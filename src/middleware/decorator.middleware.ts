import { ExpressMiddlewareInterface } from 'routing-controllers';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware as expressAuthMiddleware } from './auth.middleware';
import { validateMiddleware } from './validation.middleware';

/**
 * 认证中间件适配器（用于 routing-controllers）
 */
export class AuthMiddleware implements ExpressMiddlewareInterface {
  use(req: Request, res: Response, next: NextFunction): void {
    expressAuthMiddleware(req, res, next);
  }
}

/**
 * 验证中间件适配器工厂函数
 */
export function createValidationMiddleware(dtoClass: any) {
  class ValidationMiddleware implements ExpressMiddlewareInterface {
    use(req: Request, res: Response, next: NextFunction): Promise<void> {
      return validateMiddleware(dtoClass)(req, res, next);
    }
  }
  return ValidationMiddleware;
}

