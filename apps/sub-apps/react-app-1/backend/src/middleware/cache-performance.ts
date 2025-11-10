import { Request, Response, NextFunction } from 'express';
import { cacheManager } from '../utils/cache';

/**
 * 缓存性能监控中间件
 * 用于收集和报告缓存性能指标
 */
export class CachePerformanceMonitor {
  private static instance: CachePerformanceMonitor;
  private metrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    totalRequests: 0,
    startTime: Date.now(),
  };

  private constructor() {}

  static getInstance(): CachePerformanceMonitor {
    if (!this.instance) {
      this.instance = new CachePerformanceMonitor();
    }
    return this.instance;
  }

  // 记录缓存命中
  recordHit(): void {
    this.metrics.hits++;
  }

  // 记录缓存未命中
  recordMiss(): void {
    this.metrics.misses++;
  }

  // 记录缓存设置
  recordSet(): void {
    this.metrics.sets++;
  }

  // 记录缓存删除
  recordDelete(): void {
    this.metrics.deletes++;
  }

  // 记录缓存错误
  recordError(): void {
    this.metrics.errors++;
  }

  // 记录总请求数
  recordRequest(): void {
    this.metrics.totalRequests++;
  }

  // 获取命中率
  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  // 获取性能指标
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      hitRate: this.getHitRate(),
      uptime: Math.floor(uptime / 1000), // 秒
      timestamp: new Date().toISOString(),
    };
  }

  // 重置指标
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      startTime: Date.now(),
    };
  }
}

// 缓存性能监控中间件
export const cachePerformanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const monitor = CachePerformanceMonitor.getInstance();
  
  // 记录请求开始时间
  const startTime = Date.now();
  
  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 记录性能指标
    if (res.get('X-Cache') === 'HIT') {
      monitor.recordHit();
    } else if (res.get('X-Cache') === 'MISS') {
      monitor.recordMiss();
    }
    
    monitor.recordRequest();
    
    // 记录响应时间（可选）
    console.log(`[Cache Performance] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// 缓存性能指标API
export const getCacheMetrics = (req: Request, res: Response) => {
  const monitor = CachePerformanceMonitor.getInstance();
  const metrics = monitor.getMetrics();
  
  res.json({
    success: true,
    data: {
      metrics,
      status: {
        healthy: metrics.hitRate > 50, // 命中率大于50%认为健康
        message: metrics.hitRate > 50 ? '缓存性能良好' : '缓存命中率偏低',
      },
    },
  });
};

// 重置缓存指标API
export const resetCacheMetrics = (req: Request, res: Response) => {
  const monitor = CachePerformanceMonitor.getInstance();
  monitor.resetMetrics();
  
  res.json({
    success: true,
    message: '缓存性能指标已重置',
  });
};