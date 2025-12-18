import { Request, Response } from 'express';

/**
 * 基础控制器类
 */
export abstract class BaseController {
  /**
   * 成功响应
   */
  protected success<T>(res: Response, data?: T, message = '操作成功', statusCode = 200): void {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * 错误响应
   */
  protected error(res: Response, message = '操作失败', statusCode = 400): void {
    res.status(statusCode).json({
      success: false,
      message,
    });
  }

  /**
   * 分页响应
   */
  protected paginate<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    message = '获取成功'
  ): void {
    res.json({
      success: true,
      message,
      data: {
        list: data,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  }
}

