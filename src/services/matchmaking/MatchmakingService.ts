import crypto from "crypto";
import RedisClient from "../../utils/redis";
import { normalizePartyMemberInfo, normalizeUserId } from "./partyUser";

export type AddPartyMemberResult =
  | { ok: true; count: number; added: boolean }
  | { ok: false; reason: "full"; count: number };

export interface QueueTicket {
  userId: string;
  sessionId: string;
  username?: string;
  modeId: string;
  /** 组局后 createRoom 使用的房间类型名 */
  gameRoomName: string;
  playersPerMatch: number;
  region?: string;
  skill?: number;
  tags?: string[];
  enqueueAtMs: number;
}

export interface PartyInfo {
  partyId: string;
  partyCode: string;
  modeId: string;
  gameRoomName: string;
  playersPerMatch: number;
  region?: string;
  leaderUserId: string;
  createdAtMs: number;
}

export interface PartyMemberInfo {
  userId: string;
  joinedAtMs: number;
  /** 客户端传入的任意展示字段，原样持久化与广播 */
  profile?: Record<string, unknown>;
}

export interface MatchInfo {
  matchId: string;
  queueKey: string;
  modeId: string;
  gameRoomName: string;
  createdAtMs: number;
  players: Array<{
    userId: string;
    sessionId: string;
    username?: string;
    seatIndex: number;
    reconnectKey: string;
  }>;
  roomName?: string;
  roomId?: string;
  status: "created" | "room_created" | "closed";
}

