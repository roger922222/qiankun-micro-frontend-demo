/**
 * 性能监控器 - 微前端通信性能监控
 * 提供通信性能监控、指标收集和分析功能
 */

import { BaseEvent } from '../../types/events';
import { StateAction } from '../../types/store';

// ==================== 性能监控类型定义 ====================

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  type: 'event' | 'state' | 'navigation' | 'memory';
  name: string;
  duration?: number;
  value?: number;
  metadata?: Record<string, any>;
}

export interface EventPerformanceMetric extends PerformanceMetric {
  type: 'event';
  eventType: string;
  eventId: string;
  duration: number;
  listenerCount: number;
  middlewareCount: number;
}

export interface StatePerformanceMetric extends PerformanceMetric {
  type: 'state';
  statePath: string;
  actionType: string;
  duration: number;
  stateSize: number;
  middlewareCount: number;
}

export interface NavigationPerformanceMetric extends PerformanceMetric {
  type: 'navigation';
  from: string;
  to: string;
  duration: number;
  appName?: string;
}

export interface MemoryPerformanceMetric extends PerformanceMetric {
  type: 'memory';
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

export interface PerformanceReport {
  summary: {
    totalEvents: number;
    totalStateUpdates: number;
    totalNavigations: number;
    avgEventDuration: number;
    avgStateDuration: number;
    avgNavigationDuration: number;
    memoryUsage: MemoryPerformanceMetric;
  };
  eventMetrics: EventPerformanceMetric[];
  stateMetrics: StatePerformanceMetric[];
  navigationMetrics: NavigationPerformanceMetric[];
  memoryMetrics: MemoryPerformanceMetric[];
  timeRange: {
    start: string;
    end: string;
  };
}

export interface PerformanceThresholds {
  eventDuration: number;
  stateDuration: number;
  navigationDuration: number;
  memoryUsage: number;
}

export interface PerformanceMonitorOptions {
  enabled?: boolean;
  maxMetrics?: number;
  sampleRate?: number;
  thresholds?: Partial<PerformanceThresholds>;
  autoCleanup?: boolean;
  cleanupInterval?: number;
}

// ==================== 性能监控器实现 ====================

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private enabled: boolean = true;
  private maxMetrics: number = 1000;
  private sampleRate: number = 1.0;
  private thresholds: PerformanceThresholds;
  private autoCleanup: boolean = true;
  private cleanupInterval: number = 60000; // 1分钟
  private cleanupTimer?: NodeJS.Timeout;
  private observers: Set<(metrics: PerformanceMetric[]) => void> = new Set();

  constructor(options: PerformanceMonitorOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.maxMetrics = options.maxMetrics ?? 1000;
    this.sampleRate = options.sampleRate ?? 1.0;
    this.autoCleanup = options.autoCleanup ?? true;
    this.cleanupInterval = options.cleanupInterval ?? 60000;
    
    this.thresholds = {
      eventDuration: 10, // 10ms
      stateDuration: 5,  // 5ms
      navigationDuration: 100, // 100ms
      memoryUsage: 100 * 1024 * 1024, // 100MB
      ...options.thresholds
    };

    if (this.autoCleanup) {
      this.startAutoCleanup();
    }

    // 监听内存使用情况
    this.startMemoryMonitoring();
  }

  /**
   * 监控事件处理性能
   */
  monitorEventPerformance<T extends BaseEvent>(
    event: T,
    listenerCount: number,
    middlewareCount: number,
    startTime: number
  ): void {
    if (!this.enabled || !this.shouldSample()) {
      return;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const metric: EventPerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'event',
      name: `event-${event.type}`,
      eventType: event.type,
      eventId: event.id,
      duration,
      listenerCount,
      middlewareCount,
      metadata: {
        source: event.source,
        eventSize: this.calculateObjectSize(event)
      }
    };

    this.addMetric(metric);

    // 检查性能阈值
    if (duration > this.thresholds.eventDuration) {
      this.handlePerformanceWarning('event', metric);
    }
  }

