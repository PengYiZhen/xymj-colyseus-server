import { Schema, type } from "@colyseus/schema";

/**
 * 压测房间状态：用于页面观察「服务端当前在线人数」等（不记录每个 JWT）
 */
export class LoadTestRoomState extends Schema {
  @type("number") connectedCount: number = 0;
  /** join/leave 时自增，便于客户端校验状态是否在更新 */
  @type("number") revision: number = 0;
}
