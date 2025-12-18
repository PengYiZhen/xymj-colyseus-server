# 环境配置文件设置指南

## 概述

项目支持按环境加载不同的配置文件：
- `.env.development` - 开发环境配置
- `.env.production` - 生产环境配置
- `.env` - 默认配置（作为后备）

## 配置文件加载顺序

根据 `NODE_ENV` 环境变量，系统会按以下顺序加载配置：

1. 首先加载 `.env.{NODE_ENV}` 文件（如 `.env.development` 或 `.env.production`）
2. 如果环境特定文件不存在，则加载 `.env` 文件
3. 最后加载系统环境变量（优先级最高）

## 创建环境配置文件

### 开发环境配置

创建 `.env.development` 文件：

```bash
# Windows
copy env.example .env.development

# Linux/Mac
cp env.example .env.development
```

然后编辑 `.env.development`，设置开发环境特定的值：

```env
NODE_ENV=development
DB_DATABASE=strataggems_dev
DB_SYNCHRONIZE=true
DB_LOGGING=true
SWAGGER_ENABLED=true
REDIS_KEY_PREFIX=strataggems:dev:
```

### 生产环境配置

创建 `.env.production` 文件：

```bash
# Windows
copy env.example .env.production

# Linux/Mac
cp env.example .env.production
```

然后编辑 `.env.production`，设置生产环境特定的值：

```env
NODE_ENV=production
DB_DATABASE=strataggems
DB_SYNCHRONIZE=false
DB_LOGGING=false
SWAGGER_ENABLED=false
JWT_SECRET=<强随机字符串>
JWT_REFRESH_SECRET=<强随机字符串>
DB_PASSWORD=<生产环境数据库密码>
REDIS_PASSWORD=<生产环境 Redis 密码>
```

## 环境变量说明

### 开发环境推荐配置

```env
# 应用配置
NODE_ENV=development
PORT=2567

# 数据库配置
DB_SYNCHRONIZE=true    # 允许自动同步数据库结构
DB_LOGGING=true        # 启用 SQL 日志

# Swagger 配置
SWAGGER_ENABLED=true   # 启用 API 文档

# Redis 配置
REDIS_KEY_PREFIX=strataggems:dev:  # 使用不同的键前缀避免冲突
```

### 生产环境推荐配置

```env
# 应用配置
NODE_ENV=production
PORT=2567

# 数据库配置
DB_SYNCHRONIZE=false   # ⚠️ 必须设为 false，使用迁移管理
DB_LOGGING=false       # 关闭 SQL 日志提升性能

# Swagger 配置
SWAGGER_ENABLED=false  # 生产环境建议关闭或限制访问

# JWT 配置
# ⚠️ 必须使用强随机字符串
JWT_SECRET=<生成强随机字符串>
JWT_REFRESH_SECRET=<生成强随机字符串>
```

## 生成随机密钥

使用以下命令生成 JWT 密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 使用方式

### 开发环境

```bash
# 设置环境变量
set NODE_ENV=development  # Windows
export NODE_ENV=development  # Linux/Mac

# 或直接运行（tsx 会自动读取 .env.development）
npm run dev
```

### 生产环境

```bash
# 设置环境变量
set NODE_ENV=production  # Windows
export NODE_ENV=production  # Linux/Mac

# 构建并运行
npm run build
node build/index.js
```

## 注意事项

1. **不要提交敏感信息**：确保 `.env.development` 和 `.env.production` 已添加到 `.gitignore`
2. **密钥安全**：生产环境的 JWT 密钥必须使用强随机字符串
3. **数据库同步**：生产环境必须将 `DB_SYNCHRONIZE` 设为 `false`
4. **Swagger 文档**：生产环境建议关闭 Swagger 文档，或添加访问限制

## 配置文件示例

### .env.development 示例

```env
NODE_ENV=development
DB_DATABASE=strataggems_dev
DB_SYNCHRONIZE=true
DB_LOGGING=true
SWAGGER_ENABLED=true
REDIS_KEY_PREFIX=strataggems:dev:
```

### .env.production 示例

```env
NODE_ENV=production
DB_DATABASE=strataggems
DB_SYNCHRONIZE=false
DB_LOGGING=false
SWAGGER_ENABLED=false
JWT_SECRET=your-production-secret-here
JWT_REFRESH_SECRET=your-production-refresh-secret-here
```

