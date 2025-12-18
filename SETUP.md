# 项目设置指南

**数据库驱动说明**：
- 项目默认已包含 `mysql2`（MySQL/MariaDB 驱动）
- 如果使用其他数据库，需要安装相应驱动：
  - PostgreSQL: `npm install pg`
  - SQLite: `npm install sqlite3`
  - MongoDB: `npm install mongodb`

### 1. 配置环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
# 应用配置
APP_NAME=strataggems-server
PORT=2567
NODE_ENV=development

# JWT 配置（生产环境请修改）
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# 数据库配置
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=strataggems
DB_SYNCHRONIZE=true
DB_LOGGING=true

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm run build
node build/index.js
```

## 项目架构说明

### MVC 架构

- **Controllers** (`src/controllers/`): 处理 HTTP 请求和响应
- **Services** (`src/services/`): 业务逻辑层
- **Models** (`src/models/`): 数据模型（TypeORM 实体）
- **DTOs** (`src/dto/`): 数据传输对象，用于请求验证

### 中间件

- **auth.middleware.ts**: JWT 认证中间件
- **error.middleware.ts**: 统一错误处理
- **validation.middleware.ts**: 请求数据验证

### 工具类

- **JWTUtil** (`src/utils/jwt.ts`): JWT 令牌生成和验证
- **RedisClient** (`src/utils/redis.ts`): Redis 缓存操作

### 数据库

- **TypeORM**: ORM 框架
- **BaseEntity**: 所有实体的基类，包含通用字段（id, createdAt, updatedAt 等）

## 使用示例

### 创建新的控制器

```typescript
// src/controllers/UserController.ts
import { Request, Response } from 'express';
import { BaseController } from './BaseController';
import { UserService } from '../services/UserService';

export class UserController extends BaseController {
  private userService = new UserService();

  async getUsers(req: Request, res: Response) {
    const { page = 1, pageSize = 10 } = req.query;
    const result = await this.userService.paginate(
      Number(page),
      Number(pageSize)
    );
    this.paginate(res, result.data, result.total, result.page, result.pageSize);
  }
}
```

### 创建新的服务

```typescript
// src/services/UserService.ts
import { BaseService } from './BaseService';
import { User } from '../models/User';
import { getConnection } from '../database/connection';

export class UserService extends BaseService<User> {
  protected repository = getConnection().getRepository(User);

  async findByUsername(username: string) {
    return await this.repository.findOne({ where: { username } });
  }
}
```

### 使用 Redis 缓存

```typescript
import RedisClient from '../utils/redis';

const redis = RedisClient.getInstance();
await redis.connect();

// 设置缓存（1小时过期）
await redis.set('user:123', JSON.stringify(userData), 3600);

// 获取缓存
const cached = await redis.get('user:123');
```

### 使用 JWT 认证

```typescript
import JWTUtil from '../utils/jwt';

// 生成令牌
const tokens = JWTUtil.generateTokenPair({
  userId: user.id,
  username: user.username
});

// 验证令牌
const payload = JWTUtil.verifyAccessToken(token);
```

## 注意事项

1. **数据库连接**: 确保在 `beforeListen` 中初始化数据库连接
2. **Redis 连接**: Redis 连接失败不会阻止服务器启动，但会记录错误
3. **环境变量**: 生产环境务必修改 JWT_SECRET 和数据库密码
4. **类型安全**: 使用 TypeScript 类型定义确保类型安全

