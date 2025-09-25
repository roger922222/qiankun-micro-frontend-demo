/**
 * 性能优化工具 - 微前端通信性能优化
 * 提供事件防抖节流、状态更新批处理、内存泄漏防护等功能
 */

import { BaseEvent } from '../../types/events';
import { globalErrorManager } from '../error/error-manager';

// ==================== 类型定义 ====================

export interface DebounceOptions {
  delay: number;
  immediate?: boolean;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface ThrottleOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

export interface BatchProcessingOptions {
  batchSize: number;
  flushInterval: number;
  maxWaitTime: number;
  processor: (items: any[]) => Promise<void> | void;
}

export interface MemoryMonitorOptions {
  checkInterval: number;
  memoryThreshold: number; // MB
  onThresholdExceeded?: (usage: MemoryUsage) => void;
  autoCleanup?: boolean;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  timestamp: string;
}

export interface PerformanceMetrics {
  eventProcessingTime: number[];
  stateUpdateTime: number[];
  memoryUsage: MemoryUsage[];
  batchProcessingStats: {
    totalBatches: number;
    averageBatchSize: number;
    averageProcessingTime: number;
  };
}

// ==================== 防抖函数实现 ====================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  options: DebounceOptions
): T & { cancel: () => void; flush: () => void; pending: () => boolean } {
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: any;
  let result: ReturnType<T>;

  const { delay, immediate = false, maxWait, leading = false, trailing = true } = options;

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, delay);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): ReturnType<T> | undefined {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number): ReturnType<T> {
    timeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    lastThis = undefined;
    return result;
  }

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastCallTime = 0;
    lastArgs = undefined;
    lastThis = undefined;
    timeoutId = null;
    maxTimeoutId = null;
  }

  function flush(): ReturnType<T> {
    return timeoutId === null ? result : trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  function debounced(this: any, ...args: Parameters<T>): ReturnType<T> {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        timeoutId = setTimeout(timerExpired, delay);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, delay);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced as T & { cancel: () => void; flush: () => void; pending: () => boolean };
}

// ==================== 节流函数实现 ====================

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  options: ThrottleOptions
): T & { cancel: () => void; flush: () => void } {
  const { delay, leading = true, trailing = true } = options;

  return debounce(func, {
    delay,
    maxWait: delay,
    leading,
    trailing
  });
}

// ==================== 批处理管理器 ====================

export class BatchProcessor<T = any> {
  private items: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private lastFlushTime: number = 0;
  private stats = {
    totalBatches: 0,
    totalItems: 0,
    averageBatchSize: 0,
    averageProcessingTime: 0,
    processingTimes: [] as number[]
  };

  constructor(private options: BatchProcessingOptions) {
    this.lastFlushTime = Date.now();
  }

  /**
   * 添加项目到批处理队列
   */
  add(item: T): void {
    this.items.push(item);

    // 检查是否达到批处理大小
    if (this.items.length >= this.options.batchSize) {
      this.flush();
      return;
    }

    // 检查是否超过最大等待时间
    const now = Date.now();
    if (now - this.lastFlushTime >= this.options.maxWaitTime) {
      this.flush();
      return;
    }

    // 设置定时器
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.options.flushInterval);
    }
  }

  /**
   * 立即处理所有待处理项目
   */
  async flush(): Promise<void> {
    if (this.items.length === 0) {
      return;
    }

    const itemsToProcess = [...this.items];
    this.items = [];
    this.lastFlushTime = Date.now();

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const startTime = performance.now();

    try {
      await this.options.processor(itemsToProcess);
      
      // 更新统计
      const processingTime = performance.now() - startTime;
      this.updateStats(itemsToProcess.length, processingTime);

    } catch (error) {
      globalErrorManager.handleCustomError(
        `Batch processing failed: ${(error as Error).message}`,
        'system',
        'medium',
        { batchSize: itemsToProcess.length }
      );
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.items = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * 销毁批处理器
   */
  destroy(): void {
    this.clear();
  }

  private updateStats(batchSize: number, processingTime: number): void {
    this.stats.totalBatches++;
    this.stats.totalItems += batchSize;
    this.stats.averageBatchSize = this.stats.totalItems / this.stats.totalBatches;
    
    this.stats.processingTimes.push(processingTime);
    if (this.stats.processingTimes.length > 100) {
      this.stats.processingTimes = this.stats.processingTimes.slice(-100);
    }
    
    this.stats.averageProcessingTime = this.stats.processingTimes.reduce((a, b) => a + b, 0) / this.stats.processingTimes.length;
  }
}

// ==================== 内存监控器 ====================

export class MemoryMonitor {
  private timer: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryUsage[] = [];
  private observers: Set<(usage: MemoryUsage) => void> = new Set();
  private cleanupTasks: Set<() => void> = new Set();

  constructor(private options: MemoryMonitorOptions) {
    this.start();
  }

  /**
   * 开始内存监控
   */
  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.options.checkInterval);
  }

  /**
   * 停止内存监控
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 获取当前内存使用情况
   */
  getCurrentMemoryUsage(): MemoryUsage | null {
    if (typeof performance === 'undefined' || !performance.memory) {
      return null;
    }

    const memory = performance.memory;
    const used = memory.usedJSHeapSize / (1024 * 1024); // MB
    const total = memory.totalJSHeapSize / (1024 * 1024); // MB
    const percentage = (used / total) * 100;

    return {
      used,
      total,
      percentage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取内存使用历史
   */
  getMemoryHistory(): MemoryUsage[] {
    return [...this.memoryHistory];
  }

  /**
   * 注册清理任务
   */
  registerCleanupTask(task: () => void): () => void {
    this.cleanupTasks.add(task);
    return () => this.cleanupTasks.delete(task);
  }

  /**
   * 订阅内存使用更新
   */
  subscribe(observer: (usage: MemoryUsage) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 手动触发清理
   */
  cleanup(): void {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('[MemoryMonitor] Cleanup task failed:', error);
      }
    });

    // 建议垃圾回收（仅在支持的环境中）
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stop();
    this.cleanupTasks.clear();
    this.observers.clear();
    this.memoryHistory = [];
  }

  private checkMemoryUsage(): void {
    const usage = this.getCurrentMemoryUsage();
    if (!usage) {
      return;
    }

    // 添加到历史记录
    this.memoryHistory.push(usage);
    
    // 限制历史记录大小
    if (this.memoryHistory.length > 1000) {
      this.memoryHistory = this.memoryHistory.slice(-1000);
    }

    // 检查是否超过阈值
    if (usage.used > this.options.memoryThreshold) {
      if (this.options.onThresholdExceeded) {
        this.options.onThresholdExceeded(usage);
      }

      if (this.options.autoCleanup) {
        this.cleanup();
      }
    }

    // 通知观察者
    this.observers.forEach(observer => {
      try {
        observer(usage);
      } catch (error) {
        console.error('[MemoryMonitor] Observer error:', error);
      }
    });
  }
}

