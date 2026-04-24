import type Redis from "ioredis";
import { Room, Client, matchMaker } from "colyseus";
import crypto from "crypto";
import { RequireAuth } from "../utils/decorators/RequireAuth";
import { MatchmakingService } from "../services/matchmaking/MatchmakingService";
import type { MatchFindRequest, PartyCreateRequest, PartyJoinRequest } from "../services/matchmaking/types";
import RedisClient from "../utils/redis";

type SessionUser = {
  userId: string;
  /** 演示用：允许同一 token 多开时区分不同“玩家” */
  demoUserId?: string;
  username?: string;
  ticketId?: string;
  queueKey?: string;
  playersPerMatch?: number;
  partyId?: string;
};

function randomCode(len: number) {
  // 去掉容易混淆的字符
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function clampInt(n: any, min: number, max: number) {
  const v = Number.parseInt(String(n), 10);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * 匹配入口房间
 * - 主动模式：排队凑人 -> 创建对局房
 * - 被动模式：创建 party(房间码) -> 其他人加入 -> 满人后创建对局房
 */
export class MatchmakerRoom extends Room {
  maxClients = 5000;
  private mm = new MatchmakingService();
  private users = new Map<string, SessionUser>(); // sessionId -> user
  private tick?: NodeJS.Timeout;
  private redisSub: Redis | null = null;
  private notifyChannel = "colyseus:mm:notify";

  @RequireAuth()
  onCreate(options: any) {
    // 主动匹配
    this.onMessage("match:find", async (client, message: MatchFindRequest) => {
      const user = this.getUser(client);
      const modeId = String(message?.modeId || "default");
      const playersPerMatch = clampInt(message?.playersPerMatch, 2, 100);
      const region = message?.region ? String(message.region) : undefined;

      const { queueKey, ticketId } = await this.mm.enqueue({
        userId: user.userId,
        sessionId: client.sessionId,
        username: user.username,
        modeId,
        playersPerMatch,
        region,
        skill: message?.skill,
        tags: message?.tags,
        enqueueAtMs: Date.now(),
      });

      user.ticketId = ticketId;
      user.queueKey = queueKey;
      user.playersPerMatch = playersPerMatch;

      client.send("match:queued", { queueKey });

      // 尝试立刻组局（跨实例安全）
      await this.tryMatch(queueKey, playersPerMatch);
    });

    this.onMessage("match:cancel", async (client) => {
      const user = this.getUser(client);
      if (!user.queueKey || !user.ticketId) {
        client.send("match:cancelled", { ok: true });
        return;
      }
      const ok = await this.mm.cancelEnqueue(user.queueKey, user.ticketId);
      user.queueKey = undefined;
      user.ticketId = undefined;
      client.send("match:cancelled", { ok });
    });

    // 被动开房（party）
    this.onMessage("party:create", async (client, message: PartyCreateRequest) => {
      const user = this.getUser(client);
      const modeId = String(message?.modeId || "default");
      const playersPerMatch = clampInt(message?.playersPerMatch, 2, 100);
      const region = message?.region ? String(message.region) : undefined;

      const partyId = crypto.randomUUID();
      const partyCode = randomCode(6);
      await this.mm.createParty({
        partyId,
        partyCode,
        modeId,
        playersPerMatch,
        region,
        leaderUserId: user.userId,
        createdAtMs: Date.now(),
      });
      user.partyId = partyId;
      client.send("party:created", {
        partyId,
        partyCode,
        modeId,
        playersPerMatch,
        region,
        leaderUserId: user.userId,
        isLeader: true,
      });
    });

    this.onMessage("party:join", async (client, message: PartyJoinRequest) => {
      const user = this.getUser(client);
      const partyCode = String(message?.partyCode || "").trim().toUpperCase();
      if (!partyCode) {
        client.send("party:error", { message: "partyCode 不能为空" });
        return;
      }
      const partyId = await this.mm.getPartyIdByCode(partyCode);
      if (!partyId) {
        client.send("party:error", { message: "房间码不存在或已过期" });
        return;
      }

      const party = await this.mm.getParty(partyId);
      if (!party) {
        client.send("party:error", { message: "房间已关闭" });
        return;
      }

      const count = await this.mm.addPartyMember(partyId, {
        userId: user.userId,
        username: user.username,
        joinedAtMs: Date.now(),
      });
      user.partyId = partyId;

      const isLeader = party.leaderUserId === user.userId;
      client.send("party:joined", {
        partyId,
        partyCode,
        count,
        playersPerMatch: party.playersPerMatch,
        leaderUserId: party.leaderUserId,
        isLeader,
      });

      // 广播 party 状态给当前在线成员（用于前端更新人数/房主标识）
      await this.broadcastPartyUpdate(partyId);
    });

    this.onMessage("party:leave", async (client) => {
      const user = this.getUser(client);
      if (!user.partyId) {
        client.send("party:left", { ok: true });
        return;
      }
      const partyId = user.partyId;
      user.partyId = undefined;
      const remaining = await this.mm.removePartyMember(partyId, user.userId);
      if (remaining <= 0) {
        await this.mm.closeParty(partyId);
      } else {
        await this.broadcastPartyUpdate(partyId);
      }
      client.send("party:left", { ok: true });
    });

    this.onMessage("party:start", async (client) => {
      const user = this.getUser(client);
      if (!user.partyId) {
        client.send("party:error", { message: "你当前不在房间队伍中" });
        return;
      }

      const party = await this.mm.getParty(user.partyId);
      if (!party) {
        client.send("party:error", { message: "房间已关闭或过期" });
        return;
      }

      if (party.leaderUserId !== user.userId) {
        client.send("party:error", { message: "只有房主可以开始游戏" });
        return;
      }

      const members = await this.mm.getPartyMemberInfos(user.partyId);
      if (members.length < party.playersPerMatch) {
        client.send("party:error", {
          message: `人数不足，当前 ${members.length}/${party.playersPerMatch}`,
        });
        return;
      }

      await this.startMatchFromParty(user.partyId);
    });

    // 定时扫：避免“只入队但没人触发 tryMatch”
    this.tick = setInterval(async () => {
      const seen = new Set<string>();
      for (const u of this.users.values()) {
        if (!u.queueKey || !u.playersPerMatch) continue;
        if (seen.has(u.queueKey)) continue;
        seen.add(u.queueKey);
        // 低频尝试，避免频繁抢锁
        await this.tryMatch(u.queueKey, u.playersPerMatch);
      }
    }, 1000);

    void this.setupNotifyBridge();
  }

  onJoin(client: Client, options: any) {
    // RequireAuth 会把 userId/username 写入 options
    const demoUserIdRaw = options?.demoUserId ? String(options.demoUserId).trim() : "";
    const effectiveUserId = demoUserIdRaw || String(options.userId);
    this.users.set(client.sessionId, {
      userId: effectiveUserId,
      demoUserId: demoUserIdRaw || undefined,
      username: options.username ? String(options.username) : undefined,
    });
    client.send("mm:ready", { sessionId: client.sessionId });
  }

  async onLeave(client: Client) {
    const user = this.users.get(client.sessionId);
    if (user?.queueKey && user.ticketId) {
      await this.mm.cancelEnqueue(user.queueKey, user.ticketId);
    }
    if (user?.partyId) {
      const remaining = await this.mm.removePartyMember(user.partyId, user.userId);
      if (remaining > 0) {
        await this.broadcastPartyUpdate(user.partyId);
      } else {
        await this.mm.closeParty(user.partyId);
      }
    }
    this.users.delete(client.sessionId);
  }

  onDispose() {
    if (this.tick) clearInterval(this.tick);
    void this.teardownNotifyBridge();
  }

  private getUser(client: Client): SessionUser {
    const user = this.users.get(client.sessionId);
    if (!user) {
      throw new Error("user not found (did you join before sending messages?)");
    }
    return user;
  }

  private async tryMatch(queueKey: string, playersPerMatch: number) {
    const match = await this.mm.tryFormMatch(queueKey, playersPerMatch);
    if (!match) return;

    // 创建对局房（复用 game_room）
    const roomName = "game_room";
    const room = await matchMaker.createRoom(roomName, {
      fps: 20,
      recordFrames: false,
      matchId: match.matchId,
      playersPerMatch,
      queueKey,
    });

    await this.mm.updateMatchRoom(match.matchId, roomName, room.roomId);

    const notifications = match.players.map((p) => ({
      userId: p.userId,
      sessionId: p.sessionId,
      payload: {
        roomName,
        roomId: room.roomId,
        matchId: match.matchId,
        seatIndex: p.seatIndex,
        reconnectKey: p.reconnectKey,
        joinOptions: {
          matchId: match.matchId,
          seatIndex: p.seatIndex,
          reconnectKey: p.reconnectKey,
        },
      },
    }));

    // 本实例直发 + Redis Pub/Sub 广播（跨实例转发到在线用户）
    this.deliverNotifications(notifications);
    await this.publishNotify({ originRoomId: this.roomId, type: "match:found", notifications });
  }

  private async startMatchFromParty(partyId: string) {
    const party = await this.mm.getParty(partyId);
    if (!party) return;

    const members = await this.mm.getPartyMemberInfos(partyId);
    if (members.length < party.playersPerMatch) return;

    const matchId = crypto.randomUUID();
    const roomName = "game_room";
    const room = await matchMaker.createRoom(roomName, {
      fps: 20,
      recordFrames: false,
      matchId,
      playersPerMatch: party.playersPerMatch,
      partyId,
    });

    // 通知 party 内在线用户加入
    const notifications = members.slice(0, party.playersPerMatch).map((m, i) => ({
      userId: m.userId,
      sessionId: this.findSessionIdByUserId(m.userId) || "",
      payload: {
        roomName,
        roomId: room.roomId,
        matchId,
        seatIndex: i,
        reconnectKey: crypto.randomUUID(),
        joinOptions: { matchId, seatIndex: i, partyId },
      },
    }));

    this.deliverNotifications(notifications);
    await this.publishNotify({ originRoomId: this.roomId, type: "match:found", notifications });

    await this.mm.closeParty(partyId);
  }

  private async broadcastPartyUpdate(partyId: string) {
    const party = await this.mm.getParty(partyId);
    if (!party) return;
    const members = await this.mm.getPartyMembers(partyId);
    const count = members.length;
    for (const userId of members) {
      const targetClient = this.findClientByUserId(userId);
      if (!targetClient) continue;
      targetClient.send("party:update", {
        partyId,
        count,
        playersPerMatch: party.playersPerMatch,
        leaderUserId: party.leaderUserId,
        isLeader: party.leaderUserId === userId,
      });
    }
  }

  private findClientByUserId(userId: string): Client | null {
    for (const [sessionId, u] of this.users.entries()) {
      if (u.userId === userId) {
        return this.clients.find((c) => c.sessionId === sessionId) || null;
      }
    }
    return null;
  }

  private deliverNotifications(
    notifications: Array<{ userId: string; sessionId?: string; payload: any }>
  ) {
    for (const n of notifications) {
      const targetClient =
        (n.sessionId ? this.clients.find((c) => c.sessionId === n.sessionId) || null : null) ||
        this.findClientByUserId(n.userId);
      if (!targetClient) continue;
      targetClient.send("match:found", n.payload);
    }
  }

  private async publishNotify(envelope: any) {
    try {
      const redis = RedisClient.getInstance();
      await redis.connect();
      const client = redis.getClient();
      await client.publish(this.notifyChannel, JSON.stringify(envelope));
    } catch (e: any) {
      console.warn("[MatchmakerRoom] Redis notify publish 失败:", e?.message || e);
    }
  }

  private async setupNotifyBridge() {
    try {
      const redis = RedisClient.getInstance();
      await redis.connect();
      const dup = redis.getClient().duplicate();
      this.redisSub = dup;
      dup.on("error", (err: Error) => {
        console.error("[MatchmakerRoom] Redis notify 订阅连接错误:", err.message);
      });
      await dup.subscribe(this.notifyChannel);
      dup.on("message", (_channel: string, message: string) => {
        try {
          const data = JSON.parse(message) as any;
          if (data?.originRoomId && data.originRoomId === this.roomId) return;
          if (data?.type !== "match:found") return;
          const notifications = Array.isArray(data.notifications) ? data.notifications : [];
          this.deliverNotifications(
            notifications.map((n: any) => ({
              userId: String(n.userId),
              sessionId: n.sessionId ? String(n.sessionId) : undefined,
              payload: n.payload,
            }))
          );
        } catch {
          /* ignore malformed */
        }
      });
    } catch (e: any) {
      console.warn(
        "[MatchmakerRoom] Redis notify 桥接未启用（仅同实例可收 match:found）:",
        e?.message || e
      );
    }
  }

  private async teardownNotifyBridge() {
    if (!this.redisSub) return;
    const sub = this.redisSub;
    this.redisSub = null;
    try {
      await sub.unsubscribe(this.notifyChannel);
      await sub.quit();
    } catch {
      try {
        sub.disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  private findSessionIdByUserId(userId: string): string | null {
    for (const [sessionId, u] of this.users.entries()) {
      if (u.userId === userId) return sessionId;
    }
    return null;
  }
}

