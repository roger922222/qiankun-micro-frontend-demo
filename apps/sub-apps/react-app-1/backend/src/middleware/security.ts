import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import crypto from 'crypto';

/**
 * 安全头部中间件
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

/**
 * 请求ID中间件 - 用于追踪请求
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * 请求时间中间件
 */
export const requestTimeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // 记录慢请求
    if (duration > 1000) {
      console.warn(`[Slow Request] ${req.method} ${req.url} - ${duration}ms`);
    }
  });
  
  next();
};

/**
 * 安全日志中间件
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 记录安全相关事件
    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: duration,
      contentLength: res.get('Content-Length'),
      referrer: req.get('Referer'),
      origin: req.get('Origin')
    };

    // 记录异常请求
    if (res.statusCode >= 400) {
      console.warn(`[Security] 异常响应:`, logData);
    }

    // 记录潜在的安全威胁
    if (isSuspiciousRequest(req)) {
      console.warn(`[Security] 可疑请求:`, logData);
    }
  });
  
  next();
};

/**
 * 获取客户端真实IP
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP;
  }
  
  return req.ip || req.connection.remoteAddress || 'unknown';
}

/**
 * 检查是否为可疑请求
 */
function isSuspiciousRequest(req: Request): boolean {
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /zap/i,
    /acunetix/i,
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i,
    /union.*select/i,
    /drop.*table/i,
    /exec.*\(/i,
    /script.*>/i
  ];

  // 检查User-Agent
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }

  // 检查URL参数
  const url = req.url;
  if (suspiciousPatterns.some(pattern => pattern.test(url))) {
    return true;
  }

  // 检查请求头
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string' && suspiciousPatterns.some(pattern => pattern.test(value))) {
      return true;
    }
  }

  return false;
}

/**
 * CORS配置中间件
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-domain.com'
    ];

    // 允许没有origin的请求（如移动应用或Postman）
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[Security] 拒绝来自不受信任的域名请求: ${origin}`);
    return callback(new Error('不允许的域名'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
  maxAge: 86400 // 24小时
};

/**
 * CSRF保护中间件
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // 跳过GET和OPTIONS请求
  if (req.method === 'GET' || req.method === 'OPTIONS') {
    return next();
  }

  // 检查CSRF令牌
  const csrfToken = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const sessionToken = (req as any).session?.csrfToken;

  if (!csrfToken) {
    return res.status(403).json({
      success: false,
      message: '缺少CSRF令牌',
      code: 'MISSING_CSRF_TOKEN'
    });
  }

  if (!sessionToken || csrfToken !== sessionToken) {
    console.warn(`[Security] CSRF令牌验证失败:`, {
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      providedToken: csrfToken,
      expectedToken: sessionToken
    });

    return res.status(403).json({
      success: false,
      message: 'CSRF令牌无效',
      code: 'INVALID_CSRF_TOKEN'
    });
  }

  next();
};

/**
 * 生成CSRF令牌
 */
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * 请求大小限制中间件
 */
export const requestSizeLimiter = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      console.warn(`[Security] 请求大小超过限制: ${contentLength} > ${maxSize}`, {
        ip: getClientIP(req),
        url: req.url,
        method: req.method
      });

      return res.status(413).json({
        success: false,
        message: `请求大小超过限制，最大允许: ${maxSize}字节`,
        code: 'REQUEST_TOO_LARGE'
      });
    }

    next();
  };
};

/**
 * 用户代理检查中间件
 */
export const userAgentCheck = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent') || '';
  
  // 检查空User-Agent
  if (!userAgent) {
    console.warn(`[Security] 空User-Agent请求:`, {
      ip: getClientIP(req),
      url: req.url,
      method: req.method
    });
  }

  // 检查可疑的User-Agent
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /zap/i,
    /acunetix/i,
    /w3af/i,
    /dirbuster/i,
    /gobuster/i
  ];

  if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
    console.warn(`[Security] 可疑User-Agent: ${userAgent}`, {
      ip: getClientIP(req),
      url: req.url,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      message: '请求被拒绝',
      code: 'SUSPICIOUS_USER_AGENT'
    });
  }

  next();
};

/**
 * IP黑名单中间件
 */
export const ipBlacklist = (blacklistedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = getClientIP(req);
    
    if (blacklistedIPs.includes(clientIP)) {
      console.warn(`[Security] 黑名单IP尝试访问: ${clientIP}`, {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: '访问被拒绝',
        code: 'IP_BLOCKED'
      });
    }

    next();
  };
};

/**
 * 路径遍历防护中间件
 */
export const pathTraversalProtection = (req: Request, res: Response, next: NextFunction): void => {
  const pathTraversalPatterns = [
    /\.\.\//g,
    /%2e%2e%2f/gi,
    /%252e%252e%252f/gi,
    /\.\.\\/g,
    /%2e%2e%5c/gi,
    /%252e%252e%255c/gi
  ];

  const checkPath = (path: string): boolean => {
    return pathTraversalPatterns.some(pattern => pattern.test(path));
  };

  // 检查URL
  if (checkPath(req.url)) {
    console.warn(`[Security] 检测到路径遍历攻击:`, {
      ip: getClientIP(req),
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent')
    });

    return res.status(400).json({
      success: false,
      message: '非法请求路径',
      code: 'PATH_TRAVERSAL_DETECTED'
    });
  }

  next();
};

/**
 * 安全响应头中间件
 */
export const securityResponseHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // 移除可能泄露服务器信息的头部
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // 添加安全响应头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

export default {
  securityHeaders,
  requestIdMiddleware,
  requestTimeMiddleware,
  securityLogger,
  corsConfig,
  csrfProtection,
  generateCSRFToken,
  requestSizeLimiter,
  userAgentCheck,
  ipBlacklist,
  pathTraversalProtection,
  securityResponseHeaders
};