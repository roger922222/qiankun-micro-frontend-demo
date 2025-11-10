/**
 * 错误处理系统 - 统一错误响应格式和错误管理
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 错误类别枚举
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS = 'BUSINESS',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  SYSTEM = 'SYSTEM',
  EXTERNAL = 'EXTERNAL',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 业务错误码定义
 */
export const ErrorCodes = {
  // 通用错误 (1000-1999)
  SUCCESS: { code: 1000, message: '操作成功' },
  UNKNOWN_ERROR: { code: 1001, message: '未知错误' },
  INVALID_REQUEST: { code: 1002, message: '无效请求' },
  MISSING_PARAMETER: { code: 1003, message: '缺少必要参数' },
  INVALID_PARAMETER: { code: 1004, message: '参数格式错误' },
  
  // 认证授权错误 (2000-2999)
  UNAUTHORIZED: { code: 2001, message: '未认证' },
  INVALID_TOKEN: { code: 2002, message: '无效令牌' },
  TOKEN_EXPIRED: { code: 2003, message: '令牌已过期' },
  INSUFFICIENT_PERMISSIONS: { code: 2004, message: '权限不足' },
  ACCOUNT_DISABLED: { code: 2005, message: '账户已被禁用' },
  LOGIN_FAILED: { code: 2006, message: '登录失败' },
  INVALID_CREDENTIALS: { code: 2007, message: '用户名或密码错误' },
  
  // 业务逻辑错误 (3000-3999)
  USER_NOT_FOUND: { code: 3001, message: '用户不存在' },
  USER_ALREADY_EXISTS: { code: 3002, message: '用户已存在' },
  EMAIL_ALREADY_EXISTS: { code: 3003, message: '邮箱已存在' },
  INVALID_USER_STATUS: { code: 3004, message: '无效的用户状态' },
  CANNOT_DELETE_SUPER_ADMIN: { code: 3005, message: '不能删除超级管理员' },
  
  // 数据验证错误 (4000-4999)
  VALIDATION_ERROR: { code: 4001, message: '数据验证失败' },
  INVALID_EMAIL_FORMAT: { code: 4002, message: '邮箱格式错误' },
  INVALID_PHONE_FORMAT: { code: 4003, message: '手机号格式错误' },
  PASSWORD_TOO_WEAK: { code: 4004, message: '密码强度不足' },
  PASSWORD_MISMATCH: { code: 4005, message: '密码不匹配' },
  
  // 文件操作错误 (5000-5999)
  FILE_TOO_LARGE: { code: 5001, message: '文件过大' },
  INVALID_FILE_TYPE: { code: 5002, message: '无效的文件类型' },
  FILE_UPLOAD_FAILED: { code: 5003, message: '文件上传失败' },
  FILE_NOT_FOUND: { code: 5004, message: '文件不存在' },
  
  // 数据库错误 (6000-6999)
  DATABASE_ERROR: { code: 6001, message: '数据库错误' },
  CONNECTION_FAILED: { code: 6002, message: '数据库连接失败' },
  QUERY_TIMEOUT: { code: 6003, message: '查询超时' },
  DUPLICATE_ENTRY: { code: 6004, message: '数据重复' },
  
  // 缓存错误 (7000-7999)
  CACHE_ERROR: { code: 7001, message: '缓存错误' },
  CACHE_CONNECTION_FAILED: { code: 7002, message: '缓存连接失败' },
  
  // 外部服务错误 (8000-8999)
  EXTERNAL_SERVICE_ERROR: { code: 8001, message: '外部服务错误' },
  API_RATE_LIMIT_EXCEEDED: { code: 8002, message: 'API调用频率超限' },
  
  // 系统错误 (9000-9999)
  SYSTEM_ERROR: { code: 9001, message: '系统错误' },
  SERVICE_UNAVAILABLE: { code: 9002, message: '服务不可用' },
  MAINTENANCE_MODE: { code: 9003, message: '系统维护中' }
} as const;

