/**
 * 指标收集器 - 微前端通信指标收集和聚合
 * 提供指标收集、聚合、分析和报告功能
 */

import { PerformanceMetric } from './performance-monitor';

// ==================== 指标收集类型定义 ====================

export interface MetricAggregation {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  name: string;
  points: TimeSeriesPoint[];
  aggregation: MetricAggregation;
}

export interface MetricsSnapshot {
  id: string;
  timestamp: string;
  metrics: {
    events: {
      total: number;
      byType: Record<string, number>;
      performance: MetricAggregation;
    };
    states: {
      total: number;
      byType: Record<string, number>;
      performance: MetricAggregation;
    };
    navigation: {
      total: number;
      performance: MetricAggregation;
    };
    memory: {
      current: number;
      peak: number;
      trend: TimeSeriesData;
    };
  };
  alerts: MetricAlert[];
}

export interface MetricAlert {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  value: number;
  threshold: number;
  metadata?: Record<string, any>;
}

export interface MetricsCollectorOptions {
  enabled?: boolean;
  snapshotInterval?: number;
  maxSnapshots?: number;
  alertThresholds?: AlertThresholds;
  autoCleanup?: boolean;
}

export interface AlertThresholds {
  eventDuration: {
    warning: number;
    error: number;
    critical: number;
  };
  stateDuration: {
    warning: number;
    error: number;
    critical: number;
  };
  navigationDuration: {
    warning: number;
    error: number;
    critical: number;
  };
  memoryUsage: {
    warning: number;
    error: number;
    critical: number;
  };
  eventRate: {
    warning: number;
    error: number;
    critical: number;
  };
}

// ==================== 指标收集器实现 ====================

export class MetricsCollector {
  private snapshots: MetricsSnapshot[] = [];
  private timeSeries: Map<string, TimeSeriesData> = new Map();
  private alerts: MetricAlert[] = [];
  private enabled: boolean = true;
  private snapshotInterval: number = 60000; // 1分钟
  private maxSnapshots: number = 100;
  private alertThresholds: AlertThresholds;
  private snapshotTimer?: NodeJS.Timeout;
  private observers: Set<(snapshot: MetricsSnapshot) => void> = new Set();

  constructor(options: MetricsCollectorOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.snapshotInterval = options.snapshotInterval ?? 60000;
    this.maxSnapshots = options.maxSnapshots ?? 100;
    
    this.alertThresholds = {
      eventDuration: {
        warning: 10,
        error: 50,
        critical: 100
      },
      stateDuration: {
        warning: 5,
        error: 25,
        critical: 50
      },
      navigationDuration: {
        warning: 100,
        error: 500,
        critical: 1000
      },
      memoryUsage: {
        warning: 50 * 1024 * 1024,  // 50MB
        error: 100 * 1024 * 1024,   // 100MB
        critical: 200 * 1024 * 1024 // 200MB
      },
      eventRate: {
        warning: 100,  // 每分钟100个事件
        error: 500,    // 每分钟500个事件
        critical: 1000 // 每分钟1000个事件
      },
      ...options.alertThresholds
    };

    if (this.enabled) {
      this.startPeriodicSnapshot();
    }
  }

  /**
   * 收集性能指标
   */
  collectMetrics(metrics: PerformanceMetric[]): void {
    if (!this.enabled) {
      return;
    }

    // 更新时间序列数据
    this.updateTimeSeries(metrics);

    // 检查告警条件
    this.checkAlerts(metrics);
  }

