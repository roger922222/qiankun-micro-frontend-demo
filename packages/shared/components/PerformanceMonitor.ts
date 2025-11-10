/**
 * 性能监控面板 - 实时性能数据展示
 * 提供性能监控数据的JavaScript接口，可以被任何框架使用
 */

import {
  globalPerformanceMonitor,
  PerformanceReport
} from '../communication/monitoring/performance-monitor';
import {
  globalMetricsCollector,
  MetricsSnapshot,
  MetricAlert,
  formatMetricValue,
  getAlertColor
} from '../communication/monitoring/metrics-collector';

// ==================== 类型定义 ====================

export interface PerformanceMonitorOptions {
  refreshInterval?: number;
  showAlerts?: boolean;
  showTimeSeries?: boolean;
  maxDataPoints?: number;
  container?: HTMLElement;
}

export interface PerformanceDisplayData {
  totalEvents: number;
  avgEventDuration: number;
  totalStateUpdates: number;
  avgStateDuration: number;
  totalNavigations: number;
  avgNavigationDuration: number;
  currentMemory: number;
  peakMemory: number;
  alerts: MetricAlert[];
  timeSeriesData: Array<{ timestamp: string; value: number }>;
}

// ==================== 性能监控器类 ====================

export class PerformanceMonitorUI {
  private options: PerformanceMonitorOptions;
  private container?: HTMLElement;
  private refreshTimer?: any;
  private observers: Set<(data: PerformanceDisplayData) => void> = new Set();
  private enabled: boolean = true;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.options = {
      refreshInterval: 5000,
      showAlerts: true,
      showTimeSeries: true,
      maxDataPoints: 50,
      ...options
    };

    this.container = options.container;

