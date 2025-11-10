/**
 * 限流中间件 - 防止事件洪泛攻击和滥用
 * 提供基于令牌桶和滑动窗口的限流机制
 */

import { BaseEvent } from '../../types/events';
import { EventMiddleware, MiddlewareInterceptor } from './event-middleware';

// ==================== 限流策略类型定义 ====================

export interface RateLimitConfig {
  /**
   * 时间窗口（毫秒）
   */
  windowMs: number;
  
  /**
   * 最大请求数
   */
  maxRequests: number;
  
  /**
   * 限流键生成函数
   */
  keyGenerator?: (event: BaseEvent) => string;
  
  /**
   * 是否跳过限流检查
   */
  skip?: (event: BaseEvent) => boolean;
  
  /**
   * 限流触发时的处理
   */
  onLimitReached?: (key: string, event: BaseEvent) => void;
  
  /**
   * 限流算法
   */
  algorithm?: 'sliding-window' | 'token-bucket' | 'fixed-window';
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

// ==================== 限流存储接口 ====================

export interface RateLimitStorage {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, entry: RateLimitEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// ==================== 内存限流存储 ====================

export class MemoryRateLimitStorage implements RateLimitStorage {
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: any;

  constructor(cleanupIntervalMs: number = 60000) {
    // 定期清理过期条目
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.storage.get(key);
    
    // 检查是否过期
    if (entry && Date.now() > entry.resetTime) {
      this.storage.delete(key);
      return null;
    }
    
    return entry || null;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.storage.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetTime) {
        this.storage.delete(key);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.storage.clear();
  }
}

// ==================== 限流算法实现 ====================

export abstract class RateLimitAlgorithm {
  protected config: RateLimitConfig;
  protected storage: RateLimitStorage;

  constructor(config: RateLimitConfig, storage: RateLimitStorage) {
    this.config = config;
    this.storage = storage;
  }

  abstract checkLimit(key: string, event: BaseEvent): Promise<RateLimitResult>;
}

// ==================== 滑动窗口算法 ====================

export class SlidingWindowAlgorithm extends RateLimitAlgorithm {
  async checkLimit(key: string, _event: BaseEvent): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = await this.storage.get(key);

    if (!entry) {
      // 首次请求
      await this.storage.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }

    // 检查窗口是否已过期
    if (now >= entry.resetTime) {
      // 重置窗口
      await this.storage.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequest: now
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs
      };
    }

    // 检查是否超过限制
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: entry.resetTime - now
      };
    }

    // 增加计数
    await this.storage.set(key, {
      ...entry,
      count: entry.count + 1
    });

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count - 1,
      resetTime: entry.resetTime
    };
  }
}

// ==================== 令牌桶算法 ====================

export class TokenBucketAlgorithm extends RateLimitAlgorithm {
  private bucketSize: number;
  private refillRate: number; // 每秒补充的令牌数

  constructor(config: RateLimitConfig, storage: RateLimitStorage) {
    super(config, storage);
    this.bucketSize = config.maxRequests;
    this.refillRate = config.maxRequests / (config.windowMs / 1000);
  }

  async checkLimit(key: string, _event: BaseEvent): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = await this.storage.get(key);

    let tokens: number;
    let lastRefill: number;

    if (!entry) {
      // 初始化桶
      tokens = this.bucketSize;
      lastRefill = now;
    } else {
      // 计算需要补充的令牌
      const timePassed = (now - entry.firstRequest) / 1000;
      const tokensToAdd = Math.floor(timePassed * this.refillRate);
      tokens = Math.min(this.bucketSize, entry.count + tokensToAdd);
      lastRefill = now;
    }

    // 检查是否有足够的令牌
    if (tokens < 1) {
      const timeToNextToken = (1 / this.refillRate) * 1000;
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + timeToNextToken,
        retryAfter: timeToNextToken
      };
    }

    // 消费一个令牌
    tokens -= 1;

    // 更新存储
    await this.storage.set(key, {
      count: tokens,
      resetTime: now + this.config.windowMs,
      firstRequest: lastRefill
    });

    return {
      allowed: true,
      remaining: tokens,
      resetTime: now + this.config.windowMs
    };
  }
}

