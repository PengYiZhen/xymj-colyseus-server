import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { AuthService } from '../services/AuthService';
import { validateMiddleware } from '../middleware/validation.middleware';
import { LoginDto, RegisterDto } from '../dto/AuthDto';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super();
    this.authService = new AuthService();
  }

  /**
   * 用户注册
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      this.success(res, result, '注册成功', 201);
    } catch (error: any) {
      this.error(res, error.message, 400);
    }
  };

  /**
   * 用户登录
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      this.success(res, result, '登录成功');
    } catch (error: any) {
      this.error(res, error.message, 401);
    }
  };

  /**
   * 刷新令牌
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      this.success(res, result, '刷新令牌成功');
    } catch (error: any) {
      this.error(res, error.message, 401);
    }
  };

  /**
   * 获取当前用户信息
   */
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        this.error(res, '未认证', 401);
        return;
      }
      const result = await this.authService.getUserById(req.user.userId as string);
      this.success(res, result, '获取成功');
    } catch (error: any) {
      this.error(res, error.message, 404);
    }
  };

  /**
   * 验证中间件
   */
  static validateRegister = validateMiddleware(RegisterDto);
  static validateLogin = validateMiddleware(LoginDto);
}

