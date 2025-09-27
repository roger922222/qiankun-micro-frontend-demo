import { CachedData, CacheConfig } from '../types/common';

// 缓存管理器
export class CacheManager {
  private static cache = new Map<string, CachedData<any>>();
  private static defaultTTL = 5 * 60 * 1000; // 5分钟默认缓存时间

  // 设置缓存
  static set<T>(key: string, data: T, ttl?: number): void {
    const config: CacheConfig = {
      key,
      ttl: ttl || this.defaultTTL,
      timestamp: Date.now(),
    };

    const cachedData: CachedData<T> = {
      data,
      config,
    };

    this.cache.set(key, cachedData);
  }

  // 获取缓存
  static get<T>(key: string): T | null {
    const cachedData = this.cache.get(key);
    
    if (!cachedData) {
      return null;
    }

    // 检查是否过期
    if (this.isExpired(cachedData.config)) {
      this.cache.delete(key);
      return null;
    }

    return cachedData.data as T;
  }

  // 检查缓存是否存在且未过期
  static has(key: string): boolean {
    const cachedData = this.cache.get(key);
    
    if (!cachedData) {
      return false;
    }

    if (this.isExpired(cachedData.config)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // 删除缓存
  static delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // 清空所有缓存
  static clear(): void {
    this.cache.clear();
  }

  // 清理过期缓存
  static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((cachedData, key) => {
      if (this.isExpired(cachedData.config)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // 获取缓存统计信息
  static getStats(): {
    size: number;
    keys: string[];
    totalMemory: number;
    expiredCount: number;
  } {
    let totalMemory = 0;
    let expiredCount = 0;
    const keys: string[] = [];

    this.cache.forEach((cachedData, key) => {
      keys.push(key);
      totalMemory += JSON.stringify(cachedData.data).length;
      
      if (this.isExpired(cachedData.config)) {
        expiredCount++;
      }
    });

    return {
      size: this.cache.size,
      keys,
      totalMemory,
      expiredCount,
    };
  }

  // 检查是否过期
  private static isExpired(config: CacheConfig): boolean {
    return Date.now() - config.timestamp > config.ttl;
  }

  // 设置默认TTL
  static setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  // 获取缓存剩余时间
  static getRemainingTTL(key: string): number {
    const cachedData = this.cache.get(key);
    
    if (!cachedData) {
      return 0;
    }

    const remaining = cachedData.config.ttl - (Date.now() - cachedData.config.timestamp);
    return Math.max(0, remaining);
  }

  // 刷新缓存（重置时间戳）
  static refresh(key: string): boolean {
    const cachedData = this.cache.get(key);
    
    if (!cachedData) {
      return false;
    }

    cachedData.config.timestamp = Date.now();
    return true;
  }
}

// 智能缓存装饰器
export function cached(ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;
      
      // 尝试从缓存获取
      const cachedResult = CacheManager.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);
      
      // 缓存结果
      CacheManager.set(cacheKey, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}

// 缓存策略枚举
export enum CacheStrategy {
  CACHE_FIRST = 'cache-first',
  NETWORK_FIRST = 'network-first',
  CACHE_ONLY = 'cache-only',
  NETWORK_ONLY = 'network-only',
}

// 智能缓存类
export class SmartCache {
  private strategy: CacheStrategy;
  private ttl: number;

  constructor(strategy: CacheStrategy = CacheStrategy.CACHE_FIRST, ttl: number = 5 * 60 * 1000) {
    this.strategy = strategy;
    this.ttl = ttl;
  }

  // 执行带缓存的异步操作
  async execute<T>(
    key: string,
    networkFn: () => Promise<T>,
    options?: {
      strategy?: CacheStrategy;
      ttl?: number;
      forceRefresh?: boolean;
    }
  ): Promise<T> {
    const strategy = options?.strategy || this.strategy;
    const ttl = options?.ttl || this.ttl;
    const forceRefresh = options?.forceRefresh || false;

    switch (strategy) {
      case CacheStrategy.CACHE_FIRST:
        return this.cacheFirst(key, networkFn, ttl, forceRefresh);
      
      case CacheStrategy.NETWORK_FIRST:
        return this.networkFirst(key, networkFn, ttl);
      
      case CacheStrategy.CACHE_ONLY:
        return this.cacheOnly(key);
      
      case CacheStrategy.NETWORK_ONLY:
        return this.networkOnly(networkFn);
      
      default:
        return this.cacheFirst(key, networkFn, ttl, forceRefresh);
    }
  }

  private async cacheFirst<T>(
    key: string,
    networkFn: () => Promise<T>,
    ttl: number,
    forceRefresh: boolean
  ): Promise<T> {
    if (!forceRefresh) {
      const cached = CacheManager.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    const result = await networkFn();
    CacheManager.set(key, result, ttl);
    return result;
  }

  private async networkFirst<T>(
    key: string,
    networkFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      const result = await networkFn();
      CacheManager.set(key, result, ttl);
      return result;
    } catch (error) {
      const cached = CacheManager.get<T>(key);
      if (cached !== null) {
        console.warn('Network failed, falling back to cache:', error);
        return cached;
      }
      throw error;
    }
  }

  private async cacheOnly<T>(key: string): Promise<T> {
    const cached = CacheManager.get<T>(key);
    if (cached === null) {
      throw new Error(`No cached data found for key: ${key}`);
    }
    return cached;
  }

  private async networkOnly<T>(networkFn: () => Promise<T>): Promise<T> {
    return networkFn();
  }
}

// 批量缓存操作
export class BatchCache {
  private operations: Array<() => Promise<void>> = [];

  // 添加缓存操作
  add<T>(key: string, dataFn: () => Promise<T>, ttl?: number): BatchCache {
    this.operations.push(async () => {
      const data = await dataFn();
      CacheManager.set(key, data, ttl);
    });
    return this;
  }

  // 执行所有缓存操作
  async execute(): Promise<void> {
    await Promise.all(this.operations.map(op => op()));
    this.operations = [];
  }

  // 清空操作队列
  clear(): void {
    this.operations = [];
  }
}

// 定期清理任务
export class CacheCleanupTask {
  private intervalId: NodeJS.Timeout | null = null;
  private interval: number;

  constructor(interval: number = 10 * 60 * 1000) { // 默认10分钟清理一次
    this.interval = interval;
  }

  // 启动定期清理
  start(): void {
    if (this.intervalId) {
      this.stop();
    }

    this.intervalId = setInterval(() => {
      CacheManager.cleanup();
    }, this.interval);
  }

  // 停止定期清理
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 设置清理间隔
  setInterval(interval: number): void {
    this.interval = interval;
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
}

// 创建全局清理任务实例
export const cacheCleanupTask = new CacheCleanupTask();