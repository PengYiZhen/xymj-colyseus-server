import Redis from 'ioredis';
import config from '../config';

class RedisClient {
  private client: Redis | null = null;
  private static instance: RedisClient;

  private constructor() {}

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * 连接 Redis
   */
  async connect(): Promise<void> {
    if (this.client && this.client.status === 'ready') {
      return;
    }

    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix,
      connectTimeout: config.redis.connectTimeout,
      lazyConnect: config.redis.lazyConnect,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      console.log('Redis 连接成功');
    });

    this.client.on('error', (err) => {
      console.error('Redis 连接错误:', err);
    });

    this.client.on('close', () => {
      console.log('Redis 连接已关闭');
    });

    if (!config.redis.lazyConnect) {
      await this.client.connect();
    }
  }

  /**
   * 获取 Redis 客户端
   */
  getClient(): Redis {
    if (!this.client) {
      throw new Error('Redis 客户端未初始化，请先调用 connect()');
    }
    return this.client;
  }

  /**
   * 关闭连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  /**
   * 设置键值对
   */
  async set(key: string, value: string | number | object, expireSeconds?: number): Promise<void> {
    const client = this.getClient();
    const val = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (expireSeconds) {
      await client.setex(key, expireSeconds, val);
    } else {
      await client.set(key, val);
    }
  }

  /**
   * 获取值
   */
  async get<T = string>(key: string): Promise<T | null> {
    const client = this.getClient();
    const value = await client.get(key);
    if (!value) {
      return null;
    }
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    const client = this.getClient();
    return await client.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const client = this.getClient();
    const result = await client.expire(key, seconds);
    return result === 1;
  }

  /**
   * 获取剩余过期时间（秒）
   */
  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  /**
   * 递增
   */
  async incr(key: string): Promise<number> {
    const client = this.getClient();
    return await client.incr(key);
  }

  /**
   * 递减
   */
  async decr(key: string): Promise<number> {
    const client = this.getClient();
    return await client.decr(key);
  }

  /**
   * 哈希表设置字段
   */
  async hset(key: string, field: string, value: string | number): Promise<number> {
    const client = this.getClient();
    return await client.hset(key, field, String(value));
  }

  /**
   * 哈希表获取字段
   */
  async hget(key: string, field: string): Promise<string | null> {
    const client = this.getClient();
    return await client.hget(key, field);
  }

  /**
   * 哈希表获取所有字段
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return await client.hgetall(key);
  }

  /**
   * 哈希表删除字段
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    const client = this.getClient();
    return await client.hdel(key, ...fields);
  }

  /**
   * 列表左推入
   */
  async lpush(key: string, ...values: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.lpush(key, ...values.map(String));
  }

  /**
   * 列表右推入
   */
  async rpush(key: string, ...values: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.rpush(key, ...values.map(String));
  }

  /**
   * 列表左弹出
   */
  async lpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.lpop(key);
  }

  /**
   * 列表右弹出
   */
  async rpop(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.rpop(key);
  }

  /**
   * 获取列表范围
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = this.getClient();
    return await client.lrange(key, start, stop);
  }

  /**
   * 集合添加成员
   */
  async sadd(key: string, ...members: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.sadd(key, ...members.map(String));
  }

  /**
   * 集合移除成员
   */
  async srem(key: string, ...members: (string | number)[]): Promise<number> {
    const client = this.getClient();
    return await client.srem(key, ...members.map(String));
  }

  /**
   * 集合获取所有成员
   */
  async smembers(key: string): Promise<string[]> {
    const client = this.getClient();
    return await client.smembers(key);
  }

  /**
   * 检查成员是否在集合中
   */
  async sismember(key: string, member: string | number): Promise<boolean> {
    const client = this.getClient();
    const result = await client.sismember(key, String(member));
    return result === 1;
  }
}

export default RedisClient;

