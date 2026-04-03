import { Client, Room } from "@colyseus/core";
import { DEFAULT_CHAT_HISTORY_LIMIT, ChatRoomState } from "../schema/chat/ChatRoomState";
import { ChatMessage } from "../schema/chat/ChatMessage";
import { ChatPlayer } from "../schema/chat/ChatPlayer";
import { RequireAuth } from "../../utils/decorators/RequireAuth";
import appConfig from "../../config";

export type ChatChannel = "world" | "guild" | "nearby" | "team";

function toNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * 聊天房间基类：负责
 * 1) onJoin 时把 JWT/客户端 options 绑定到 state.players
 * 2) updatePosition 更新坐标（用于附近聊天）
 * 3) chat 写入历史并按 recipients 策略向目标客户端发送
 */
export abstract class BaseChatRoom extends Room<ChatRoomState> {
  state = new ChatRoomState();

  protected messageHistoryLimit = DEFAULT_CHAT_HISTORY_LIMIT;

  protected abstract get channel(): ChatChannel;

  @RequireAuth()
  onCreate(options: any) {
    // 单房间并发上限（与 Colyseus Room.maxClients 一致；人满后 join 会被拒绝）
    this.maxClients = appConfig.colyseus.chatRoomMaxClients;
    console.log(
      `[ChatRoom] channel=${this.channel} roomId=${this.roomId} maxClients=${this.maxClients}`
    );

    // 聊天消息（客户端发送 -> 服务端按频道过滤发送给目标客户端）
    this.onMessage("chat", (client, message) => {
      this.handleChat(client, message);
    });

    // 附近聊天：更新客户端坐标
    this.onMessage("updatePosition", (client, message) => {
      this.handleUpdatePosition(client, message);
    });
  }

  @RequireAuth()
  onJoin(client: Client, options: any) {
    const player = new ChatPlayer();
    player.sessionId = client.sessionId;

    // 来自 RequireAuth 的注入字段（如果你后续扩展登录体系，也可在这里映射）
    player.userId = (options?.userId ?? client.sessionId) as string;
    player.username = (options?.username ?? options?.userId ?? client.sessionId) as string;

    // 房间分组：guild/team/nearby radius
    player.guildId = (options?.guildId ?? "") as string;
    player.teamId = (options?.teamId ?? "") as string;

    player.x = toNumber(options?.x, 0);
    player.y = toNumber(options?.y, 0);
    player.nearbyRadius = toNumber(options?.nearbyRadius, 120);

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    this.state.players.delete(client.sessionId);
  }

  protected handleUpdatePosition(client: Client, message: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    player.x = toNumber(message?.x, player.x);
    player.y = toNumber(message?.y, player.y);
  }

  protected handleChat(client: Client, message: any) {
    const sender = this.state.players.get(client.sessionId);
    if (!sender) return;

    const text =
      (typeof message === "string" ? message : message?.message ?? message?.text) ??
      "";

    const trimmed = String(text).trim();
    if (!trimmed) return;

    const timestamp = Date.now();

    const payload = {
      channel: this.channel,
      guildId: sender.guildId || "",
      teamId: sender.teamId || "",
      sender: {
        sessionId: sender.sessionId,
        userId: sender.userId,
        username: sender.username,
      },
      message: trimmed,
      timestamp,
    };

    // 写入消息历史（用于状态同步/演示）
    const chatMsg = new ChatMessage();
    chatMsg.channel = this.channel;
    chatMsg.senderSessionId = sender.sessionId;
    chatMsg.senderUserId = sender.userId;
    chatMsg.senderName = sender.username;
    chatMsg.text = trimmed;
    chatMsg.timestamp = timestamp;

    this.state.messages.push(chatMsg);
    while (this.state.messages.length > this.messageHistoryLimit) {
      this.state.messages.shift();
    }

    this.distributeChat(sender, payload);
  }

  /**
   * 按 recipients 策略推送给本房间客户端（子类可 override，例如世界频道走 Redis 再 fan-out）
   */
  protected distributeChat(sender: ChatPlayer, payload: Record<string, unknown>): void {
    for (const targetClient of this.clients as any) {
      const targetPlayer = this.state.players.get(targetClient.sessionId);
      if (!targetPlayer) continue;
      if (this.isRecipient(sender, targetPlayer)) {
        targetClient.send("chat", payload);
      }
    }
  }

  /**
   * 判断消息是否需要发送给目标客户端
   */
  protected abstract isRecipient(sender: ChatPlayer, target: ChatPlayer): boolean;
}

