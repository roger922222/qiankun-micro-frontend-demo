import Redis from 'ioredis';
import { promisify } from 'util';

// Redis连接配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxmemoryPolicy: 'allkeys-lru',
  lazyConnect: true,
};

// 创建Redis客户端
export const redis = new Redis(redisConfig);

// 缓存配置
export const CACHE_CONFIG = {
  // 缓存时间（秒）
  TTL: {
    PRODUCT_LIST: 300,      // 5分钟
    PRODUCT_DETAIL: 600,    // 10分钟
    PRODUCT_STATS: 900,     // 15分钟
    CATEGORY_LIST: 1800,    // 30分钟
    SEARCH_RESULTS: 180,    // 3分钟
    HEALTH_CHECK: 60,       // 1分钟
  },
  
  // 缓存键前缀
  PREFIX: {
    PRODUCT: 'product:',
    CATEGORY: 'category:',
    STATS: 'stats:',
    SEARCH: 'search:',
    HEALTH: 'health:',
    METRICS: 'metrics:',
  },
  
  // 缓存策略
  STRATEGY: {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  },
};

// 缓存键生成器
export class CacheKeyGenerator {
  static productList(filter: any, page: number, pageSize: number): string {
    const filterHash = Buffer.from(JSON.stringify(filter)).toString('base64');
    return `${CACHE_CONFIG.PREFIX.PRODUCT}list:${filterHash}:${page}:${pageSize}`;
  }
  
  static productDetail(id: string): string {
    return `${CACHE_CONFIG.PREFIX.PRODUCT}detail:${id}`;
  }
  
  static productStats(): string {
    return `${CACHE_CONFIG.PREFIX.STATS}products`;
  }
  
  static categoryList(): string {
    return `${CACHE_CONFIG.PREFIX.CATEGORY}list`;
  }
  
  static searchResults(keyword: string, filters: any): string {
    const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `${CACHE_CONFIG.PREFIX.SEARCH}${keyword}:${filterHash}`;
  }
  
  static healthCheck(): string {
    return `${CACHE_CONFIG.PREFIX.HEALTH}status`;
  }
  
  static metrics(endpoint: string, method: string): string {
    return `${CACHE_CONFIG.PREFIX.METRICS}${method}:${endpoint}`;
  }
}

// 缓存包装器
export class CacheWrapper {
  /**
   * 获取缓存数据
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`获取缓存失败 [${key}]:`, error);
      return null;
    }
  }
  
  /**
   * 设置缓存数据
   */
  static async set<T>(key: string, value: T, ttl: number = CACHE_CONFIG.TTL.PRODUCT_LIST): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`设置缓存失败 [${key}]:`, error);
    }
  }
  
  /**
   * 删除缓存
   */
  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`删除缓存失败 [${key}]:`, error);
    }
  }
  
  /**
   * 批量删除缓存（模式匹配）
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`批量删除缓存失败 [${pattern}]:`, error);
    }
  }
  
  /**
   * 检查键是否存在
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`检查缓存存在失败 [${key}]:`, error);
      return false;
    }
  }
  
  /**
   * 获取缓存TTL
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error(`获取缓存TTL失败 [${key}]:`, error);
      return -1;
    }
  }
  
  /**
   * 原子递增
   */
  static async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await redis.incr(key);
      if (ttl && result === 1) {
        await redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error(`缓存递增失败 [${key}]:`, error);
      return 0;
    }
  }
  
  /**
   * 原子递减
   */
  static async decr(key: string): Promise<number> {
    try {
      return await redis.decr(key);
    } catch (error) {
      console.error(`缓存递减失败 [${key}]:`, error);
      return 0;
    }
  }
}

// 缓存策略实现
export class CacheStrategy {
  /**
   * Cache-First 策略
   * 先查缓存，缓存没有再查数据库并更新缓存
   */
  static async cacheFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_CONFIG.TTL.PRODUCT_LIST
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = await CacheWrapper.get<T>(key);
    if (cached !== null) {
      console.log(`🎯 缓存命中: ${key}`);
      return cached;
    }
    
    // 缓存没有，从数据库获取
    console.log(`🔄 缓存未命中，从数据库获取: ${key}`);
    const data = await fetcher();
    
    // 更新缓存
    await CacheWrapper.set(key, data, ttl);
    console.log(`💾 缓存已更新: ${key}`);
    