  /**
   * 创建指标快照
   */
  createSnapshot(metrics: PerformanceMetric[]): MetricsSnapshot {
    const now = new Date().toISOString();
    const eventMetrics = metrics.filter(m => m.type === 'event');
    const stateMetrics = metrics.filter(m => m.type === 'state');
    const navigationMetrics = metrics.filter(m => m.type === 'navigation');
    const memoryMetrics = metrics.filter(m => m.type === 'memory');

    // 事件统计
    const eventsByType: Record<string, number> = {};
    eventMetrics.forEach(metric => {
      const eventType = (metric as any).eventType || 'unknown';
      eventsByType[eventType] = (eventsByType[eventType] || 0) + 1;
    });

    // 状态更新统计
    const statesByType: Record<string, number> = {};
    stateMetrics.forEach(metric => {
      const actionType = (metric as any).actionType || 'unknown';
      statesByType[actionType] = (statesByType[actionType] || 0) + 1;
    });

    // 内存使用情况
    const latestMemory = memoryMetrics[memoryMetrics.length - 1];
    const memoryValues = memoryMetrics.map(m => (m as any).heapUsed || 0);
    const peakMemory = Math.max(...memoryValues, 0);

    const snapshot: MetricsSnapshot = {
      id: this.generateId(),
      timestamp: now,
      metrics: {
        events: {
          total: eventMetrics.length,
          byType: eventsByType,
          performance: this.calculateAggregation(eventMetrics.map(m => m.duration || 0))
        },
        states: {
          total: stateMetrics.length,
          byType: statesByType,
          performance: this.calculateAggregation(stateMetrics.map(m => m.duration || 0))
        },
        navigation: {
          total: navigationMetrics.length,
          performance: this.calculateAggregation(navigationMetrics.map(m => m.duration || 0))
        },
        memory: {
          current: (latestMemory as any)?.heapUsed || 0,
          peak: peakMemory,
          trend: this.timeSeries.get('memory') || this.createEmptyTimeSeries('memory')
        }
      },
      alerts: this.getRecentAlerts(300000) // 最近5分钟的告警
    };

    this.addSnapshot(snapshot);
    return snapshot;
  }

  /**
   * 获取时间序列数据
   */
  getTimeSeries(name: string, timeRange?: { start: string; end: string }): TimeSeriesData | null {
    const series = this.timeSeries.get(name);
    if (!series) {
      return null;
    }

    if (!timeRange) {
      return series;
    }

    const startTime = new Date(timeRange.start).getTime();
    const endTime = new Date(timeRange.end).getTime();

    const filteredPoints = series.points.filter(point => {
      const pointTime = new Date(point.timestamp).getTime();
      return pointTime >= startTime && pointTime <= endTime;
    });

    return {
      ...series,
      points: filteredPoints,
      aggregation: this.calculateAggregation(filteredPoints.map(p => p.value))
    };
  }

