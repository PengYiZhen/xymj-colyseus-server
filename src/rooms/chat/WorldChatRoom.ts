import type Redis from "ioredis";
import { BaseChatRoom, ChatChannel } from "./BaseChatRoom";
import { ChatPlayer } from "../schema/chat/ChatPlayer";
import { RequireAuth } from "../../utils/decorators/RequireAuth";
import RedisClient from "../../utils/redis";
import appConfig from "../../config";

/**
 * 世界聊天：本房间广播后，经 Redis Pub/Sub 同步到其它进程 / 其它 world 房间实例，
 * 避免「多实例 world 房」消息不互通。
 */
export class WorldChatRoom extends BaseChatRoom {
  private redisSub: Redis | null = null;

  protected get channel(): ChatChannel {
    return "world";
  }

  protected isRecipient(sender: ChatPlayer, target: ChatPlayer): boolean {
    return true;
  }

  @RequireAuth()
  onCreate(options: any) {
    super.onCreate(options);
    void this.setupWorldRedisBridge();
  }

  onDispose() {
    void this.teardownWorldRedisBridge();
  }

  protected distributeChat(sender: ChatPlayer, payload: Record<string, unknown>): void {
    super.distributeChat(sender, payload);
    void this.publishWorldToRedis(payload);
  }

  private get worldChannel(): string {
    return appConfig.colyseus.chatWorldRedisChannel;
  }

  private async publishWorldToRedis(payload: Record<string, unknown>) {
    try {
      const redis = RedisClient.getInstance();
      await redis.connect();
      const client = redis.getClient();
      const envelope = {
        ...payload,
        originRoomId: this.roomId,
      };
      await client.publish(this.worldChannel, JSON.stringify(envelope));
    } catch (e: any) {
      console.error("[WorldChatRoom] Redis publish 失败:", e?.message || e);
    }
  }

  private async setupWorldRedisBridge() {
    try {
      const redis = RedisClient.getInstance();
      await redis.connect();
      const dup = redis.getClient().duplicate();
      this.redisSub = dup;
      dup.on("error", (err: Error) => {
        console.error("[WorldChatRoom] Redis 订阅连接错误:", err.message);
      });
      await dup.subscribe(this.worldChannel);
      dup.on("message", (_channel: string, message: string) => {
        try {
          const data = JSON.parse(message) as Record<string, unknown>;
          const originRoomId = data.originRoomId as string | undefined;
          if (!originRoomId || originRoomId === this.roomId) {
            return;
          }
          const { originRoomId: _o, ...rest } = data;
          for (const c of this.clients as any) {
            c.send("chat", rest);
          }
        } catch {
          /* ignore malformed */
        }
      });
      console.log(
        `[WorldChatRoom] Redis 世界频道桥接已启用 channel=${this.worldChannel}`
      );
    } catch (e: any) {
      console.warn(
        "[WorldChatRoom] Redis 桥接未启用，世界聊天仅本房间实例内互通:",
        e?.message || e
      );
    }
  }

  private async teardownWorldRedisBridge() {
    if (!this.redisSub) return;
    const sub = this.redisSub;
    this.redisSub = null;
    try {
      await sub.unsubscribe(this.worldChannel);
      await sub.quit();
    } catch {
      try {
        sub.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
