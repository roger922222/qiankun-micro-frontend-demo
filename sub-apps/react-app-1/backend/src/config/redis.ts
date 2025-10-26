import Redis from 'ioredis';
import { createClient } from 'redis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxmemoryPolicy?: string;
}

const defaultConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'user_management:',
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxmemoryPolicy: 'allkeys-lru',
};

class RedisManager {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private config: RedisConfig;

  constructor(config: RedisConfig = defaultConfig) {
    this.config = { ...defaultConfig, ...config };
  }

  async connect(): Promise<Redis> {
    if (this.client && this.isConnected) {
      return this.client;
    }

    try {
      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        enableReadyCheck: this.config.enableReadyCheck,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError: (err: Error) => {
          console.log('Redis重连错误:', err.message);
          return true;
        },
      });

      this.client.on('connect', () => {
        console.log('🚀 Redis客户端连接成功');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('✅ Redis客户端准备就绪');
        this.isConnected = true;
      });

      this.client.on('error', (error: Error) => {
        console.error('❌ Redis客户端错误:', error.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('🔌 Redis客户端连接关闭');
        this.isConnected = false;
      });

      // 测试连接
      await this.client.ping();
      
      return this.client;
    } catch (error) {
      console.error('Redis连接失败:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isReady()) {
        return false;
      }
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis健康检查失败:', error);
      return false;
    }
  }

  // 生成带前缀的键名
  createKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  // 缓存键模式
  getCacheKeyPattern(type: string, id?: string): string {
    if (id) {
      return this.createKey(`${type}:${id}`);
    }
    return this.createKey(`${type}:*`);
  }
}

// 创建单例实例
export const redisManager = new RedisManager();

// 便捷获取Redis客户端
export const getRedisClient = async (): Promise<Redis | null> => {
  try {
    const client = await redisManager.connect();
    return client;
  } catch (error) {
    console.error('获取Redis客户端失败:', error);
    return null;
  }
};

export default redisManager;