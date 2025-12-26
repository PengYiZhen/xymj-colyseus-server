/**
 * Swagger 响应工具类
 * 用于简化 OpenAPI 装饰器中的响应定义
 */

/**
 * 创建成功响应（带数据）
 */
export function successResponse(dataSchema: any, description = '操作成功') {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: '#/components/schemas/SuccessResponse' },
            {
              type: 'object',
              properties: {
                data: dataSchema,
              },
            },
          ],
        },
      },
    },
  };
}

/**
 * 创建成功响应（无数据）
 */
export function successResponseOnly(description = '操作成功') {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/SuccessResponse',
        },
      },
    },
  };
}

/**
 * 创建错误响应
 */
export function errorResponse(statusCode: number, description = '操作失败') {
  return {
    [statusCode]: {
      description,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/ErrorResponse',
          },
        },
      },
    },
  };
}

/**
 * 创建健康检查响应
 */
export function healthResponse() {
  return {
    '200': successResponse({
      type: 'object',
      properties: {
        timestamp: {
          type: 'string',
          format: 'date-time',
        },
        version: {
          type: 'string',
          example: '1.0.0',
        },
      },
    }, '服务运行正常'),
  };
}

