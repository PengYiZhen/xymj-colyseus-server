import { JsonController, Post, Get, Body, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto/AuthDto';
import { AuthMiddleware, createValidationMiddleware } from '../middleware/decorator.middleware';
import { ResponseUtil } from '../utils/response.util';
import { successResponse, errorResponse } from '../utils/swagger-responses.util';

@JsonController('/auth')
@OpenAPI({ tags: ['认证'] })
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * 用户注册
   */
  @Post('/register')
  @UseBefore(createValidationMiddleware(RegisterDto))
  @OpenAPI({
    summary: '用户注册',
    description: '注册新用户账户',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/RegisterRequest',
          },
        },
      },
    },
    responses: {
      '201': successResponse(
        { $ref: '#/components/schemas/AuthResponse' },
        '注册成功'
      ),
      ...errorResponse(400, '注册失败'),
    },
  })
  async register(@Body({ type: RegisterDto }) body: RegisterDto, @Res() res: Response): Promise<Response> {
    try {
      const result = await this.authService.register(body);
      return ResponseUtil.success(res, result, '注册成功', 201);
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 400);
    }
  }

  /**
   * 用户登录
   */
  @Post('/login')
  @UseBefore(createValidationMiddleware(LoginDto))
  @OpenAPI({
    summary: '用户登录',
    description: '用户登录获取访问令牌',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/LoginRequest',
          },
        },
      },
    },
    responses: {
      '200': successResponse(
        { $ref: '#/components/schemas/AuthResponse' },
        '登录成功'
      ),
      ...errorResponse(401, '登录失败'),
    },
  })
  async login(@Body({ type: LoginDto }) body: LoginDto, @Res() res: Response): Promise<Response> {
    try {
      const result = await this.authService.login(body);
      return ResponseUtil.success(res, result, '登录成功');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 401);
    }
  }

  /**
   * 刷新令牌
   */
  @Post('/refresh')
  @UseBefore(createValidationMiddleware(RefreshTokenDto))
  @OpenAPI({
    summary: '刷新令牌',
    description: '使用刷新令牌获取新的访问令牌',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/RefreshTokenRequest',
          },
        },
      },
    },
    responses: {
      '200': successResponse(
        { $ref: '#/components/schemas/TokenPair' },
        '刷新成功'
      ),
      ...errorResponse(401, '刷新失败'),
    },
  })
  async refreshToken(
    @Body({ type: RefreshTokenDto }) body: RefreshTokenDto,
    @Res() res: Response
  ): Promise<Response> {
    try {
      const result = await this.authService.refreshToken(body.refreshToken);
      return ResponseUtil.success(res, result, '刷新令牌成功');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 401);
    }
  }

  /**
   * 获取当前用户信息
   */
  @Get('/me')
  @UseBefore(AuthMiddleware)
  @OpenAPI({
    summary: '获取当前用户信息',
    description: '获取当前登录用户的信息（需要认证）',
    security: [{ bearerAuth: [] }],
    responses: {
      '200': successResponse(
        { $ref: '#/components/schemas/User' },
        '获取成功'
      ),
      ...errorResponse(401, '未认证'),
      ...errorResponse(404, '用户不存在'),
    },
  })
  async getCurrentUser(@Req() req: Request, @Res() res: Response): Promise<Response> {
    try {
      if (!req.user) {
        return ResponseUtil.error(res, '未认证', 401);
      }
      const result = await this.authService.getUserById(req.user.userId as string);
      return ResponseUtil.success(res, result, '获取成功');
    } catch (error: any) {
      return ResponseUtil.error(res, error.message, 404);
    }
  }
}