    return data;
  }
  
  /**
   * Network-First 策略
   * 先查数据库，失败时回退到缓存
   */
  static async networkFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_CONFIG.TTL.PRODUCT_DETAIL
  ): Promise<T> {
    try {
      // 从数据库获取最新数据
      const data = await fetcher();
      
      // 更新缓存
      await CacheWrapper.set(key, data, ttl);
      console.log(`🔄 网络优先，缓存已更新: ${key}`);
      
      return data;
    } catch (error) {
      console.error(`❌ 数据库获取失败，尝试缓存回退: ${key}`, error);
      
      // 数据库失败，回退到缓存
      const cached = await CacheWrapper.get<T>(key);
      if (cached !== null) {
        console.log(`🎯 缓存回退成功: ${key}`);
        return cached;
      }
      
      // 缓存也没有，抛出错误
      throw new Error('数据库和缓存都不可用');
    }
  }
  
  /**
   * Stale-While-Revalidate 策略
   * 返回缓存数据（如果有），同时在后台更新缓存
   */
  static async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_CONFIG.TTL.PRODUCT_LIST
  ): Promise<T> {
    const cached = await CacheWrapper.get<T>(key);
    
    if (cached !== null) {
      // 有缓存，先返回缓存数据
      console.log(`🎯 返回缓存数据，后台更新: ${key}`);
      
      // 后台异步更新缓存
      fetcher().then(async (data) => {
        await CacheWrapper.set(key, data, ttl);
        console.log(`🔄 后台缓存更新完成: ${key}`);
      }).catch(error => {
        console.error(`❌ 后台缓存更新失败: ${key}`, error);
      });
      
      return cached;
    }
    
    // 没有缓存，必须等待数据库
    console.log(`🔄 无缓存，同步获取数据: ${key}`);
    const data = await fetcher();
    await CacheWrapper.set(key, data, ttl);
    return data;
  }
}

// 缓存失效策略
export class CacheInvalidator {
  /**
   * 商品相关缓存失效
   */
  static async invalidateProduct(productId: string): Promise<void> {
    const keys = [
      CacheKeyGenerator.productDetail(productId),
      CacheKeyGenerator.productStats(),
    ];
    
    // 删除具体商品缓存
    await Promise.all(keys.map(key => CacheWrapper.del(key)));
    
    // 删除商品列表缓存（模式匹配）
    await CacheWrapper.delPattern(`${CACHE_CONFIG.PREFIX.PRODUCT}list:*`);
    
    console.log(`🗑️ 商品缓存失效完成: ${productId}`);
  }
  
  /**
   * 分类相关缓存失效
   */
  static async invalidateCategory(categoryId: string): Promise<void> {
    await CacheWrapper.delPattern(`${CACHE_CONFIG.PREFIX.CATEGORY}*`);
    await CacheWrapper.delPattern(`${CACHE_CONFIG.PREFIX.PRODUCT}list:*`);
    console.log(`🗑️ 分类缓存失效完成: ${categoryId}`);
  }
  
  /**
   * 搜索缓存失效
   */
  static async invalidateSearch(): Promise<void> {
    await CacheWrapper.delPattern(`${CACHE_CONFIG.PREFIX.SEARCH}*`);
    console.log(`🗑️ 搜索缓存失效完成`);
  }
  
  /**
   * 全量缓存失效（谨慎使用）
   */
  static async invalidateAll(): Promise<void> {
    const patterns = [
      `${CACHE_CONFIG.PREFIX.PRODUCT}*`,
      `${CACHE_CONFIG.PREFIX.CATEGORY}*`,
      `${CACHE_CONFIG.PREFIX.STATS}*`,
      `${CACHE_CONFIG.PREFIX.SEARCH}*`,
    ];
    
    await Promise.all(patterns.map(pattern => CacheWrapper.delPattern(pattern)));
    console.log(`🗑️ 全量缓存失效完成`);
  }
}

// Redis连接状态监控
export class RedisMonitor {
  private static metrics = {
    totalCommands: 0,
    failedCommands: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  
  /**
   * 获取Redis状态
   */
  static async getStatus() {
    try {
      const info = await redis.info();
      const ping = await redis.ping();
      return {
        connected: ping === 'PONG',
        info: this.parseRedisInfo(info),
        metrics: this.metrics,
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        metrics: this.metrics,
      };
    }
  }
  
  /**
   * 记录缓存命中
   */
  static recordCacheHit() {
    this.metrics.cacheHits++;
  }
  
  /**
   * 记录缓存未命中
   */
  static recordCacheMiss() {
    this.metrics.cacheMisses++;
  }
  
  /**
   * 记录命令执行
   */
  static recordCommand(success: boolean) {
    this.metrics.totalCommands++;
    if (!success) {
      this.metrics.failedCommands++;
    }
  }
  
  /**
   * 解析Redis信息
   */
  private static parseRedisInfo(info: string) {
    const lines = info.split('\r\n');
    const parsed: Record<string, any> = {};
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        parsed[key] = isNaN(Number(value)) ? value : Number(value);
      }
    }
    
    return {
      version: parsed.redis_version,
      uptime: parsed.uptime_in_seconds,
      memory: {
        used: parsed.used_memory_human,
        peak: parsed.used_memory_peak_human,
      },
      connections: {
        total: parsed.total_connections_received,
        current: parsed.connected_clients,
      },
      commands: {
        total: parsed.total_commands_processed,
        perSecond: parsed.instantaneous_ops_per_sec,
      },
      keyspace: parsed.db0,
    };
  }
}

// 初始化Redis事件监听
redis.on('connect', () => {
  console.log('🔌 Redis连接已建立');
});

redis.on('ready', () => {
  console.log('✅ Redis已就绪');
});

redis.on('error', (error) => {
  console.error('❌ Redis错误:', error);
  RedisMonitor.recordCommand(false);
});

redis.on('close', () => {
  console.log('🔌 Redis连接已关闭');
});

export {
  CacheWrapper as default,
  CacheKeyGenerator,
  CacheStrategy,
  CacheInvalidator,
  RedisMonitor,
};