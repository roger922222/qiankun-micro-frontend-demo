// 前端性能监控和错误追踪
import { v4 as uuidv4 } from 'uuid';

// 性能监控配置
export const PERFORMANCE_CONFIG = {
  // 监控采样率
  SAMPLING_RATE: 0.1,
  
  // 性能指标阈值
  THRESHOLDS: {
    LCP: 2500, // 最大内容绘制时间
    FID: 100,  // 首次输入延迟
    CLS: 0.1,  // 累积布局偏移
    TTI: 3500, // 可交互时间
    FCP: 1800, // 首次内容绘制时间
  },
  
  // 错误监控配置
  ERROR_MONITORING: {
    ENABLED: true,
    MAX_ERRORS_PER_MINUTE: 10,
    RETRY_ATTEMPTS: 3,
  },
  
  // 用户行为监控
  USER_TRACKING: {
    ENABLED: true,
    TRACK_CLICKS: true,
    TRACK_NAVIGATION: true,
    TRACK_API_CALLS: true,
  },
};

// 性能指标收集器
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private userId: string;
  private sessionId: string;
  
  private constructor() {
    this.userId = this.getOrCreateUserId();
    this.sessionId = uuidv4();
    this.initializeMonitoring();
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * 初始化性能监控
   */
  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    // 监听页面加载完成
    window.addEventListener('load', () => {
      this.collectWebVitals();
      this.collectNavigationTiming();
      this.collectResourceTiming();
    });
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.reportMetrics();
      }
    });
    
    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.reportMetrics();
    });
  }
  
  /**
   * 收集Web Vitals指标
   */
  private collectWebVitals(): void {
    if (typeof window === 'undefined') return;
    
    // 监听LCP (Largest Contentful Paint)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.recordMetric('LCP', entry.startTime);
        this.checkThreshold('LCP', entry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // 监听FID (First Input Delay)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.recordMetric('FID', entry.processingStart - entry.startTime);
        this.checkThreshold('FID', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });
    
    // 监听CLS (Cumulative Layout Shift)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
      this.checkThreshold('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
    
    // 监听FCP (First Contentful Paint)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.recordMetric('FCP', entry.startTime);
        this.checkThreshold('FCP', entry.startTime);
      }
    }).observe({ entryTypes: ['paint'] });
  }
  
  /**
   * 收集导航时间指标
   */
  private collectNavigationTiming(): void {
    if (typeof window === 'undefined') return;
    
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      // DNS查询时间
      this.recordMetric('DNS', navigation.domainLookupEnd - navigation.domainLookupStart);
      
      // TCP连接时间
      this.recordMetric('TCP', navigation.connectEnd - navigation.connectStart);
      
      // 请求响应时间
      this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart);
      
      // 页面加载时间
      this.recordMetric('LoadTime', navigation.loadEventEnd - navigation.loadEventStart);
      
      // DOM解析时间
      this.recordMetric('DOMContentLoaded', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart);
    }
  }
  
  /**
   * 收集资源加载时间
   */
  private collectResourceTiming(): void {
    if (typeof window === 'undefined') return;
    
    const resources = performance.getEntriesByType('resource');
    
    for (const resource of resources) {
      const entry = resource as PerformanceResourceTiming;
      
      // 只收集慢资源（>1秒）
      if (entry.duration > 1000) {
        this.recordMetric(`Resource_${entry.name}`, entry.duration);
      }
    }
  }
  
  /**
   * 记录性能指标
   */
  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(value);
    
    // 采样率控制
    if (Math.random() > PERFORMANCE_CONFIG.SAMPLING_RATE) {
      return;
    }
    
    // 发送到监控服务
    this.sendMetric(name, value);
  }
  
  /**
   * 检查阈值并告警
   */
  private checkThreshold(metric: string, value: number): void {
    const threshold = PERFORMANCE_CONFIG.THRESHOLDS[metric as keyof typeof PERFORMANCE_CONFIG.THRESHOLDS];
    
    if (threshold && value > threshold) {
      console.warn(`⚠️ 性能指标告警: ${metric} = ${value.toFixed(2)}ms, 阈值 = ${threshold}ms`);
      
      // 发送告警
      this.sendAlert(metric, value, threshold);
    }
  }
  
  /**
   * 获取或创建用户ID
   */
  private getOrCreateUserId(): string {
    let userId = localStorage.getItem('userId');
    
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('userId', userId);
    }
    
    return userId;
  }
  
  /**
   * 发送指标到监控服务
   */
  private sendMetric(name: string, value: number): void {
    // 这里可以发送到后端监控服务
    const metricData = {
      userId: this.userId,
      sessionId: this.sessionId,
      metric: name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    
    // 发送到后端（异步，不阻塞主流程）
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/metrics', JSON.stringify(metricData));
    } else {
      // 降级方案
      fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metricData),
        keepalive: true,
      }).catch(console.error);
    }
  }
  
  /**
   * 发送告警
   */
  private sendAlert(metric: string, value: number, threshold: number): void {
    const alertData = {
      userId: this.userId,
      sessionId: this.sessionId,
      type: 'PERFORMANCE_ALERT',
      metric,
      value,
      threshold,
      timestamp: Date.now(),
      url: window.location.href,
    };
    
    // 发送到告警服务
    fetch('/api/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alertData),
      keepalive: true,
    }).catch(console.error);
  }
  
  /**
   * 报告指标
   */
  private reportMetrics(): void {
    if (this.metrics.size === 0) return;
    
    const reportData = {
      userId: this.userId,
      sessionId: this.sessionId,
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([name, values]) => [
          name,
          {
            values,
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length,
          },
        ])
      ),
      timestamp: Date.now(),
      url: window.location.href,
    };
    
    // 发送到后端
    fetch('/api/metrics/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
      keepalive: true,
    }).catch(console.error);
    
    // 清空已报告的指标
    this.metrics.clear();
  }
  
  /**
   * 获取性能摘要
   */
  getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        summary[name] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length,
          p50: this.percentile(values, 0.5),
          p95: this.percentile(values, 0.95),
          p99: this.percentile(values, 0.99),
        };
      }
    }
    
    return summary;
  }
  
  /**
   * 计算百分位数
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

// 错误监控器
export class ErrorMonitor {
  private static instance: ErrorMonitor;
  private errorCount: number = 0;
  private errorQueue: Array<any> = [];
  private lastErrorTime: number = 0;
  
  private constructor() {
    this.initializeErrorMonitoring();
  }
  
  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }
  
  /**
   * 初始化错误监控
   */
  private initializeErrorMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    // 监听全局错误
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });
    
    // 监听未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        reason: event.reason,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    });
    
    // 监听Vue错误（如果存在）
    if (window.Vue) {
      window.Vue.config.errorHandler = (error, vm, info) => {
        this.handleError({
          type: 'vue',
          message: error.message,
          stack: error.stack,
          component: vm?.$options?.name,
          info,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      };
    }
  }
  
  /**
   * 处理错误
   */
  private handleError(errorInfo: any): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();
    
    // 错误频率检查
    if (this.errorCount > PERFORMANCE_CONFIG.ERROR_MONITORING.MAX_ERRORS_PER_MINUTE) {
      console.warn('⚠️ 错误频率过高，暂时停止收集');
      return;
    }
    
    // 添加到错误队列
    this.errorQueue.push(errorInfo);
    
    // 控制台输出
    console.error('🚨 前端错误监控:', errorInfo);
    
    // 发送到后端
    this.sendError(errorInfo);
    
    // 如果队列过长，发送批量错误
    if (this.errorQueue.length >= 10) {
      this.sendBatchErrors();
    }
  }
  
  /**
   * 发送错误到后端
   */
  private sendError(errorInfo: any): void {
    const errorData = {
      ...errorInfo,
      userId: localStorage.getItem('userId'),
      sessionId: localStorage.getItem('sessionId'),
      timestamp: Date.now(),
    };
    
    // 使用sendBeacon优先，降级到fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/errors', JSON.stringify(errorData));
    } else {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
        keepalive: true,
      }).catch(console.error);
    }
  }
  
  /**
   * 发送批量错误
   */
  private sendBatchErrors(): void {
    if (this.errorQueue.length === 0) return;
    
    const batchData = {
      errors: this.errorQueue,
      userId: localStorage.getItem('userId'),
      sessionId: localStorage.getItem('sessionId'),
      timestamp: Date.now(),
    };
    
    fetch('/api/errors/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchData),
      keepalive: true,
    }).catch(console.error);
    
    // 清空队列
    this.errorQueue = [];
  }
  
  /**
   * 手动报告错误
   */
  reportError(error: Error, context?: Record<string, any>): void {
    this.handleError({
      type: 'manual',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }
  
  /**
   * 获取错误统计
   */
  getErrorStats(): { count: number; lastErrorTime: number } {
    return {
      count: this.errorCount,
      lastErrorTime: this.lastErrorTime,
    };
  }
}

// 用户行为追踪器
export class UserBehaviorTracker {
  private static instance: UserBehaviorTracker;
  private events: Array<any> = [];
  private startTime: number = Date.now();
  
  private constructor() {
    if (PERFORMANCE_CONFIG.USER_TRACKING.ENABLED) {
      this.initializeTracking();
    }
  }
  
  static getInstance(): UserBehaviorTracker {
    if (!UserBehaviorTracker.instance) {
      UserBehaviorTracker.instance = new UserBehaviorTracker();
    }
    return UserBehaviorTracker.instance;
  }
  
  /**
   * 初始化用户行为追踪
   */
  private initializeTracking(): void {
    if (typeof window === 'undefined') return;
    
    // 追踪页面导航
    if (PERFORMANCE_CONFIG.USER_TRACKING.TRACK_NAVIGATION) {
      this.trackNavigation();
    }
    
    // 追踪点击事件
    if (PERFORMANCE_CONFIG.USER_TRACKING.TRACK_CLICKS) {
      this.trackClicks();
    }
    
    // 追踪API调用
    if (PERFORMANCE_CONFIG.USER_TRACKING.TRACK_API_CALLS) {
      this.trackAPICalls();
    }
    
    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.reportEvents();
    });
  }
  
  /**
   * 追踪页面导航
   */
  private trackNavigation(): void {
    let lastUrl = window.location.href;
    
    // 监听路由变化
    window.addEventListener('popstate', () => {
      this.recordEvent('navigation', {
        from: lastUrl,
        to: window.location.href,
        timestamp: Date.now(),
        duration: Date.now() - this.startTime,
      });
      
      lastUrl = window.location.href;
    });
    
    // 监听hash变化
    window.addEventListener('hashchange', () => {
      this.recordEvent('hash_navigation', {
        from: lastUrl,
        to: window.location.href,
        timestamp: Date.now(),
      });
    });
  }
  
  /**
   * 追踪点击事件
   */
  private trackClicks(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      this.recordEvent('click', {
        element: target.tagName,
        id: target.id,
        className: target.className,
        text: target.textContent?.substring(0, 100), // 限制长度
        timestamp: Date.now(),
        position: {
          x: event.clientX,
          y: event.clientY,
        },
      });
    }, true);
  }
  
  /**
   * 追踪API调用
   */
  private trackAPICalls(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = Date.now();
      const url = input.toString();
      
      try {
        const response = await originalFetch(input, init);
        const duration = Date.now() - startTime;
        
        this.recordEvent('api_call', {
          url,
          method: init?.method || 'GET',
          status: response.status,
          duration,
          timestamp: startTime,
          success: response.ok,
        });
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.recordEvent('api_error', {
          url,
          method: init?.method || 'GET',
          duration,
          timestamp: startTime,
          error: error.message,
        });
        
        throw error;
      }
    };
  }
  
  /**
   * 记录事件
   */
  recordEvent(type: string, data: any): void {
    this.events.push({
      type,
      data,
      timestamp: Date.now(),
      userId: localStorage.getItem('userId'),
      sessionId: localStorage.getItem('sessionId'),
    });
    
    // 如果事件过多，发送批量事件
    if (this.events.length >= 50) {
      this.reportEvents();
    }
  }
  
  /**
   * 报告事件
   */
  private reportEvents(): void {
    if (this.events.length === 0) return;
    
    const eventData = {
      events: this.events,
      userId: localStorage.getItem('userId'),
      sessionId: localStorage.getItem('sessionId'),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    
    // 发送到后端
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/behavior', JSON.stringify(eventData));
    } else {
      fetch('/api/behavior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
        keepalive: true,
      }).catch(console.error);
    }
    
    // 清空事件队列
    this.events = [];
  }
  
  /**
   * 手动记录事件
   */
  trackEvent(type: string, data: any): void {
    this.recordEvent(type, data);
  }
  
  /**
   * 获取事件统计
   */
  getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const event of this.events) {
      stats[event.type] = (stats[event.type] || 0) + 1;
    }
    
    return stats;
  }
}

