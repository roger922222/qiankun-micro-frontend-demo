import { createWriteStream } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';
import { AppError, ErrorLevel, ErrorCategory } from './error-handler';

/**
 * 错误日志接口
 */
export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  level: ErrorLevel;
  category: ErrorCategory;
  code: number;
  message: string;
  details?: Record<string, any>;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  stack?: string;
  environment: string;
  service: string;
  version: string;
}

/**
 * 错误统计信息
 */
export interface ErrorStats {
  totalErrors: number;
  byLevel: Record<ErrorLevel, number>;
  byCategory: Record<ErrorCategory, number>;
  byCode: Record<number, number>;
  recentErrors: ErrorLogEntry[];
  hourlyTrend: Array<{ hour: string; count: number }>;
  topErrorCodes: Array<{ code: number; message: string; count: number }>;
  errorRate: number; // 错误率 (错误数/总请求数)
}

/**
 * 错误日志管理器
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private logStream: ReturnType<typeof createWriteStream>;
  private errorBuffer: ErrorLogEntry[] = [];
  private maxBufferSize = 1000;
  private flushInterval = 5000; // 5秒刷新一次
  private flushTimer?: NodeJS.Timeout;
  private errorStats: ErrorStats;
  private requestCount = 0;
  private errorCount = 0;

  private constructor() {
    this.logStream = this.createLogStream();
    this.errorStats = this.initializeStats();
    this.startFlushTimer();
  }

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * 创建日志文件流
   */
  private createLogStream(): ReturnType<typeof createWriteStream> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const logFile = join(process.cwd(), 'logs', 'errors', `error-${today}.log`);
    
    return createWriteStream(logFile, { flags: 'a' });
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): ErrorStats {
    return {
      totalErrors: 0,
      byLevel: {
        [ErrorLevel.LOW]: 0,
        [ErrorLevel.MEDIUM]: 0,
        [ErrorLevel.HIGH]: 0,
        [ErrorLevel.CRITICAL]: 0
      },
      byCategory: {
        [ErrorCategory.VALIDATION]: 0,
        [ErrorCategory.AUTHENTICATION]: 0,
        [ErrorCategory.AUTHORIZATION]: 0,
        [ErrorCategory.BUSINESS]: 0,
        [ErrorCategory.DATABASE]: 0,
        [ErrorCategory.NETWORK]: 0,
        [ErrorCategory.SYSTEM]: 0,
        [ErrorCategory.EXTERNAL]: 0,
        [ErrorCategory.UNKNOWN]: 0
      },
      byCode: {},
      recentErrors: [],
      hourlyTrend: this.generateHourlyTrend(),
      topErrorCodes: [],
      errorRate: 0
    };
  }

  /**
   * 生成小时趋势数据
   */
  private generateHourlyTrend(): Array<{ hour: string; count: number }> {
    const trend = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      trend.push({
        hour: format(hour, 'HH:00'),
        count: 0
      });
    }
    
    return trend;
  }

  /**
   * 记录错误
   */
  logError(error: AppError | Error, context?: {
    requestId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
  }): void {
    const errorEntry = this.createErrorEntry(error, context);
    
    // 添加到缓冲区
    this.errorBuffer.push(errorEntry);
    
    // 更新统计信息
    this.updateStats(errorEntry);
    
    // 如果缓冲区满了，立即刷新
    if (this.errorBuffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * 创建错误条目
   */
  private createErrorEntry(error: AppError | Error, context?: any): ErrorLogEntry {
    const now = new Date();
    const baseEntry: Partial<ErrorLogEntry> = {
      id: this.generateErrorId(),
      timestamp: now,
      environment: process.env.NODE_ENV || 'development',
      service: 'user-management-backend',
      version: process.env.npm_package_version || '1.0.0',
      ...context
    };

    if (error instanceof AppError) {
      return {
        ...baseEntry,
        level: error.level,
        category: error.category,
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: error.requestId || context?.requestId,
        path: error.path || context?.path,
        method: error.method || context?.method,
        stack: error.stack
      } as ErrorLogEntry;
    } else {
      return {
        ...baseEntry,
        level: ErrorLevel.MEDIUM,
        category: ErrorCategory.SYSTEM,
        code: 9001, // SYSTEM_ERROR
        message: error.message,
        stack: error.stack
      } as ErrorLogEntry;
    }
  }

  /**
   * 生成错误ID
   */
  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `ERR-${timestamp}-${random}`;
  }

  /**
   * 更新统计信息
   */
  private updateStats(errorEntry: ErrorLogEntry): void {
    this.errorStats.totalErrors++;
    this.errorStats.byLevel[errorEntry.level]++;
    this.errorStats.byCategory[errorEntry.category]++;
    
    // 更新错误码统计
    this.errorStats.byCode[errorEntry.code] = 
      (this.errorStats.byCode[errorEntry.code] || 0) + 1;
    
    // 更新最近错误
    this.errorStats.recentErrors.unshift(errorEntry);
    if (this.errorStats.recentErrors.length > 100) {
      this.errorStats.recentErrors = this.errorStats.recentErrors.slice(0, 100);
    }
    
    // 更新小时趋势
    const currentHour = format(errorEntry.timestamp, 'HH:00');
    const trendEntry = this.errorStats.hourlyTrend.find(t => t.hour === currentHour);
    if (trendEntry) {
      trendEntry.count++;
    }
    
    // 更新热门错误码
    this.updateTopErrorCodes();
    
    // 更新错误率
    this.updateErrorRate();
  }

  /**
   * 更新热门错误码
   */
  private updateTopErrorCodes(): void {
    const codeEntries = Object.entries(this.errorStats.byCode)
      .map(([code, count]) => ({
        code: parseInt(code),
        message: this.getErrorMessage(parseInt(code)),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    this.errorStats.topErrorCodes = codeEntries;
  }

  /**
   * 获取错误消息
   */
  private getErrorMessage(code: number): string {
    // 这里可以根据错误码返回对应的消息
    // 简化实现，返回通用消息
    return `Error ${code}`;
  }

  /**
   * 更新错误率
   */
  private updateErrorRate(): void {
    // 这里应该根据实际的请求数和错误数计算
    // 简化实现，使用模拟数据
    this.errorStats.errorRate = this.errorCount / Math.max(this.requestCount, 1);
  }

  /**
   * 记录请求（用于计算错误率）
   */
  recordRequest(): void {
    this.requestCount++;
  }

  /**
   * 开始刷新定时器
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * 刷新缓冲区
   */
  private flush(): void {
    if (this.errorBuffer.length === 0) return;

    const errorsToWrite = [...this.errorBuffer];
    this.errorBuffer = [];

    errorsToWrite.forEach(errorEntry => {
      const logLine = JSON.stringify(errorEntry) + '\n';
      this.logStream.write(logLine);
    });

    // 控制台输出关键错误
    const criticalErrors = errorsToWrite.filter(e => e.level === ErrorLevel.CRITICAL);
    if (criticalErrors.length > 0) {
      console.error(`[ErrorLogger] 发现 ${criticalErrors.length} 个关键错误`);
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  /**
   * 获取指定时间范围内的错误
   */
  getErrorsByTimeRange(startTime: Date, endTime: Date): ErrorLogEntry[] {
    return this.errorStats.recentErrors.filter(error => 
      error.timestamp >= startTime && error.timestamp <= endTime
    );
  }

  /**
   * 获取指定类别的错误
   */
  getErrorsByCategory(category: ErrorCategory): ErrorLogEntry[] {
    return this.errorStats.recentErrors.filter(error => error.category === category);
  }

  /**
   * 获取指定级别的错误
   */
  getErrorsByLevel(level: ErrorLevel): ErrorLogEntry[] {
    return this.errorStats.recentErrors.filter(error => error.level === level);
  }

  /**
   * 获取指定错误码的错误
   */
  getErrorsByCode(code: number): ErrorLogEntry[] {
    return this.errorStats.recentErrors.filter(error => error.code === code);
  }

  /**
   * 获取错误趋势
   */
  getErrorTrend(hours: number = 24): Array<{ hour: string; count: number }> {
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    const trend: Array<{ hour: string; count: number }> = [];
    
    for (let i = 0; i < hours; i++) {
      const hour = new Date(startTime.getTime() + i * 60 * 60 * 1000);
      const hourStr = format(hour, 'HH:00');
      const count = this.errorStats.recentErrors.filter(error => {
        const errorHour = format(error.timestamp, 'HH:00');
        return errorHour === hourStr && error.timestamp >= startTime;
      }).length;
      
      trend.push({ hour: hourStr, count });
    }
    
    return trend;
  }

  /**
   * 清理过期错误（保留最近7天）
   */
  cleanup(): void {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.errorStats.recentErrors = this.errorStats.recentErrors.filter(
      error => error.timestamp >= sevenDaysAgo
    );
    
    // 重置统计信息
    this.initializeStats();
  }

  /**
   * 关闭日志器
   */
  shutdown(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // 刷新剩余的错误
    this.flush();
    
    // 关闭文件流
    this.logStream.end();
  }
}

/**
 * 错误分析器
 */
export class ErrorAnalyzer {
  /**
   * 分析错误模式
   */
  static analyzePatterns(errors: ErrorLogEntry[]): Array<{
    pattern: string;
    count: number;
    examples: ErrorLogEntry[];
  }> {
    const patterns = new Map<string, { count: number; examples: ErrorLogEntry[] }>();
    
    errors.forEach(error => {
      // 简化的模式识别：基于错误码和类别
      const pattern = `${error.category}-${error.code}`;
      
      if (!patterns.has(pattern)) {
        patterns.set(pattern, { count: 0, examples: [] });
      }
      
      const patternData = patterns.get(pattern)!;
      patternData.count++;
      
      if (patternData.examples.length < 5) {
        patternData.examples.push(error);
      }
    });
    
    return Array.from(patterns.entries()).map(([pattern, data]) => ({
      pattern,
      count: data.count,
      examples: data.examples
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * 生成错误报告
   */
  static generateReport(stats: ErrorStats): string {
    const report = [];
    
    report.push('=== 错误分析报告 ===');
    report.push(`生成时间: ${new Date().toISOString()}`);
    report.push(`总错误数: ${stats.totalErrors}`);
    report.push(`错误率: ${(stats.errorRate * 100).toFixed(2)}%`);
    report.push('');
    
    report.push('按级别分布:');
    Object.entries(stats.byLevel).forEach(([level, count]) => {
      report.push(`  ${level}: ${count}`);
    });
    report.push('');
    
    report.push('按类别分布:');
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      report.push(`  ${category}: ${count}`);
    });
    report.push('');
    
    report.push('热门错误码:');
    stats.topErrorCodes.forEach(({ code, message, count }) => {
      report.push(`  ${code} (${message}): ${count}`);
    });
    
    return report.join('\n');
  }

  /**
   * 识别潜在问题
   */
  static identifyIssues(stats: ErrorStats): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }> {
    const issues = [];
    
    // 检查错误率
    if (stats.errorRate > 0.1) { // 10%错误率
      issues.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'high',
        description: `错误率过高: ${(stats.errorRate * 100).toFixed(2)}%`,
        recommendation: '检查系统负载和错误日志，识别主要错误来源'
      });
    }
    
    // 检查关键错误
    if (stats.byLevel[ErrorLevel.CRITICAL] > 10) {
      issues.push({
        type: 'MANY_CRITICAL_ERRORS',
        severity: 'critical',
        description: `关键错误过多: ${stats.byLevel[ErrorLevel.CRITICAL]}`,
        recommendation: '立即检查关键错误，可能需要紧急修复'
      });
    }
    
    // 检查数据库错误
    if (stats.byCategory[ErrorCategory.DATABASE] > 50) {
      issues.push({
        type: 'DATABASE_ISSUES',
        severity: 'medium',
        description: `数据库错误较多: ${stats.byCategory[ErrorCategory.DATABASE]}`,
        recommendation: '检查数据库连接、查询性能和资源使用情况'
      });
    }
    
    return issues;
  }
}

// 便捷函数
export const errorLogger = ErrorLogger.getInstance();

/**
 * 记录应用错误
 */
export const logAppError = (
  error: AppError | Error,
  context?: {
    requestId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
  }
): void => {
  errorLogger.logError(error, context);
};

/**
 * 记录请求错误
 */
export const logRequestError = (
  error: AppError | Error,
  req: any
): void => {
  logAppError(error, {
    requestId: req.headers?.['x-request-id'],
    userId: req.user?.userId,
    ip: req.ip,
    userAgent: req.get?.('User-Agent'),
    path: req.path,
    method: req.method
  });
};

export default {
  ErrorLogger,
  ErrorAnalyzer,
  errorLogger,
  logAppError,
  logRequestError
};