// ==================== 性能优化管理器 ====================

export class PerformanceOptimizer {
  private batchProcessors: Map<string, BatchProcessor> = new Map();
  private memoryMonitor: MemoryMonitor;
  private metrics: PerformanceMetrics = {
    eventProcessingTime: [],
    stateUpdateTime: [],
    memoryUsage: [],
    batchProcessingStats: {
      totalBatches: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0
    }
  };

  constructor() {
    this.memoryMonitor = new MemoryMonitor({
      checkInterval: 10000, // 10秒
      memoryThreshold: 100, // 100MB
      autoCleanup: true,
      onThresholdExceeded: (usage) => {
        console.warn('[PerformanceOptimizer] Memory threshold exceeded:', usage);
      }
    });

    this.setupMemoryMonitoring();
  }

  /**
   * 创建防抖函数
   */
  createDebouncedFunction<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    options?: Partial<DebounceOptions>
  ): T & { cancel: () => void; flush: () => void; pending: () => boolean } {
    return debounce(func, { delay, ...options });
  }

  /**
   * 创建节流函数
   */
  createThrottledFunction<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    options?: Partial<ThrottleOptions>
  ): T & { cancel: () => void; flush: () => void } {
    return throttle(func, { delay, ...options });
  }

  /**
   * 创建批处理器
   */
  createBatchProcessor<T>(
    id: string,
    options: BatchProcessingOptions
  ): BatchProcessor<T> {
    const processor = new BatchProcessor<T>(options);
    this.batchProcessors.set(id, processor);
    return processor;
  }

  /**
   * 获取批处理器
   */
  getBatchProcessor<T>(id: string): BatchProcessor<T> | undefined {
    return this.batchProcessors.get(id) as BatchProcessor<T> | undefined;
  }

  /**
   * 移除批处理器
   */
  removeBatchProcessor(id: string): boolean {
    const processor = this.batchProcessors.get(id);
    if (processor) {
      processor.destroy();
      this.batchProcessors.delete(id);
      return true;
    }
    return false;
  }

  /**
   * 监控函数执行性能
   */
  monitorFunction<T extends (...args: any[]) => any>(
    func: T,
    category: 'event' | 'state' | 'other' = 'other'
  ): T {
    return ((...args: any[]) => {
      const startTime = performance.now();
      
      try {
        const result = func(...args);
        
        if (result instanceof Promise) {
          return result.finally(() => {
            const duration = performance.now() - startTime;
            this.recordMetric(category, duration);
          });
        } else {
          const duration = performance.now() - startTime;
          this.recordMetric(category, duration);
          return result;
        }
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordMetric(category, duration);
        throw error;
      }
    }) as T;
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    this.updateBatchProcessingStats();
    return {
      ...this.metrics,
      memoryUsage: this.memoryMonitor.getMemoryHistory()
    };
  }

  /**
   * 清除性能指标
   */
  clearMetrics(): void {
    this.metrics = {
      eventProcessingTime: [],
      stateUpdateTime: [],
      memoryUsage: [],
      batchProcessingStats: {
        totalBatches: 0,
        averageBatchSize: 0,
        averageProcessingTime: 0
      }
    };
  }

  /**
   * 注册内存清理任务
   */
  registerMemoryCleanup(task: () => void): () => void {
    return this.memoryMonitor.registerCleanupTask(task);
  }

  /**
   * 手动触发内存清理
   */
  cleanup(): void {
    this.memoryMonitor.cleanup();
    
    // 清理过期的性能指标
    this.cleanupMetrics();
  }

  /**
   * 销毁优化器
   */
  destroy(): void {
    this.batchProcessors.forEach(processor => processor.destroy());
    this.batchProcessors.clear();
    this.memoryMonitor.destroy();
    this.clearMetrics();
  }

  // ==================== 私有方法 ====================

  private setupMemoryMonitoring(): void {
    this.memoryMonitor.subscribe((usage) => {
      this.metrics.memoryUsage.push(usage);
      
      // 限制内存使用历史大小
      if (this.metrics.memoryUsage.length > 1000) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-1000);
      }
    });
  }

  private recordMetric(category: 'event' | 'state' | 'other', duration: number): void {
    switch (category) {
      case 'event':
        this.metrics.eventProcessingTime.push(duration);
        if (this.metrics.eventProcessingTime.length > 1000) {
          this.metrics.eventProcessingTime = this.metrics.eventProcessingTime.slice(-1000);
        }
        break;
      case 'state':
        this.metrics.stateUpdateTime.push(duration);
        if (this.metrics.stateUpdateTime.length > 1000) {
          this.metrics.stateUpdateTime = this.metrics.stateUpdateTime.slice(-1000);
        }
        break;
    }
  }

  private updateBatchProcessingStats(): void {
    let totalBatches = 0;
    let totalBatchSize = 0;
    let totalProcessingTime = 0;
    let processorCount = 0;

    this.batchProcessors.forEach(processor => {
      const stats = processor.getStats();
      totalBatches += stats.totalBatches;
      totalBatchSize += stats.averageBatchSize * stats.totalBatches;
      totalProcessingTime += stats.averageProcessingTime;
      processorCount++;
    });

    this.metrics.batchProcessingStats = {
      totalBatches,
      averageBatchSize: totalBatches > 0 ? totalBatchSize / totalBatches : 0,
      averageProcessingTime: processorCount > 0 ? totalProcessingTime / processorCount : 0
    };
  }

  private cleanupMetrics(): void {
    const oneHourAgo = Date.now() - 3600000; // 1小时前

    // 清理内存使用历史
    this.metrics.memoryUsage = this.metrics.memoryUsage.filter(usage => 
      new Date(usage.timestamp).getTime() > oneHourAgo
    );
  }
}

