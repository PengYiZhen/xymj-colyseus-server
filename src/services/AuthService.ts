import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { getConnection } from '../database/connection';
import { User } from '../models/User';
import JWTUtil, { TokenPair } from '../utils/jwt';
import RedisClient from '../utils/redis';
import { LoginDto, RegisterDto } from '../dto/AuthDto'; 

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

    // 将刷新令牌存储到 Redis
    await this.redis.set(
      `refresh_token:${savedUser.id}`,
      tokens.refreshToken,
      7 * 24 * 60 * 60 // 7天
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
      select: ['id', 'username', 'email', 'password', 'nickname', 'avatar', 'status'],
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

    // 将刷新令牌存储到 Redis
    await this.redis.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      7 * 24 * 60 * 60 // 7天
    );

    // 移除密码字段
    delete (user as any).password;

    return {
      user,
      tokens,
    };
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

    // 更新 Redis 中的刷新令牌
    await this.redis.set(
      `refresh_token:${payload.userId}`,
      newTokens.refreshToken,
      7 * 24 * 60 * 60 // 7天
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
  }
}

