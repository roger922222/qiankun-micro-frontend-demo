// 真实用户性能监控 (RUM) 数据收集器
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
}

interface CustomMetric extends PerformanceMetric {
  category: 'component' | 'api' | 'interaction' | 'resource';
  details?: any;
}

interface PerformanceAnalysis {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  trends: MetricTrend[];
}

interface Bottleneck {
  type: 'lcp' | 'fid' | 'cls' | 'api' | 'component' | 'resource';
  severity: 'high' | 'medium' | 'low';
  description: string;
  value: number;
  threshold: number;
  impact: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImprovement: string;
  action: () => void;
}

interface MetricTrend {
  name: string;
  current: number;
  previous: number;
  change: number;
  trend: 'improving' | 'declining' | 'stable';
}

export class RUMCollector {
  private metrics: PerformanceMetric[] = [];
  private customMetrics: CustomMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private sessionId: string;
  private startTime: number;
  private isCollecting = false;

  // 性能阈值配置
  private thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
    FCP: { good: 1800, poor: 3000 }
  };

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.initializeObservers();
    // 不在构造函数中自动开始收集，等待手动调用
    // this.startCollection();
  }

  // 开始性能数据收集
  startCollection(): void {
    if (this.isCollecting) return;
    
    this.isCollecting = true;
    console.log('RUM collection started');

    // 收集核心 Web 指标
    this.collectCoreWebVitals();
    
    // 收集自定义指标
    this.collectCustomMetrics();
    
    // 监听页面生命周期
    this.setupPageLifecycleListeners();
    
    // 定期发送数据
    this.startPeriodicReporting();
  }

  // 收集核心 Web 指标
  private collectCoreWebVitals(): void {
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry) {
          this.recordMetric('LCP', lastEntry.startTime);
        }
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observation not supported');
      }
    }

    // FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        const fid = entry.processingStart - entry.startTime;
        this.recordMetric('FID', fid);
      });
    });
    
    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (e) {
      console.warn('FID observation not supported');
    }

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.recordMetric('CLS', clsValue);
    });
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (e) {
      console.warn('CLS observation not supported');
    }

    // FCP (First Contentful Paint)
    const fcpObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      });
    });
    
    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);
    } catch (e) {
      console.warn('FCP observation not supported');
    }

    // TTFB (Time to First Byte)
    if (performance.timing) {
      const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      this.recordMetric('TTFB', ttfb);
    }
  }

  // 收集自定义性能指标
  private collectCustomMetrics(): void {
    try {
      // 组件渲染时间监控
      this.measureComponentRenderTime();
      
      // API 响应时间监控
      this.measureAPIResponseTime();
      
      // 用户交互延迟监控
      this.measureInteractionLatency();
      
      // 资源加载时间监控
      this.measureResourceLoadTime();
    } catch (error) {
      console.warn('collectCustomMetrics error:', error);
    }
  }

  // 组件渲染时间测量
  private measureComponentRenderTime(): void {
    // 由于无法直接访问React，这里使用性能观察器替代
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'measure' && entry.name.includes('React')) {
          this.recordCustomMetric({
            name: 'component-render',
            value: entry.duration,
            category: 'component',
            details: { measureName: entry.name }
          });
        }
      });
    });
    
    try {
      observer.observe({ entryTypes: ['measure'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('Component render time measurement not supported');
    }
  }

  // 替代的组件渲染时间测量方法
  private measureComponentRenderTimeAlternative(): void {
    const self = this;
    
    // 监听DOM变化作为组件渲染的指标
    const mutationObserver = new MutationObserver((mutations) => {
      const start = performance.now();
      
      // 使用 requestAnimationFrame 测量到下一帧的时间
      requestAnimationFrame(() => {
        const end = performance.now();
        
        if (mutations.length > 0) {
          self.recordCustomMetric({
            name: 'dom-update',
            value: end - start,
            category: 'component',
            details: { mutationCount: mutations.length }
          });
        }
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  // API 响应时间测量
  private measureAPIResponseTime(): void {
    // 在微前端环境中，需要检查是否在安全的上下文中执行
    if (typeof window === 'undefined' || !window.fetch) {
      console.warn('measureAPIResponseTime: window.fetch not available');
      return;
    }
    
    const originalFetch = window.fetch;
    const self = this;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const start = performance.now();
      const url = typeof input === 'string' ? input : input.toString();
      
      try {
        const response = await originalFetch(input, init);
        const end = performance.now();
        
        self.recordCustomMetric({
          name: 'api-response',
          value: end - start,
          category: 'api',
          details: {
            url,
            status: response.status,
            method: init?.method || 'GET'
          }
        });
        
        return response;
      } catch (error) {
        const end = performance.now();
        
        self.recordCustomMetric({
          name: 'api-error',
          value: end - start,
          category: 'api',
          details: {
            url,
            error: error.message,
            method: init?.method || 'GET'
          }
        });
        
        throw error;
      }
    };
  }

  // 用户交互延迟测量
  private measureInteractionLatency(): void {
    const interactionTypes = ['click', 'keydown', 'scroll'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        const start = performance.now();
        
        // 使用 requestAnimationFrame 测量到下一帧的时间
        requestAnimationFrame(() => {
          const end = performance.now();
          
          this.recordCustomMetric({
            name: 'interaction-latency',
            value: end - start,
            category: 'interaction',
            details: {
              type,
              target: (event.target as Element)?.tagName || 'unknown'
            }
          });
        });
      }, { passive: true });
    });
  }

  // 资源加载时间测量
  private measureResourceLoadTime(): void {
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.entryType === 'resource') {
          this.recordCustomMetric({
            name: 'resource-load',
            value: entry.duration,
            category: 'resource',
            details: {
              name: entry.name,
              type: entry.initiatorType,
              size: entry.transferSize || 0
            }
          });
        }
      });
    });
    
    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (e) {
      console.warn('Resource observation not supported');
    }
  }

  // 记录性能指标
  private recordMetric(name: string, value: number): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId
    };
    
    this.metrics.push(metric);
    console.log(`RUM Metric - ${name}: ${value.toFixed(2)}ms`);
  }

  // 记录自定义指标
  private recordCustomMetric(metric: Omit<CustomMetric, 'timestamp' | 'url' | 'userAgent' | 'sessionId'>): void {
    const fullMetric: CustomMetric = {
      ...metric,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId
    };
    
    this.customMetrics.push(fullMetric);
  }

  // 性能分析
  analyzePerformance(): PerformanceAnalysis {
    const score = this.calculatePerformanceScore();
    const bottlenecks = this.identifyBottlenecks();
    const recommendations = this.generateRecommendations(bottlenecks);
    const trends = this.calculateTrends();
    
    return {
      score,
      grade: this.getPerformanceGrade(score),
      bottlenecks,
      recommendations,
      trends
    };
  }

  // 计算性能评分
  private calculatePerformanceScore(): number {
    const weights = { LCP: 0.25, FID: 0.25, CLS: 0.25, FCP: 0.15, TTFB: 0.1 };
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([metricName, weight]) => {
      const metric = this.getLatestMetric(metricName);
      if (metric) {
        const score = this.getMetricScore(metricName, metric.value);
        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  // 获取指标评分
  private getMetricScore(metricName: string, value: number): number {
    const threshold = this.thresholds[metricName as keyof typeof this.thresholds];
    if (!threshold) return 50;

    if (value <= threshold.good) return 100;
    if (value >= threshold.poor) return 0;
    
    // 线性插值
    const ratio = (threshold.poor - value) / (threshold.poor - threshold.good);
    return Math.round(ratio * 100);
  }

  // 获取性能等级
  private getPerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  // 识别性能瓶颈
  private identifyBottlenecks(): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    Object.entries(this.thresholds).forEach(([metricName, threshold]) => {
      const metric = this.getLatestMetric(metricName);
      if (metric && metric.value > threshold.good) {
        const severity = metric.value > threshold.poor ? 'high' : 'medium';
        
        bottlenecks.push({
          type: metricName.toLowerCase() as any,
          severity,
          description: this.getBottleneckDescription(metricName, metric.value),
          value: metric.value,
          threshold: threshold.good,
          impact: this.getBottleneckImpact(metricName)
        });
      }
    });

    // 分析自定义指标瓶颈
    this.analyzeCustomMetricBottlenecks(bottlenecks);

    return bottlenecks.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  // 分析自定义指标瓶颈
  private analyzeCustomMetricBottlenecks(bottlenecks: Bottleneck[]): void {
    // API 响应时间分析
    const apiMetrics = this.customMetrics.filter(m => m.category === 'api');
    if (apiMetrics.length > 0) {
      const avgApiTime = apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length;
      if (avgApiTime > 1000) {
        bottlenecks.push({
          type: 'api',
          severity: avgApiTime > 3000 ? 'high' : 'medium',
          description: `API平均响应时间 ${avgApiTime.toFixed(0)}ms 过长`,
          value: avgApiTime,
          threshold: 1000,
          impact: '影响用户体验和页面交互流畅度'
        });
      }
    }

    // 组件渲染时间分析
    const componentMetrics = this.customMetrics.filter(m => m.category === 'component');
    const slowComponents = componentMetrics.filter(m => m.value > 16); // 超过一帧时间
    if (slowComponents.length > 0) {
      bottlenecks.push({
        type: 'component',
        severity: 'medium',
        description: `${slowComponents.length} 个组件渲染时间超过16ms`,
        value: slowComponents.length,
        threshold: 0,
        impact: '可能导致页面卡顿和用户交互延迟'
      });
    }
  }

  // 生成优化建议
  private generateRecommendations(bottlenecks: Bottleneck[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'lcp':
          recommendations.push({
            priority: 'high',
            title: '优化最大内容绘制 (LCP)',
            description: '优化关键资源加载，使用CDN，压缩图片',
            expectedImprovement: '提升30-50%加载速度',
            action: () => console.log('Applying LCP optimization')
          });
          break;
          
        case 'fid':
          recommendations.push({
            priority: 'high',
            title: '减少首次输入延迟 (FID)',
            description: '优化JavaScript执行，使用Web Workers',
            expectedImprovement: '提升用户交互响应速度',
            action: () => console.log('Applying FID optimization')
          });
          break;
          
        case 'cls':
          recommendations.push({
            priority: 'medium',
            title: '减少累积布局偏移 (CLS)',
            description: '为图片和广告设置尺寸，避免动态内容插入',
            expectedImprovement: '提升视觉稳定性',
            action: () => console.log('Applying CLS optimization')
          });
          break;
          
        case 'api':
          recommendations.push({
            priority: 'high',
            title: '优化API性能',
            description: '实施API缓存，优化数据库查询，使用CDN',
            expectedImprovement: '减少50-70%响应时间',
            action: () => console.log('Applying API optimization')
          });
          break;
          
        case 'component':
          recommendations.push({
            priority: 'medium',
            title: '优化组件渲染',
            description: '使用React.memo，优化重渲染，虚拟化长列表',
            expectedImprovement: '提升页面流畅度',
            action: () => console.log('Applying component optimization')
          });
          break;
      }
    });

    return recommendations;
  }

  // 计算性能趋势
  private calculateTrends(): MetricTrend[] {
    // 这里应该与历史数据比较，为演示目的返回模拟数据
    const coreMetrics = ['LCP', 'FID', 'CLS', 'FCP', 'TTFB'];
    
    return coreMetrics.map(metricName => {
      const current = this.getLatestMetric(metricName);
      const currentValue = current ? current.value : 0;
      
      // 模拟历史数据（实际应用中应从存储中获取）
      const previousValue = currentValue * (0.8 + Math.random() * 0.4);
      const change = ((currentValue - previousValue) / previousValue) * 100;
      
      return {
        name: metricName,
        current: currentValue,
        previous: previousValue,
        change: Math.round(change * 100) / 100,
        trend: Math.abs(change) < 5 ? 'stable' : (change > 0 ? 'declining' : 'improving')
      };
    });
  }

  // 获取最新指标
  private getLatestMetric(name: string): PerformanceMetric | undefined {
    return this.metrics
      .filter(m => m.name === name)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  // 获取瓶颈描述
  private getBottleneckDescription(metricName: string, value: number): string {
    const descriptions = {
      LCP: `最大内容绘制时间 ${value.toFixed(0)}ms 过长`,
      FID: `首次输入延迟 ${value.toFixed(0)}ms 影响交互`,
      CLS: `累积布局偏移 ${value.toFixed(3)} 影响视觉稳定性`,
      FCP: `首次内容绘制 ${value.toFixed(0)}ms 过慢`,
      TTFB: `首字节时间 ${value.toFixed(0)}ms 过长`
    };
    
    return descriptions[metricName as keyof typeof descriptions] || `${metricName} 性能指标异常`;
  }

  // 获取瓶颈影响
  private getBottleneckImpact(metricName: string): string {
    const impacts = {
      LCP: '影响用户感知的页面加载速度',
      FID: '影响用户交互体验和响应性',
      CLS: '影响视觉稳定性和用户体验',
      FCP: '影响用户感知的页面渲染速度',
      TTFB: '影响整体页面加载性能'
    };
    
    return impacts[metricName as keyof typeof impacts] || '影响整体用户体验';
  }

  // 页面生命周期监听
  private setupPageLifecycleListeners(): void {
    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      this.recordCustomMetric({
        name: 'visibility-change',
        value: Date.now() - this.startTime,
        category: 'interaction',
        details: { hidden: document.hidden }
      });
    });

    // 页面卸载
    window.addEventListener('beforeunload', () => {
      this.sendMetrics();
    });
  }

  // 定期报告
  private startPeriodicReporting(): void {
    setInterval(() => {
      this.sendMetrics();
    }, 30000); // 每30秒发送一次
  }

  // 发送指标数据
  private sendMetrics(): void {
    if (this.metrics.length === 0 && this.customMetrics.length === 0) return;

    const payload = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      customMetrics: this.customMetrics
    };

    // 这里应该发送到后端API
    console.log('Sending RUM data:', payload);
    
    // 使用 navigator.sendBeacon 确保数据发送
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/rum', JSON.stringify(payload));
    }
    
    // 清空已发送的指标
    this.metrics = [];
    this.customMetrics = [];
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `rum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 初始化观察器
  private initializeObservers(): void {
    // 在构造函数中调用
  }

  // 公共方法
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getCustomMetrics(): CustomMetric[] {
    return [...this.customMetrics];
  }

  // 停止收集
  stopCollection(): void {
    this.isCollecting = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('RUM collection stopped');
  }
}

// 单例导出
export const rumCollector = new RUMCollector();