  /**
   * 监控状态更新性能
   */
  monitorStateUpdatePerformance(
    action: StateAction,
    statePath: string,
    middlewareCount: number,
    stateSize: number,
    startTime: number
  ): void {
    if (!this.enabled || !this.shouldSample()) {
      return;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const metric: StatePerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'state',
      name: `state-${action.type}`,
      statePath,
      actionType: action.type,
      duration,
      stateSize,
      middlewareCount,
      metadata: {
        payloadSize: this.calculateObjectSize(action.payload)
      }
    };

    this.addMetric(metric);

    // 检查性能阈值
    if (duration > this.thresholds.stateDuration) {
      this.handlePerformanceWarning('state', metric);
    }
  }

  /**
   * 监控导航性能
   */
  monitorNavigationPerformance(
    from: string,
    to: string,
    appName: string | undefined,
    startTime: number
  ): void {
    if (!this.enabled || !this.shouldSample()) {
      return;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const metric: NavigationPerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'navigation',
      name: `navigation-${from}-${to}`,
      from,
      to,
      duration,
      appName,
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    };

    this.addMetric(metric);

    // 检查性能阈值
    if (duration > this.thresholds.navigationDuration) {
      this.handlePerformanceWarning('navigation', metric);
    }
  }

  /**
   * 记录内存使用情况
   */
  recordMemoryUsage(): void {
    if (!this.enabled || typeof window === 'undefined') {
      return;
    }

    // 使用 performance.memory API (仅在 Chrome 中可用)
    const memory = (performance as any).memory;
    if (!memory) {
      return;
    }

    const metric: MemoryPerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'memory',
      name: 'memory-usage',
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      external: memory.usedJSHeapSize,
      arrayBuffers: 0,
      metadata: {
        limit: memory.jsHeapSizeLimit
      }
    };

    this.addMetric(metric);

    // 检查内存阈值
    if (metric.heapUsed > this.thresholds.memoryUsage) {
      this.handlePerformanceWarning('memory', metric);
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(timeRange?: { start: string; end: string }): PerformanceReport {
    let filteredMetrics = this.metrics;

    if (timeRange) {
      const startTime = new Date(timeRange.start).getTime();
      const endTime = new Date(timeRange.end).getTime();
      
      filteredMetrics = this.metrics.filter(metric => {
        const metricTime = new Date(metric.timestamp).getTime();
        return metricTime >= startTime && metricTime <= endTime;
      });
    }

    const eventMetrics = filteredMetrics.filter(m => m.type === 'event') as EventPerformanceMetric[];
    const stateMetrics = filteredMetrics.filter(m => m.type === 'state') as StatePerformanceMetric[];
    const navigationMetrics = filteredMetrics.filter(m => m.type === 'navigation') as NavigationPerformanceMetric[];
    const memoryMetrics = filteredMetrics.filter(m => m.type === 'memory') as MemoryPerformanceMetric[];

    const avgEventDuration = eventMetrics.length > 0 
      ? eventMetrics.reduce((sum, m) => sum + m.duration, 0) / eventMetrics.length 
      : 0;

    const avgStateDuration = stateMetrics.length > 0
      ? stateMetrics.reduce((sum, m) => sum + m.duration, 0) / stateMetrics.length
      : 0;

    const avgNavigationDuration = navigationMetrics.length > 0
      ? navigationMetrics.reduce((sum, m) => sum + m.duration, 0) / navigationMetrics.length
      : 0;

    const latestMemory = memoryMetrics[memoryMetrics.length - 1] || {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0
    } as MemoryPerformanceMetric;

    return {
      summary: {
        totalEvents: eventMetrics.length,
        totalStateUpdates: stateMetrics.length,
        totalNavigations: navigationMetrics.length,
        avgEventDuration,
        avgStateDuration,
        avgNavigationDuration,
        memoryUsage: latestMemory
      },
      eventMetrics,
      stateMetrics,
      navigationMetrics,
      memoryMetrics,
      timeRange: timeRange || {
        start: filteredMetrics[0]?.timestamp || new Date().toISOString(),
        end: filteredMetrics[filteredMetrics.length - 1]?.timestamp || new Date().toISOString()
      }
    };
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    this.metrics = [];
    this.notifyObservers();
  }

  /**
   * 获取实时指标
   */
  getRealTimeMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 订阅指标更新
   */
  subscribe(observer: (metrics: PerformanceMetric[]) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 设置采样率
   */
  setSampleRate(rate: number): void {
    this.sampleRate = Math.max(0, Math.min(1, rate));
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.enabled = false;
    this.clearMetrics();
    this.observers.clear();
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  // ==================== 私有方法 ====================

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // 限制指标数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.notifyObservers();
  }

  private shouldSample(): boolean {
    return Math.random() < this.sampleRate;
  }

  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateObjectSize(obj: any): number {
    try {
      return JSON.stringify(obj).length;
    } catch {
      return 0;
    }
  }

  private handlePerformanceWarning(type: string, metric: PerformanceMetric): void {
    console.warn(`[PerformanceMonitor] Performance warning - ${type}:`, metric);
    
    // 可以在这里添加更多的警告处理逻辑
    // 例如：发送到监控服务、触发告警等
  }

  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const cutoffTime = Date.now() - (5 * 60 * 1000); // 5分钟前
      const cutoffISOString = new Date(cutoffTime).toISOString();
      
      this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffISOString);
      this.notifyObservers();
    }, this.cleanupInterval);
  }

  private startMemoryMonitoring(): void {
    // 每30秒记录一次内存使用情况
    setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer(this.getRealTimeMetrics());
      } catch (error) {
        console.error('[PerformanceMonitor] Error notifying observer:', error);
      }
    });
  }
}