  /**
   * 获取告警列表
   */
  getAlerts(timeRange?: { start: string; end: string }): MetricAlert[] {
    if (!timeRange) {
      return [...this.alerts];
    }

    const startTime = new Date(timeRange.start).getTime();
    const endTime = new Date(timeRange.end).getTime();

    return this.alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      return alertTime >= startTime && alertTime <= endTime;
    });
  }

  /**
   * 获取最新快照
   */
  getLatestSnapshot(): MetricsSnapshot | null {
    return this.snapshots[this.snapshots.length - 1] || null;
  }

  /**
   * 获取所有快照
   */
  getSnapshots(timeRange?: { start: string; end: string }): MetricsSnapshot[] {
    if (!timeRange) {
      return [...this.snapshots];
    }

    const startTime = new Date(timeRange.start).getTime();
    const endTime = new Date(timeRange.end).getTime();

    return this.snapshots.filter(snapshot => {
      const snapshotTime = new Date(snapshot.timestamp).getTime();
      return snapshotTime >= startTime && snapshotTime <= endTime;
    });
  }

  /**
   * 获取指标趋势分析
   */
  getTrendAnalysis(metricName: string, _period: 'hour' | 'day' | 'week' = 'hour'): {
    trend: 'up' | 'down' | 'stable';
    change: number;
    analysis: string;
  } {
    const series = this.timeSeries.get(metricName);
    if (!series || series.points.length < 2) {
      return {
        trend: 'stable',
        change: 0,
        analysis: 'Insufficient data for trend analysis'
      };
    }

    const points = series.points;
    const recent = points.slice(-10); // 最近10个数据点
    const older = points.slice(-20, -10); // 之前10个数据点

    if (older.length === 0) {
      return {
        trend: 'stable',
        change: 0,
        analysis: 'Insufficient historical data'
      };
    }

    const recentAvg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.value, 0) / older.length;
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    let trend: 'up' | 'down' | 'stable';
    let analysis: string;

    if (Math.abs(change) < 5) {
      trend = 'stable';
      analysis = `${metricName} is stable with ${change.toFixed(1)}% change`;
    } else if (change > 0) {
      trend = 'up';
      analysis = `${metricName} is trending up by ${change.toFixed(1)}%`;
    } else {
      trend = 'down';
      analysis = `${metricName} is trending down by ${Math.abs(change).toFixed(1)}%`;
    }

    return { trend, change, analysis };
  }

  /**
   * 订阅快照更新
   */
  subscribe(observer: (snapshot: MetricsSnapshot) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.snapshots = [];
    this.timeSeries.clear();
    this.alerts = [];
  }

  /**
   * 销毁收集器
   */
  destroy(): void {
    this.enabled = false;
    this.clear();
    this.observers.clear();
    
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }
  }

  // ==================== 私有方法 ====================

  private updateTimeSeries(metrics: PerformanceMetric[]): void {
    const now = new Date().toISOString();

    // 按类型分组指标
    const metricsByType = new Map<string, PerformanceMetric[]>();
    metrics.forEach(metric => {
      const key = `${metric.type}-${metric.name}`;
      if (!metricsByType.has(key)) {
        metricsByType.set(key, []);
      }
      metricsByType.get(key)!.push(metric);
    });

    // 更新时间序列
    metricsByType.forEach((typeMetrics, key) => {
      const values = typeMetrics.map(m => m.duration || m.value || 0);
      const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;

      if (!this.timeSeries.has(key)) {
        this.timeSeries.set(key, this.createEmptyTimeSeries(key));
      }

      const series = this.timeSeries.get(key)!;
      series.points.push({
        timestamp: now,
        value: avgValue,
        metadata: {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        }
      });

      // 限制数据点数量
      if (series.points.length > 1000) {
        series.points = series.points.slice(-1000);
      }

      // 更新聚合数据
      series.aggregation = this.calculateAggregation(series.points.map(p => p.value));
    });

    // 更新内存时间序列
    const memoryMetrics = metrics.filter(m => m.type === 'memory');
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1] as any;
      if (!this.timeSeries.has('memory')) {
        this.timeSeries.set('memory', this.createEmptyTimeSeries('memory'));
      }

      const memorySeries = this.timeSeries.get('memory')!;
      memorySeries.points.push({
        timestamp: now,
        value: latestMemory.heapUsed || 0,
        metadata: {
          heapTotal: latestMemory.heapTotal,
          external: latestMemory.external
        }
      });

      if (memorySeries.points.length > 1000) {
        memorySeries.points = memorySeries.points.slice(-1000);
      }

      memorySeries.aggregation = this.calculateAggregation(memorySeries.points.map(p => p.value));
    }
  }

  private checkAlerts(metrics: PerformanceMetric[]): void {
    const now = new Date().toISOString();

    // 检查事件处理时间
    const eventMetrics = metrics.filter(m => m.type === 'event' && m.duration);
    eventMetrics.forEach(metric => {
      const duration = metric.duration!;
      const level = this.getAlertLevel(duration, this.alertThresholds.eventDuration);
      
      if (level) {
        this.addAlert({
          id: this.generateId(),
          timestamp: now,
          level,
          type: 'event-duration',
          message: `Event ${metric.name} took ${duration.toFixed(2)}ms to process`,
          value: duration,
          threshold: this.alertThresholds.eventDuration[level],
          metadata: { eventType: (metric as any).eventType, eventId: metric.id }
        });
      }
    });

    // 检查状态更新时间
    const stateMetrics = metrics.filter(m => m.type === 'state' && m.duration);
    stateMetrics.forEach(metric => {
      const duration = metric.duration!;
      const level = this.getAlertLevel(duration, this.alertThresholds.stateDuration);
      
      if (level) {
        this.addAlert({
          id: this.generateId(),
          timestamp: now,
          level,
          type: 'state-duration',
          message: `State update ${metric.name} took ${duration.toFixed(2)}ms to process`,
          value: duration,
          threshold: this.alertThresholds.stateDuration[level],
          metadata: { statePath: (metric as any).statePath }
        });
      }
    });

    // 检查内存使用
    const memoryMetrics = metrics.filter(m => m.type === 'memory');
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1] as any;
      const heapUsed = latestMemory.heapUsed || 0;
      const level = this.getAlertLevel(heapUsed, this.alertThresholds.memoryUsage);
      
      if (level) {
        this.addAlert({
          id: this.generateId(),
          timestamp: now,
          level,
          type: 'memory-usage',
          message: `Memory usage is ${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
          value: heapUsed,
          threshold: this.alertThresholds.memoryUsage[level],
          metadata: { heapTotal: latestMemory.heapTotal }
        });
      }
    }

    // 检查事件频率
    const recentEvents = metrics.filter(m => {
      const metricTime = new Date(m.timestamp).getTime();
      const oneMinuteAgo = Date.now() - 60000;
      return m.type === 'event' && metricTime > oneMinuteAgo;
    });

    const eventRate = recentEvents.length;
    const rateLevel = this.getAlertLevel(eventRate, this.alertThresholds.eventRate);
    
    if (rateLevel) {
      this.addAlert({
        id: this.generateId(),
        timestamp: now,
        level: rateLevel,
        type: 'event-rate',
        message: `High event rate: ${eventRate} events per minute`,
        value: eventRate,
        threshold: this.alertThresholds.eventRate[rateLevel]
      });
    }
  }

  private getAlertLevel(
    value: number, 
    thresholds: { warning: number; error: number; critical: number }
  ): 'warning' | 'error' | 'critical' | null {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.error) return 'error';
    if (value >= thresholds.warning) return 'warning';
    return null;
  }

  private addAlert(alert: MetricAlert): void {
    this.alerts.push(alert);
    
    // 限制告警数量
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    console.warn(`[MetricsCollector] ${alert.level.toUpperCase()}: ${alert.message}`, alert);
  }

  private getRecentAlerts(timeWindow: number): MetricAlert[] {
    const cutoffTime = Date.now() - timeWindow;
    return this.alerts.filter(alert => {
      return new Date(alert.timestamp).getTime() > cutoffTime;
    });
  }

  private addSnapshot(snapshot: MetricsSnapshot): void {
    this.snapshots.push(snapshot);
    
    // 限制快照数量
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    this.notifyObservers(snapshot);
  }

  private startPeriodicSnapshot(): void {
    this.snapshotTimer = setInterval(() => {
      // 这里需要从性能监控器获取指标
      // 在实际使用中，这个方法会被外部调用
    }, this.snapshotInterval);
  }

  private calculateAggregation(values: number[]): MetricAggregation {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      count: values.length,
      sum,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99)
    };
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = (sortedValues.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private createEmptyTimeSeries(name: string): TimeSeriesData {
    return {
      name,
      points: [],
      aggregation: this.calculateAggregation([])
    };
  }

  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyObservers(snapshot: MetricsSnapshot): void {
    this.observers.forEach(observer => {
      try {
        observer(snapshot);
      } catch (error) {
        console.error('[MetricsCollector] Error notifying observer:', error);
      }
    });
  }
}

// ==================== 单例实例 ====================

export const globalMetricsCollector = new MetricsCollector({
  enabled: true,
  snapshotInterval: 60000,
  maxSnapshots: 100
});

// ==================== 工具函数 ====================

/**
 * 格式化指标值
 */
export function formatMetricValue(value: number, type: 'duration' | 'memory' | 'count'): string {
  switch (type) {
    case 'duration':
      return `${value.toFixed(2)}ms`;
    case 'memory':
      if (value < 1024) return `${value}B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)}KB`;
      if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)}MB`;
      return `${(value / 1024 / 1024 / 1024).toFixed(2)}GB`;
    case 'count':
      return value.toString();
    default:
      return value.toString();
  }
}

/**
 * 获取告警颜色
 */
export function getAlertColor(level: MetricAlert['level']): string {
  switch (level) {
    case 'info': return '#1890ff';
    case 'warning': return '#faad14';
    case 'error': return '#ff4d4f';
    case 'critical': return '#a8071a';
    default: return '#666666';
  }
}