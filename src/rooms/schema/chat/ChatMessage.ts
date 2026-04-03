import { Schema, type } from "@colyseus/schema";

/**
 * 聊天消息 字段属性可自行扩展
 */
export class ChatMessage extends Schema {
  @type("string")
  channel: string = "";

  // 发送方信息
  @type("string")
  senderSessionId: string = "";

  @type("string")
  senderUserId: string = "";

  @type("string")
  senderName: string = "";

  // 内容
  @type("string")
  text: string = "";

  // 时间戳（毫秒）
  @type("number")
  timestamp: number = 0;
}

