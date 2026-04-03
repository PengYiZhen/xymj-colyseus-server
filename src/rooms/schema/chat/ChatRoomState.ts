import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";
import { ChatMessage } from "./ChatMessage";
import { ChatPlayer } from "./ChatPlayer";

export const DEFAULT_CHAT_HISTORY_LIMIT = 50;

export class ChatRoomState extends Schema {
  // 当前房间玩家（key: sessionId）
  @type({ map: ChatPlayer })
  players = new MapSchema<ChatPlayer>();

  // 聊天记录（按时间顺序追加，超出限制时截断）
  @type([ChatMessage])
  messages = new ArraySchema<ChatMessage>();
}

