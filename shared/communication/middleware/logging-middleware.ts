/**
 * 日志中间件 - 记录事件处理详细信息
 * 提供事件日志记录、性能监控和调试信息
 */

import { BaseEvent } from '../../types/events';
import { EventMiddleware } from './event-middleware';

// ==================== 日志级别定义 ====================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

// ==================== 日志条目接口 ====================

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  eventType: string;
  eventId: string;
  source: string;
  message: string;
  duration?: number;
  metadata?: Record<string, any>;
  error?: Error;
}

// ==================== 日志存储接口 ====================

export interface LogStorage {
  write(entry: LogEntry): Promise<void>;
  read(filter?: LogFilter): Promise<LogEntry[]>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
}

export interface LogFilter {
  level?: LogLevel;
  eventType?: string;
  source?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

// ==================== 内存日志存储 ====================

export class MemoryLogStorage implements LogStorage {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async write(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }
  }

  async read(filter?: LogFilter): Promise<LogEntry[]> {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.level >= filter.level!);
      }
      
      if (filter.eventType) {
        filteredLogs = filteredLogs.filter(log => log.eventType === filter.eventType);
      }
      
      if (filter.source) {
        filteredLogs = filteredLogs.filter(log => log.source === filter.source);
      }
      
      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
      }
      
      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
      }
      
      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    return filteredLogs;
  }

  async clear(): Promise<void> {
    this.logs = [];
  }

  async getSize(): Promise<number> {
    return this.logs.length;
  }

  // 获取所有日志（用于调试）
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }
}

// ==================== 控制台日志存储 ====================

export class ConsoleLogStorage implements LogStorage {
  private logCount: number = 0;