/**
 * 统一错误响应接口
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    category: ErrorCategory;
    level: ErrorLevel;
    details?: Record<string, any>;
    timestamp: string;
    requestId?: string;
    path?: string;
    method?: string;
  };
  metadata?: {
    retryable: boolean;
    helpUrl?: string;
    documentation?: string;
  };
}

/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  public readonly code: number;
  public readonly category: ErrorCategory;
  public readonly level: ErrorLevel;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly path?: string;
  public readonly method?: string;

  constructor(
    errorCode: typeof ErrorCodes[keyof typeof ErrorCodes],
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    level: ErrorLevel = ErrorLevel.MEDIUM,
    details?: Record<string, any>,
    requestContext?: {
      requestId?: string;
      path?: string;
      method?: string;
    }
  ) {
    super(errorCode.message);
    this.name = 'AppError';
    this.code = errorCode.code;
    this.category = category;
    this.level = level;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date();
    this.requestId = requestContext?.requestId;
    this.path = requestContext?.path;
    this.method = requestContext?.method;

    // 保持错误堆栈
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为错误响应格式
   */
  toErrorResponse(): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        category: this.category,
        level: this.level,
        details: this.details,
        timestamp: this.timestamp.toISOString(),
        requestId: this.requestId,
        path: this.path,
        method: this.method
      },
      metadata: {
        retryable: this.isRetryable(),
        helpUrl: this.getHelpUrl(),
        documentation: this.getDocumentation()
      }
    };
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryable(): boolean {
    const retryableCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.EXTERNAL,
      ErrorCategory.DATABASE
    ];
    
    const nonRetryableCodes = [
      ErrorCodes.VALIDATION_ERROR.code,
      ErrorCodes.UNAUTHORIZED.code,
      ErrorCodes.INSUFFICIENT_PERMISSIONS.code,
      ErrorCodes.USER_NOT_FOUND.code
    ];

    return retryableCategories.includes(this.category) && 
           !nonRetryableCodes.includes(this.code) &&
           this.level !== ErrorLevel.CRITICAL;
  }

  /**
   * 获取帮助链接
   */
  private getHelpUrl(): string | undefined {
    const helpUrls: Record<number, string> = {
      [ErrorCodes.UNAUTHORIZED.code]: '/docs/auth/unauthorized',
      [ErrorCodes.VALIDATION_ERROR.code]: '/docs/validation/errors',
      [ErrorCodes.PASSWORD_TOO_WEAK.code]: '/docs/security/password-requirements'
    };

    return helpUrls[this.code];
  }

  /**
   * 获取文档链接
   */
  private getDocumentation(): string | undefined {
    const docs: Record<number, string> = {
      [ErrorCodes.UNAUTHORIZED.code]: 'https://docs.example.com/api/auth',
      [ErrorCodes.VALIDATION_ERROR.code]: 'https://docs.example.com/api/validation'
    };

    return docs[this.code];
  }

  /**
   * 获取错误摘要（用于日志）
   */
  toSummary(): string {
    return `[${this.category}|${this.level}] ${this.code}: ${this.message}`;
  }
}

/**
 * 错误工厂类 - 创建标准化的错误
 */
export class ErrorFactory {
  /**
   * 创建验证错误
   */
  static validationError(
    message: string,
    details?: Record<string, any>,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): AppError {
    return new AppError(
      { ...ErrorCodes.VALIDATION_ERROR, message },
      ErrorCategory.VALIDATION,
      ErrorLevel.MEDIUM,
      details,
      requestContext
    );
  }

  /**
   * 创建认证错误
   */
  static authenticationError(
    errorCode: typeof ErrorCodes[keyof typeof ErrorCodes],
    details?: Record<string, any>,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): AppError {
    return new AppError(
      errorCode,
      ErrorCategory.AUTHENTICATION,
      ErrorLevel.HIGH,
      details,
      requestContext
    );
  }

