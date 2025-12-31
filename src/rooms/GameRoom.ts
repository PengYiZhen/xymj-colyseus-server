import { Client } from "@colyseus/core";
import { FrameSyncRoom, ClientInput } from "../utils/FrameSync";
import { MyRoomState, Player } from "./schema/MyRoomState";
import { RequireAuth } from "../utils/decorators/RequireAuth";

/**
 * 游戏房间示例 - 使用帧同步
 */
export class GameRoom extends FrameSyncRoom<MyRoomState> {
  maxClients = 4;
  state = new MyRoomState();

  @RequireAuth()
  onCreate(options: any) {
    console.log("[GameRoom] 房间创建:", this.roomId);
   
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

  // @RequireAuth()
  onJoin(client: Client, options: any) {
    console.log(`[GameRoom] ${client.sessionId} 加入房间`);
    
    // 创建玩家并添加到状态
    const player = new Player();
    player.sessionId = client.sessionId;
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
    
    // 从状态中移除玩家
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