  async write(entry: LogEntry): Promise<void> {
    this.logCount++;
    
    const levelText = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const duration = entry.duration ? ` (${entry.duration}ms)` : '';
    
    const message = `[${timestamp}] [${levelText}] [${entry.source}] ${entry.eventType}:${entry.eventId} - ${entry.message}${duration}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(message, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.metadata);
        break;
      case LogLevel.ERROR:
        console.error(message, entry.error || entry.metadata);
        break;
    }
  }

  async read(): Promise<LogEntry[]> {
    // 控制台存储不支持读取
    return [];
  }

  async clear(): Promise<void> {
    console.clear();
    this.logCount = 0;
  }

  async getSize(): Promise<number> {
    return this.logCount;
  }
}

// ==================== 复合日志存储 ====================

export class CompositeLogStorage implements LogStorage {
  private storages: LogStorage[] = [];

  constructor(storages: LogStorage[]) {
    this.storages = storages;
  }

  async write(entry: LogEntry): Promise<void> {
    await Promise.all(this.storages.map(storage => storage.write(entry)));
  }

  async read(filter?: LogFilter): Promise<LogEntry[]> {
    // 从第一个支持读取的存储中读取
    for (const storage of this.storages) {
      try {
        const logs = await storage.read(filter);
        if (logs.length > 0) {
          return logs;
        }
      } catch (error) {
        // 忽略读取错误，尝试下一个存储
      }
    }
    return [];
  }

  async clear(): Promise<void> {
    await Promise.all(this.storages.map(storage => storage.clear()));
  }

  async getSize(): Promise<number> {
    const sizes = await Promise.all(this.storages.map(storage => storage.getSize()));
    return Math.max(...sizes);
  }
}

// ==================== 日志中间件 ====================

export interface LoggingMiddlewareOptions {
  level?: LogLevel;
  storage?: LogStorage;
  includeMetadata?: boolean;
  performanceTracking?: boolean;
  eventTypeFilter?: string[];
  sourceFilter?: string[];
  customFormatter?: (event: BaseEvent, duration?: number) => string;
}

export class LoggingMiddleware implements EventMiddleware {
  public readonly name = 'logging';
  public readonly priority = 10; // 较高优先级，早期执行

  private level: LogLevel;
  private storage: LogStorage;
  private includeMetadata: boolean;
  private performanceTracking: boolean;
  private eventTypeFilter?: string[];
  private sourceFilter?: string[];
  private customFormatter?: (event: BaseEvent, duration?: number) => string;

  constructor(options: LoggingMiddlewareOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.storage = options.storage ?? new MemoryLogStorage();
    this.includeMetadata = options.includeMetadata ?? true;
    this.performanceTracking = options.performanceTracking ?? true;
    this.eventTypeFilter = options.eventTypeFilter;
    this.sourceFilter = options.sourceFilter;
    this.customFormatter = options.customFormatter;
  }

  async process<T extends BaseEvent>(event: T, next: (event: T) => Promise<void>): Promise<void> {
    // 检查是否应该记录此事件
    if (!this.shouldLog(event)) {
      await next(event);
      return;
    }

    const startTime = Date.now();
    let error: Error | undefined;

    try {
      // 记录事件开始
      await this.logEventStart(event);

      // 执行下一个中间件
      await next(event);

      // 记录事件成功完成
      if (this.performanceTracking) {
        const duration = Date.now() - startTime;
        await this.logEventComplete(event, duration);
      }

    } catch (err) {
      error = err as Error;
      
      // 记录事件错误
      const duration = Date.now() - startTime;
      await this.logEventError(event, error, duration);
      
      // 重新抛出错误
      throw error;
    }
  }

  /**
   * 检查是否应该记录此事件
   */
  private shouldLog(event: BaseEvent): boolean {
    // 检查事件类型过滤器
    if (this.eventTypeFilter && !this.eventTypeFilter.includes(event.type)) {
      return false;
    }

    // 检查来源过滤器
    if (this.sourceFilter && !this.sourceFilter.includes(event.source)) {
      return false;
    }

    return true;
  }

  /**
   * 记录事件开始
   */
  private async logEventStart(event: BaseEvent): Promise<void> {
    if (this.level <= LogLevel.DEBUG) {
      const message = this.customFormatter 
        ? this.customFormatter(event)
        : `Event started: ${event.type}`;

      await this.writeLog({
        id: `${event.id}-start`,
        timestamp: new Date().toISOString(),
        level: LogLevel.DEBUG,
        eventType: event.type,
        eventId: event.id,
        source: event.source,
        message,
        metadata: this.includeMetadata ? { event } : undefined
      });
    }
  }

  /**
   * 记录事件完成
   */
  private async logEventComplete(event: BaseEvent, duration: number): Promise<void> {
    if (this.level <= LogLevel.INFO) {
      const message = this.customFormatter 
        ? this.customFormatter(event, duration)
        : `Event completed: ${event.type}`;

      await this.writeLog({
        id: `${event.id}-complete`,
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        eventType: event.type,
        eventId: event.id,
        source: event.source,
        message,
        duration,
        metadata: this.includeMetadata ? { event } : undefined
      });
    }
  }

  /**
   * 记录事件错误
   */
  private async logEventError(event: BaseEvent, error: Error, duration: number): Promise<void> {
    if (this.level <= LogLevel.ERROR) {
      const message = `Event error: ${event.type} - ${error.message}`;

      await this.writeLog({
        id: `${event.id}-error`,
        timestamp: new Date().toISOString(),
        level: LogLevel.ERROR,
        eventType: event.type,
        eventId: event.id,
        source: event.source,
        message,
        duration,
        error,
        metadata: this.includeMetadata ? { event } : undefined
      });
    }
  }

  /**
   * 写入日志条目
   */
  private async writeLog(entry: LogEntry): Promise<void> {
    try {
      await this.storage.write(entry);
    } catch (error) {
      console.error('[LoggingMiddleware] Failed to write log entry:', error);
    }
  }

  /**
   * 获取日志
   */
  async getLogs(filter?: LogFilter): Promise<LogEntry[]> {
    return await this.storage.read(filter);
  }

  /**
   * 清除日志
   */
  async clearLogs(): Promise<void> {
    await this.storage.clear();
  }

  /**
   * 获取日志统计
   */
  async getLogStats(): Promise<{
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsByEventType: Record<string, number>;
    logsBySource: Record<string, number>;
  }> {
    const logs = await this.storage.read();
    
    const logsByLevel: Record<string, number> = {};
    const logsByEventType: Record<string, number> = {};
    const logsBySource: Record<string, number> = {};

    logs.forEach(log => {
      const levelName = LogLevel[log.level];
      logsByLevel[levelName] = (logsByLevel[levelName] || 0) + 1;
      logsByEventType[log.eventType] = (logsByEventType[log.eventType] || 0) + 1;
      logsBySource[log.source] = (logsBySource[log.source] || 0) + 1;
    });

    return {
      totalLogs: logs.length,
      logsByLevel,
      logsByEventType,
      logsBySource
    };
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 设置存储
   */
  setStorage(storage: LogStorage): void {
    this.storage = storage;
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建日志中间件
 */
export function createLoggingMiddleware(options: LoggingMiddlewareOptions = {}): LoggingMiddleware {
  return new LoggingMiddleware(options);
}

/**
 * 创建开发环境日志中间件
 */
export function createDevLoggingMiddleware(): LoggingMiddleware {
  return new LoggingMiddleware({
    level: LogLevel.DEBUG,
    storage: new CompositeLogStorage([
      new MemoryLogStorage(500),
      new ConsoleLogStorage()
    ]),
    includeMetadata: true,
    performanceTracking: true
  });
}

/**
 * 创建生产环境日志中间件
 */
export function createProdLoggingMiddleware(): LoggingMiddleware {
  return new LoggingMiddleware({
    level: LogLevel.WARN,
    storage: new MemoryLogStorage(100),
    includeMetadata: false,
    performanceTracking: false
  });
}

// ==================== 导出 ====================
// 所有导出已在上面通过 export 关键字直接声明，无需重复导出