  /**
   * 创建业务逻辑错误
   */
  static businessError(
    errorCode: typeof ErrorCodes[keyof typeof ErrorCodes],
    details?: Record<string, any>,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): AppError {
    return new AppError(
      errorCode,
      ErrorCategory.BUSINESS,
      ErrorLevel.MEDIUM,
      details,
      requestContext
    );
  }

  /**
   * 创建数据库错误
   */
  static databaseError(
    originalError: Error,
    details?: Record<string, any>,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): AppError {
    let errorCode = ErrorCodes.DATABASE_ERROR;
    
    // 根据原始错误类型选择合适的错误码
    if (originalError.message.includes('ECONNREFUSED')) {
      errorCode = ErrorCodes.CONNECTION_FAILED;
    } else if (originalError.message.includes('timeout')) {
      errorCode = ErrorCodes.QUERY_TIMEOUT;
    } else if (originalError.message.includes('duplicate')) {
      errorCode = ErrorCodes.DUPLICATE_ENTRY;
    }

    return new AppError(
      errorCode,
      ErrorCategory.DATABASE,
      ErrorLevel.HIGH,
      { ...details, originalError: originalError.message },
      requestContext
    );
  }

  /**
   * 创建系统错误
   */
  static systemError(
    originalError: Error,
    details?: Record<string, any>,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): AppError {
    return new AppError(
      ErrorCodes.SYSTEM_ERROR,
      ErrorCategory.SYSTEM,
      ErrorLevel.CRITICAL,
      { ...details, originalError: originalError.message },
      requestContext
    );
  }
}

/**
 * 错误响应工具类
 */
export class ErrorResponseUtil {
  /**
   * 创建成功响应
   */
  static success<T>(data: T, message = '操作成功'): { success: true; data: T; message: string } {
    return {
      success: true,
      data,
      message
    };
  }

  /**
   * 创建错误响应
   */
  static error(error: AppError): ErrorResponse {
    return error.toErrorResponse();
  }

  /**
   * 创建验证错误响应
   */
  static validationError(
    message: string,
    details?: Record<string, any>,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): ErrorResponse {
    const error = ErrorFactory.validationError(message, details, requestContext);
    return this.error(error);
  }

  /**
   * 创建未找到错误响应
   */
  static notFound(
    resource: string,
    identifier?: string,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): ErrorResponse {
    const message = identifier ? `${resource}不存在: ${identifier}` : `${resource}不存在`;
    const error = ErrorFactory.businessError(
      { ...ErrorCodes.USER_NOT_FOUND, message },
      { resource, identifier },
      requestContext
    );
    return this.error(error);
  }

  /**
   * 创建未授权错误响应
   */
  static unauthorized(
    message = '未认证',
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): ErrorResponse {
    const error = ErrorFactory.authenticationError(
      { ...ErrorCodes.UNAUTHORIZED, message },
      undefined,
      requestContext
    );
    return this.error(error);
  }

  /**
   * 创建权限不足错误响应
   */
  static forbidden(
    requiredPermission?: string,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): ErrorResponse {
    const details = requiredPermission ? { requiredPermission } : undefined;
    const error = ErrorFactory.authenticationError(
      ErrorCodes.INSUFFICIENT_PERMISSIONS,
      details,
      requestContext
    );
    return this.error(error);
  }

  /**
   * 创建业务逻辑错误响应
   */
  static businessError(
    errorCode: typeof ErrorCodes[keyof typeof ErrorCodes],
    details?: Record<string, any>,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): ErrorResponse {
    const error = ErrorFactory.businessError(errorCode, details, requestContext);
    return this.error(error);
  }

  /**
   * 创建系统错误响应
   */
  static systemError(
    originalError: Error,
    details?: Record<string, any>,
    requestContext?: { requestId?: string; path?: string; method?: string }
  ): ErrorResponse {
    const error = ErrorFactory.systemError(originalError, details, requestContext);
    return this.error(error);
  }
}

/**
 * 全局错误处理中间件
 */
