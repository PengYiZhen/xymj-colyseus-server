import { Client } from "@colyseus/core";
import JWTUtil, { TokenPayload } from "../jwt";
import RedisClient from "../redis";

/**
 * 认证错误类
 */
export class AuthenticationError extends Error {
  constructor(message: string = "授权失败") {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * 需要认证的装饰器
 * 用于验证JWT token是否与Redis中存储的token一致
 * 
 * 使用方式：
//  * @RequireAuth()
 * onJoin(client: Client, options: any) {
 *   // options.token 应该包含JWT token
 * }
 */
export function RequireAuth() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const redis = RedisClient.getInstance();

    descriptor.value = async function (...args: any[]) {
      // 对于onJoin，第一个参数是client，第二个是options
      // 对于onCreate，第一个参数是options
      let options: any;
      let client: Client | undefined;

      // 检查第一个参数是否是Client对象（通过检查是否有sessionId属性）
      if (args[0] && typeof args[0] === 'object' && 'sessionId' in args[0]) {
        // 这是onJoin方法
        client = args[0] as Client;
        options = args[1];
      } else {
        // 这是onCreate方法
        options = args[0];
      }

      // 从options中获取token
      const token = options?.token || options?.accessToken;

      if (!token) {
        throw new AuthenticationError("未提供认证令牌");
      }

      try {
        // 验证JWT token
        const payload: TokenPayload = JWTUtil.verifyAccessToken(token);

        // 从Redis中获取存储的accessToken进行对比
        const storedAccessToken = await redis.get<string>(
          `access_token:${payload.userId}`
        );

        // 如果Redis中存储了accessToken，则必须完全匹配
        if (storedAccessToken) {
          if (storedAccessToken !== token) {
            throw new AuthenticationError("令牌不匹配，授权失败");
          }
        } else {
          // 如果Redis中没有accessToken，检查是否有refreshToken（表示用户已登录）
          const storedRefreshToken = await redis.get<string>(
            `refresh_token:${payload.userId}`
          );
          if (!storedRefreshToken) {
            throw new AuthenticationError("令牌已过期或无效，授权失败");
          }
        }

        // 将用户信息附加到options中，方便后续使用
        options.userId = payload.userId;
        options.username = payload.username;
        options.email = payload.email;
        options.tokenPayload = payload;

        // 调用原始方法
        return await originalMethod.apply(this, args);
      } catch (error: any) {
        if (error instanceof AuthenticationError) {
          throw error;
        }
        // JWT验证失败
        throw new AuthenticationError(error.message || "授权失败");
      }
    };

    return descriptor;
  };
}

