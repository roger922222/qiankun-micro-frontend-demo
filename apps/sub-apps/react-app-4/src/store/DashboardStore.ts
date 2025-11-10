import { makeAutoObservable, runInAction, computed, reaction } from 'mobx';
import { message } from 'antd';
import { debounce, throttle } from 'lodash';
import { DashboardMetrics, ChartData, RealTimeMetrics, DashboardFilter, DashboardLayout, ChartConfig } from './types/dashboard';
import { api } from './utils/api';
import { CacheManager } from './utils/cache';

// 默认值
const defaultMetrics: DashboardMetrics = {
  totalUsers: 0,
  totalOrders: 0,
  totalRevenue: 0,
  pageViews: 0,
  conversionRate: 0,
  activeUsers: 0,
  bounceRate: 0,
  avgSessionDuration: 0,
};

const defaultRealTimeData: RealTimeMetrics = {
  activeUsers: 0,
  orders: 0,
  revenue: 0,
  pageViews: 0,
  timestamp: 0,
};

const defaultFilters: DashboardFilter = {
  timeRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
    preset: 'last7days',
  },
  region: [],
  channel: [],
  userType: [],
};

// 错误处理类
class ErrorHandler {
  handleApiError(error: any, context: string) {
    const errorInfo = {
      message: error.message || 'Unknown error',
      context,
      timestamp: Date.now(),
      stack: error.stack
    };
    
    console.error('Dashboard Error:', errorInfo);
    message.error(this.getUserFriendlyMessage(error));
    
    return errorInfo.message;
  }
  
  getUserFriendlyMessage(error: any): string {
    if (error.code === 'NETWORK_ERROR') return '网络连接失败，请检查网络';
    if (error.code === 'TIMEOUT') return '请求超时，请稍后重试';
    if (error.status === 401) return '登录已过期，请重新登录';
    if (error.status === 403) return '权限不足，无法访问';
    return '操作失败，请稍后重试';
  }
}

// 数据持久化管理类
class PersistenceManager {
  private storageKey = 'dashboard-store-state';
  
  saveState(state: Partial<DashboardStore>) {
    const persistData = {
      filters: state.filters,
      currentLayout: state.currentLayout,
      autoRefresh: state.autoRefresh,
      refreshInterval: state.refreshInterval,
      cacheEnabled: state.cacheEnabled,
      timestamp: Date.now()
    };
    
    localStorage.setItem(this.storageKey, JSON.stringify(persistData));
  }
  
  loadState(): Partial<DashboardStore> | null {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;
      
      const data = JSON.parse(saved);
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        this.clearState();
        return null;
      }
      
      return data;
    } catch {
      this.clearState();
      return null;
    }
  }
  
  clearState() {
    localStorage.removeItem(this.storageKey);
  }
}

class DashboardStore {
  // 基础状态
  loading = false;
  error: string | null = null;
  initialized = false;
  lastUpdated = 0;
  lastUpdateTime = 0;
  pendingReports = 0;

  // 基础指标
  metrics: DashboardMetrics = { ...defaultMetrics };

  // 图表数据
  salesTrend: ChartData[] = [];
  userAnalytics: ChartData[] = [];
  revenueByRegion: ChartData[] = [];
  topProducts: ChartData[] = [];

  // 实时数据
  realTimeData: RealTimeMetrics = { ...defaultRealTimeData };
  realTimeChartData: { traffic?: any[]; performance?: any[] } = {};
  wsConnection: WebSocket | null = null;
  wsReconnectAttempts = 0;
  maxReconnectAttempts = 5;
  reconnectDelay = 1000;

  // 高级功能
  filters: DashboardFilter = { ...defaultFilters };
  layouts: DashboardLayout[] = [];
  currentLayout: string | null = null;
  autoRefresh = false;
  refreshInterval = 30;
  cacheEnabled = true;

  // 缓存和性能
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private refreshTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private mockDataTimer: NodeJS.Timeout | null = null;
  private loadedCharts = new Set<string>();
  
  // 缓存统计
  private cacheHits = 0;
  private cacheMisses = 0;

  // 工具类
  private errorHandler = new ErrorHandler();
  private persistenceManager = new PersistenceManager();

  constructor() {
    makeAutoObservable(this);

    this.setupReactions();
    this.loadPersistedState();
  }  // MobX computed 属性
  get filteredMetrics() {
    return computed(() => {
      return this.applyFilters([this.metrics], this.filters)[0] || this.metrics;
    });
  }

  get chartConfigs() {
    return computed(() => {
      const layout = this.layouts.find(l => l.id === this.currentLayout);
      return layout?.config || {};
    });
  }

