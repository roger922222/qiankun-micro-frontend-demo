/**
 * 错误管理器 - 微前端全局错误处理
 * 提供错误捕获、分类、统计、报告和恢复机制
 */

import { BaseEvent } from '../../types/events';
import { StateAction } from '../../types/store';

// ==================== 错误类型定义 ====================

export interface ErrorInfo {
  id: string;
  timestamp: string;
  type: ErrorType;
  level: ErrorLevel;
  message: string;
  stack?: string;
  source: ErrorSource;
  context?: ErrorContext;
  metadata?: Record<string, any>;
}

export type ErrorType = 
  | 'event-error'
  | 'state-error'
  | 'navigation-error'
  | 'network-error'
  | 'runtime-error'
  | 'validation-error'
  | 'permission-error'
  | 'timeout-error'
  | 'memory-error'
  | 'unknown-error';

export type ErrorLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorSource {
  type: 'main-app' | 'micro-app' | 'shared' | 'external';
  name: string;
  version?: string;
  url?: string;
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  route?: string;
  event?: Partial<BaseEvent>;
  action?: Partial<StateAction>;
  component?: string;
  props?: Record<string, any>;
}

export interface ErrorReport {
  summary: {
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsByLevel: Record<ErrorLevel, number>;
    errorsBySource: Record<string, number>;
    errorRate: number;
    timeRange: {
      start: string;
      end: string;
    };
  };
  recentErrors: ErrorInfo[];
  trends: {
    hourly: Array<{ timestamp: string; count: number }>;
    daily: Array<{ timestamp: string; count: number }>;
  };
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: string;
    level: ErrorLevel;
  }>;
}

export interface ErrorHandlerOptions {
  enabled?: boolean;
  maxErrors?: number;
  reportInterval?: number;
  autoReport?: boolean;
  enableConsoleLogging?: boolean;
  enableRemoteLogging?: boolean;
  remoteEndpoint?: string;
}

export type ErrorHandler = (error: ErrorInfo) => void | Promise<void>;
export type ErrorFilter = (error: ErrorInfo) => boolean;
export type ErrorTransformer = (error: ErrorInfo) => ErrorInfo;

// ==================== 错误管理器实现 ====================

export class ErrorManager {
  private errors: ErrorInfo[] = [];
  private handlers: Map<ErrorType | 'all', Set<ErrorHandler>> = new Map();
  private filters: ErrorFilter[] = [];
  private transformers: ErrorTransformer[] = [];
  private enabled: boolean = true;
  private maxErrors: number = 1000;
  private reportInterval: number = 60000; // 1分钟
  private autoReport: boolean = true;
  private enableConsoleLogging: boolean = true;
  private enableRemoteLogging: boolean = false;
  private remoteEndpoint?: string;
  private reportTimer?: NodeJS.Timeout;
  private observers: Set<(errors: ErrorInfo[]) => void> = new Set();

  constructor(options: ErrorHandlerOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.maxErrors = options.maxErrors ?? 1000;
    this.reportInterval = options.reportInterval ?? 60000;
    this.autoReport = options.autoReport ?? true;
    this.enableConsoleLogging = options.enableConsoleLogging ?? true;
    this.enableRemoteLogging = options.enableRemoteLogging ?? false;
    this.remoteEndpoint = options.remoteEndpoint;

    if (this.enabled) {
      this.setupGlobalErrorHandlers();
      
      if (this.autoReport) {
        this.startPeriodicReporting();
      }
    }
  }

  /**
   * 处理事件错误
   */
  handleEventError(error: Error, event: BaseEvent, context?: Partial<ErrorContext>): void {
    const errorInfo: ErrorInfo = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'event-error',
      level: this.determineErrorLevel(error, 'event-error'),
      message: error.message,
      stack: error.stack,
      source: this.getErrorSource('event'),
      context: {
        event: {
          type: event.type,
          source: event.source,
          id: event.id
        },
        ...context
      },
      metadata: {
        eventType: event.type,
        eventSource: event.source
      }
    };

