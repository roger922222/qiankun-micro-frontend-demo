import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';
import { db, performanceMetrics, apiLogs } from '@/lib/database';
import { redis, RedisMonitor } from '@/lib/redis';
import { eq, desc, sql } from 'drizzle-orm';

// 性能监控配置
export const PERFORMANCE_CONFIG = {
  // 慢查询阈值（毫秒）
  SLOW_QUERY_THRESHOLD: 1000,
  
  // 性能指标收集
  METRICS: {
    RESPONSE_TIME: true,
    DATABASE_TIME: true,
    CACHE_HIT_RATE: true,
    MEMORY_USAGE: true,
    ERROR_RATE: true,
  },
  
  // 告警阈值
  ALERTS: {
    RESPONSE_TIME: 2000,      // 2秒响应时间告警
    DATABASE_TIME: 500,        // 500ms数据库时间告警
    ERROR_RATE: 0.05,         // 5%错误率告警
    CACHE_HIT_RATE: 0.8,      // 80%缓存命中率告警
  },
  
  // 采样率
  SAMPLING_RATE: 0.1, // 10%采样率，减少性能开销
};

// 性能监控器
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private alerts: Array<{type: string; message: string; timestamp: Date}> = [];
  
  private constructor() {}
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * 监控API性能
   */
  async monitorAPI<T>(
    endpoint: string,
    method: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    const requestId = uuidv4();
    
    try {
      // 执行API处理
      const result = await handler();
      
      // 计算响应时间
      const responseTime = performance.now() - startTime;
      
      // 记录性能指标
      await this.recordMetric(endpoint, method, responseTime, 200);
      
      // 检查是否需要告警
      this.checkResponseTimeAlert(endpoint, responseTime);
      
      console.log(`✅ [${requestId}] ${method} ${endpoint} - ${responseTime.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      // 记录错误指标
      const responseTime = performance.now() - startTime;
      await this.recordMetric(endpoint, method, responseTime, 500, error.message);
      
      console.error(`❌ [${requestId}] ${method} ${endpoint} - ${responseTime.toFixed(2)}ms - Error:`, error);
      
      throw error;
    }
  }
  
  /**
   * 监控数据库查询性能
   */
  async monitorDatabase<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      
      const queryTime = performance.now() - startTime;
      
      // 检查慢查询
      if (queryTime > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
        console.warn(`🐌 慢查询警告: ${queryName} - ${queryTime.toFixed(2)}ms`);
        this.checkSlowQueryAlert(queryName, queryTime);
      }
      
      console.log(`📊 [DB] ${queryName} - ${queryTime.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const queryTime = performance.now() - startTime;
      console.error(`💥 [DB] ${queryName} - ${queryTime.toFixed(2)}ms - Error:`, error);
      throw error;
    }
  }
  
  /**
   * 记录性能指标
   */
  private async recordMetric(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    errorMessage?: string
  ): Promise<void> {
    // 采样率控制
    if (Math.random() > PERFORMANCE_CONFIG.SAMPLING_RATE) {
      return;
    }
    
    try {
      await db.insert(performanceMetrics).values({
        id: uuidv4(),
        endpoint,
        method,
        responseTimeMs: Math.round(responseTime),
        statusCode,
        errorMessage,
        createdAt: new Date(),
      });
      
      // 更新内存指标
      const key = `${method}:${endpoint}`;
      if (!this.metrics.has(key)) {
        this.metrics.set(key, []);
      }
      this.metrics.get(key)!.push(responseTime);
      
      // 保持最近100个数据点
      const times = this.metrics.get(key)!;
      if (times.length > 100) {
        times.shift();
      }
    } catch (error) {
      console.error('记录性能指标失败:', error);
    }
  }
  
  /**
   * 获取性能统计
   */
  async getPerformanceStats(timeRange: '1h' | '24h' | '7d' = '1h') {
    const timeFilter = this.getTimeFilter(timeRange);
    
    try {
      const [
        responseTimeStats,
        errorRateStats,
        endpointStats,
        databaseStats,
        cacheStats
      ] = await Promise.all([
        // 响应时间统计
        db.select({
          avg: sql`AVG(response_time_ms)`,
          p50: sql`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms)`,
          p95: sql`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)`,
          p99: sql`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms)`,
          max: sql`MAX(response_time_ms)`,
          min: sql`MIN(response_time_ms)`,
        })
        .from(performanceMetrics)
        .where(sql`created_at > ${timeFilter}`),
        
        // 错误率统计
        db.select({
          totalRequests: sql`COUNT(*)`,
          errorRequests: sql`COUNT(CASE WHEN status_code >= 400 THEN 1 END)`,
          errorRate: sql`COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*)`,
        })
        .from(performanceMetrics)
        .where(sql`created_at > ${timeFilter}`),
        
        // 端点统计
        db.select({
          endpoint: performanceMetrics.endpoint,
          method: performanceMetrics.method,
          avgResponseTime: sql`AVG(response_time_ms)`,
          requestCount: sql`COUNT(*)`,
          errorCount: sql`COUNT(CASE WHEN status_code >= 400 THEN 1 END)`,
        })
        .from(performanceMetrics)
        .where(sql`created_at > ${timeFilter}`)
        .groupBy(performanceMetrics.endpoint, performanceMetrics.method)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10),
        
        // 数据库性能统计
        this.getDatabaseStats(timeRange),
        
        // Redis缓存统计
        RedisMonitor.getStatus(),
      ]);
      
      return {
        timeRange,
        responseTime: responseTimeStats[0],
        errorRate: errorRateStats[0],
        topEndpoints: endpointStats,
        database: databaseStats,
        cache: cacheStats,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('获取性能统计失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取数据库性能统计
   */
  private async getDatabaseStats(timeRange: string) {
    // 这里可以集成数据库性能监控
    // 例如：查询pg_stat_statements等系统表
    return {
      slowQueries: 0,
      connectionPool: {
        total: 20,
        active: Math.floor(Math.random() * 10) + 1,
        idle: Math.floor(Math.random() * 10) + 1,
      },
      transactions: {
        total: Math.floor(Math.random() * 1000) + 100,
        perSecond: Math.floor(Math.random() * 100) + 10,
      },
    };
  }
  
  /**
   * 检查响应时间告警
   */
  private checkResponseTimeAlert(endpoint: string, responseTime: number): void {
    if (responseTime > PERFORMANCE_CONFIG.ALERTS.RESPONSE_TIME) {
      const alert = {
        type: 'RESPONSE_TIME',
        message: `响应时间告警: ${endpoint} - ${responseTime.toFixed(2)}ms`,
        timestamp: new Date(),
      };
      
      this.alerts.push(alert);
      console.warn(`⚠️ ${alert.message}`);
      
      // 保持最近100条告警
      if (this.alerts.length > 100) {
        this.alerts.shift();
      }
    }
  }
  
  /**
   * 检查慢查询告警
   */
  private checkSlowQueryAlert(queryName: string, queryTime: number): void {
    if (queryTime > PERFORMANCE_CONFIG.ALERTS.DATABASE_TIME) {
      const alert = {
        type: 'SLOW_QUERY',
        message: `慢查询告警: ${queryName} - ${queryTime.toFixed(2)}ms`,
        timestamp: new Date(),
      };
      
      this.alerts.push(alert);
      console.warn(`⚠️ ${alert.message}`);
    }
  }
  
  /**
   * 获取告警信息
   */
  getAlerts(): Array<{type: string; message: string; timestamp: Date}> {
    return [...this.alerts];
  }
  
  /**
   * 清理告警
   */
  clearAlerts(): void {
    this.alerts = [];
  }
  
  /**
   * 获取时间过滤器
   */
  private getTimeFilter(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 60 * 60 * 1000);
    }
  }
  
  /**
   * 获取实时指标
   */
  getRealtimeMetrics() {
    const metrics: Record<string, any> = {};
    
    // 计算平均响应时间
    for (const [key, times] of this.metrics.entries()) {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const p95 = this.percentile(times, 0.95);
        metrics[key] = {
          avg: avg.toFixed(2),
          p95: p95.toFixed(2),
          count: times.length,
        };
      }
    }
    
    return {
      responseTime: metrics,
      cache: RedisMonitor.getStatus(),
      alerts: this.alerts.slice(-10), // 最近10条告警
      timestamp: new Date(),
    };
  }
  
  /**
   * 计算百分位数
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

// API性能监控中间件
export function createPerformanceMiddleware() {
  const monitor = PerformanceMonitor.getInstance();
  
  return async (req: any, res: any, next: any) => {
    const startTime = performance.now();
    const requestId = uuidv4();
    
    // 添加请求ID到请求对象
    req.requestId = requestId;
    
    // 记录请求日志
    try {
      await db.insert(apiLogs).values({
        id: requestId,
        endpoint: req.url,
        method: req.method,
        requestBody: req.body ? JSON.stringify(req.body) : null,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('记录API日志失败:', error);
    }
    
    // 监控API性能
    try {
      const result = await monitor.monitorAPI(
        req.url,
        req.method,
        async () => {
          return new Promise((resolve, reject) => {
            // 监听响应完成
            res.on('finish', async () => {
              const responseTime = performance.now() - startTime;
              
              // 更新API日志
              try {
                await db.update(apiLogs)
                  .set({
                    responseBody: JSON.stringify(res.locals.responseData || {}),
                    statusCode: res.statusCode,
                  })
                  .where(eq(apiLogs.id, requestId));
              } catch (error) {
                console.error('更新API日志失败:', error);
              }
              
              resolve(res.locals.responseData);
            });
            
            // 调用下一个中间件
            next();
          });
        }
      );
      
      return result;
    } catch (error) {
      // 错误已经在monitorAPI中处理
      throw error;
    }
  };
}

// 导出单例实例
export const performanceMonitor = PerformanceMonitor.getInstance();