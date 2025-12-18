import { Request, Response, NextFunction } from 'express';

/**
 * 错误处理中间件
 */
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('错误:', err);

  const statusCode = (err as any).statusCode || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 处理中间件
 */
export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `路由 ${req.method} ${req.path} 不存在`,
  });
}