    this.processError(errorInfo);
  }

  /**
   * 处理状态错误
   */
  handleStateError(error: Error, action: StateAction, context?: Partial<ErrorContext>): void {
    const errorInfo: ErrorInfo = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'state-error',
      level: this.determineErrorLevel(error, 'state-error'),
      message: error.message,
      stack: error.stack,
      source: this.getErrorSource('state'),
      context: {
        action: {
          type: action.type,
          payload: action.payload
        },
        ...context
      },
      metadata: {
        actionType: action.type,
        payloadSize: this.calculateObjectSize(action.payload)
      }
    };

    this.processError(errorInfo);
  }

  /**
   * 处理路由错误
   */
  handleRouteError(error: Error, route: string, context?: Partial<ErrorContext>): void {
    const errorInfo: ErrorInfo = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'navigation-error',
      level: this.determineErrorLevel(error, 'navigation-error'),
      message: error.message,
      stack: error.stack,
      source: this.getErrorSource('navigation'),
      context: {
        route,
        url: window.location.href,
        ...context
      },
      metadata: {
        route,
        userAgent: navigator.userAgent
      }
    };

    this.processError(errorInfo);
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(error: Error, url: string, method: string = 'GET', context?: Partial<ErrorContext>): void {
    const errorInfo: ErrorInfo = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'network-error',
      level: this.determineErrorLevel(error, 'network-error'),
      message: error.message,
      stack: error.stack,
      source: this.getErrorSource('network'),
      context: {
        url,
        ...context
      },
      metadata: {
        url,
        method,
        userAgent: navigator.userAgent
      }
    };

    this.processError(errorInfo);
  }

  /**
   * 处理运行时错误
   */
  handleRuntimeError(error: Error, context?: Partial<ErrorContext>): void {
    const errorInfo: ErrorInfo = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'runtime-error',
      level: this.determineErrorLevel(error, 'runtime-error'),
      message: error.message,
      stack: error.stack,
      source: this.getErrorSource('runtime'),
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      },
      metadata: {
        errorName: error.name,
        userAgent: navigator.userAgent
      }
    };

    this.processError(errorInfo);
  }

  /**
   * 处理自定义错误
   */
  handleCustomError(
    message: string,
    type: ErrorType,
    level: ErrorLevel,
    context?: Partial<ErrorContext>,
    metadata?: Record<string, any>
  ): void {
    const errorInfo: ErrorInfo = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type,
      level,
      message,
      source: this.getErrorSource('custom'),
      context,
      metadata
    };

    this.processError(errorInfo);
  }

  /**
   * 注册错误处理器
   */
  onError(type: ErrorType | 'all', handler: ErrorHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    
    this.handlers.get(type)!.add(handler);
    
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * 添加错误过滤器
   */
  addFilter(filter: ErrorFilter): () => void {
    this.filters.push(filter);
    return () => {
      const index = this.filters.indexOf(filter);
      if (index > -1) {
        this.filters.splice(index, 1);
      }
    };
  }

  /**
   * 添加错误转换器
   */
  addTransformer(transformer: ErrorTransformer): () => void {
    this.transformers.push(transformer);
    return () => {
      const index = this.transformers.indexOf(transformer);
      if (index > -1) {
        this.transformers.splice(index, 1);
      }
    };
  }

  /**
   * 获取错误报告
   */
  getErrorReport(timeRange?: { start: string; end: string }): ErrorReport {
    let filteredErrors = this.errors;

    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      
      filteredErrors = this.errors.filter(error => {
        const errorTime = new Date(error.timestamp).getTime();
        return errorTime >= startTime && errorTime <= endTime;
      });
    }

    // 按类型统计
    const errorsByType: Record<ErrorType, number> = {} as any;
    const errorsByLevel: Record<ErrorLevel, number> = {} as any;
    const errorsBySource: Record<string, number> = {};

    filteredErrors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsByLevel[error.level] = (errorsByLevel[error.level] || 0) + 1;
      errorsBySource[error.source.name] = (errorsBySource[error.source.name] || 0) + 1;
    });

    // 计算错误率
    const timeSpan = timeRange 
      ? new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()
      : 3600000; // 默认1小时
    const errorRate = (filteredErrors.length / (timeSpan / 1000)) * 60; // 每分钟错误数

    // 生成趋势数据
    const trends = this.generateTrends(filteredErrors);

    // 统计高频错误
    const errorCounts = new Map<string, { count: number; lastOccurrence: string; level: ErrorLevel }>();
    filteredErrors.forEach(error => {
      const key = error.message;
      const existing = errorCounts.get(key);
      if (existing) {
        existing.count++;
        if (new Date(error.timestamp) > new Date(existing.lastOccurrence)) {
          existing.lastOccurrence = error.timestamp;
          existing.level = error.level;
        }
      } else {
        errorCounts.set(key, {
          count: 1,
          lastOccurrence: error.timestamp,
          level: error.level
        });
      }
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      summary: {
        totalErrors: filteredErrors.length,
        errorsByType,
        errorsByLevel,
        errorsBySource,
        errorRate,
        timeRange: timeRange || {
          start: filteredErrors[0]?.timestamp || new Date().toISOString(),
          end: filteredErrors[filteredErrors.length - 1]?.timestamp || new Date().toISOString()
        }
      },
      recentErrors: filteredErrors.slice(-50),
      trends,
      topErrors
    };
  }

  /**
   * 获取所有错误
   */
  getAllErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  /**
   * 清除所有错误
   */
  clearErrors(): void {
    this.errors = [];
    this.notifyObservers();
  }

  /**
   * 订阅错误更新
   */
  subscribe(observer: (errors: ErrorInfo[]) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 启用/禁用错误管理
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 销毁错误管理器
   */
  destroy(): void {
    this.enabled = false;
    this.clearErrors();
    this.handlers.clear();
    this.filters = [];
    this.transformers = [];
    this.observers.clear();
    
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
  }

  // ==================== 私有方法 ====================

  private processError(errorInfo: ErrorInfo): void {
    if (!this.enabled) {
      return;
    }

    // 应用过滤器
    for (const filter of this.filters) {
      if (!filter(errorInfo)) {
        return;
      }
    }

    // 应用转换器
    let transformedError = errorInfo;
    for (const transformer of this.transformers) {
      transformedError = transformer(transformedError);
    }

    // 添加到错误列表
    this.addError(transformedError);

    // 控制台日志
    if (this.enableConsoleLogging) {
      this.logToConsole(transformedError);
    }

    // 远程日志
    if (this.enableRemoteLogging && this.remoteEndpoint) {
      this.logToRemote(transformedError);
    }

    // 调用处理器
    this.callHandlers(transformedError);
  }

  private addError(error: ErrorInfo): void {
    this.errors.push(error);
    
    // 限制错误数量
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    this.notifyObservers();
  }

  private callHandlers(error: ErrorInfo): void {
    // 调用特定类型的处理器
    const typeHandlers = this.handlers.get(error.type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(error);
        } catch (err) {
          console.error('[ErrorManager] Error in error handler:', err);
        }
      });
    }

    // 调用全局处理器
    const allHandlers = this.handlers.get('all');
    if (allHandlers) {
      allHandlers.forEach(handler => {
        try {
          handler(error);
        } catch (err) {
          console.error('[ErrorManager] Error in global error handler:', err);
        }
      });
    }
  }

  private logToConsole(error: ErrorInfo): void {
    const logMethod = error.level === 'critical' ? 'error' : 
                     error.level === 'high' ? 'error' :
                     error.level === 'medium' ? 'warn' : 'log';

    console[logMethod](`[ErrorManager] ${error.type.toUpperCase()}:`, {
      message: error.message,
      level: error.level,
      source: error.source,
      context: error.context,
      stack: error.stack
    });
  }

  private async logToRemote(error: ErrorInfo): Promise<void> {
    if (!this.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(error)
      });
    } catch (err) {
      console.error('[ErrorManager] Failed to log error to remote endpoint:', err);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // 全局错误处理
    window.addEventListener('error', (event) => {
      this.handleRuntimeError(event.error || new Error(event.message), {
        url: event.filename,
        component: 'global'
      });
    });

    // Promise rejection 处理
    window.addEventListener('unhandledrejection', (event) => {
      this.handleRuntimeError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        {
          component: 'promise'
        }
      );
    });
  }

  private startPeriodicReporting(): void {
    this.reportTimer = setInterval(() => {
      const report = this.getErrorReport();
      console.log('[ErrorManager] Periodic Error Report:', report.summary);
    }, this.reportInterval);
  }

  private determineErrorLevel(error: Error, type: ErrorType): ErrorLevel {
    // 根据错误类型和内容确定错误级别
    if (type === 'memory-error' || error.message.includes('out of memory')) {
      return 'critical';
    }
    
    if (type === 'network-error' && error.message.includes('timeout')) {
      return 'high';
    }
    
    if (type === 'validation-error' || type === 'permission-error') {
      return 'medium';
    }
    
    if (error.stack && error.stack.includes('TypeError')) {
      return 'high';
    }
    
    return 'medium';
  }

  private getErrorSource(_context: string): ErrorSource {
    const url = window.location.href;
    
    if (url.includes('main-app')) {
      return { type: 'main-app', name: 'main-app', url };
    }
    
    if (url.includes('react-app')) {
      const match = url.match(/react-app-(\d+)/);
      return { 
        type: 'micro-app', 
        name: match ? `react-app-${match[1]}` : 'react-app',
        url 
      };
    }
    
    if (url.includes('vue-app')) {
      const match = url.match(/vue-app-(\d+)/);
      return { 
        type: 'micro-app', 
        name: match ? `vue-app-${match[1]}` : 'vue-app',
        url 
      };
    }
    
    return { type: 'shared', name: 'shared', url };
  }

  private generateTrends(errors: ErrorInfo[]): {
    hourly: Array<{ timestamp: string; count: number }>;
    daily: Array<{ timestamp: string; count: number }>;
  } {
    const now = new Date();
    const hourly: Array<{ timestamp: string; count: number }> = [];
    const daily: Array<{ timestamp: string; count: number }> = [];

    // 生成过去24小时的数据
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 3600000);
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hourStart.getTime() + 3600000);
      
      const count = errors.filter(error => {
        const errorTime = new Date(error.timestamp);
        return errorTime >= hourStart && errorTime < hourEnd;
      }).length;

      hourly.push({
        timestamp: hourStart.toISOString(),
        count
      });
    }

    // 生成过去7天的数据
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 86400000);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      
      const count = errors.filter(error => {
        const errorTime = new Date(error.timestamp);
        return errorTime >= dayStart && errorTime < dayEnd;
      }).length;

      daily.push({
        timestamp: dayStart.toISOString(),
        count
      });
    }

    return { hourly, daily };
  }

  private calculateObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length;
    } catch {
      return 0;
    }
  }

  private generateId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer(this.getAllErrors());
      } catch (error) {
        console.error('[ErrorManager] Error notifying observer:', error);
      }
    });
  }
}

