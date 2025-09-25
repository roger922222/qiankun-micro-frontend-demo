/**
 * 监控系统统一导出
 * 提供性能监控和指标收集的统一接口
 */

// 性能监控器
export {
  PerformanceMonitor,
  globalPerformanceMonitor,
  withPerformanceMonitoring,
  usePerformanceMonitor
} from './performance-monitor';

export type {
  PerformanceMetric,
  EventPerformanceMetric,
  StatePerformanceMetric,
  NavigationPerformanceMetric,
  MemoryPerformanceMetric,
  PerformanceReport,
  PerformanceThresholds,
  PerformanceMonitorOptions
} from './performance-monitor';

// 指标收集器
export {
  MetricsCollector,
  globalMetricsCollector,
  formatMetricValue,
  getAlertColor
} from './metrics-collector';

export type {
  MetricAggregation,
  TimeSeriesPoint,
  TimeSeriesData,
  MetricsSnapshot,
  MetricAlert,
  MetricsCollectorOptions,
  AlertThresholds
} from './metrics-collector';

// 工具函数
export const MonitoringUtils = {
  /**
   * 初始化监控系统
   */
  initialize: (options?: {
    performanceOptions?: any;
    metricsOptions?: any;  }) => {
    const { metricsOptions = {} } = options || {};
    ;
    
    // 启用性能监控
    globalPerformanceMonitor.setEnabled(true);
    
    // 设置指标收集
    if (metricsOptions.enabled !== false) {
      // 定期收集指标
      setInterval(() => {
        const metrics = globalPerformanceMonitor.getRealTimeMetrics();
        globalMetricsCollector.collectMetrics(metrics);
      }, 5000);
    }
    
    console.log('[MonitoringSystem] Monitoring system initialized');
  },

  /**
   * 获取监控摘要
   */
  getSummary: () => {
    const report = globalPerformanceMonitor.getPerformanceReport();
    const snapshot = globalMetricsCollector.getLatestSnapshot();
    
    return {
      performance: report,
      metrics: snapshot,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * 清除所有监控数据
   */
  clearAll: () => {
    globalPerformanceMonitor.clearMetrics();
    globalMetricsCollector.clear();
  }
};