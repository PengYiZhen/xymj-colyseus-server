import swaggerJsdoc from 'swagger-jsdoc';
import { SwaggerDefinition } from 'swagger-jsdoc';
import appConfig from './index';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: appConfig.swagger.title,
    version: appConfig.swagger.version,
    description: appConfig.swagger.description,
    contact: appConfig.swagger.contact.name || appConfig.swagger.contact.email || appConfig.swagger.contact.url
      ? {
          name: appConfig.swagger.contact.name,
          email: appConfig.swagger.contact.email,
          url: appConfig.swagger.contact.url,
        }
      : undefined,
  },
  servers: appConfig.swagger.servers,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '输入 JWT 令牌，格式：Bearer {token}',
      },
    },
    schemas: {
      // 通用响应结构
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: '操作成功',
          },
          data: {
            type: 'object',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: '操作失败',
          },
          errors: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
      // 用户相关模型
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          username: {
            type: 'string',
            example: 'testuser',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'test@example.com',
          },
          nickname: {
            type: 'string',
            nullable: true,
            example: '测试用户',
          },
          avatar: {
            type: 'string',
            nullable: true,
            example: 'https://example.com/avatar.jpg',
          },
          status: {
            type: 'integer',
            example: 1,
            description: '状态：0-禁用，1-启用',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      // 注册请求
      RegisterRequest: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 50,
            example: 'testuser',
            description: '用户名（3-50个字符）',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'test@example.com',
            description: '邮箱地址',
          },
          password: {
            type: 'string',
            minLength: 6,
            maxLength: 100,
            example: 'password123',
            description: '密码（至少6个字符）',
          },
          nickname: {
            type: 'string',
            maxLength: 100,
            example: '测试用户',
            description: '昵称（可选）',
          },
        },
      },
      // 登录请求
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: {
            type: 'string',
            example: 'testuser',
            description: '用户名或邮箱',
          },
          password: {
            type: 'string',
            minLength: 6,
            example: 'password123',
            description: '密码',
          },
        },
      },
      // 刷新令牌请求
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            description: '刷新令牌',
          },
        },
      },
      // 令牌响应
      TokenPair: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            description: '访问令牌',
          },
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            description: '刷新令牌',
          },
        },
      },
      // 登录/注册响应
      AuthResponse: {
        type: 'object',
        properties: {
          user: {
            $ref: '#/components/schemas/User',
          },
          tokens: {
            $ref: '#/components/schemas/TokenPair',
          },
        },
      },
    },
  },
  tags: [
    {
      name: '认证',
      description: '用户认证相关接口',
    },
    {
      name: '健康检查',
      description: '服务健康检查接口',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;