    if (this.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * 开始监控
   */
  startMonitoring(): void {
    this.enabled = true;
    
    // 订阅性能监控器更新
    globalPerformanceMonitor.subscribe(() => {
      this.updateDisplay();
    });

    // 订阅指标收集器更新
    globalMetricsCollector.subscribe(() => {
      this.updateDisplay();
    });

    // 定期更新
    this.refreshTimer = setInterval(() => {
      if (this.enabled) {
        const currentMetrics = globalPerformanceMonitor.getRealTimeMetrics();
        globalMetricsCollector.collectMetrics(currentMetrics);
        
        globalMetricsCollector.createSnapshot(currentMetrics);
        this.updateDisplay();
      }
    }, this.options.refreshInterval);

    // 初始更新
    this.updateDisplay();
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    this.enabled = false;
    
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  /**
   * 获取当前性能数据
   */
  getCurrentData(): PerformanceDisplayData | null {
    const snapshot = globalMetricsCollector.getLatestSnapshot();
    if (!snapshot) return null;

    const memoryTrend = snapshot.metrics.memory.trend;
    const timeSeriesData = memoryTrend.points.slice(-this.options.maxDataPoints!);

    return {
      totalEvents: snapshot.metrics.events.total,
      avgEventDuration: snapshot.metrics.events.performance.avg,
      totalStateUpdates: snapshot.metrics.states.total,
      avgStateDuration: snapshot.metrics.states.performance.avg,
      totalNavigations: snapshot.metrics.navigation.total,
      avgNavigationDuration: snapshot.metrics.navigation.performance.avg,
      currentMemory: snapshot.metrics.memory.current,
      peakMemory: snapshot.metrics.memory.peak,
      alerts: snapshot.alerts,
      timeSeriesData
    };
  }

  /**
   * 订阅数据更新
   */
  subscribe(observer: (data: PerformanceDisplayData) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 清除所有数据
   */
  clearData(): void {
    globalPerformanceMonitor.clearMetrics();
    globalMetricsCollector.clear();
    this.updateDisplay();
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    if (enabled && !this.enabled) {
      this.startMonitoring();
    } else if (!enabled && this.enabled) {
      this.stopMonitoring();
    }
    
    globalPerformanceMonitor.setEnabled(enabled);
  }

  /**
   * 创建HTML显示界面
   */
  createHTMLDisplay(): string {
    const data = this.getCurrentData();
    if (!data) {
      return '<div class="performance-monitor">Loading performance data...</div>';
    }

    return `
      <div class="performance-monitor" style="padding: 20px; background: #f5f5f5; border-radius: 8px; font-family: Arial, sans-serif;">
        <div class="header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0;">
          <h2 style="font-size: 24px; font-weight: bold; color: #333; margin: 0;">Performance Monitor</h2>
          <div class="controls">
            <button onclick="performanceMonitor.clearData()" style="padding: 8px 16px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer;">Clear Data</button>
          </div>
        </div>
        
        <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 20px;">
          ${this.createMetricCard('Total Events', data.totalEvents.toString(), '', '#333', 'Events processed')}
          ${this.createMetricCard('Avg Event Duration', data.avgEventDuration.toFixed(2), 'ms', data.avgEventDuration > 10 ? '#ff4d4f' : '#52c41a', 'Average event processing time')}
          ${this.createMetricCard('State Updates', data.totalStateUpdates.toString(), '', '#333', 'State changes processed')}
          ${this.createMetricCard('Avg State Duration', data.avgStateDuration.toFixed(2), 'ms', data.avgStateDuration > 5 ? '#ff4d4f' : '#52c41a', 'Average state update time')}
          ${this.createMetricCard('Navigation Count', data.totalNavigations.toString(), '', '#333', 'Navigation events')}
          ${this.createMetricCard('Memory Usage', formatMetricValue(data.currentMemory, 'memory'), '', data.currentMemory > 100 * 1024 * 1024 ? '#ff4d4f' : '#52c41a', `Peak: ${formatMetricValue(data.peakMemory, 'memory')}`)}
        </div>
        
        ${this.options.showAlerts && data.alerts.length > 0 ? this.createAlertsSection(data.alerts) : ''}
        
        ${this.options.showTimeSeries && data.timeSeriesData.length > 0 ? this.createTimeSeriesChart(data.timeSeriesData) : ''}
        
        ${data.totalEvents === 0 ? '<div style="text-align: center; color: #999; padding: 40px; font-size: 14px;">No performance data available. Start using the application to see metrics.</div>' : ''}
      </div>
    `;
  }

  /**
   * 渲染到指定容器
   */
  renderToContainer(container: HTMLElement): void {
    this.container = container;
    this.updateDisplay();
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stopMonitoring();
    this.observers.clear();
    
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  // ==================== 私有方法 ====================

  private updateDisplay(): void {
    const data = this.getCurrentData();
    if (!data) return;

    // 通知观察者
    this.observers.forEach(observer => {
      try {
        observer(data);
      } catch (error) {
        console.error('[PerformanceMonitorUI] Error notifying observer:', error);
      }
    });

    // 更新HTML容器
    if (this.container) {
      this.container.innerHTML = this.createHTMLDisplay();
    }
  }

  private createMetricCard(title: string, value: string, unit: string, color: string, description: string): string {
    return `
      <div style="background: #fff; padding: 16px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e8e8e8;">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px; font-weight: 500;">${title}</div>
        <div style="font-size: 24px; font-weight: bold; color: ${color}; margin-bottom: 4px;">
          ${value}
          ${unit ? `<span style="font-size: 14px; margin-left: 4px;">${unit}</span>` : ''}
        </div>
        <div style="font-size: 12px; color: #999;">${description}</div>
      </div>
    `;
  }

  private createAlertsSection(alerts: MetricAlert[]): string {
    const visibleAlerts = alerts.slice(0, 10);
    
    return `
      <div style="margin-top: 20px;">
        <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 12px;">
          Active Alerts (${alerts.length})
        </div>
        ${visibleAlerts.map(alert => this.createAlertItem(alert)).join('')}
        ${alerts.length > 10 ? `<div style="font-size: 12px; color: #999; margin-top: 8px;">... and ${alerts.length - 10} more alerts</div>` : ''}
      </div>
    `;
  }

  private createAlertItem(alert: MetricAlert): string {
    const alertColor = getAlertColor(alert.level);
    
    return `
      <div style="padding: 12px; margin-bottom: 8px; border-radius: 4px; border: 1px solid ${alertColor}; background: ${alertColor}10; display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; color: ${alertColor};">
            ${alert.message}
          </div>
          <div style="font-size: 12px; opacity: 0.8;">
            ${alert.type} • ${new Date(alert.timestamp).toLocaleTimeString()} • 
            Value: ${formatMetricValue(alert.value, 'duration')} • 
            Threshold: ${formatMetricValue(alert.threshold, 'duration')}
          </div>
        </div>
      </div>
    `;
  }

  private createTimeSeriesChart(data: Array<{ timestamp: string; value: number }>): string {
    if (data.length === 0) return '';

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));

    return `
      <div style="background: #fff; padding: 16px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-top: 20px;">
        <div style="font-size: 16px; font-weight: bold; color: #333; margin-bottom: 12px;">Memory Usage Trend</div>
        <div style="height: 200px; position: relative; overflow: hidden; background: #f8f8f8; border-radius: 4px;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #999; font-size: 14px;">
            Chart visualization would be rendered here
          </div>
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 8px;">
          Range: ${formatMetricValue(minValue, 'memory')} - ${formatMetricValue(maxValue, 'memory')}
        </div>
      </div>
    `;
  }
}

// ==================== 全局实例 ====================

export const globalPerformanceMonitorUI = new PerformanceMonitorUI();

// 将实例暴露到全局，方便在HTML中使用
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = globalPerformanceMonitorUI;
}

// ==================== 工具函数 ====================

/**
 * 创建性能监控器实例
 */
export function createPerformanceMonitor(options?: PerformanceMonitorOptions): PerformanceMonitorUI {
  return new PerformanceMonitorUI(options);
}

/**
 * 获取当前性能摘要
 */
export function getPerformanceSummary(): {
  report: PerformanceReport;
  snapshot: MetricsSnapshot | null;
  timestamp: string;
} {
  return {
    report: globalPerformanceMonitor.getPerformanceReport(),
    snapshot: globalMetricsCollector.getLatestSnapshot(),
    timestamp: new Date().toISOString()
  };
}