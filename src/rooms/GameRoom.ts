import { Client } from "@colyseus/core";
import { FrameSyncRoom, ClientInput } from "../utils/FrameSync";
import { MyRoomState, Player } from "./schema/MyRoomState";
import { RequireAuth } from "../utils/decorators/RequireAuth";
import crypto from "crypto";
import RedisClient from "../utils/redis";

/**
 * 游戏房间示例 - 使用帧同步
 */
export class GameRoom extends FrameSyncRoom<MyRoomState> {
  maxClients = 4;
  state = new MyRoomState();
  private reconnectWindowMs = Number.parseInt(
    process.env.MATCH_RECONNECT_WINDOW_MS || "15000",
    10
  );
  private pendingReconnect = new Map<
    string,
    { oldSessionId: string; expireAtMs: number; reconnectKey: string; matchId: string }
  >(); // userId -> info

  onCreate(options: any) {
    console.log("[GameRoom] 房间创建:", this.roomId);

    // 对接匹配赛：接入方可以在创建房间时传 playersPerMatch，平台框架做兜底
    if (options?.playersPerMatch) {
      const n = Number.parseInt(String(options.playersPerMatch), 10);
      if (!Number.isNaN(n) && n > 0) {
        this.maxClients = n;
      }
    }
   
    // 初始化帧同步（20 FPS）
    this.initFrameSync({
      targetFPS: options.fps || 20,
      enabled: true,  
      recordFrames: options.recordFrames || false,
    });

    // 启动帧同步   
    this.startFrameSync();

    // 监听其他消息
    this.onMessage("chat", (client, message) => {
      console.log(`[GameRoom] ${client.sessionId} 发送消息:`, message);
      this.broadcast("chat", { clientId: client.sessionId, message }, { except: client });
    });
  }

  @RequireAuth()
  onJoin(client: Client, options: any) {
    console.log(`[GameRoom] ${client.sessionId} 加入房间`);

    const userId = String(options.demoUserId ? String(options.demoUserId).trim() : options.userId);
    const matchId = options.matchId ? String(options.matchId) : "";
    const seatIndex =
      options.seatIndex !== undefined ? Number.parseInt(String(options.seatIndex), 10) : -1;
    const reconnectKey = options.reconnectKey ? String(options.reconnectKey) : "";

    // 断线重连：若存在等待重连记录，则校验 reconnectKey 并把旧 session 迁移到新 session
    const migrated = this.tryConsumeReconnect(userId, matchId, reconnectKey);
    if (migrated) {
      const existing = this.state.players.get(migrated.oldSessionId);
      if (existing) {
        this.state.players.delete(migrated.oldSessionId);
        existing.sessionId = client.sessionId;
        existing.online = true;
        this.state.players.set(client.sessionId, existing);
        client.send("reconnect:ok", { matchId });

        this.broadcast(
          "playerOnline",
          { sessionId: client.sessionId, userId },
          { except: client }
        );
        return;
      }
    }

    // 兜底去重：即使没有命中 pendingReconnect，也保证同一 userId 在房间中只保留一个 player
    // 场景：页面刷新/重复连接时旧 session 仍在重连窗口，导致状态里出现同 userId 多条记录
    const duplicateSessionId = this.findSessionIdByUserId(userId);
    if (duplicateSessionId && duplicateSessionId !== client.sessionId) {
      const duplicate = this.state.players.get(duplicateSessionId);
      if (duplicate) {
        this.state.players.delete(duplicateSessionId);
        duplicate.sessionId = client.sessionId;
        duplicate.online = true;
        if (!Number.isNaN(seatIndex) && seatIndex >= 0) {
          duplicate.seatIndex = seatIndex;
        }
        this.state.players.set(client.sessionId, duplicate);

        // 清理可能残留的重连记录，避免后续超时任务误删
        this.pendingReconnect.delete(userId);
        client.send("reconnect:ok", { matchId, dedup: true });
        return;
      }
    }
    
    // 创建玩家并添加到状态
    const player = new Player();
    player.sessionId = client.sessionId;
    player.userId = userId;
    player.seatIndex = Number.isNaN(seatIndex) ? -1 : seatIndex;
    player.online = true;
    player.x = Math.random() * 800; // 随机初始位置
    player.y = Math.random() * 500;
    this.state.players.set(client.sessionId, player);
    
    console.log(`[GameRoom] 当前玩家数量: ${this.state.players.size}`);
    
    // 发送当前帧号给新加入的客户端
    client.send("frameSync", {
      currentFrame: this.frameSync.getCurrentFrame(),
      targetFPS: this.frameSync.getConfig().targetFPS,
    });
    
    // 广播玩家加入消息
    this.broadcast("playerJoined", {
      sessionId: client.sessionId,
      playerCount: this.state.players.size,
    }, { except: client });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`[GameRoom] ${client.sessionId} 离开房间`);

    const player = this.state.players.get(client.sessionId);
    const userId = player?.userId ? String(player.userId) : "";
    const matchId = ""; // 可后续从 options/metadata 注入

