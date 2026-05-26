import type { PartyUserPayload } from "./types";
import type { PartyMemberInfo } from "./MatchmakingService";

type SessionLike = {
  userId: string;
  username?: string;
};

const RESERVED_MEMBER_KEYS = new Set(["userId", "joinedAtMs", "profile"]);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** 从 Redis 反序列化，兼容旧版扁平字段 */
export function normalizePartyMemberInfo(raw: unknown): PartyMemberInfo | null {
  if (!isPlainObject(raw)) return null;
  const userId = String(raw.userId ?? "").trim();
  if (!userId) return null;
  const joinedAtMs =
    typeof raw.joinedAtMs === "number" && Number.isFinite(raw.joinedAtMs)
      ? raw.joinedAtMs
      : Date.now();

  if (isPlainObject(raw.profile)) {
    return { userId, joinedAtMs, profile: { ...raw.profile } };
  }

  const profile: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (RESERVED_MEMBER_KEYS.has(k)) continue;
    if (v === undefined) continue;
    profile[k] = v;
  }
  return { userId, joinedAtMs, profile: Object.keys(profile).length ? profile : undefined };
}

/** 将客户端 party:* 里的 user 与会话合并；userId 以 JWT 为准，其余字段原样保留 */
export function buildPartyMemberFromPayload(
  session: SessionLike,
  raw?: PartyUserPayload,
  joinedAtMs = Date.now()
): PartyMemberInfo {
  const profile: Record<string, unknown> = isPlainObject(raw) ? { ...raw } : {};
  delete profile.userId;

  if (session.username !== undefined && profile.username === undefined) {
    profile.username = session.username;
  }

  return {
    userId: session.userId,
    joinedAtMs,
    profile: Object.keys(profile).length ? profile : undefined,
  };
}

/** 下发给客户端：userId + 业务自定义 profile 字段 */
export function toPartyMemberView(member: PartyMemberInfo): Record<string, unknown> {
  return {
    userId: member.userId,
    ...(member.profile ?? {}),
  };
}
