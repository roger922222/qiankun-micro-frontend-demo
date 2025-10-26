import { CacheManager } from './cache';

export interface QueryOptimizationOptions {
  enableCache?: boolean;
  cacheTTL?: number;
  enableLazyLoading?: boolean;
  enableBatchLoading?: boolean;
  batchSize?: number;
}

export class QueryOptimizer {
  private cacheManager: CacheManager;
  private batchLoaders: Map<string, any> = new Map();

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * 智能缓存策略
   */
  async optimizeQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: QueryOptimizationOptions = {}
  ): Promise<T> {
    const {
      enableCache = true,
      cacheTTL = 300,
    } = options;

    // 如果启用缓存，先尝试从缓存获取
    if (enableCache) {
      try {
        const cachedResult = await this.cacheManager.get<T>(key);
        if (cachedResult !== null && cachedResult !== undefined) {
          console.log(`🎯 查询缓存命中: ${key}`);
          return cachedResult;
        }
      } catch (error) {
        console.error(`缓存查询失败: ${key}`, error);
      }
    }

    // 执行查询
    const result = await queryFn();

    // 缓存结果
    if (enableCache && result !== null && result !== undefined) {
      try {
        await this.cacheManager.set(key, result, cacheTTL);
        console.log(`💾 查询结果缓存: ${key}, TTL: ${cacheTTL}s`);
      } catch (error) {
        console.error(`缓存设置失败: ${key}`, error);
      }
    }

    return result;
  }

  /**
   * 批量加载优化
   */
  async batchLoad<T, K>(
    keys: K[],
    loadFn: (batchKeys: K[]) => Promise<Map<K, T>>,
    options: QueryOptimizationOptions = {}
  ): Promise<Map<K, T>> {
    const {
      enableBatchLoading = true,
      batchSize = 100,
    } = options;

    if (!enableBatchLoading || keys.length <= batchSize) {
      return loadFn(keys);
    }

    // 分批处理
    const results = new Map<K, T>();
    const batches = this.createBatches(keys, batchSize);

    for (const batch of batches) {
      try {
        const batchResult = await loadFn(batch);
        batchResult.forEach((value, key) => results.set(key, value));
      } catch (error) {
        console.error(`批量加载失败: ${batch.length} 个键`, error);
        // 回退到单个加载
        for (const key of batch) {
          try {
            const singleResult = await loadFn([key]);
            singleResult.forEach((value, k) => results.set(k, value));
          } catch (singleError) {
            console.error(`单个加载失败: ${key}`, singleError);
          }
        }
      }
    }

    return results;
  }

  /**
   * 延迟加载策略
   */
  async lazyLoad<T>(
    key: string,
    loadFn: () => Promise<T>,
    options: QueryOptimizationOptions = {}
  ): Promise<T | null> {
    const {
      enableLazyLoading = true,
      enableCache = true,
      cacheTTL = 600,
    } = options;

    if (!enableLazyLoading) {
      return loadFn();
    }

    // 先尝试从缓存获取
    if (enableCache) {
      try {
        const cachedResult = await this.cacheManager.get<T>(key);
        if (cachedResult !== null && cachedResult !== undefined) {
          return cachedResult;
        }
      } catch (error) {
        console.error(`延迟加载缓存查询失败: ${key}`, error);
      }
    }

    // 延迟加载数据
    try {
      const result = await loadFn();
      
      // 缓存结果
      if (enableCache && result !== null && result !== undefined) {
        await this.cacheManager.set(key, result, cacheTTL);
      }

      return result;
    } catch (error) {
      console.error(`延迟加载失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 缓存预热
   */
  async preheatCache<T>(
    keys: string[],
    loadFn: (key: string) => Promise<T>,
    options: QueryOptimizationOptions = {}
  ): Promise<void> {
    const {
      enableCache = true,
      cacheTTL = 300,
    } = options;

    if (!enableCache) {
      return;
    }

    console.log(`🔥 缓存预热开始: ${keys.length} 个键`);
    const startTime = Date.now();

    // 并发预热，但限制并发数
    const concurrencyLimit = 10;
    const batches = this.createBatches(keys, concurrencyLimit);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (key) => {
          try {
            const result = await loadFn(key);
            if (result !== null && result !== undefined) {
              await this.cacheManager.set(key, result, cacheTTL);
            }
          } catch (error) {
            console.error(`缓存预热失败: ${key}`, error);
          }
        })
      );
    }

    const duration = Date.now() - startTime;
    console.log(`✅ 缓存预热完成: ${keys.length} 个键, 耗时: ${duration}ms`);
  }

  /**
   * 智能缓存失效
   */
  async invalidateCache(patterns: string[]): Promise<void> {
    console.log(`🧹 智能缓存失效: ${patterns.join(', ')}`);
    
    for (const pattern of patterns) {
      try {
        await this.cacheManager.delPattern(pattern);
      } catch (error) {
        console.error(`缓存失效失败: ${pattern}`, error);
      }
    }
  }

  /**
   * 性能监控
   */
  async monitorQueryPerformance<T>(
    key: string,
    queryFn: () => Promise<T>
  ): Promise<{ result: T; duration: number; cacheHit: boolean }> {
    const startTime = Date.now();
    let cacheHit = false;

    // 检查缓存
    try {
      const cachedResult = await this.cacheManager.get<T>(key);
      if (cachedResult !== null && cachedResult !== undefined) {
        cacheHit = true;
        return {
          result: cachedResult,
          duration: Date.now() - startTime,
          cacheHit: true,
        };
      }
    } catch (error) {
      console.error(`监控缓存查询失败: ${key}`, error);
    }

    // 执行查询
    const result = await queryFn();
    const duration = Date.now() - startTime;

    // 记录性能指标
    console.log(`⏱️ 查询性能: ${key}, 耗时: ${duration}ms, 缓存命中: ${cacheHit}`);

    return {
      result,
      duration,
      cacheHit,
    };
  }

  /**
   * 创建批次
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

// 创建全局查询优化器实例
export const queryOptimizer = new QueryOptimizer(new CacheManager());

export default QueryOptimizer;