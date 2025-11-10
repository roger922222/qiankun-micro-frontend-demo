import { Request, Response, NextFunction } from 'express';
import { cacheManager } from '../utils/cache';

export interface CacheMiddlewareOptions {
  ttl?: number;
  key?: string | ((req: Request) => string);
  condition?: (req: Request, res: Response) => boolean;
  skipCache?: (req: Request) => boolean;
}

const DEFAULT_CACHE_MIDDLEWARE_OPTIONS: CacheMiddlewareOptions = {
  ttl: 300, // 默认5分钟
  condition: (req, res) => res.statusCode === 200,
  skipCache: (req) => {
    // 跳过缓存的条件
    const skipMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    return skipMethods.includes(req.method);
  },
};

// 缓存中间件
export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  const opts = { ...DEFAULT_CACHE_MIDDLEWARE_OPTIONS, ...options };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // 检查是否需要跳过缓存
    if (opts.skipCache && opts.skipCache(req)) {
      return next();
    }

    // 生成缓存键
    const cacheKey = typeof opts.key === 'function' ? opts.key(req) : (opts.key || generateCacheKey(req));
    
    try {
      // 尝试从缓存获取
      const cachedData = await cacheManager.get(cacheKey);
      
      if (cachedData !== null && cachedData !== undefined) {
        console.log(`🎯 接口缓存命中: ${req.method} ${req.originalUrl}`);
        
        // 设置缓存命中头
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        // 返回缓存数据
        return res.json(cachedData);
      }
      
      // 缓存未命中，继续处理请求
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      
      // 保存原始的json方法
      const originalJson = res.json;
      
      // 重写json方法以缓存响应数据
      res.json = function(data: any) {
        // 检查是否满足缓存条件
        if (opts.condition && opts.condition(req, res)) {
          // 异步缓存数据，不阻塞响应
          cacheManager.set(cacheKey, data, opts.ttl).catch(error => {
            console.error(`缓存响应数据失败: ${cacheKey}`, error);
          });
        }
        
        // 调用原始的json方法
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error(`缓存中间件错误: ${cacheKey}`, error);
      // 如果缓存出错，继续正常处理请求
      next();
    }
  };
};

// 缓存清理中间件
export const cacheEvictMiddleware = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 保存原始的json方法
    const originalJson = res.json;
    
    // 重写json方法以清理缓存
    res.json = function(data: any) {
      // 异步清理相关缓存，不阻塞响应
      Promise.all(
        patterns.map(pattern => {
          const fullPattern = pattern.replace('*', '*');
          return cacheManager.delPattern(fullPattern).catch(error => {
            console.error(`清理缓存模式失败: ${pattern}`, error);
          });
        })
      ).then(() => {
        console.log(`🧹 缓存清理完成: ${patterns.join(', ')}`);
      }).catch(error => {
        console.error('缓存清理错误:', error);
      });
      
      // 调用原始的json方法
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// 生成缓存键
function generateCacheKey(req: Request): string {
  const method = req.method;
  const url = req.originalUrl || req.url;
  const query = JSON.stringify(req.query);
  const body = JSON.stringify(req.body);
  
  // 生成基于请求内容的哈希
  const crypto = require('crypto');
  const content = `${method}:${url}:${query}:${body}`;
  const hash = crypto.createHash('md5').update(content).digest('hex');
  
  return `api:${hash}`;
}

// 健康检查中间件
export const cacheHealthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const redisManager = require('../config/redis').redisManager;
    const isHealthy = await redisManager.healthCheck();
    
    res.set('X-Cache-Health', isHealthy ? 'healthy' : 'unhealthy');
    next();
  } catch (error) {
    console.error('缓存健康检查失败:', error);
    res.set('X-Cache-Health', 'error');
    next();
  }
};