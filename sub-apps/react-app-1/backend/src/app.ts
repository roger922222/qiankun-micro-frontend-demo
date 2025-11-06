import express from 'express';
import rateLimit from 'express-rate-limit';
import 'reflect-metadata';
import { userRoutes } from './routes/users';
import { roleRoutes } from './routes/roles';
import { permissionRoutes } from './routes/permissions';
import { logRoutes } from './routes/logs';
import { authRoutes } from './routes/auth';
import { initializeDatabase } from './config/database';
import { redisManager } from './config/redis';
import { cacheHealthMiddleware } from './middleware/cache';
import { cachePerformanceMiddleware, getCacheMetrics, resetCacheMetrics } from './middleware/cache-performance';
import { 
  securityHeaders, 
  requestIdMiddleware, 
  requestTimeMiddleware, 
  securityLogger, 
  corsConfig,
  userAgentCheck,
  pathTraversalProtection,
  securityResponseHeaders
} from './middleware/security';
import { 
  sqlInjectionProtection, 
  xssProtection, 
  parameterPollutionProtection,
  requestSizeLimit,
  rateLimitConfig
} from './middleware/validation';
import { 
  globalErrorHandler, 
  notFoundHandler,
  ErrorLogger,
  ErrorAnalyzer,
  getHttpStatusCode
} from './utils/error-handler';
import { errorRoutes } from './routes/errors';

const app = express();
const PORT = process.env.PORT || 3002;

// 基础安全中间件
app.use(securityHeaders);
app.use(requestIdMiddleware);
app.use(requestTimeMiddleware);
app.use(securityLogger);
app.use(userAgentCheck);
app.use(pathTraversalProtection);
app.use(securityResponseHeaders);

// CORS配置
app.use(cors(corsConfig));

// 请求大小限制
app.use(requestSizeLimit(10 * 1024 * 1024)); // 10MB
app.use(express.json({ 
  limit: '10mb',
  verify: (req: any, res, buf) => {
    // 存储原始body用于签名验证
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 输入安全防护
app.use(sqlInjectionProtection);
app.use(xssProtection);
app.use(parameterPollutionProtection);

// 限流中间件 - 通用API限流
const apiLimiter = rateLimit(rateLimitConfig.api);
app.use('/api', apiLimiter);

// 缓存性能监控中间件
app.use(cachePerformanceMiddleware);

// 健康检查
app.get('/health', cacheHealthMiddleware, (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redis连接状态检查
app.get('/health/redis', async (_req, res) => {
  try {
    const isHealthy = await redisManager.healthCheck();
    res.json({ 
      status: isHealthy ? 'healthy' : 'unhealthy',
      redis: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    res.status(503).json({ 
      status: 'error',
      redis: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/errors', errorRoutes);

// 缓存监控API
app.get('/api/cache/metrics', getCacheMetrics);
app.post('/api/cache/metrics/reset', resetCacheMetrics);

// 错误处理中间件
app.use(globalErrorHandler);

// 404处理
app.use(notFoundHandler);

if (require.main === module) {
  // 初始化错误日志器
  const errorLogger = ErrorLogger.getInstance();
  
  // 初始化Redis连接
  redisManager.connect()
    .then(() => {
      console.log('✅ Redis连接成功');
    })
    .catch((error) => {
      console.log('⚠️  Redis连接失败，缓存功能将不可用:', error.message);
      // 记录Redis连接错误
      errorLogger.logError(error, { 
        service: 'redis',
        operation: 'connect' 
      });
    })
    .finally(() => {
      // 初始化数据库连接（可选）
      initializeDatabase()
        .then(() => {
          app.listen(PORT, () => {
            console.log(`🚀 BFF服务器运行在端口 ${PORT}`);
            console.log(`📊 API文档: http://localhost:${PORT}/api-docs`);
            console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
            console.log(`🔍 Redis状态: http://localhost:${PORT}/health/redis`);
            console.log(`📈 错误统计: http://localhost:${PORT}/api/errors/stats`);
          });
        })
        .catch((error) => {
          console.log('⚠️  数据库连接失败，使用内存存储模式');
          console.log(`🚀 BFF服务器运行在端口 ${PORT}`);
          console.log(`📊 API文档: http://localhost:${PORT}/api-docs`);
          console.log(`🔍 健康检查: http://localhost:${PORT}/health`);
          console.log(`🔍 Redis状态: http://localhost:${PORT}/health/redis`);
          console.log(`📈 错误统计: http://localhost:${PORT}/api/errors/stats`);
          
          // 记录数据库连接错误
          errorLogger.logError(error, { 
            service: 'database',
            operation: 'initialize' 
          });
          
          app.listen(PORT, () => {
            console.log(`✅ 服务器启动成功（内存模式）`);
          });
        });
    });
  
  // 优雅关闭处理
  process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，开始优雅关闭...');
    errorLogger.shutdown();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('收到SIGINT信号，开始优雅关闭...');
    errorLogger.shutdown();
    process.exit(0);
  });
}

export default app;