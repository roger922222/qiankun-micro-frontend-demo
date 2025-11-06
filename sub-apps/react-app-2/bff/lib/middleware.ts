import { NextApiRequest, NextApiResponse } from 'next';
import { rateLimitMiddleware, rateLimiters, SmartRateLimiter, RateLimitReporter } from '@/lib/rate-limiter';
import { performanceMonitor } from '@/lib/performance-monitor';
import { createApiResponse } from '@/types';

/**
 * 创建受保护的API处理器
 */
export function createProtectedHandler(
  endpoint: string,
  method: string,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // 1. 智能请求分析
      const analysis = SmartRateLimiter.analyzeRequestPattern(req);
      if (analysis.isSuspicious) {
        console.warn(`🚨 可疑请求检测: ${analysis.reason}`, {
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          endpoint: req.url,
          method: req.method,
        });
        
        // 对可疑请求应用更严格的限流
        const suspiciousLimiter = {
          points: 5, // 每分钟5次
          duration: 60,
        };
        
        const allowed = await rateLimitMiddleware(
          req,
          res,
          rateLimiters.general,
          'suspicious'
        );
        
        if (!allowed) {
          return res.status(429).json(
            createApiResponse(false, null, '请求过于频繁，请稍后再试')
          );
        }
      }
      
      // 2. 根据端点类型应用不同的限流策略
      let allowed = false;
      let limiterType = 'general';
      
      switch (true) {
        case endpoint.includes('/products/list'):
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.products.list,
            'list'
          );
          limiterType = 'products:list';
          break;
          
        case endpoint.includes('/products/create'):
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.products.create,
            'create'
          );
          limiterType = 'products:create';
          break;
          
        case endpoint.includes('/products/') && method === 'PUT':
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.products.update,
            'update'
          );
          limiterType = 'products:update';
          break;
          
        case endpoint.includes('/products/') && method === 'DELETE':
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.products.delete,
            'delete'
          );
          limiterType = 'products:delete';
          break;
          
        case endpoint.includes('/batch'):
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.batch,
            'batch'
          );
          limiterType = 'batch';
          break;
          
        case endpoint.includes('/inventory'):
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.inventory,
            'inventory'
          );
          limiterType = 'inventory';
          break;
          
        case endpoint.includes('/pricing'):
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.pricing,
            'pricing'
          );
          limiterType = 'pricing';
          break;
          
        case endpoint.includes('/search'):
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.search,
            'search'
          );
          limiterType = 'search';
          break;
          
        case endpoint.includes('/health'):
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.health,
            'health'
          );
          limiterType = 'health';
          break;
          
        default:
          allowed = await rateLimitMiddleware(
            req,
            res,
            rateLimiters.general,
            'general'
          );
          limiterType = 'general';
      }
      
      // 记录限流结果
      RateLimitReporter.recordResult(endpoint, allowed);
      
      if (!allowed) {
        return res.status(429).json(
          createApiResponse(false, null, '请求过于频繁，请稍后再试')
        );
      }
      
      // 3. 性能监控
      await performanceMonitor.monitorAPI(
        endpoint,
        method,
        async () => {
          // 4. 执行实际的API处理
          await handler(req, res);
        }
      );
      
    } catch (error) {
      console.error(`API处理错误 [${endpoint}]:`, error);
      
      if (!res.headersSent) {
        res.status(500).json(
          createApiResponse(false, null, '服务器内部错误')
        );
      }
    }
  };
}

/**
 * 创建监控中间件
 */
export function createMonitoringMiddleware() {
  return async (req: NextApiRequest, res: NextApiResponse, next: any) => {
    try {
      await performanceMonitor.monitorAPI(
        req.url || 'unknown',
        req.method || 'GET',
        async () => {
          // 调用下一个中间件
          await new Promise<void>((resolve, reject) => {
            res.on('finish', resolve);
            res.on('error', reject);
            next();
          });
        }
      );
    } catch (error) {
      console.error('监控中间件错误:', error);
      next(error);
    }
  };
}

/**
 * 安全中间件
 */
export function createSecurityMiddleware() {
  return (req: NextApiRequest, res: NextApiResponse, next: any) => {
    // 1. 设置安全响应头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    
    // 2. 请求大小限制
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (contentLength > maxSize) {
      return res.status(413).json(
        createApiResponse(false, null, '请求体过大')
      );
    }
    
    // 3. 检查用户代理
    const userAgent = req.headers['user-agent'];
    if (!userAgent || userAgent.length < 10) {
      console.warn('⚠️ 可疑的用户代理:', userAgent);
    }
    
    // 4. 检查请求频率模式
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip) {
      const reputation = SmartRateLimiter.getIPReputation(ip as string);
      if (reputation < 30) {
        console.warn(`🚨 低信誉IP访问: ${ip} (信誉分数: ${reputation})`);
      }
    }
    
    next();
  };
}

/**
 * 错误处理中间件
 */
export function createErrorHandler() {
  return (error: any, req: NextApiRequest, res: NextApiResponse, next: any) => {
    console.error('API错误:', {
      url: req.url,
      method: req.method,
      error: error.message,
      stack: error.stack,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });
    
    // 根据错误类型返回不同的响应
    if (error.name === 'ValidationError') {
      return res.status(400).json(
        createApiResponse(false, null, '参数验证失败', error.message)
      );
    }
    
    if (error.name === 'DatabaseError') {
      return res.status(500).json(
        createApiResponse(false, null, '数据库错误', '请稍后重试')
      );
    }
    
    if (error.name === 'RateLimitError') {
      return res.status(429).json(
        createApiResponse(false, null, '请求过于频繁', '请稍后再试')
      );
    }
    
    // 默认错误响应
    return res.status(500).json(
      createApiResponse(false, null, '服务器内部错误', '请稍后重试')
    );
  };
}

/**
 * 创建API路由包装器
 */
export function createAPIRoute(
  method: string,
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // 只允许指定的HTTP方法
    if (req.method !== method) {
      res.setHeader('Allow', [method]);
      return res.status(405).json(
        createApiResponse(false, null, 'Method not allowed')
      );
    }
    
    try {
      await handler(req, res);
    } catch (error) {
      console.error('API路由错误:', error);
      
      if (!res.headersSent) {
        res.status(500).json(
          createApiResponse(false, null, '服务器内部错误')
        );
      }
    }
  };
}