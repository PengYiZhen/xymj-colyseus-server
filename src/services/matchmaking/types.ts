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

export interface PartyCreateRequest {
  modeId: string;
  playersPerMatch: number;
  region?: string;
}

export interface PartyJoinRequest {
  partyCode: string;
}

export interface MatchFoundPayload {
  roomName: string;
  roomId: string;
  matchId: string;
  seatIndex: number;
  reconnectKey: string;
  joinOptions: Record<string, any>;
}