// ==================== 固定窗口算法 ====================

export class FixedWindowAlgorithm extends RateLimitAlgorithm {
  async checkLimit(key: string, _event: BaseEvent): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const windowEnd = windowStart + this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;

    const entry = await this.storage.get(windowKey);

    if (!entry) {
      // 新窗口
      await this.storage.set(windowKey, {
        count: 1,
        resetTime: windowEnd,
        firstRequest: now
      });

      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: windowEnd
      };
    }

    // 检查是否超过限制
    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: windowEnd,
        retryAfter: windowEnd - now
      };
    }

    // 增加计数
    await this.storage.set(windowKey, {
      ...entry,
      count: entry.count + 1
    });

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count - 1,
      resetTime: windowEnd
    };
  }
}

// ==================== 限流中间件 ====================

export interface RateLimitMiddlewareOptions {
  configs?: Map<string, RateLimitConfig>;
  defaultConfig?: RateLimitConfig;
  storage?: RateLimitStorage;
  debug?: boolean;
}

export class RateLimitMiddleware implements EventMiddleware {
  public readonly name = 'rate-limit';
  public readonly priority = 30; // 在权限检查之后

  private configs: Map<string, RateLimitConfig>;
  private defaultConfig: RateLimitConfig;
  private storage: RateLimitStorage;
  private algorithms: Map<string, RateLimitAlgorithm> = new Map();
  private debug: boolean;

  constructor(options: RateLimitMiddlewareOptions = {}) {
    this.configs = options.configs || new Map();
    this.defaultConfig = options.defaultConfig || {
      windowMs: 60000, // 1分钟
      maxRequests: 100,
      algorithm: 'sliding-window'
    };
    this.storage = options.storage || new MemoryRateLimitStorage();
    this.debug = options.debug || false;

    this.initializeAlgorithms();
  }

  private initializeAlgorithms(): void {
    // 为每个配置创建对应的算法实例
    for (const [eventType, config] of this.configs.entries()) {
      this.algorithms.set(eventType, this.createAlgorithm(config));
    }

    // 创建默认算法
    this.algorithms.set('default', this.createAlgorithm(this.defaultConfig));
  }

  private createAlgorithm(config: RateLimitConfig): RateLimitAlgorithm {
    switch (config.algorithm) {
      case 'token-bucket':
        return new TokenBucketAlgorithm(config, this.storage);
      case 'fixed-window':
        return new FixedWindowAlgorithm(config, this.storage);
      case 'sliding-window':
      default:
        return new SlidingWindowAlgorithm(config, this.storage);
    }
  }

  async process<T extends BaseEvent>(event: T, next: (event: T) => Promise<void>): Promise<void> {
    // 获取事件对应的配置
    const config = this.configs.get(event.type) || this.defaultConfig;

    // 检查是否跳过限流
    if (config.skip && config.skip(event)) {
      if (this.debug) {
        console.log(`[RateLimitMiddleware] Skipping rate limit for event: ${event.type}`);
      }
      await next(event);
      return;
    }

    // 生成限流键
    const key = config.keyGenerator ? config.keyGenerator(event) : this.defaultKeyGenerator(event);

    // 获取对应的算法
    const algorithm = this.algorithms.get(event.type) || this.algorithms.get('default')!;

    if (this.debug) {
      console.log(`[RateLimitMiddleware] Checking rate limit for key: ${key}, event: ${event.type}`);
    }

    // 执行限流检查
    const result = await algorithm.checkLimit(key, event);

    if (!result.allowed) {
      if (this.debug) {
        console.warn(`[RateLimitMiddleware] Rate limit exceeded for key: ${key}, retry after: ${result.retryAfter}ms`);
      }

      // 调用限流触发回调
      if (config.onLimitReached) {
        config.onLimitReached(key, event);
      }

      // 抛出限流错误
      throw new MiddlewareInterceptor(
        `Rate limit exceeded. Retry after ${result.retryAfter}ms`,
        this.name
      );
    }

    if (this.debug) {
      console.log(`[RateLimitMiddleware] Rate limit check passed for key: ${key}, remaining: ${result.remaining}`);
    }

    // 限流检查通过，继续执行
    await next(event);
  }