// 性能优化建议器
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  
  private constructor() {}
  
  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }
  
  /**
   * 分析性能并提供优化建议
   */
  analyzePerformance(): Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
    data?: any;
  }> {
    const recommendations = [];
    
    // 检查LCP
    const lcp = this.getMetric('LCP');
    if (lcp && lcp > PERFORMANCE_CONFIG.THRESHOLDS.LCP) {
      recommendations.push({
        issue: 'LCP (Largest Contentful Paint) 过高',
        severity: 'high',
        recommendation: '优化最大内容元素的加载，考虑使用图片懒加载、CDN加速、预加载关键资源',
        data: { lcp, threshold: PERFORMANCE_CONFIG.THRESHOLDS.LCP },
      });
    }
    
    // 检查FID
    const fid = this.getMetric('FID');
    if (fid && fid > PERFORMANCE_CONFIG.THRESHOLDS.FID) {
      recommendations.push({
        issue: 'FID (First Input Delay) 过高',
        severity: 'high',
        recommendation: '减少主线程阻塞时间，考虑代码分割、延迟加载非关键脚本、使用Web Workers',
        data: { fid, threshold: PERFORMANCE_CONFIG.THRESHOLDS.FID },
      });
    }
    
    // 检查CLS
    const cls = this.getMetric('CLS');
    if (cls && cls > PERFORMANCE_CONFIG.THRESHOLDS.CLS) {
      recommendations.push({
        issue: 'CLS (Cumulative Layout Shift) 过高',
        severity: 'medium',
        recommendation: '避免布局偏移，为图片和广告预留空间，避免动态插入内容',
        data: { cls, threshold: PERFORMANCE_CONFIG.THRESHOLDS.CLS },
      });
    }
    
    // 检查资源加载时间
    const slowResources = this.getSlowResources();
    if (slowResources.length > 0) {
      recommendations.push({
        issue: '发现慢资源加载',
        severity: 'medium',
        recommendation: '优化资源加载，考虑使用CDN、压缩资源、启用HTTP/2、使用预加载',
        data: { slowResources },
      });
    }
    
    return recommendations;
  }
  
  /**
   * 获取指标
   */
  private getMetric(name: string): number | null {
    const monitor = PerformanceMonitor.getInstance();
    const summary = monitor.getPerformanceSummary();
    
    if (summary[name] && summary[name].avg) {
      return summary[name].avg;
    }
    
    return null;
  }
  
  /**
   * 获取慢资源
   */
  private getSlowResources(): Array<any> {
    const resources = performance.getEntriesByType('resource');
    const slowResources = [];
    
    for (const resource of resources) {
      const entry = resource as PerformanceResourceTiming;
      if (entry.duration > 1000) {
        slowResources.push({
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize,
          type: entry.initiatorType,
        });
      }
    }
    
    return slowResources;
  }
}

// 导出监控实例
export const performanceMonitor = PerformanceMonitor.getInstance();
export const errorMonitor = ErrorMonitor.getInstance();
export const behaviorTracker = UserBehaviorTracker.getInstance();
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// 便捷函数
export function trackPerformance(): void {
  performanceMonitor.getInstance();
}

export function trackError(error: Error, context?: Record<string, any>): void {
  errorMonitor.reportError(error, context);
}

export function trackEvent(type: string, data: any): void {
  behaviorTracker.trackEvent(type, data);
}

export function getPerformanceRecommendations(): Array<any> {
  return performanceOptimizer.analyzePerformance();
}