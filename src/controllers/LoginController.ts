import { JsonController, Post, Get, Body, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto/AuthDto';
import { AuthMiddleware, createValidationMiddleware } from '../middleware/decorator.middleware';
import { ResponseUtil } from '../utils/response.util';
import { AccessTokenAndLoginService } from '../services/AccessTokenAndLoginService';


@JsonController('/minigame')
@OpenAPI({ tags: ['小游戏登录相关'] })
export class LoginController {

  private accessTokenAndLoginService: AccessTokenAndLoginService;

  constructor() {
    this.accessTokenAndLoginService = new AccessTokenAndLoginService();
  }
  /**
   * @抖音
   * @param res 
   * @returns 
   */
  @Get('/douyin/access_token')
  @OpenAPI({
    summary: '抖音小游戏令牌', 
    description: '获取抖音小游戏令牌',
  })
  async douyinAccessToken(@Res() res: Response): Promise<Response> {

    const accessToken = await this.accessTokenAndLoginService.getDouYinAccessToken();
    return ResponseUtil.success(res, accessToken, "操作成功！");
  }
  /**
   * @抖音
   * @param res 
   * @returns 
   */
  @Get('/douyin/login')
  @OpenAPI({
    summary: '抖音小游戏登录', 
    description: '抖音小游戏登录',
  })
  async douyinLogin(@Req() req: Request, @Res() res: Response): Promise<Response> {
    // 获取抖音登录用户信息
    // 数据库逻辑自己写
    // 如果想post方法就将req.query 改为 req.body
    const douyinLoginInfo = await this.accessTokenAndLoginService.getDouYinLoginUserInfoOpenid(req.query.code as string, req.query.anonymous_code as string);
    return ResponseUtil.success(res, douyinLoginInfo, "操作成功！");
  }
  /**
   * @微信
   * @param res 
   * @returns 
   */
  @Get('/weixin/access_token')
  @OpenAPI({
    summary: '微信小游戏令牌', 
    description: '获取微信小游戏令牌',
  })
  async weixinAccessToken(@Res() res: Response): Promise<Response> {

    const accessToken = await this.accessTokenAndLoginService.getWeixinAccessToken();
    return ResponseUtil.success(res, accessToken, "操作成功！");
  }
  /**
   * @抖音
   * @param res 
   * @returns 
   */
  @Get('/weixin/login')
  @OpenAPI({
    summary: '微信小游戏登录', 
    description: '微信小游戏登录',
  })
  async weixinLogin(@Req() req: Request, @Res() res: Response): Promise<Response> {

    const weixinLoginInfo = await this.accessTokenAndLoginService.getWeixinLoginUserInfoOpenid(req.query.jsCode as string);
    return ResponseUtil.success(res, weixinLoginInfo, "操作成功！");
  }
}