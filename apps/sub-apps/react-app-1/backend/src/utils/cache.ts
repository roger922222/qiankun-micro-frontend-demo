import { Redis } from 'ioredis';
import { getRedisClient } from '../config/redis';

export interface CacheOptions {
  ttl?: number; // 缓存时间（秒）
  key?: string; // 自定义缓存键
  condition?: (result: any) => boolean; // 缓存条件
  serialize?: (data: any) => string; // 序列化函数
  deserialize?: (data: string) => any; // 反序列化函数
}

const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  ttl: 300, // 默认5分钟
  condition: (result) => result !== null && result !== undefined,
  serialize: (data) => JSON.stringify(data),
  deserialize: (data) => JSON.parse(data),
};

export class CacheManager {
  private client: Redis | null = null;
  private defaultTTL: number;

  constructor(defaultTTL: number = 300) {
    this.defaultTTL = defaultTTL;
  }

  async initialize(): Promise<void> {
    this.client = await getRedisClient();
  }

  private async ensureClient(): Promise<Redis> {
    if (!this.client) {
      await this.initialize();
    }
    if (!this.client) {
      throw new Error('Redis客户端初始化失败');
    }
    return this.client;
  }

  // 生成缓存键
  private generateCacheKey(key: string): string {
    return `cache:${key}`;
  }

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.ensureClient();
      const cacheKey = this.generateCacheKey(key);
      const data = await client.get(cacheKey);
      
      if (data) {
        console.log(`✅ 缓存命中: ${cacheKey}`);
        return JSON.parse(data) as T;
      }
      
      console.log(`🔄 缓存未命中: ${cacheKey}`);
      return null;
    } catch (error) {
      console.error(`获取缓存失败: ${key}`, error);
      return null;
    }
  }

  // 设置缓存
  async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      const cacheKey = this.generateCacheKey(key);
      const cacheTTL = ttl || this.defaultTTL;
      
      const serializedValue = JSON.stringify(value);
      await client.setex(cacheKey, cacheTTL, serializedValue);
      
      console.log(`💾 缓存设置: ${cacheKey}, TTL: ${cacheTTL}s`);
      return true;
    } catch (error) {
      console.error(`设置缓存失败: ${key}`, error);
      return false;
    }
  }

  // 删除缓存
  async del(key: string): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      const cacheKey = this.generateCacheKey(key);
      const result = await client.del(cacheKey);
      
      console.log(`🗑️ 缓存删除: ${cacheKey}`);
      return result > 0;
    } catch (error) {
      console.error(`删除缓存失败: ${key}`, error);
      return false;
    }
  }

  // 批量删除缓存（支持通配符）
  async delPattern(pattern: string): Promise<number> {
    try {
      const client = await this.ensureClient();
      const cachePattern = this.generateCacheKey(pattern);
      
      // 获取所有匹配的键
      const keys = await client.keys(cachePattern);
      if (keys.length === 0) {
        return 0;
      }
      
      // 批量删除
      const result = await client.del(...keys);
      console.log(`🗑️ 批量删除缓存: ${keys.length} 个键`);
      
      return result;
    } catch (error) {
      console.error(`批量删除缓存失败: ${pattern}`, error);
      return 0;
    }
  }

  // 检查键是否存在
  async exists(key: string): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      const cacheKey = this.generateCacheKey(key);
      const result = await client.exists(cacheKey);
      
      return result === 1;
    } catch (error) {
      console.error(`检查缓存存在失败: ${key}`, error);
      return false;
    }
  }

  // 获取缓存TTL
  async ttl(key: string): Promise<number> {
    try {
      const client = await this.ensureClient();
      const cacheKey = this.generateCacheKey(key);
      const result = await client.ttl(cacheKey);
      
      return result;
    } catch (error) {
      console.error(`获取缓存TTL失败: ${key}`, error);
      return -2; // 键不存在
    }
  }

  // 缓存装饰器
  cache(options: CacheOptions = {}) {
    const opts = { ...DEFAULT_CACHE_OPTIONS, ...options };
    
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      const cacheKeyPrefix = `${target.constructor.name}:${propertyKey}`;
      
      descriptor.value = async function (...args: any[]) {
        const cacheKey = opts.key || `${cacheKeyPrefix}:${JSON.stringify(args)}`;
        
        try {
          // 尝试从缓存获取
          const cachedResult = await cacheManager.get(cacheKey);
          if (cachedResult !== null && cachedResult !== undefined) {
            console.log(`🎯 方法缓存命中: ${cacheKey}`);
            return cachedResult;
          }
          
          // 执行原方法
          const result = await originalMethod.apply(this, args);
          
          // 检查是否满足缓存条件
          if (opts.condition && opts.condition(result)) {
            await cacheManager.set(cacheKey, result, opts.ttl);
          }
          
          return result;
        } catch (error) {
          console.error(`缓存装饰器错误: ${cacheKey}`, error);
          // 如果缓存出错，直接返回原方法结果
          return originalMethod.apply(this, args);
        }
      };
      
      return descriptor;
    };
  }

  // 缓存清理装饰器
  cacheEvict(pattern: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const result = await originalMethod.apply(this, args);
        
        try {
          // 执行原方法后清理相关缓存
          const fullPattern = `cache:*:${pattern}:*`;
          await cacheManager.delPattern(fullPattern);
          console.log(`🧹 缓存清理: ${fullPattern}`);
        } catch (error) {
          console.error(`缓存清理错误: ${pattern}`, error);
        }
        
        return result;
      };
      
      return descriptor;
    };
  }
}

// 创建全局缓存管理器实例
export const cacheManager = new CacheManager();

export default CacheManager;