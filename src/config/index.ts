import dotenv from 'dotenv';
import path from 'path';

// 根据 NODE_ENV 加载对应的环境变量文件
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envFilePath = path.resolve(process.cwd(), envFile);

// 先加载环境特定的配置文件
dotenv.config({ path: envFilePath });

// 如果环境特定文件不存在，则加载默认的 .env 文件
if (env !== 'development') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
}

// 最后加载默认的 .env 文件（作为后备）
dotenv.config();

export interface AppConfig {
  // 应用配置
  app: {
    name: string;
    port: number;
    env: string;
    version: string;
  };
  
  // JWT 配置
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  
  // 数据库配置
  database: {
    type: 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mongodb';
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
    entities: string[];
    migrations: string[];
    subscribers: string[];
  };
  
  // Redis 配置
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
    connectTimeout: number;
    lazyConnect: boolean;
  };
  
  // Colyseus 配置
  colyseus: {
    maxClients: number;
    pingInterval: number;
    pingMaxRetries: number;
  };
  
  // Swagger 配置
  swagger: {
    enabled: boolean;
    path: string;
    title: string;
    version: string;
    description: string;
    contact: {
      name?: string;
      email?: string;
      url?: string;
    };
    servers: Array<{
      url: string;
      description: string;
    }>;
  };
}

/**
 * 应用配置
 * 
 * 所有配置参数都从环境变量中读取，默认值仅用于开发环境
 * 生产环境请务必在 .env 文件中设置所有必需的配置项
 * 
 * 配置优先级：
 * 1. 环境变量（.env 文件或系统环境变量）
 * 2. 代码中的默认值（仅用于开发环境）
 */
const config: AppConfig = {
  // 应用基础配置
  app: {
    name: process.env.APP_NAME || 'strataggems-server',
    port: parseInt(process.env.PORT || '2567', 10),
    env: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
  },
  
  // JWT 认证配置
  // ⚠️ 生产环境必须修改 JWT_SECRET 和 JWT_REFRESH_SECRET
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // 数据库配置
  // ⚠️ 生产环境建议将 DB_SYNCHRONIZE 设为 false，使用迁移管理数据库结构
  database: {
    type: (process.env.DB_TYPE as any) || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'strataggems',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
    entities: [
      process.env.DB_ENTITIES || 'src/entities/**/*.ts',
      'src/models/**/*.ts',
    ],
    migrations: [
      process.env.DB_MIGRATIONS || 'src/migrations/**/*.ts',
    ],
    subscribers: [
      process.env.DB_SUBSCRIBERS || 'src/subscribers/**/*.ts',
    ],
  },
  
  // Redis 缓存配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'strataggems:',
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
    lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
  },
  
  // Colyseus 游戏服务器配置
  colyseus: {
    maxClients: parseInt(process.env.COLYSEUS_MAX_CLIENTS || '100', 10),
    pingInterval: parseInt(process.env.COLYSEUS_PING_INTERVAL || '3000', 10),
    pingMaxRetries: parseInt(process.env.COLYSEUS_PING_MAX_RETRIES || '3', 10),
  },
  
  // Swagger API 文档配置
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH || '/api-docs',
    title: process.env.SWAGGER_TITLE || '小游码匠 API 文档',
    version: process.env.SWAGGER_VERSION || (process.env.APP_VERSION || '1.0.0'),
    description: process.env.SWAGGER_DESCRIPTION || '多人在线游戏服务端框架 API 文档',
    contact: {
      name: process.env.SWAGGER_CONTACT_NAME,
      email: process.env.SWAGGER_CONTACT_EMAIL,
      url: process.env.SWAGGER_CONTACT_URL,
    },
    servers: [
      {
        url: process.env.SWAGGER_SERVER_URL || `http://localhost:${parseInt(process.env.PORT || '2567', 10)}`,
        description: process.env.SWAGGER_SERVER_DESCRIPTION || '本地开发服务器',
      },
    ],
  },
};

export default config;

