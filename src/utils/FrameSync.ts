import { Room } from "@colyseus/core";

/**
 * 帧同步配置
 */
export interface FrameSyncConfig {
  /** 目标帧率（FPS） */
  targetFPS: number;
  /** 是否启用帧同步 */
  enabled: boolean;
  /** 最大帧延迟（毫秒） */
  maxFrameDelay: number;
  /** 是否记录帧数据（用于回放） */
  recordFrames: boolean;
}

/**
 * 客户端输入数据
 */
export interface ClientInput {
  clientId: string;
  frame: number;
  inputs: any;
  timestamp: number;
}

/**
 * 帧数据
 */
export interface FrameData {
  frame: number;
  timestamp: number;
  inputs: ClientInput[];
  state?: any;
}

/**
 * 帧同步管理器
 * 用于管理多人游戏的帧同步逻辑
 */
export class FrameSyncManager {
  private room: Room;
  private config: FrameSyncConfig;
  private frameInterval: NodeJS.Timeout | null = null;
  private currentFrame: number = 0;
  private frameStartTime: number = 0;
  private frameData: FrameData[] = [];
  private pendingInputs: Map<string, ClientInput> = new Map();
  private isRunning: boolean = false;

  constructor(room: Room, config: Partial<FrameSyncConfig> = {}) {
    this.room = room;
    this.config = {
      targetFPS: config.targetFPS || 20, // 默认 20 FPS
      enabled: config.enabled !== false,
      maxFrameDelay: config.maxFrameDelay || 100,
      recordFrames: config.recordFrames || false,
    };
  }

  /**
   * 启动帧同步
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.currentFrame = 0;
    this.frameStartTime = Date.now();
    const frameInterval = 1000 / this.config.targetFPS;

    this.frameInterval = setInterval(() => {
      this.tick();
    }, frameInterval);

    console.log(`[FrameSync] 帧同步已启动，目标帧率: ${this.config.targetFPS} FPS`);
  }

  /**
   * 停止帧同步
   */
  stop(): void {
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    this.isRunning = false;
    console.log(`[FrameSync] 帧同步已停止`);
  }

  /**
   * 处理客户端输入
   */
  handleClientInput(clientId: string, inputs: any, frame?: number): void {
    const input: ClientInput = {
      clientId,
      frame: frame || this.currentFrame,
      inputs,
      timestamp: Date.now(),
    };

    // 存储待处理的输入
    this.pendingInputs.set(clientId, input);
  }

  /**
   * 获取当前帧号
   */
  getCurrentFrame(): number {
    return this.currentFrame;
  }

  /**
   * 获取帧数据
   */
  getFrameData(frame: number): FrameData | undefined {
    return this.frameData.find((f) => f.frame === frame);
  }

  /**
   * 获取所有帧数据（用于回放）
   */
  getAllFrameData(): FrameData[] {
    return [...this.frameData];
  }

  /**
   * 清除帧数据
   */
  clearFrameData(): void {
    this.frameData = [];
  }

  /**
   * 帧更新回调（由子类实现）
   */
  onFrameUpdate(frame: number, inputs: ClientInput[]): void {
    // 子类可以重写此方法来实现游戏逻辑
  }

  /**
   * 帧同步回调（由子类实现）
   */
  onFrameSync(frame: number, frameData: FrameData): void {
    // 子类可以重写此方法来同步状态到客户端
  }

  /**
   * 每帧执行
   */
  private tick(): void {
    const now = Date.now();
    const frameDelay = now - this.frameStartTime;

    // 检查帧延迟
    if (frameDelay > this.config.maxFrameDelay) {
      console.warn(
        `[FrameSync] 帧延迟过高: ${frameDelay}ms (目标: ${1000 / this.config.targetFPS}ms)`
      );
    }

    // 收集所有待处理的输入
    const inputs: ClientInput[] = Array.from(this.pendingInputs.values());
    this.pendingInputs.clear();

    // 创建帧数据
    const frameData: FrameData = {
      frame: this.currentFrame,
      timestamp: now,
      inputs,
    };

    // 记录帧数据（如果启用）
    if (this.config.recordFrames) {
      this.frameData.push(frameData);
      // 限制帧数据数量，避免内存溢出
      if (this.frameData.length > 1000) {
        this.frameData.shift();
      }
    }

    // 调用帧更新回调
    this.onFrameUpdate(this.currentFrame, inputs);

    // 调用帧同步回调
    this.onFrameSync(this.currentFrame, frameData);

    // 更新帧号和时间
    this.currentFrame++;
    this.frameStartTime = now;
  }

  /**
   * 获取配置
   */
  getConfig(): FrameSyncConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<FrameSyncConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果帧率改变，重启帧同步
    if (this.isRunning && config.targetFPS) {
      this.stop();
      this.start();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    currentFrame: number;
    isRunning: boolean;
    targetFPS: number;
    frameDataCount: number;
    pendingInputsCount: number;
  } {
    return {
      currentFrame: this.currentFrame,
      isRunning: this.isRunning,
      targetFPS: this.config.targetFPS,
      frameDataCount: this.frameData.length,
      pendingInputsCount: this.pendingInputs.size,
    };
  }
}

/**
 * 帧同步房间基类
 * 提供帧同步功能的房间基类
 */
export abstract class FrameSyncRoom<T extends object> extends Room<T> {
  protected frameSync: FrameSyncManager;

  abstract onCreate(options: any): void;
  abstract onJoin(client: any, options: any): void;
  abstract onLeave(client: any, consented: boolean): void;
  abstract onDispose(): void;

  /**
   * 初始化帧同步
   */
  protected initFrameSync(config?: Partial<FrameSyncConfig>): void {
    this.frameSync = new FrameSyncManager(this, config);
    
    // 重写帧同步回调
    this.frameSync.onFrameUpdate = (frame: number, inputs: ClientInput[]) => {
      this.onFrameUpdate(frame, inputs);
    };

    this.frameSync.onFrameSync = (frame: number, frameData: FrameData) => {
      this.onFrameSync(frame, frameData);
    };

    // 监听客户端输入消息
    this.onMessage("input", (client, message) => {
      this.frameSync.handleClientInput(client.sessionId, message.inputs, message.frame);
    });
  }

  /**
   * 帧更新回调（子类实现）
   */
  protected onFrameUpdate(frame: number, inputs: ClientInput[]): void {
    // 子类实现游戏逻辑
  }

  /**
   * 帧同步回调（子类实现）
   */
  protected onFrameSync(frame: number, frameData: FrameData): void {
    // 子类实现状态同步
    // 例如：this.state.frame = frame;
  }

  /**
   * 启动帧同步
   */
  protected startFrameSync(): void {
    this.frameSync?.start();
  }

  /**
   * 停止帧同步
   */
  protected stopFrameSync(): void {
    this.frameSync?.stop();
  }
}

export default FrameSyncManager;

