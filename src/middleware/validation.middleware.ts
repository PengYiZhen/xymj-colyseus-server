import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * 验证中间件工厂函数
 */
export function validateMiddleware(dtoClass: any, skipMissingProperties = false) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dto = plainToInstance(dtoClass, req.body);
    const errors: ValidationError[] = await validate(dto, {
      skipMissingProperties,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.map((error) => {
        return Object.values(error.constraints || {}).join(', ');
      });

      res.status(400).json({
        success: false,
        message: '验证失败',
        errors: messages,
      });
      return;
    }

    req.body = dto;
    next();
  };
}

