# 多人在线游戏服务端集成框架-xymj-colyseus-server

小游码匠-基于 Colyseus 的游戏服务器，集成了 MVC 架构、JWT 认证、TypeORM 数据库和 Redis 缓存。

![](./homepage.png)

## 功能特性

- ✅ **MVC 架构**：清晰的控制器、服务、模型分层
- ✅ **JWT 认证**：完整的令牌生成、验证和刷新机制
- ✅ **TypeORM**：强大的 ORM 数据库操作
- ✅ **Redis 缓存**：高性能缓存支持
- ✅ **数据验证**：基于 class-validator 的请求验证
- ✅ **错误处理**：统一的错误处理中间件
- ✅ **配置管理**：环境变量配置管理
- ✅ **Swagger 文档**：自动生成 API 文档

![帧同步](./framesync.png)
- 帧同步建议开多个浏览器窗口进行演示

## 项目结构

```
src/
├── config/           # 配置文件
│   └── index.ts      # 主配置文件
├── controllers/      # 控制器层
│   ├── BaseController.ts
│   └── AuthController.ts
├── services/         # 服务层
│   ├── BaseService.ts
│   └── AuthService.ts
├── models/           # 数据模型
│   ├── BaseEntity.ts
│   └── User.ts
├── dto/              # 数据传输对象
│   └── AuthDto.ts
├── middleware/       # 中间件
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   └── validation.middleware.ts
├── routes/           # 路由定义
│   └── index.ts
├── database/         # 数据库连接
│   └── connection.ts
├── utils/            # 工具类
│   ├── jwt.ts
│   └── redis.ts
├── rooms/            # Colyseus 房间
│   └── MyRoom.ts
├── app.config.ts     # 应用配置
└── index.ts          # 入口文件
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

**注意**：根据你使用的数据库类型，可能需要安装相应的数据库驱动：

- **MySQL/MariaDB**（默认）: `mysql2` ✅ 已包含
- **PostgreSQL**: `npm install pg`
- **SQLite**: `npm install sqlite3`
- **MongoDB**: `npm install mongodb`

### 2. 配置环境变量

**重要**：所有配置参数都应该在 `.env` 文件中设置，而不是硬编码在代码中。

复制 `env.example` 为 `.env` 并修改配置：

```bash
# Windows
copy env.example .env

# Linux/Mac
cp env.example .env
```

然后在 `.env` 文件中配置以下必需项：

**必需配置项**：
- **数据库配置**：`DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- **Redis 配置**：`REDIS_HOST`, `REDIS_PORT`（如果 Redis 有密码，设置 `REDIS_PASSWORD`）
- **JWT 配置**：`JWT_SECRET`, `JWT_REFRESH_SECRET`（⚠️ 生产环境必须修改为强随机字符串）

**可选配置项**：
- 应用配置：`APP_NAME`, `PORT`, `NODE_ENV`
- 数据库高级配置：`DB_SYNCHRONIZE`, `DB_LOGGING`
- Redis 高级配置：`REDIS_DB`, `REDIS_KEY_PREFIX`
- Colyseus 配置：`COLYSEUS_MAX_CLIENTS`, `COLYSEUS_PING_INTERVAL`

详细配置说明请参考 `env.example` 文件中的注释。

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

### 4. 访问 API 文档

启动服务后，访问 Swagger API 文档：

```
http://localhost:2567/api-docs
```

**注意**：Swagger 文档的启用状态由 `SWAGGER_ENABLED` 环境变量控制。

## API 使用示例

### 用户注册

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "nickname": "测试用户"
}
```

### 用户登录

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid",
      "username": "testuser",
      "email": "test@example.com"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### 获取当前用户信息

```bash
GET /api/auth/me
Authorization: Bearer <accessToken>
```

### 刷新令牌

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 核心功能说明

### JWT 认证

JWT 工具类提供了完整的令牌管理功能：

```typescript
import JWTUtil from './utils/jwt';

// 生成令牌对
const tokens = JWTUtil.generateTokenPair({
  userId: '123',
  username: 'testuser'
});

// 验证令牌
const payload = JWTUtil.verifyAccessToken(tokens.accessToken);
```

### TypeORM 使用

数据库连接和实体操作：

```typescript
import { getConnection } from './database/connection';
import { User } from './models/User';

const connection = getConnection();
const userRepository = connection.getRepository(User);

// 查询用户
const user = await userRepository.findOne({ where: { id: '123' } });
```

### Redis 缓存

Redis 工具类提供了丰富的缓存操作：

```typescript
import RedisClient from './utils/redis';

const redis = RedisClient.getInstance();
await redis.connect();

// 设置缓存
await redis.set('key', 'value', 3600); // 1小时过期

// 获取缓存
const value = await redis.get('key');

// 哈希操作
await redis.hset('user:123', 'name', 'test');
const name = await redis.hget('user:123', 'name');
```

### MVC 架构

#### 创建控制器

```typescript
import { BaseController } from './controllers/BaseController';

export class UserController extends BaseController {
  async getUsers(req: Request, res: Response) {
    // 业务逻辑
    this.success(res, data, '获取成功');
  }
}
```

#### 创建服务

```typescript
import { BaseService } from './services/BaseService';
import { User } from './models/User';

export class UserService extends BaseService<User> {
  protected repository = getConnection().getRepository(User);
  
  // 自定义业务方法
  async findByUsername(username: string) {
    return await this.repository.findOne({ where: { username } });
  }
}
```

## 环境变量说明

### 基础配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| APP_NAME | 应用名称 | strataggems-server |
| PORT | 服务端口 | 2567 |
| NODE_ENV | 环境模式 | development |
| APP_VERSION | 应用版本 | 1.0.0 |

### Swagger 配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| SWAGGER_ENABLED | 是否启用 Swagger | true |
| SWAGGER_PATH | Swagger 文档路径 | /api-docs |
| SWAGGER_TITLE | Swagger 文档标题 | 小游码匠 API 文档 |
| SWAGGER_SERVER_URL | API 服务器地址 | http://localhost:2567 |

### 其他配置

详细的环境变量说明请参考：
- `env.example` - 所有配置项示例
- `ENV_SETUP.md` - 环境配置文件设置指南
- `CONFIG.md` - 完整配置说明文档

## Swagger API 文档

项目集成了 Swagger，可以自动生成和展示 API 文档。

### 访问文档

启动服务后，访问：
```
http://localhost:2567/api-docs
```

### 配置说明

Swagger 相关配置在环境变量中设置：

```env
SWAGGER_ENABLED=true          # 是否启用
SWAGGER_PATH=/api-docs        # 文档路径
SWAGGER_TITLE=小游码匠 API 文档  # 文档标题
SWAGGER_SERVER_URL=http://localhost:2567  # API 服务器地址
```

### 使用建议

- **开发环境**：启用 Swagger 文档，方便 API 测试和文档查看
- **生产环境**：建议关闭 Swagger 文档，或添加访问限制

## 开发建议

1. **数据库迁移**：使用 TypeORM 的迁移功能管理数据库结构变更
2. **错误处理**：使用统一的错误处理中间件
3. **数据验证**：使用 DTO 和 class-validator 验证请求数据
4. **缓存策略**：合理使用 Redis 缓存提升性能
5. **安全配置**：生产环境务必修改 JWT_SECRET 和数据库密码
6. **API 文档**：使用 Swagger 注释保持 API 文档同步更新
7. **环境配置**：使用 `.env.development` 和 `.env.production` 管理不同环境配置

## 许可证

UNLICENSED
