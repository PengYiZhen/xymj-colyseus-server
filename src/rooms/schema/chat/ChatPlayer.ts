import { Schema, type } from "@colyseus/schema";

/**
 * 字段属性可自行扩展
 * 聊天房间内的玩家绑定信息 》用于路由过滤：世界/工会/附近/队伍《
 */
export class ChatPlayer extends Schema {
  @type("string")
  sessionId: string = "";

  @type("string")
  userId: string = "";

  @type("string")
  username: string = "";

  @type("string")
  guildId: string = "";

  @type("string")
  teamId: string = "";

  // 附近聊天使用坐标
  @type("number")
  x: number = 0;

  @type("number")
  y: number = 0;

  // 附近聊天半径（单位按前端约定）
  @type("number")
  nearbyRadius: number = 120;
}

