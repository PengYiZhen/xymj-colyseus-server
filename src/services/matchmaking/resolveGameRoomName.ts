import appConfig from "../../config";

/**
 * 解析组局后要创建的 Colyseus 房间类型名（须在 app.config 中 gameServer.define 注册）。
 * 优先级：请求显式 gameRoomName > modeId 映射表 > 默认 game_room（Demo）
 */
export function resolveGameRoomName(params: {
  gameRoomName?: string;
  modeId?: string;
}): string {
  const explicit = params.gameRoomName?.trim();
  if (explicit) return explicit;

  const mode = params.modeId?.trim();
  if (mode) {
    const mapped = appConfig.matchmaking.modeGameRoomMap[mode];
    if (mapped?.trim()) return mapped.trim();
  }

  return appConfig.matchmaking.defaultGameRoomName;
}