// ==================== 单例实例 ====================

export const globalPerformanceMonitor = new PerformanceMonitor({
  enabled: true,
  maxMetrics: 1000,
  sampleRate: 1.0,
  autoCleanup: true,
  thresholds: {
    eventDuration: 10,
    stateDuration: 5,
    navigationDuration: 100,
    memoryUsage: 100 * 1024 * 1024
  }
});

// ==================== 工具函数 ====================

/**
 * 创建性能监控装饰器
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    const startTime = performance.now();
    const result = fn(...args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - startTime;
        const metric: PerformanceMetric = {
          id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          type: 'event',
          name,
          duration,
          metadata: { args }
        };
        globalPerformanceMonitor['addMetric'](metric);
      });
    } else {
      const duration = performance.now() - startTime;
      const metric: PerformanceMetric = {
        id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        type: 'event',
        name,
        duration,
        metadata: { args }
      };
      globalPerformanceMonitor['addMetric'](metric);
      return result;
    }
  }) as T;
}

/**
 * 性能监控Hook (仅在React环境中可用)
 */
export function usePerformanceMonitor() {
  if (typeof window === 'undefined' || !(window as any).React) {
    return {
      metrics: [],
      report: null,
      clearMetrics: () => {},
      setEnabled: () => {}
    };
  }

  const React = (window as any).React;
  const [metrics, setMetrics] = React.useState([] as PerformanceMetric[]);
  const [report, setReport] = React.useState(null as PerformanceReport | null);

  React.useEffect(() => {
    const unsubscribe = globalPerformanceMonitor.subscribe(setMetrics);
    
    // 初始化数据
    setMetrics(globalPerformanceMonitor.getRealTimeMetrics());
    setReport(globalPerformanceMonitor.getPerformanceReport());

    return unsubscribe;
  }, []);

  const clearMetrics = React.useCallback(() => {
    globalPerformanceMonitor.clearMetrics();
  }, []);

  const setEnabled = React.useCallback((enabled: boolean) => {
    globalPerformanceMonitor.setEnabled(enabled);
  }, []);

  return {
    metrics,
    report,
    clearMetrics,
    setEnabled
  };
}