  /**
   * 默认键生成器
   */
  private defaultKeyGenerator(event: BaseEvent): string {
    return `${event.type}:${event.source}`;
  }

  /**
   * 添加限流配置
   */
  addConfig(eventType: string, config: RateLimitConfig): void {
    this.configs.set(eventType, config);
    this.algorithms.set(eventType, this.createAlgorithm(config));
  }

  /**
   * 移除限流配置
   */
  removeConfig(eventType: string): void {
    this.configs.delete(eventType);
    this.algorithms.delete(eventType);
  }

  /**
   * 获取限流状态
   */
  async getRateLimitStatus(eventType: string, key: string): Promise<RateLimitResult | null> {
    const algorithm = this.algorithms.get(eventType) || this.algorithms.get('default');
    if (!algorithm) {
      return null;
    }

    // 创建临时事件对象用于检查
    const tempEvent: BaseEvent = {
      type: eventType,
      source: 'rate-limit-check',
      timestamp: new Date().toISOString(),
      id: `rate-check-${Date.now()}`
    };

    return await algorithm.checkLimit(key, tempEvent);
  }

  /**
   * 清除限流记录
   */
  async clearRateLimitData(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * 获取限流统计
   */
  getConfigs(): Map<string, RateLimitConfig> {
    return new Map(this.configs);
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建限流中间件
 */
export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions = {}): RateLimitMiddleware {
  return new RateLimitMiddleware(options);
}

/**
 * 创建基础限流配置
 */
export function createBasicRateLimitConfig(): Map<string, RateLimitConfig> {
  const configs = new Map<string, RateLimitConfig>();

  // 用户相关事件 - 较严格限制
  configs.set('USER_LOGIN', {
    windowMs: 60000, // 1分钟
    maxRequests: 5,
    algorithm: 'sliding-window',
    keyGenerator: (event) => `user-login:${event.source}`
  });

  configs.set('USER_LOGOUT', {
    windowMs: 60000,
    maxRequests: 10,
    algorithm: 'sliding-window'
  });

  // 数据更新事件 - 中等限制
  configs.set('DATA_UPDATE', {
    windowMs: 60000,
    maxRequests: 50,
    algorithm: 'token-bucket',
    keyGenerator: (event) => `data-update:${event.source}`
  });

  // 通知事件 - 较宽松限制
  configs.set('NOTIFICATION', {
    windowMs: 60000,
    maxRequests: 100,
    algorithm: 'sliding-window'
  });

  // 主题切换 - 宽松限制
  configs.set('THEME_CHANGE', {
    windowMs: 60000,
    maxRequests: 20,
    algorithm: 'fixed-window'
  });

  return configs;
}

/**
 * 创建开发环境限流中间件
 */
export function createDevRateLimitMiddleware(): RateLimitMiddleware {
  return new RateLimitMiddleware({
    debug: true,
    defaultConfig: {
      windowMs: 60000,
      maxRequests: 1000, // 开发环境较宽松
      algorithm: 'sliding-window',
      skip: () => true // 开发环境跳过大部分限流
    }
  });
}

/**
 * 创建生产环境限流中间件
 */
export function createProdRateLimitMiddleware(): RateLimitMiddleware {
  return new RateLimitMiddleware({
    configs: createBasicRateLimitConfig(),
    defaultConfig: {
      windowMs: 60000,
      maxRequests: 100,
      algorithm: 'sliding-window'
    },
    debug: false
  });
}

// ==================== 导出 ====================
// 所有导出已在上面通过 export 关键字直接声明，无需重复导出