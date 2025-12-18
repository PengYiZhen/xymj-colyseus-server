import { Request, Response, NextFunction } from 'express';
import JWTUtil from '../utils/jwt';

/**
 * JWT 认证中间件
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtil.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        message: '未提供认证令牌',
      });
      return;
    }

    const payload = JWTUtil.verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || '认证失败',
    });
  }
}

/**
 * 可选的认证中间件（不强制要求认证）
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = JWTUtil.extractTokenFromHeader(authHeader);

    if (token) {
      const payload = JWTUtil.verifyAccessToken(token);
      req.user = payload;
    }
    next();
  } catch (error) {
    // 忽略错误，继续执行
    next();
  }
}