function clampInt(n: any, min: number, max: number) {
  const v = Number.parseInt(String(n), 10);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export class MatchmakingService {
  private redis = RedisClient.getInstance();

  /** queueKey 必须包含 playersPerMatch，确保同队列人数一致 */
  getQueueKey(params: { modeId: string; playersPerMatch: number; region?: string }) {
    const playersPerMatch = clampInt(params.playersPerMatch, 2, 100);
    const region = params.region ? String(params.region) : "global";
    return `queue:${params.modeId}:${playersPerMatch}:${region}`;
  }

  private async getRawRedis() {
    const client = this.redis.getClient();
    return client;
  }

  async enqueue(ticket: QueueTicket): Promise<{ queueKey: string; ticketId: string }> {
    const client = await this.getRawRedis();
    const queueKey = this.getQueueKey(ticket);
    const ticketId = crypto.randomUUID();
    const ticketKey = `mm:ticket:${ticketId}`;

    const payload = {
      ...ticket,
      ticketId,
    };

    // ticket 保存 10 分钟，便于查找/取消/调试
    await client
      .multi()
      .set(ticketKey, JSON.stringify(payload), "EX", 60 * 10)
      // ZSET: score 使用时间戳，后续可改为匹配分数
      .zadd(queueKey, String(ticket.enqueueAtMs), ticketId)
      .exec();

    return { queueKey, ticketId };
  }

  async cancelEnqueue(queueKey: string, ticketId: string): Promise<boolean> {
    const client = await this.getRawRedis();
    const ticketKey = `mm:ticket:${ticketId}`;
    const res = await client.multi().zrem(queueKey, ticketId).del(ticketKey).exec();
    const zrem = Number(res?.[0]?.[1] ?? 0);
    return zrem > 0;
  }

  async tryFormMatch(queueKey: string, playersPerMatch: number): Promise<MatchInfo | null> {
    const client = await this.getRawRedis();
    const lockKey = `mm:lock:${queueKey}`;
    const lockId = crypto.randomUUID();

    // 短锁，避免多实例重复出队组局
    const lockOk = await client.set(lockKey, lockId, "PX", 2000, "NX");
    if (!lockOk) return null;

    try {
      const n = clampInt(playersPerMatch, 2, 100);
      const lua = `
local queueKey = KEYS[1]
local n = tonumber(ARGV[1])
local ids = redis.call('ZRANGE', queueKey, 0, n - 1)
if (#ids < n) then
  return {}
end
redis.call('ZREM', queueKey, unpack(ids))
return ids
`;
      const ids = (await client.eval(lua, 1, queueKey, String(n))) as string[];
      if (!ids || ids.length !== n) return null;

      const tickets = await Promise.all(ids.map((id) => client.get(`mm:ticket:${id}`)));
      const players = tickets
        .map((t) => {
          if (!t) return null;
          try {
            return JSON.parse(t) as QueueTicket & { ticketId: string };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Array<QueueTicket & { ticketId: string }>;

      if (players.length !== n) {
        // 有坏数据就放弃本次组局（简单起见）；可扩展为回滚
        return null;
      }

      const matchId = crypto.randomUUID();
      const createdAtMs = Date.now();
      const gameRoomName = players[0]?.gameRoomName || "game_room";
      const modeId = players[0]?.modeId || "default";

      const match: MatchInfo = {
        matchId,
        queueKey,
        modeId,
        gameRoomName,
        createdAtMs,
        status: "created",
        players: players.map((p, idx) => ({
          userId: p.userId,
          sessionId: p.sessionId,
          username: p.username,
          seatIndex: idx,
          reconnectKey: crypto.randomUUID(),
        })),
      };

      await client.set(`mm:match:${matchId}`, JSON.stringify(match), "EX", 60 * 10);
      // 清理 ticket（避免重复用）
      await Promise.all(ids.map((id) => client.del(`mm:ticket:${id}`)));

      return match;
    } finally {
      // 只在锁仍属于自己时释放（简单校验）
      const val = await client.get(lockKey);
      if (val === lockId) {
        await client.del(lockKey);
      }
    }
  }

  async updateMatchRoom(matchId: string, roomName: string, roomId: string) {
    const client = await this.getRawRedis();
    const raw = await client.get(`mm:match:${matchId}`);
    if (!raw) return;
    let match: MatchInfo;
    try {
      match = JSON.parse(raw) as MatchInfo;
    } catch {
      return;
    }
    match.roomName = roomName;
    match.roomId = roomId;
    match.status = "room_created";
    await client.set(`mm:match:${matchId}`, JSON.stringify(match), "EX", 60 * 10);
  }

  async createParty(params: PartyInfo, leaderMember: PartyMemberInfo): Promise<void> {
    const client = await this.getRawRedis();
    const leaderUserId = normalizeUserId(params.leaderUserId);
    const party = { ...params, leaderUserId };
    const leader = { ...leaderMember, userId: leaderUserId };

    await client.set(`mm:party:${party.partyId}`, JSON.stringify(party), "EX", 60 * 30);
    await client.sadd(`mm:party:${party.partyId}:members`, leaderUserId);
    await client.hset(
      `mm:party:${party.partyId}:memberInfo`,
      leaderUserId,
      JSON.stringify(leader)
    );
    await client.expire(`mm:party:${party.partyId}:members`, 60 * 30);
    await client.expire(`mm:party:${party.partyId}:memberInfo`, 60 * 30);
    await client.set(`mm:partyCode:${party.partyCode}`, party.partyId, "EX", 60 * 30);
  }

  async getPartyIdByCode(partyCode: string): Promise<string | null> {
    const client = await this.getRawRedis();
    return await client.get(`mm:partyCode:${partyCode}`);
  }

  async getParty(partyId: string): Promise<PartyInfo | null> {
    const client = await this.getRawRedis();
    const raw = await client.get(`mm:party:${partyId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PartyInfo;
    } catch {
      return null;
    }
  }

  async addPartyMember(
    partyId: string,
    member: PartyMemberInfo,
    maxMembers: number
  ): Promise<AddPartyMemberResult> {
    const client = await this.getRawRedis();
    const membersKey = `mm:party:${partyId}:members`;
    const infoKey = `mm:party:${partyId}:memberInfo`;
    const userId = normalizeUserId(member.userId);
    const cap = clampInt(maxMembers, 2, 100);

    const isMember = await client.sismember(membersKey, userId);
    if (isMember) {
      await client.hset(infoKey, userId, JSON.stringify({ ...member, userId }));
      const count = await client.scard(membersKey);
      return { ok: true, count, added: false };
    }

    const count = await client.scard(membersKey);
    if (count >= cap) {
      return { ok: false, reason: "full", count };
    }

    await client.sadd(membersKey, userId);
    await client.hset(infoKey, userId, JSON.stringify({ ...member, userId }));
    return { ok: true, count: count + 1, added: true };
  }

  async updatePartyLeader(partyId: string, newLeaderUserId: string): Promise<boolean> {
    const party = await this.getParty(partyId);
    if (!party) return false;
    const leaderUserId = normalizeUserId(newLeaderUserId);
    if (!leaderUserId) return false;

    party.leaderUserId = leaderUserId;
    const client = await this.getRawRedis();
    await client.set(`mm:party:${partyId}`, JSON.stringify(party), "EX", 60 * 30);
    return true;
  }

  async isPartyMember(partyId: string, userId: string): Promise<boolean> {
    const client = await this.getRawRedis();
    const id = normalizeUserId(userId);
    if (!id) return false;
    return (await client.sismember(`mm:party:${partyId}:members`, id)) === 1;
  }

  async getPartyMemberInfos(partyId: string): Promise<PartyMemberInfo[]> {
    const client = await this.getRawRedis();
    const raw = await client.hgetall(`mm:party:${partyId}:memberInfo`);
    const out: PartyMemberInfo[] = [];
    for (const v of Object.values(raw)) {
      try {
        const parsed = normalizePartyMemberInfo(JSON.parse(v));
        if (parsed) out.push(parsed);
      } catch {
        // ignore
      }
    }
    // 稳定排序：先 joinedAtMs，再 userId
    out.sort((a, b) => (a.joinedAtMs - b.joinedAtMs) || a.userId.localeCompare(b.userId));
    return out;
  }

  async removePartyMember(partyId: string, userId: string): Promise<number> {
    const client = await this.getRawRedis();
    const id = normalizeUserId(userId);
    await client.srem(`mm:party:${partyId}:members`, id);
    await client.hdel(`mm:party:${partyId}:memberInfo`, id);
    return await client.scard(`mm:party:${partyId}:members`);
  }

  async getPartyMembers(partyId: string): Promise<string[]> {
    const client = await this.getRawRedis();
    return await client.smembers(`mm:party:${partyId}:members`);
  }

  async closeParty(partyId: string) {
    const client = await this.getRawRedis();
    const party = await this.getParty(partyId);
    await client.del(`mm:party:${partyId}`);
    await client.del(`mm:party:${partyId}:members`);
    await client.del(`mm:party:${partyId}:memberInfo`);
    if (party?.partyCode) {
      await client.del(`mm:partyCode:${party.partyCode}`);
    }
  }
}

