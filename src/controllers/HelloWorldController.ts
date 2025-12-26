import { JsonController, Post, Get, Body, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { LoginDto, RegisterDto, RefreshTokenDto } from '../dto/AuthDto';
import { AuthMiddleware, createValidationMiddleware } from '../middleware/decorator.middleware';
import { ResponseUtil } from '../utils/response.util';


@JsonController('/hl')
@OpenAPI({ tags: ['Hello World'] })
export class HelloWorldController {
  @Get('/hello')
  @OpenAPI({
    summary: 'Hello World', 
    description: 'Hello World',
  })
  helloWorld(@Res() res: Response): Response {
    return ResponseUtil.success(res, { 
        name: "小游码匠",
        age: 300,
        email: "xiaoyoumajiang@gmail.com",
        phone: "123456789012",
        address: "四川成都",
    }, "操作成功！");
  }
}