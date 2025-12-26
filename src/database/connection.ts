import { DataSource, DataSourceOptions } from 'typeorm';
import config from '../config';
import 'reflect-metadata';

let dataSource: DataSource | null = null;

/**
 * 创建数据库连接
 */
export async function createConnection(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  const options: DataSourceOptions = {
    type: config.database.type,
    host: config.database.host,
    port: config.database.port,
    username: config.database.username,
    password: config.database.password,
    database: config.database.database,
    synchronize: config.database.synchronize,
    logging: config.database.logging,
    entities: config.database.entities,
    migrations: config.database.migrations,
    subscribers: config.database.subscribers,
    extra: {
      charset: 'utf8mb4',
    },
  };

  dataSource = new DataSource(options);
  
  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');
    return dataSource;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
}

/**
 * 获取数据库连接
 */
export function getConnection(): DataSource {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('数据库连接未初始化，请先调用 createConnection()');
  }
  return dataSource;
}

/**
 * 关闭数据库连接
 */
export async function closeConnection(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
    console.log('✅ 数据库连接已关闭');
  }
}

/**
 * 数据库连接管理器
 */
export class DatabaseManager {
  private static instance: DatabaseManager;
  private connection: DataSource | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async connect(): Promise<void> {
    if (!this.connection || !this.connection.isInitialized) {
      this.connection = await createConnection();
    }
  }

  getConnection(): DataSource {
    if (!this.connection || !this.connection.isInitialized) {
      throw new Error('数据库连接未初始化');
    }
    return this.connection;
  }

  async disconnect(): Promise<void> {
    if (this.connection && this.connection.isInitialized) {
      await this.connection.destroy();
      this.connection = null;
    }
  }

  async runMigrations(): Promise<void> {
    const connection = this.getConnection();
    await connection.runMigrations();
  }

  async revertMigration(): Promise<void> {
    const connection = this.getConnection();
    await connection.undoLastMigration();
  }
}

export default DatabaseManager;

