# 配置说明文档

## 概述

本项目使用环境变量（`.env` 文件）来管理所有配置参数。**所有配置都应该在 `.env` 文件中设置，而不是硬编码在代码中**。

## 配置文件位置

- **配置示例文件**：`env.example` - 包含所有可用的配置项和说明
- **实际配置文件**：`.env` - 你的实际配置（此文件不应提交到 Git）

## 快速开始

1. 复制示例文件：
   ```bash
   # Windows
   copy env.example .env
   
   # Linux/Mac
   cp env.example .env
   ```

2. 编辑 `.env` 文件，根据你的环境修改配置值

3. 重启应用使配置生效

## 配置项说明

### 应用配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `APP_NAME` | 应用名称 | `strataggems-server` | 否 |
| `PORT` | 服务端口 | `2567` | 否 |
| `NODE_ENV` | 环境模式 (`development`, `production`, `test`) | `development` | 否 |
| `APP_VERSION` | 应用版本 | `1.0.0` | 否 |

### JWT 配置 ⚠️

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `JWT_SECRET` | JWT 访问令牌密钥 | `your-secret-key-change-in-production` | **是**（生产环境） |
| `JWT_EXPIRES_IN` | 访问令牌过期时间 | `24h` | 否 |
| `JWT_REFRESH_SECRET` | JWT 刷新令牌密钥 | `your-refresh-secret-key` | **是**（生产环境） |
| `JWT_REFRESH_EXPIRES_IN` | 刷新令牌过期时间 | `7d` | 否 |

**重要**：
- 生产环境**必须**修改 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`
- 建议使用强随机字符串（至少 32 个字符）
- 可以使用以下命令生成随机密钥：
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

### 数据库配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `DB_TYPE` | 数据库类型 (`mysql`, `postgres`, `sqlite`, `mariadb`) | `mysql` | 否 |
| `DB_HOST` | 数据库主机地址 | `localhost` | **是** |
| `DB_PORT` | 数据库端口 | `3306` | **是** |
| `DB_USERNAME` | 数据库用户名 | `root` | **是** |
| `DB_PASSWORD` | 数据库密码 | （空） | **是** |
| `DB_DATABASE` | 数据库名称 | `strataggems` | **是** |
| `DB_SYNCHRONIZE` | 是否自动同步数据库结构 | `true` | 否 |
| `DB_LOGGING` | 是否启用 SQL 日志 | `true` | 否 |

**重要提示**：
- 生产环境建议将 `DB_SYNCHRONIZE` 设为 `false`，使用数据库迁移来管理结构变更
- 开发环境可以设为 `true` 以便自动创建表结构
- 确保数据库已创建（如果不存在，需要手动创建）

### Redis 配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `REDIS_HOST` | Redis 主机地址 | `localhost` | **是** |
| `REDIS_PORT` | Redis 端口 | `6379` | **是** |
| `REDIS_PASSWORD` | Redis 密码 | （空） | 否 |
| `REDIS_DB` | Redis 数据库编号 (0-15) | `0` | 否 |
| `REDIS_KEY_PREFIX` | Redis 键前缀 | `strataggems:` | 否 |
| `REDIS_CONNECT_TIMEOUT` | 连接超时时间（毫秒） | `10000` | 否 |
| `REDIS_LAZY_CONNECT` | 是否延迟连接 | `false` | 否 |

### Colyseus 配置

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `COLYSEUS_MAX_CLIENTS` | 最大客户端连接数 | `100` | 否 |
| `COLYSEUS_PING_INTERVAL` | 心跳检测间隔（毫秒） | `3000` | 否 |
| `COLYSEUS_PING_MAX_RETRIES` | 心跳最大重试次数 | `3` | 否 |

## 环境特定配置

### 开发环境

```env
NODE_ENV=development
DB_SYNCHRONIZE=true
DB_LOGGING=true
```

### 生产环境

```env
NODE_ENV=production
DB_SYNCHRONIZE=false
DB_LOGGING=false
JWT_SECRET=<强随机字符串>
JWT_REFRESH_SECRET=<强随机字符串>
```

## 配置验证

启动应用时，检查控制台输出：
- ✅ "数据库连接成功" - 数据库配置正确
- ✅ "Redis 连接成功" - Redis 配置正确
- ❌ 如果出现连接错误，请检查相应的配置项

## 常见问题

### Q: 如何知道哪些配置是必需的？

A: 查看 `env.example` 文件，所有必需项都有注释说明。通常数据库和 Redis 的连接信息是必需的。

### Q: 配置修改后需要重启吗？

A: 是的，修改 `.env` 文件后需要重启应用才能生效。

### Q: 可以在代码中直接修改配置吗？

A: **不推荐**。所有配置都应该通过环境变量管理，这样便于不同环境的部署和管理。

### Q: 如何保护敏感配置（如密码）？

A: 
1. 确保 `.env` 文件已添加到 `.gitignore`
2. 生产环境使用环境变量或密钥管理服务
3. 不要将 `.env` 文件提交到版本控制系统

## 配置优先级

配置的读取优先级（从高到低）：
1. 系统环境变量
2. `.env` 文件中的配置
3. 代码中的默认值（仅用于开发环境）

