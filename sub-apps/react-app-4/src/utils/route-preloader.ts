// 路由级预加载机制
interface UserBehavior {
  visitedRoutes: string[];
  timeSpent: { [route: string]: number };
  clickPatterns: string[];
  lastVisitTime: number;
}

interface RoutePattern {
  from: string;
  to: string[];
  probability: number;
}

interface PreloadConfig {
  maxConcurrentPreloads: number;
  preloadDelay: number;
  cacheTimeout: number;
  enablePredictive: boolean;
}

export class RoutePreloader {
  private preloadedRoutes = new Set<string>();
  private loadingRoutes = new Set<string>();
  private routePatterns: RoutePattern[] = [];
  private userBehavior: UserBehavior;
  private config: PreloadConfig;
  private preloadCache = new Map<string, { timestamp: number; promise: Promise<any> }>();

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = {
      maxConcurrentPreloads: 3,
      preloadDelay: 1000,
      cacheTimeout: 300000, // 5分钟
      enablePredictive: true,
      ...config
    };

    this.userBehavior = this.loadUserBehavior();
    this.initializeRoutePatterns();
    this.startBehaviorTracking();
  }

  // 初始化路由模式
  private initializeRoutePatterns(): void {
    this.routePatterns = [
      { from: '/dashboard', to: ['/analytics', '/realtime'], probability: 0.7 },
      { from: '/analytics', to: ['/reports', '/dashboard'], probability: 0.6 },
      { from: '/realtime', to: ['/dashboard', '/visualization'], probability: 0.8 },
      { from: '/reports', to: ['/analytics', '/visualization'], probability: 0.5 },
      { from: '/visualization', to: ['/dashboard', '/realtime'], probability: 0.6 }
    ];
  }

  // 基于用户行为预测下一个路由
  predictNextRoute(currentRoute: string): string[] {
    const predictions: Array<{ route: string; score: number }> = [];
    
    // 基于历史模式预测
    const pattern = this.routePatterns.find(p => p.from === currentRoute);
    if (pattern) {
      pattern.to.forEach(route => {
        predictions.push({ route, score: pattern.probability });
      });
    }
    
    // 基于用户历史行为
    const userHistory = this.userBehavior.visitedRoutes;
    const currentIndex = userHistory.lastIndexOf(currentRoute);
    if (currentIndex !== -1 && currentIndex < userHistory.length - 1) {
      const nextRoute = userHistory[currentIndex + 1];
      const existing = predictions.find(p => p.route === nextRoute);
      if (existing) {
        existing.score += 0.3; // 增加历史权重
      } else {
        predictions.push({ route: nextRoute, score: 0.3 });
      }
    }
    
    // 基于停留时间权重
    Object.entries(this.userBehavior.timeSpent).forEach(([route, time]) => {
      if (route !== currentRoute) {
        const existing = predictions.find(p => p.route === route);
        const timeWeight = Math.min(time / 60000, 0.2); // 最大0.2权重，基于分钟
        if (existing) {
          existing.score += timeWeight;
        } else {
          predictions.push({ route, score: timeWeight });
        }
      }
    });
    
    // 排序并返回前3个预测
    return predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(p => p.score > 0.2)
      .map(p => p.route);
  }

  // 智能预加载
  async preloadRoute(routePath: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    if (this.preloadedRoutes.has(routePath) || this.loadingRoutes.has(routePath)) {
      return;
    }

    // 检查缓存
    const cached = this.preloadCache.get(routePath);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.promise;
    }

    // 控制并发数
    if (this.loadingRoutes.size >= this.config.maxConcurrentPreloads) {
      console.log(`Preload queue full, skipping ${routePath}`);
      return;
    }

    this.loadingRoutes.add(routePath);
    
    const preloadPromise = this.executePreload(routePath, priority);
    this.preloadCache.set(routePath, {
      timestamp: Date.now(),
      promise: preloadPromise
    });

    try {
      await preloadPromise;
      this.preloadedRoutes.add(routePath);
      console.log(`Route ${routePath} preloaded successfully`);
    } catch (error) {
      console.warn(`Failed to preload route ${routePath}:`, error);
    } finally {
      this.loadingRoutes.delete(routePath);
    }
  }

  private async executePreload(routePath: string, priority: string): Promise<void> {
    // 延迟加载以避免影响当前页面性能
    if (priority !== 'high') {
      await new Promise(resolve => setTimeout(resolve, this.config.preloadDelay));
    }

    try {
      // 动态导入路由组件
      const componentPath = this.getComponentPath(routePath);
      await import(componentPath);
      
      // 预加载路由相关数据
      await this.preloadRouteData(routePath);
      
      // 预加载路由相关静态资源
      await this.preloadRouteAssets(routePath);
      
    } catch (error) {
      throw new Error(`Route preload failed: ${error.message}`);
    }
  }

  private getComponentPath(routePath: string): string {
    const routeMap: { [key: string]: string } = {
      '/dashboard': '../pages/Dashboard',
      '/analytics': '../pages/Analytics',
      '/realtime': '../pages/RealTimeData',
      '/reports': '../pages/Reports',
      '/visualization': '../pages/Visualization'
    };
    
    return routeMap[routePath] || `../pages${routePath}`;
  }

  private async preloadRouteData(routePath: string): Promise<void> {
    const dataEndpoints: { [key: string]: string[] } = {
      '/dashboard': ['/api/dashboard/metrics', '/api/dashboard/summary'],
      '/analytics': ['/api/analytics/data', '/api/analytics/trends'],
      '/realtime': ['/api/realtime/metrics', '/api/realtime/websocket-config'],
      '/reports': ['/api/reports/list', '/api/reports/templates'],
      '/visualization': ['/api/visualization/charts', '/api/visualization/config']
    };

    const endpoints = dataEndpoints[routePath] || [];
    
    const preloadPromises = endpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'X-Preload': 'true' }
        });
        
        if (response.ok) {
          // 数据会被浏览器缓存
          console.log(`Preloaded data for ${endpoint}`);
        }
      } catch (error) {
        console.warn(`Failed to preload data for ${endpoint}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  private async preloadRouteAssets(routePath: string): Promise<void> {
    const assetMap: { [key: string]: string[] } = {
      '/dashboard': ['/static/css/dashboard.css', '/static/js/dashboard-charts.js'],
      '/analytics': ['/static/css/analytics.css', '/static/js/analytics-utils.js'],
      '/realtime': ['/static/css/realtime.css', '/static/js/websocket-client.js'],
      '/reports': ['/static/css/reports.css', '/static/js/report-generator.js'],
      '/visualization': ['/static/css/visualization.css', '/static/js/d3-charts.js']
    };

    const assets = assetMap[routePath] || [];
    
    assets.forEach(asset => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = asset;
      document.head.appendChild(link);
    });
  }

  // 自动预加载管理
  async autoPreload(currentRoute: string): Promise<void> {
    if (!this.config.enablePredictive) return;

    const predictedRoutes = this.predictNextRoute(currentRoute);
    
    for (let i = 0; i < predictedRoutes.length; i++) {
      const route = predictedRoutes[i];
      const priority = i === 0 ? 'high' : i === 1 ? 'medium' : 'low';
      
      // 异步预加载，不阻塞主流程
      this.preloadRoute(route, priority).catch(error => {
        console.warn(`Auto preload failed for ${route}:`, error);
      });
    }
  }

  // 用户行为跟踪
  private startBehaviorTracking(): void {
    // 跟踪路由访问
    window.addEventListener('popstate', () => {
      this.trackRouteVisit(window.location.pathname);
    });

    // 跟踪页面停留时间
    let startTime = Date.now();
    let currentRoute = window.location.pathname;
    
    const trackTimeSpent = () => {
      const timeSpent = Date.now() - startTime;
      this.userBehavior.timeSpent[currentRoute] = 
        (this.userBehavior.timeSpent[currentRoute] || 0) + timeSpent;
      
      this.saveUserBehavior();
    };

    window.addEventListener('beforeunload', trackTimeSpent);
    
    // 定期保存行为数据
    setInterval(() => {
      trackTimeSpent();
      startTime = Date.now();
    }, 30000); // 每30秒保存一次
  }

  private trackRouteVisit(route: string): void {
    this.userBehavior.visitedRoutes.push(route);
    this.userBehavior.lastVisitTime = Date.now();
    
    // 保持最近100条记录
    if (this.userBehavior.visitedRoutes.length > 100) {
      this.userBehavior.visitedRoutes = this.userBehavior.visitedRoutes.slice(-100);
    }
    
    this.saveUserBehavior();
  }

  private loadUserBehavior(): UserBehavior {
    try {
      const stored = localStorage.getItem('route-preloader-behavior');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load user behavior:', error);
    }
    
    return {
      visitedRoutes: [],
      timeSpent: {},
      clickPatterns: [],
      lastVisitTime: Date.now()
    };
  }

  private saveUserBehavior(): void {
    try {
      localStorage.setItem('route-preloader-behavior', JSON.stringify(this.userBehavior));
    } catch (error) {
      console.warn('Failed to save user behavior:', error);
    }
  }

  // 清理过期缓存
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [route, cache] of this.preloadCache.entries()) {
      if (now - cache.timestamp > this.config.cacheTimeout) {
        this.preloadCache.delete(route);
        this.preloadedRoutes.delete(route);
      }
    }
  }

  // 获取预加载统计
  getStats() {
    return {
      preloadedRoutes: Array.from(this.preloadedRoutes),
      loadingRoutes: Array.from(this.loadingRoutes),
      cacheSize: this.preloadCache.size,
      userBehavior: this.userBehavior
    };
  }
}

// 单例导出
export const routePreloader = new RoutePreloader();