export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 生成请求ID（如果不存在）
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  
  // 构建请求上下文
  const requestContext = {
    requestId,
    path: req.path,
    method: req.method
  };

  let appError: AppError;

  // 如果已经是AppError，直接使用
  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof ValidationError) {
    // 转换验证错误
    appError = ErrorFactory.validationError(
      err.message,
      undefined,
      requestContext
    );
  } else if (err instanceof UnauthorizedError) {
    // 转换认证错误
    appError = ErrorFactory.authenticationError(
      ErrorCodes.UNAUTHORIZED,
      undefined,
      requestContext
    );
  } else if (err instanceof NotFoundError) {
    // 转换未找到错误
    appError = ErrorFactory.businessError(
      ErrorCodes.USER_NOT_FOUND,
      undefined,
      requestContext
    );
  } else {
    // 转换其他错误为系统错误
    appError = ErrorFactory.systemError(
      err,
      undefined,
      requestContext
    );
  }

  // 记录错误日志
  console.error(`[Error] ${requestId} - ${appError.toSummary()}`, {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      code: appError.code,
      message: appError.message,
      category: appError.category,
      level: appError.level,
      details: appError.details,
      stack: appError.stack
    },
    timestamp: new Date().toISOString()
  });

  // 发送错误响应
  const errorResponse = appError.toErrorResponse();
  res.status(getHttpStatusCode(appError.code)).json(errorResponse);
};

/**
 * 根据错误码获取HTTP状态码
 */
function getHttpStatusCode(errorCode: number): number {
  // 根据错误码范围映射到HTTP状态码
  if (errorCode >= 2000 && errorCode < 3000) {
    return 401; // 认证相关错误
  } else if (errorCode >= 3000 && errorCode < 4000) {
    return 404; // 业务逻辑错误（资源不存在）
  } else if (errorCode >= 4000 && errorCode < 5000) {
    return 400; // 验证错误
  } else if (errorCode >= 5000 && errorCode < 6000) {
    return 413; // 文件相关错误
  } else if (errorCode >= 6000 && errorCode < 7000) {
    return 503; // 数据库错误
  } else if (errorCode >= 7000 && errorCode < 8000) {
    return 503; // 缓存错误
  } else if (errorCode >= 8000 && errorCode < 9000) {
    return 502; // 外部服务错误
  } else if (errorCode >= 9000 && errorCode < 10000) {
    return 500; // 系统错误
  }
  
  return 500; // 默认系统错误
}

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
  
  const error = ErrorFactory.businessError(
    ErrorCodes.INVALID_REQUEST,
    { path: req.path, method: req.method },
    { requestId, path: req.path, method: req.method }
  );

  const errorResponse = error.toErrorResponse();
  res.status(404).json(errorResponse);
};

/**
 * 异步错误包装器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 错误追踪工具
 */
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errorCount: Map<string, number> = new Map();
  private lastErrorTime: Map<string, Date> = new Map();

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * 记录错误
   */
  trackError(error: AppError): void {
    const key = `${error.category}-${error.code}`;
    const count = this.errorCount.get(key) || 0;
    this.errorCount.set(key, count + 1);
    this.lastErrorTime.set(key, new Date());

    // 如果错误频率过高，发送告警
    if (count > 10) {
      console.warn(`[ErrorTracker] 高频错误: ${key} - 出现次数: ${count + 1}`);
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): Record<string, { count: number; lastTime: Date | undefined }> {
    const stats: Record<string, { count: number; lastTime: Date | undefined }> = {};
    
    for (const [key, count] of this.errorCount.entries()) {
      stats[key] = {
        count,
        lastTime: this.lastErrorTime.get(key)
      };
    }
    
    return stats;
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.errorCount.clear();
    this.lastErrorTime.clear();
  }
}

// 导出原有的错误类以保持兼容性
export { ValidationError, NotFoundError, UnauthorizedError } from './error';

export default {
  AppError,
  ErrorFactory,
  ErrorResponseUtil,
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  ErrorTracker,
  ErrorCodes,
  ErrorLevel,
  ErrorCategory
};