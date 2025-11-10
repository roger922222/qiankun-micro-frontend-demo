/**
 * 日志记录器
 * 提供统一的日志记录功能
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  source: string;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

/**
 * 日志记录器类
 */
export class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      maxStorageEntries: 1000,
      source: 'unknown',
      enableRemote: false,
      ...config
    };
  }

  /**
   * 记录调试日志
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * 记录信息日志
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * 记录错误日志
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const logMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
    
    this.log(LogLevel.ERROR, message, logMetadata, error?.stack);
  }

  /**
   * 记录致命错误日志
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    const logMetadata = {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };
    
    this.log(LogLevel.FATAL, message, logMetadata, error?.stack);
  }

  /**
   * 通用日志记录方法
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, stackTrace?: string): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source: this.config.source,
      metadata,
      stackTrace
    };

    // 控制台输出
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // 存储到内存
    if (this.config.enableStorage) {
      this.logToStorage(entry);
    }

    // 远程日志
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(entry);
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const { timestamp, level, message, source, metadata } = entry;
    const levelName = LogLevel[level];
    const logMessage = `[${timestamp}] [${levelName}] [${source}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, metadata);
        break;
      case LogLevel.INFO:
        console.info(logMessage, metadata);
        break;
      case LogLevel.WARN:
        console.warn(logMessage, metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logMessage, metadata);
        if (entry.stackTrace) {
          console.error(entry.stackTrace);
        }
        break;
    }
  }

  /**
   * 存储到内存
   */
  private logToStorage(entry: LogEntry): void {
    this.logs.push(entry);
    
    // 限制存储数量
    if (this.logs.length > this.config.maxStorageEntries) {
      this.logs = this.logs.slice(-this.config.maxStorageEntries);
    }
  }

  /**
   * 发送到远程服务器
   */
  private async logToRemote(entry: LogEntry): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.error('Failed to send log to remote:', error);
    }
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 按级别过滤日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 按时间范围过滤日志
   */
  getLogsByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 导出日志
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      const headers = ['timestamp', 'level', 'source', 'message', 'metadata'];
      const csvRows = [headers.join(',')];
      
      this.logs.forEach(log => {
        const row = [
          log.timestamp,
          LogLevel[log.level],
          log.source,
          `"${log.message.replace(/"/g, '""')}"`,
          log.metadata ? `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"` : ''
        ];
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 创建应用专用日志记录器
 */
export function createLogger(source: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({
    source,
    ...config
  });
}

/**
 * 全局日志记录器实例
 */
export const globalLogger = createLogger('global', {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
});

/**
 * 性能监控日志记录器
 */
export class PerformanceLogger {
  private timers: Map<string, number> = new Map();
  private logger: Logger;

  constructor(logger: Logger = globalLogger) {
    this.logger = logger;
  }

  /**
   * 开始计时
   */
  start(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * 结束计时并记录
   */
  end(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.logger.warn(`Performance timer "${name}" not found`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.logger.info(`Performance: ${name}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...metadata
    });

    return duration;
  }

  /**
   * 测量函数执行时间
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T> | T,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(name);
    try {
      const result = await fn();
      this.end(name, metadata);
      return result;
    } catch (error) {
      this.end(name, { ...metadata, error: true });
      throw error;
    }
  }
}

/**
 * 全局性能日志记录器
 */
export const performanceLogger = new PerformanceLogger();

/**
 * 错误边界日志记录器
 */
export class ErrorBoundaryLogger {
  private logger: Logger;

  constructor(logger: Logger = globalLogger) {
    this.logger = logger;
  }

  /**
   * 记录React错误边界错误
   */
  logReactError(error: Error, errorInfo: any, componentStack?: string): void {
    this.logger.error('React Error Boundary', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: componentStack,
      props: errorInfo.props
    });
  }

  /**
   * 记录Vue错误处理器错误
   */
  logVueError(error: Error, instance: any, info: string): void {
    this.logger.error('Vue Error Handler', error, {
      component: instance?.$options.name || 'Unknown',
      info,
      props: instance?.$props
    });
  }

  /**
   * 记录全局未捕获错误
   */
  logGlobalError(event: ErrorEvent): void {
    this.logger.error('Global Error', undefined, {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  }

  /**
   * 记录Promise拒绝错误
   */
  logUnhandledRejection(event: PromiseRejectionEvent): void {
    this.logger.error('Unhandled Promise Rejection', undefined, {
      reason: event.reason,
      promise: event.promise
    });
  }
}

/**
 * 全局错误边界日志记录器
 */
export const errorBoundaryLogger = new ErrorBoundaryLogger();

/**
 * 日志装饰器
 */
export function Log(level: LogLevel = LogLevel.INFO) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const logger = createLogger(target.constructor.name);

    descriptor.value = function (...args: any[]) {
      const methodName = `${target.constructor.name}.${propertyKey}`;
      
      logger.log(level, `Calling ${methodName}`, { args });
      
      try {
        const result = originalMethod.apply(this, args);
        
        if (result instanceof Promise) {
          return result
            .then(res => {
              logger.log(level, `${methodName} completed`, { result: res });
              return res;
            })
            .catch(error => {
              logger.error(`${methodName} failed`, error);
              throw error;
            });
        } else {
          logger.log(level, `${methodName} completed`, { result });
          return result;
        }
      } catch (error) {
        logger.error(`${methodName} failed`, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 自动设置全局错误处理
 */
export function setupGlobalErrorHandling(): void {
  // 全局错误处理
  window.addEventListener('error', (event) => {
    errorBoundaryLogger.logGlobalError(event);
  });

  // Promise拒绝处理
  window.addEventListener('unhandledrejection', (event) => {
    errorBoundaryLogger.logUnhandledRejection(event);
  });
}

// 自动设置全局错误处理
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling();
}