  get isRealTimeConnected() {
    return this.wsConnection !== null && this.wsConnection.readyState === WebSocket.OPEN;
  }

  get cacheStats() {
    return computed(() => ({
      size: this.cache.size,
      hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
      memory: this.getCacheMemoryUsage()
    })).get();
  }

  get isLoading() {
    return this.loading;
  }

  get hasError() {
    return !!this.error;
  }

  // 设置响应式副作用
  private setupReactions() {
    // 自动刷新
    reaction(
      () => this.autoRefresh,
      (enabled) => enabled ? this.startAutoRefresh() : this.stopAutoRefresh()
    );

    // 筛选变化自动重新加载
    reaction(
      () => this.filters,
      () => this.debounceRefresh(),
      { fireImmediately: false }
    );

    // WebSocket 重连
    reaction(
      () => this.wsConnection?.readyState,
      (state) => {
        if (state === WebSocket.CLOSED && this.wsReconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      }
    );

    // 持久化状态变化
    reaction(
      () => ({
        filters: this.filters,
        currentLayout: this.currentLayout,
        autoRefresh: this.autoRefresh,
        refreshInterval: this.refreshInterval,
        cacheEnabled: this.cacheEnabled,
      }),
      (state) => this.persistenceManager.saveState(state),
      { delay: 1000 }
    );
  }

  // 加载持久化状态
  private loadPersistedState() {
    const saved = this.persistenceManager.loadState();
    if (saved) {
      runInAction(() => {
        this.filters = saved.filters || this.filters;
        this.currentLayout = saved.currentLayout || this.currentLayout;
        this.autoRefresh = saved.autoRefresh || this.autoRefresh;
        this.refreshInterval = saved.refreshInterval || this.refreshInterval;
        this.cacheEnabled = saved.cacheEnabled !== undefined ? saved.cacheEnabled : this.cacheEnabled;
      });
    }
  }

  // 数据加载与缓存
  async loadDashboardData() {
    if (this.loading) return;

    runInAction(() => {
      this.loading = true;
      this.error = null;
    });

    try {
      await Promise.all([
        this.loadMetrics(),
        this.loadChartData('sales'),
        this.loadChartData('users'),
        this.loadChartData('revenue'),
        this.loadChartData('products'),
      ]);

      runInAction(() => {
        this.initialized = true;
        this.lastUpdated = Date.now();
      });
    } catch (error) {
      runInAction(() => {
        this.error = this.errorHandler.handleApiError(error, 'loadDashboardData');
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  async loadWithCache<T>(key: string, loader: () => Promise<T>, ttl = 300000): Promise<T> {
    if (this.cacheEnabled) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.cacheHits++;
        return cached.data;
      }
    }

    this.cacheMisses++;
    const data = await loader();
    
    if (this.cacheEnabled) {
      this.cache.set(key, { data, timestamp: Date.now(), ttl });
    }
    
    return data;
  }

  async loadMetrics(filters?: DashboardFilter) {
    try {
      const currentFilters = filters || this.filters;
      const cacheKey = `dashboard:metrics:${JSON.stringify(currentFilters)}`;
      
      const data = await this.loadWithCache(
        cacheKey,
        async () => {
          const response = await api.get<DashboardMetrics>('/dashboard/metrics', {
            params: currentFilters,
          });
          return response.code === 0 ? response.data : null;
        },
        5 * 60 * 1000
      );

      if (data) {
        runInAction(() => {
          this.metrics = data;
        });
      } else {
        // 使用模拟数据
        runInAction(() => {
          this.metrics = {
            totalUsers: 11280,
            totalOrders: 9280,
            totalRevenue: 112893.56,
            pageViews: 45672,
            conversionRate: 3.2,
            activeUsers: 1205,
            bounceRate: 45.6,
            avgSessionDuration: 185,
          };
        });
      }
    } catch (error) {
      console.warn('Failed to load metrics, using mock data:', error);
      runInAction(() => {
        this.metrics = {
          totalUsers: 11280,
          totalOrders: 9280,
          totalRevenue: 112893.56,
          pageViews: 45672,
          conversionRate: 3.2,
          activeUsers: 1205,
          bounceRate: 45.6,
          avgSessionDuration: 185,
        };
      });
    }
  }

  async loadChartData(chartType: string, filters?: DashboardFilter) {
    try {
      const currentFilters = filters || this.filters;
      const cacheKey = `dashboard:chart:${chartType}:${JSON.stringify(currentFilters)}`;

      const data = await this.loadWithCache(
        cacheKey,
        async () => {
          const response = await api.get<ChartData[]>(`/dashboard/charts/${chartType}`, {
            params: currentFilters,
          });
          return response.code === 0 ? response.data : null;
        },
        3 * 60 * 1000
      );

      const chartData = data || this.generateMockChartData(chartType);
      
      runInAction(() => {
        switch (chartType) {
          case 'sales':
            this.salesTrend = chartData;
            break;
          case 'users':
            this.userAnalytics = chartData;
            break;
          case 'revenue':
            this.revenueByRegion = chartData;
            break;
          case 'products':
            this.topProducts = chartData;
            break;
        }
        this.loadedCharts.add(chartType);
      });
    } catch (error) {
      console.warn(`Failed to load ${chartType} chart data, using mock data:`, error);
      const mockData = this.generateMockChartData(chartType);
      runInAction(() => {
        switch (chartType) {
          case 'sales':
            this.salesTrend = mockData;
            break;
          case 'users':
            this.userAnalytics = mockData;
            break;
          case 'revenue':
            this.revenueByRegion = mockData;
            break;
          case 'products':
            this.topProducts = mockData;
            break;
        }
        this.loadedCharts.add(chartType);
      });
    }
  }

  // 筛选和查询
  updateFilters(filters: Partial<DashboardFilter>) {
    runInAction(() => {
      this.filters = { ...this.filters, ...filters };
    });
  }

  applyFilters(data: any[], filters: DashboardFilter): any[] {
    // 这里实现筛选逻辑
    return data;
  }

  // 布局管理
  async saveLayout(layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const newLayout: DashboardLayout = {
        ...layout,
        id: `layout_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const response = await api.post<DashboardLayout>('/dashboard/layouts', newLayout);
      if (response.code === 0) {
        runInAction(() => {
          this.layouts.push(response.data);
        });
      }
    } catch (error) {
      console.error('Failed to save layout:', error);
      throw error;
    }
  }

  async loadLayouts() {
    try {
      const response = await api.get<DashboardLayout[]>('/dashboard/layouts');
      if (response.code === 0) {
        runInAction(() => {
          this.layouts = response.data;
          if (!this.currentLayout && response.data.length > 0) {
            const defaultLayout = response.data.find(l => l.isDefault) || response.data[0];
            this.currentLayout = defaultLayout.id;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load layouts:', error);
    }
  }

  switchLayout(layoutId: string) {
    runInAction(() => {
      this.currentLayout = layoutId;
    });
  }

  async deleteLayout(layoutId: string) {
    try {
      await api.delete(`/dashboard/layouts/${layoutId}`);
      runInAction(() => {
        this.layouts = this.layouts.filter(l => l.id !== layoutId);
        if (this.currentLayout === layoutId) {
          this.currentLayout = this.layouts.length > 0 ? this.layouts[0].id : null;
        }
      });
    } catch (error) {
      console.error('Failed to delete layout:', error);
      throw error;
    }
  }

  // 实时数据增强
  connectRealTime() {
    if (this.wsConnection) {
      this.wsConnection.close();
    }

    try {
      const wsUrl = (typeof process !== 'undefined' && process.env?.REACT_APP_WS_URL) || 'ws://localhost:8080/ws/dashboard';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Dashboard WebSocket connected');
        runInAction(() => {
          this.wsConnection = ws;
          this.wsReconnectAttempts = 0;
        });
        this.setupHeartbeat();
        this.startMockDataGeneration(); // 启动模拟数据生成
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'realtime_metrics') {
            this.throttleUpdate(data.payload);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Dashboard WebSocket disconnected');
        runInAction(() => {
          this.wsConnection = null;
        });
        this.clearHeartbeat();
      };

      ws.onerror = (error) => {
        console.error('Dashboard WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  disconnectRealTime() {
    if (this.wsConnection) {
      this.wsConnection.close();
      runInAction(() => {
        this.wsConnection = null;
      });
    }
    this.clearHeartbeat();
    this.stopMockDataGeneration(); // 停止模拟数据生成
  }

  private setupHeartbeat() {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.wsConnection?.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    setTimeout(() => {
      if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
        this.wsReconnectAttempts++;
        console.log(`Attempting WebSocket reconnection (${this.wsReconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connectRealTime();
      }
    }, this.reconnectDelay * Math.pow(2, this.wsReconnectAttempts));
  }

  updateRealTimeData(data: RealTimeMetrics) {
    runInAction(() => {
      this.realTimeData = {
        ...data,
        timestamp: Date.now(),
      };
      this.lastUpdateTime = Date.now();
      
      // 更新图表数据
      this.updateRealTimeChartData();
    });
  }

  private updateRealTimeChartData() {
    const now = Date.now();
    
    // 更新流量数据
    if (!this.realTimeChartData.traffic) {
      this.realTimeChartData.traffic = [];
    }
    this.realTimeChartData.traffic.push({
      value: this.realTimeData.activeUsers + Math.floor(Math.random() * 50),
      timestamp: now
    });
    
    // 更新性能数据
    if (!this.realTimeChartData.performance) {
      this.realTimeChartData.performance = [];
    }
    this.realTimeChartData.performance.push({
      value: Math.floor(Math.random() * 200) + 100,
      timestamp: now
    });
    
    // 保持最近20个数据点
    if (this.realTimeChartData.traffic.length > 20) {
      this.realTimeChartData.traffic.shift();
    }
    if (this.realTimeChartData.performance.length > 20) {
      this.realTimeChartData.performance.shift();
    }
  }

  // 模拟数据生成（用于演示）
  private startMockDataGeneration() {
    this.stopMockDataGeneration();
    this.mockDataTimer = setInterval(() => {
      const mockData: RealTimeMetrics = {
        activeUsers: Math.floor(Math.random() * 2000) + 1000,
        orders: Math.floor(Math.random() * 50) + 10,
        revenue: Math.random() * 10000 + 5000,
        pageViews: Math.floor(Math.random() * 5000) + 2000,
        timestamp: Date.now()
      };
      this.updateRealTimeData(mockData);
    }, 3000);
  }

  private stopMockDataGeneration() {
    if (this.mockDataTimer) {
      clearInterval(this.mockDataTimer);
      this.mockDataTimer = null;
    }
  }

  // 数据导出
  async exportData(format: 'pdf' | 'excel' | 'csv') {
    try {
      const exportData = {
        metrics: this.metrics,
        charts: {
          salesTrend: this.salesTrend,
          userAnalytics: this.userAnalytics,
          revenueByRegion: this.revenueByRegion,
          topProducts: this.topProducts,
        },
        filters: this.filters,
        timestamp: Date.now(),
      };

      // 先发送POST请求生成文件，然后下载
      const response = await api.post('/dashboard/export', { format, data: exportData });
      if (response.code === 0 && response.data.downloadUrl) {
        await api.download(response.data.downloadUrl, `dashboard_${Date.now()}.${format}`);
      }
    } catch (error) {
      console.error('Failed to export dashboard:', error);
      throw error;
    }
  }

  async generateReport(template: string) {
    try {
      const response = await api.post('/dashboard/reports', {
        template,
        data: {
          metrics: this.metrics,
          charts: {
            salesTrend: this.salesTrend,
            userAnalytics: this.userAnalytics,
            revenueByRegion: this.revenueByRegion,
            topProducts: this.topProducts,
          },
          filters: this.filters,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  // 性能优化
  private debounceRefresh = debounce(() => this.refreshData(), 1000);
  private throttleUpdate = throttle((data: RealTimeMetrics) => this.updateRealTimeData(data), 100);

  batchUpdate(updates: Array<() => void>) {
    runInAction(() => {
      updates.forEach(update => update());
    });
  }

  async refreshData() {
    await this.loadDashboardData();
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      this.refreshData();
    }, this.refreshInterval * 1000);
  }

  private stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  toggleAutoRefresh() {
    runInAction(() => {
      this.autoRefresh = !this.autoRefresh;
    });
  }

  setRefreshInterval(interval: number) {
    runInAction(() => {
      this.refreshInterval = interval;
    });
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  // 缓存管理
  clearCache() {
    this.cache.clear();
    CacheManager.clear();
    runInAction(() => {
      this.lastUpdated = Date.now();
    });
  }

  toggleCache() {
    runInAction(() => {
      this.cacheEnabled = !this.cacheEnabled;
    });
  }

  private getCacheMemoryUsage(): number {
    let total = 0;
    this.cache.forEach(cached => {
      total += JSON.stringify(cached.data).length;
    });
    return total;
  }

  // 懒加载
  async loadChartDataLazy(chartType: string) {
    if (this.loadedCharts.has(chartType)) return;
    await this.loadChartData(chartType);
  }

  // 重置
  reset() {
    runInAction(() => {
      this.metrics = { ...defaultMetrics };
      this.salesTrend = [];
      this.userAnalytics = [];
      this.revenueByRegion = [];
      this.topProducts = [];
      this.loading = false;
      this.error = null;
      this.initialized = false;
      this.realTimeData = { ...defaultRealTimeData };
      this.filters = { ...defaultFilters };
      this.layouts = [];
      this.currentLayout = null;
      this.autoRefresh = false;
      this.refreshInterval = 30;
      this.cacheEnabled = true;
      this.lastUpdated = 0;
    });
    
    this.disconnectRealTime();
    this.stopAutoRefresh();
    this.clearCache();
    this.loadedCharts.clear();
    this.persistenceManager.clearState();
  }

  // 辅助方法：生成模拟数据
  private generateMockChartData(chartType: string): ChartData[] {
    switch (chartType) {
      case 'sales':
        return [
          { name: '1月', value: 4000 },
          { name: '2月', value: 3000 },
          { name: '3月', value: 2000 },
          { name: '4月', value: 2780 },
          { name: '5月', value: 1890 },
          { name: '6月', value: 2390 },
        ];
      case 'users':
        return [
          { name: '新用户', value: 6800 },
          { name: '老用户', value: 4480 },
        ];
      case 'revenue':
        return [
          { name: '北京', value: 25000 },
          { name: '上海', value: 22000 },
          { name: '广州', value: 18000 },
          { name: '深圳', value: 16000 },
          { name: '杭州', value: 12000 },
        ];
      case 'products':
        return [
          { name: '产品A', value: 8500 },
          { name: '产品B', value: 7200 },
          { name: '产品C', value: 6800 },
          { name: '产品D', value: 5900 },
          { name: '产品E', value: 4200 },
        ];
      default:
        return [];
    }
  }

  // 设置方法
  setMetrics(metrics: Partial<DashboardMetrics>) {
    runInAction(() => {
      this.metrics = { ...this.metrics, ...metrics };
    });
  }

  setSalesTrend(data: ChartData[]) {
    runInAction(() => {
      this.salesTrend = data;
    });
  }

  setUserAnalytics(data: ChartData[]) {
    runInAction(() => {
      this.userAnalytics = data;
    });
  }

  setLoading(loading: boolean) {
    runInAction(() => {
      this.loading = loading;
    });
  }

  setRealTimeData(data: Partial<RealTimeMetrics>) {
    runInAction(() => {
      this.realTimeData = { ...this.realTimeData, ...data };
    });
  }

  // 初始化示例数据
  initializeSampleData() {
    this.setMetrics({
      totalUsers: 11280,
      totalOrders: 9280,
      totalRevenue: 112893.56,
      pageViews: 45672,
      conversionRate: 3.2,
    });

    this.setSalesTrend([
      { name: '1月', value: 4000 },
      { name: '2月', value: 3000 },
      { name: '3月', value: 2000 },
      { name: '4月', value: 2780 },
      { name: '5月', value: 1890 },
      { name: '6月', value: 2390 },
    ]);

    this.setUserAnalytics([
      { name: '新用户', value: 6800 },
      { name: '老用户', value: 4480 },
    ]);
  }

  // 智能缓存预热
  async warmupCache() {
    const criticalData = [
      'dashboard:metrics',
      'dashboard:charts:sales',
      'dashboard:layouts'
    ];
    
    try {
      await Promise.all(
        criticalData.map(key => 
          this.loadWithCache(key, () => this.fetchCriticalData(key))
        )
      );
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  private async fetchCriticalData(key: string): Promise<any> {
    // 模拟关键数据获取
    switch (key) {
      case 'dashboard:metrics':
        return this.metrics;
      case 'dashboard:charts:sales':
        return this.salesTrend;
      case 'dashboard:layouts':
        return this.layouts;
      default:
        return null;
    }
  }

  // 预加载页面数据
  async preloadPageData(pageType: string) {
    const preloadStrategies: Record<string, () => Promise<void>> = {
      analytics: async () => {
        await this.loadChartData('analytics');
      },
      reports: async () => {
        await this.loadReportsData();
      },
      realtime: async () => {
        this.connectRealTime();
      },
      visualization: async () => {
        await Promise.all([
          this.loadChartData('sales'),
          this.loadChartData('users'),
          this.loadChartData('revenue')
        ]);
      }
    };
    
    const strategy = preloadStrategies[pageType];
    if (strategy) {
      // 低优先级预加载，不阻塞当前页面
      requestIdleCallback(() => strategy());
    }
  }

  // 加载报告数据
  private async loadReportsData() {
    try {
      // 模拟报告数据加载
      await new Promise(resolve => setTimeout(resolve, 500));
      runInAction(() => {
        this.pendingReports = Math.floor(Math.random() * 5);
      });
    } catch (error) {
      this.errorHandler.handleApiError(error, 'loadReportsData');
    }
  }

  // WebSocket 相关方法（保持兼容性）
  connectWebSocket() {
    this.connectRealTime();
  }

  disconnectWebSocket() {
    this.disconnectRealTime();
  }
}

export const dashboardStore = new DashboardStore();