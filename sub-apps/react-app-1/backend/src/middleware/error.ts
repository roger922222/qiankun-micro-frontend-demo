import { Request, Response, NextFunction } from 'express';

/**
 * 基础错误类 - 保持向后兼容性
 * 新的错误处理应该使用 error-handler.ts 中的 AppError
 */
export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error implements ApiError {
  statusCode = 401;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends Error implements ApiError {
  statusCode = 400;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * 数据库错误
 */
export class DatabaseError extends Error implements ApiError {
  statusCode = 500;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends Error implements ApiError {
  statusCode = 502;
  isOperational = true;
  
  constructor(message: string) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

/**
 * 简单的错误处理中间件 - 用于向后兼容
 * 推荐使用 error-handler.ts 中的 globalErrorHandler
 */
export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message } = err;
  
  console.error(`[Error] ${req.method} ${req.url} - ${statusCode}: ${message}`);
  console.error(err.stack);
  
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 错误工厂 - 用于创建标准化的错误
 */
export class ErrorFactory {
  static validationError(message: string): ValidationError {
    return new ValidationError(message);
  }

  static notFoundError(message: string): NotFoundError {
    return new NotFoundError(message);
  }

  static unauthorizedError(message: string): UnauthorizedError {
    return new UnauthorizedError(message);
  }

  static businessError(message: string): BusinessError {
    return new BusinessError(message);
  }

  static databaseError(message: string): DatabaseError {
    return new DatabaseError(message);
  }

  static externalServiceError(message: string): ExternalServiceError {
    return new ExternalServiceError(message);
  }
}

/**
 * 错误工具类
 */
export class ErrorUtil {
  /**
   * 包装错误信息
   */
  static wrapError(error: any, context?: string): Error {
    if (error instanceof Error) {
      if (context) {
        error.message = `${context}: ${error.message}`;
      }
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(context ? `${context}: ${error}` : error);
    }
    
    return new Error(context ? `${context}: ${String(error)}` : String(error));
  }

  /**
   * 获取错误堆栈信息
   */
  static getErrorStack(error: Error): string {
    return error.stack || 'No stack trace available';
  }

  /**
   * 判断是否为业务错误
   */
  static isBusinessError(error: any): boolean {
    return error instanceof BusinessError || 
           (error instanceof Error && error.name === 'BusinessError');
  }

  /**
   * 判断是否为验证错误
   */
  static isValidationError(error: any): boolean {
    return error instanceof ValidationError || 
           (error instanceof Error && error.name === 'ValidationError');
  }

  /**
   * 判断是否为认证错误
   */
  static isAuthenticationError(error: any): boolean {
    return error instanceof UnauthorizedError || 
           (error instanceof Error && error.name === 'UnauthorizedError');
  }
}