    if (!consented && player && userId) {
      // 标记离线并给予重连窗口
      player.online = false;

      const reconnectKey = crypto.randomUUID();
      const expireAtMs = Date.now() + this.reconnectWindowMs;
      this.pendingReconnect.set(userId, {
        oldSessionId: client.sessionId,
        expireAtMs,
        reconnectKey,
        matchId,
      });

      void this.persistReconnect(
        userId,
        matchId,
        reconnectKey,
        Math.ceil(this.reconnectWindowMs / 1000)
      );

      // 延迟真正移除
      this.clock.setTimeout(() => {
        const info = this.pendingReconnect.get(userId);
        if (!info) return;
        if (info.oldSessionId !== client.sessionId) return;
        if (Date.now() < info.expireAtMs) return;
        this.pendingReconnect.delete(userId);
        this.state.players.delete(client.sessionId);
        this.broadcast("playerLeft", {
          sessionId: client.sessionId,
          playerCount: this.state.players.size,
        });
      }, this.reconnectWindowMs);

      this.broadcast("playerOffline", {
        sessionId: client.sessionId,
        userId,
        reconnectWindowMs: this.reconnectWindowMs,
      });

      return;
    }

    // 主动离开或无重连信息：直接移除
    this.state.players.delete(client.sessionId);

    console.log(`[GameRoom] 当前玩家数量: ${this.state.players.size}`);

    // 广播玩家离开消息
    this.broadcast("playerLeft", {
      sessionId: client.sessionId,
      playerCount: this.state.players.size,
    });
  }

  onDispose() {
    console.log(`[GameRoom] 房间 ${this.roomId} 正在销毁`);
    this.stopFrameSync();
  }

  private tryConsumeReconnect(userId: string, matchId: string, reconnectKey: string) {
    if (!userId || !reconnectKey) return null;
    const info = this.pendingReconnect.get(userId);
    if (!info) return null;
    if (Date.now() > info.expireAtMs) {
      this.pendingReconnect.delete(userId);
      return null;
    }
    if (info.reconnectKey !== reconnectKey) return null;
    if (matchId && info.matchId && matchId !== info.matchId) return null;
    this.pendingReconnect.delete(userId);
    return info;
  }

  private async persistReconnect(
    userId: string,
    matchId: string,
    reconnectKey: string,
    ttlSeconds: number
  ) {
    try {
      const redis = RedisClient.getInstance();
      await redis.connect();
      const key = `mm:reconnect:${matchId || "none"}:${userId}`;
      await redis.set(key, reconnectKey, ttlSeconds);
    } catch {
      // ignore if redis not available
    }
  }

  private findSessionIdByUserId(userId: string): string | null {
    for (const [sessionId, player] of this.state.players.entries()) {
      if (player.userId === userId) return sessionId;
    }
    return null;
  }

  /**
   * 帧更新 - 处理游戏逻辑
   */
  protected onFrameUpdate(frame: number, inputs: ClientInput[]): void {
    // 处理所有客户端的输入
    for (const input of inputs) {
      // 在这里实现游戏逻辑
      // 例如：移动、攻击、技能等
      this.processPlayerInput(input);
    }

    // 更新游戏状态
    this.updateGameState(frame);
    
    // 更新帧号
    this.state.frame = frame;
  }

  /**
   * 帧同步 - 同步状态到客户端
   */
  protected onFrameSync(frame: number, frameData: any): void {
    // 更新房间状态
    this.state.mySynchronizedProperty = `Frame: ${frame}`;
    // 帧号已经在 onFrameUpdate 中更新了，这里确保同步
    this.state.frame = frame;

    // 可选：广播帧同步消息（但通常通过状态同步就足够了）
    // this.broadcast("frameSync", {
    //   currentFrame: frame,
    //   targetFPS: this.frameSync.getConfig().targetFPS,
    // });
  }

  /**
   * 处理玩家输入
   */
  private processPlayerInput(input: ClientInput): void {
    const player = this.state.players.get(input.clientId);
    if (!player) return;
    
    // 处理移动输入
    if (input.inputs.move) {
      const move = input.inputs.move;
      const speed = 3;
      const oldX = player.x;
      const oldY = player.y;
      
      player.x += (move.x || 0) * speed;
      player.y += (move.y || 0) * speed;
      
      // 边界检测
      player.x = Math.max(15, Math.min(785, player.x));
      player.y = Math.max(15, Math.min(485, player.y));
      
      // 如果位置发生变化，广播操作信息
      if (oldX !== player.x || oldY !== player.y) {
        this.broadcast("playerAction", {
          sessionId: input.clientId,
          action: "move",
          data: { x: player.x, y: player.y, move: move }
        });
      }
    }
    
    // 处理攻击输入
    if (input.inputs.attack !== undefined) {
      player.attacking = input.inputs.attack;
      // 广播攻击操作
      this.broadcast("playerAction", {
        sessionId: input.clientId,
        action: "attack",
        data: { attacking: input.inputs.attack }
      });
    }
    
    // 处理跳跃输入
    if (input.inputs.jump !== undefined && input.inputs.jump) {
      // 广播跳跃操作
      this.broadcast("playerAction", {
        sessionId: input.clientId,
        action: "jump",
        data: { jump: true }
      });
    }
  }

  /**
   * 更新游戏状态
   */
  private updateGameState(frame: number): void {
    // 更新游戏状态
    // 例如：物理更新、碰撞检测等
  }
}

