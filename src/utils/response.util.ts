import { Response } from 'express';

/**
 * 响应工具类（用于装饰器控制器）
 */
export class ResponseUtil {
  /**
   * 成功响应
   */
  static success<T>(res: Response, data?: T, message = '操作成功', statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * 错误响应
   */
  static error(res: Response, message = '操作失败', statusCode = 400): Response {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  /**
   * 分页响应
   */
  static paginate<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    pageSize: number,
    message = '获取成功'
  ): Response {
    return res.json({
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

