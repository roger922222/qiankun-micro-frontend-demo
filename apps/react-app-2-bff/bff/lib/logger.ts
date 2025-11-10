import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';

// 日志级别配置
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

// 日志颜色配置
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray',
};

// 添加颜色支持
winston.addColors(LOG_COLORS);

// 日志格式配置
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 控制台日志格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const requestId = meta.requestId || 'N/A';
    const duration = meta.duration ? ` (${meta.duration}ms)` : '';
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    
    return `[${timestamp}] [${level}] [${requestId}] ${message}${duration}${metaStr}`;
  })
);

// 创建日志目录
const logDir = process.env.LOG_DIR || 'logs';

// 创建logger实例
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: LOG_LEVELS,
  format: logFormat,
  defaultMeta: {
    service: 'product-bff',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    }),
    
    // 错误日志文件
    new DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
    }),
    
    // 综合日志文件
    new DailyRotateFile({
      filename: `${logDir}/combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    }),
    
    // HTTP请求日志文件
    new DailyRotateFile({
      filename: `${logDir}/http-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat,
    }),
    
    // 性能日志文件
    new DailyRotateFile({
      filename: `${logDir}/performance-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat,
    }),
  ],
  
  // 异常处理
  exceptionHandlers: [
    new DailyRotateFile({
      filename: `${logDir}/exceptions-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  
  // 拒绝处理
  rejectionHandlers: [
    new DailyRotateFile({
      filename: `${logDir}/rejections-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

// 日志工具类
export class Logger {
  private static instance: Logger;
  private requestId: string;
  
  private constructor(requestId?: string) {
    this.requestId = requestId || uuidv4();
  }
  
  static getInstance(requestId?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(requestId);
    }
    if (requestId) {
      Logger.instance.requestId = requestId;
    }
    return Logger.instance;
  }
  
  /**
   * 记录错误日志
   */
  error(message: string, error?: Error, meta?: Record<string, any>) {
    logger.error({
      requestId: this.requestId,
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta,
    });
  }
  
  /**
   * 记录警告日志
   */
  warn(message: string, meta?: Record<string, any>) {
    logger.warn({
      requestId: this.requestId,
      message,
      ...meta,
    });
  }
  
  /**
   * 记录信息日志
   */
  info(message: string, meta?: Record<string, any>) {
    logger.info({
      requestId: this.requestId,
      message,
      ...meta,
    });
  }
  
  /**
   * 记录HTTP请求日志
   */
  http(message: string, meta?: Record<string, any>) {
    logger.http({
      requestId: this.requestId,
      message,
      ...meta,
    });
  }
  
  /**
   * 记录调试日志
   */
  debug(message: string, meta?: Record<string, any>) {
    logger.debug({
      requestId: this.requestId,
      message,
      ...meta,
    });
  }
  
  /**
   * 记录性能日志
   */
  performance(message: string, duration: number, meta?: Record<string, any>) {
    logger.info({
      requestId: this.requestId,
      message,
      duration,
      level: 'performance',
      ...meta,
    });
  }
  
  /**
   * 记录数据库查询日志
   */
  dbQuery(query: string, duration: number, meta?: Record<string, any>) {
    logger.info({
      requestId: this.requestId,
      message: `DB Query: ${query}`,
      duration,
      level: 'db',
      ...meta,
    });
  }
  
  /**
   * 记录缓存操作日志
   */
  cache(operation: string, key: string, hit: boolean, duration?: number, meta?: Record<string, any>) {
    logger.info({
      requestId: this.requestId,
      message: `Cache ${operation}: ${key}`,
      duration,
      hit,
      level: 'cache',
      ...meta,
    });
  }
  
  /**
   * 记录限流日志
   */
  rateLimit(endpoint: string, allowed: boolean, remaining?: number, meta?: Record<string, any>) {
    logger.warn({
      requestId: this.requestId,
      message: `Rate limit ${allowed ? 'allowed' : 'denied'}: ${endpoint}`,
      endpoint,
      allowed,
      remaining,
      level: 'rateLimit',
      ...meta,
    });
  }
  
  /**
   * 记录安全日志
   */
  security(event: string, meta?: Record<string, any>) {
    logger.warn({
      requestId: this.requestId,
      message: `Security event: ${event}`,
      event,
      level: 'security',
      ...meta,
    });
  }
}

// 请求日志中间件
export function createRequestLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || uuidv4();
    const startTime = Date.now();
    
    // 设置请求ID
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    
    const logger = Logger.getInstance(requestId);
    
    // 记录请求开始
    logger.http('Request started', {
      method: req.method,
      url: req.url,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
    });
    
    // 监听响应完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logger.http('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        duration,
        contentLength: res.get('content-length'),
      });
      
      // 记录慢请求
      if (duration > 1000) {
        logger.performance('Slow request detected', duration, {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
        });
      }
    });
    
    // 监听错误
    res.on('error', (error: Error) => {
      logger.error('Response error', error, {
        method: req.method,
        url: req.url,
      });
    });
    
    next();
  };
}

// 数据库查询日志
export function createDatabaseLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const originalQuery = req.db?.query;
    
    if (originalQuery) {
      req.db.query = async function(query: string, params?: any[]) {
        const startTime = Date.now();
        const logger = Logger.getInstance(req.requestId);
        
        try {
          const result = await originalQuery.call(this, query, params);
          const duration = Date.now() - startTime;
          
          logger.dbQuery(query, duration, {
            params,
            rowsAffected: result?.rowCount,
          });
          
          // 记录慢查询
          if (duration > 500) {
            logger.performance('Slow query detected', duration, {
              query: query.substring(0, 100), // 只记录前100个字符
              params,
            });
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          
          logger.error('Database query failed', error as Error, {
            query: query.substring(0, 100),
            params,
            duration,
          });
          
          throw error;
        }
      };
    }
    
    next();
  };
}

// 缓存操作日志
export function logCacheOperation(
  requestId: string,
  operation: string,
  key: string,
  hit: boolean,
  duration?: number,
  meta?: Record<string, any>
) {
  const logger = Logger.getInstance(requestId);
  logger.cache(operation, key, hit, duration, meta);
}

// 限流日志
export function logRateLimit(
  requestId: string,
  endpoint: string,
  allowed: boolean,
  remaining?: number,
  meta?: Record<string, any>
) {
  const logger = Logger.getInstance(requestId);
  logger.rateLimit(endpoint, allowed, remaining, meta);
}

// 安全日志
export function logSecurityEvent(
  requestId: string,
  event: string,
  meta?: Record<string, any>
) {
  const logger = Logger.getInstance(requestId);
  logger.security(event, meta);
}

export default logger;