// ==================== 单例实例 ====================

export const globalErrorManager = new ErrorManager({
  enabled: true,
  maxErrors: 1000,
  autoReport: true,
  enableConsoleLogging: true,
  enableRemoteLogging: false
});

// ==================== 工具函数 ====================

/**
 * 创建错误处理装饰器
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context?: Partial<ErrorContext>
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.catch(error => {
          globalErrorManager.handleRuntimeError(error, context);
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      globalErrorManager.handleRuntimeError(error as Error, context);
      throw error;
    }
  }) as T;
}

/**
 * 错误边界Hook (仅在React环境中可用)
 */
export function useErrorHandler() {
  if (typeof window === 'undefined' || !(window as any).React) {
    return {
      handleError: (error: Error) => globalErrorManager.handleRuntimeError(error),
      errors: [],
      clearErrors: () => {}
    };
  }

  const React = (window as any).React;
  const [errors, setErrors] = React.useState([] as ErrorInfo[]);

  React.useEffect(() => {
    const unsubscribe = globalErrorManager.subscribe(setErrors);
    setErrors(globalErrorManager.getAllErrors());
    return unsubscribe;
  }, []);

  const handleError = React.useCallback((error: Error, context?: Partial<ErrorContext>) => {
    globalErrorManager.handleRuntimeError(error, context);
  }, []);

  const clearErrors = React.useCallback(() => {
    globalErrorManager.clearErrors();
  }, []);

  return {
    handleError,
    errors,
    clearErrors
  };
}