// ==================== 单例实例 ====================

export const globalPerformanceOptimizer = new PerformanceOptimizer();

// ==================== 工具函数 ====================

/**
 * 创建防抖事件处理器
 */
export function createDebouncedEventHandler<T extends BaseEvent>(
  handler: (event: T) => void | Promise<void>,
  delay: number = 300
): (event: T) => void {
  return globalPerformanceOptimizer.createDebouncedFunction(handler, delay);
}

/**
 * 创建节流事件处理器
 */
export function createThrottledEventHandler<T extends BaseEvent>(
  handler: (event: T) => void | Promise<void>,
  delay: number = 100
): (event: T) => void {
  return globalPerformanceOptimizer.createThrottledFunction(handler, delay);
}

/**
 * 创建状态更新批处理器
 */
export function createStateUpdateBatcher(
  updateHandler: (updates: any[]) => void | Promise<void>,
  options?: Partial<BatchProcessingOptions>
): BatchProcessor {
  return globalPerformanceOptimizer.createBatchProcessor('state-updates', {
    batchSize: 10,
    flushInterval: 100,
    maxWaitTime: 500,
    processor: updateHandler,
    ...options
  });
}

/**
 * 监控函数性能
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  func: T,
  category: 'event' | 'state' | 'other' = 'other'
): T {
  return globalPerformanceOptimizer.monitorFunction(func, category);
}

/**
 * 内存安全的函数包装器
 */
export function withMemoryProtection<T extends (...args: any[]) => any>(
  func: T,
  cleanupCallback?: () => void
): T {
  if (cleanupCallback) {
    globalPerformanceOptimizer.registerMemoryCleanup(cleanupCallback);
  }

  return ((...args: any[]) => {
    try {
      return func(...args);
    } catch (error) {
      // 在错误时触发清理
      globalPerformanceOptimizer.cleanup();
      throw error;
    }
  }) as T;
}