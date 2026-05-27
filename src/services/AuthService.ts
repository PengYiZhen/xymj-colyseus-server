import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { getConnection } from '../database/connection';
import { User } from '../models/User';
import JWTUtil, { TokenPair } from '../utils/jwt';
import RedisClient from '../utils/redis';
import { LoginDto, RegisterDto } from '../dto/AuthDto';
import config from '../config';
import { parseExpiresInToSeconds } from '../utils/parseExpiresIn';

export class AuthService {
  private get userRepository(): Repository<User> {
    const connection = getConnection();
    return connection.getRepository(User);
  }

  private get redis(): RedisClient {
    return RedisClient.getInstance();
  }

  /**
   * 用户注册
   */
  async register(dto: RegisterDto): Promise<{ user: User; tokens: TokenPair }> {
    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });

    if (existingUser) {
      throw new Error('用户名或邮箱已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 创建用户
    const user = this.userRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      nickname: dto.nickname,
      status: 1,
    });

    const savedUser = await this.userRepository.save(user);

    // 生成令牌
    const tokens = JWTUtil.generateTokenPair({
      userId: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
    });

    const refreshTokenExpire = parseExpiresInToSeconds(config.jwt.refreshExpiresIn);
    const accessTokenExpire = parseExpiresInToSeconds(config.jwt.expiresIn);

    await this.redis.set(
      `refresh_token:${savedUser.id}`,
      tokens.refreshToken,
      refreshTokenExpire
    );

    // 将访问令牌存储到 Redis（用于房间连接验证）
    await this.redis.set(
      `access_token:${savedUser.id}`,
      tokens.accessToken,
      accessTokenExpire // 与JWT过期时间一致
    );

    // 移除密码字段
    delete (savedUser as any).password;

    return {
      user: savedUser,
      tokens,
    };
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto): Promise<{ user: User; tokens: TokenPair }> {
    // 查找用户（包含密码字段）
    const user = await this.userRepository.findOne({
      where: [{ username: dto.username }, { email: dto.username }],
      select: [
        'id',
        'username',
        'email',
        'password',
        'nickname',
        'avatar',
        'openid',
        'guildId',
        'status',
      ],
    });

    if (!user) {
      throw new Error('用户名或密码错误');
    }

    if (user.status === 0) {
      throw new Error('账户已被禁用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new Error('用户名或密码错误');
    }

    // 生成令牌
    const tokens = JWTUtil.generateTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    const refreshTokenExpire = parseExpiresInToSeconds(config.jwt.refreshExpiresIn);
    const accessTokenExpire = parseExpiresInToSeconds(config.jwt.expiresIn);

    await this.redis.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      refreshTokenExpire
    );

    // 将访问令牌存储到 Redis（用于房间连接验证）
    await this.redis.set(
      `access_token:${user.id}`,
      tokens.accessToken,
      accessTokenExpire // 与JWT过期时间一致
    );

    // 移除密码字段
    delete (user as any).password;

    return {
      user,
      tokens,
    };
  }

  /**
   * 微信/抖音小游戏：按平台侧 openid（或匿名 id）查找或创建用户。
   * 返回的实体未查询 password 字段。
   */
  async findOrCreateMinigameUser(params: {
    openid: string;
    platform: 'weixin' | 'douyin';
  }): Promise<User> {
    const { openid, platform } = params;
    if (!openid) {
      throw new Error('openid 不能为空');
    }

    const existing = await this.userRepository.findOne({
      where: { openid },
      select: [
        'id',
        'username',
        'email',
        'nickname',
        'avatar',
        'openid',
        'guildId',
        'status',
        'createdAt',
        'updatedAt',
        'version',
      ],
    });
    if (existing) {
      return existing;
    }

    const randomSuffix = randomUUID().replace(/-/g, '').slice(0, 16);
    const username = `mg_${platform}_${randomSuffix}`.slice(0, 64);
    const email = `${platform}_${randomUUID()}@minigame.local`;
    const hashedPassword = await bcrypt.hash(randomUUID(), 10);

    const created = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      openid,
      status: 1,
    });
    await this.userRepository.save(created);

    const saved = await this.userRepository.findOne({
      where: { id: created.id },
      select: [
        'id',
        'username',
        'email',
        'nickname',
        'avatar',
        'openid',
        'guildId',
        'status',
        'createdAt',
        'updatedAt',
        'version',
      ],
    });
    if (!saved) {
      throw new Error('创建小游戏用户失败');
    }
    return saved;
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // 验证刷新令牌
    const payload = JWTUtil.verifyRefreshToken(refreshToken);

    // 检查 Redis 中的刷新令牌
    const storedToken = await this.redis.get<string>(`refresh_token:${payload.userId}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw new Error('无效的刷新令牌');
    }

    // 生成新的令牌对
    const newTokens = JWTUtil.generateTokenPair({
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
    });

    const refreshTokenExpire = parseExpiresInToSeconds(config.jwt.refreshExpiresIn);
    const accessTokenExpire = parseExpiresInToSeconds(config.jwt.expiresIn);

    await this.redis.set(
      `refresh_token:${payload.userId}`,
      newTokens.refreshToken,
      refreshTokenExpire
    );

    // 更新 Redis 中的访问令牌
    await this.redis.set(
      `access_token:${payload.userId}`,
      newTokens.accessToken,
      accessTokenExpire // 与JWT过期时间一致
    );

    return newTokens;
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return user;
  }

  /**
   * 登出
   */
  async logout(userId: string): Promise<void> {
    await this.redis.del(`refresh_token:${userId}`);
    await this.redis.del(`access_token:${userId}`);
  }
}

