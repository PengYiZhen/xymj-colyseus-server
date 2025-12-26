import { JsonController, Get, Res } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Response } from 'express';
import appConfig from '../config';
import { ResponseUtil } from '../utils/response.util';
import { successResponse } from '../utils/swagger-responses.util';

@JsonController()
@OpenAPI({ tags: ['健康检查'] })
export class HealthController {
  /**
   * 健康检查
   */
  @Get('/health')
  @OpenAPI({
    summary: '健康检查',
    description: '检查服务运行状态',
    responses: {
      '200': successResponse(
        { $ref: '#/components/schemas/HealthResponse' },
        '服务运行正常'
      ),
    },
  })
  health(@Res() res: Response): Response {
    return ResponseUtil.success(
      res,
      {
        timestamp: new Date().toISOString(),
        version: appConfig.app.version,
      },
      '服务运行正常'
    );
  }
}

