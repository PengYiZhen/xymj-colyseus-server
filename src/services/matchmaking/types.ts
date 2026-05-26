export type MatchMode = "active" | "passive";

export interface MatchFindRequest {
  modeId: string;
  /** 接入方决定一局人数 */
  playersPerMatch: number;
  /** 可选：段位/分数，用于后续扩展分段匹配 */
  skill?: number;
  /** 可选：大区 */
  region?: string;
  /** 可选：附加过滤维度 */
  tags?: string[];
}

/**
 * party:create / party:join 客户端携带的展示用用户信息。
 * 字段名与结构由业务方自定；服务端仅强制 userId 以 JWT 为准（客户端传的 userId 会被忽略）。
 */
export type PartyUserPayload = Record<string, unknown>;

export interface PartyCreateRequest {
  modeId: string;
  playersPerMatch: number;
  region?: string;
  user?: PartyUserPayload;
}

export interface PartyJoinRequest {
  partyCode: string;
  user?: PartyUserPayload;
}

export interface MatchFoundPayload {
  roomName: string;
  roomId: string;
  matchId: string;
  seatIndex: number;
  reconnectKey: string;
  joinOptions: Record<string, any>;
}

