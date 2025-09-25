import { makeAutoObservable } from 'mobx';

export interface DashboardMetrics {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pageViews: number;
  conversionRate: number;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

export interface RealTimeMetrics {
  activeUsers: number;
  orders: number;
  revenue: number;
  pageViews: number;
}

class DashboardStore {
  metrics: DashboardMetrics = {
    totalUsers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pageViews: 0,
    conversionRate: 0,
  };

  salesTrend: ChartData[] = [];
  userAnalytics: ChartData[] = [];
  loading = false;
  
  // 实时数据相关
  realTimeData: RealTimeMetrics = {
    activeUsers: 0,
    orders: 0,
    revenue: 0,
    pageViews: 0,
  };
  wsConnection: WebSocket | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setMetrics(metrics: Partial<DashboardMetrics>) {
    this.metrics = { ...this.metrics, ...metrics };
  }

  setSalesTrend(data: ChartData[]) {
    this.salesTrend = data;
  }

  setUserAnalytics(data: ChartData[]) {
    this.userAnalytics = data;
  }

  setLoading(loading: boolean) {
    this.loading = loading;
  }

  async loadDashboardData() {
    this.setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      this.setLoading(false);
    }
  }

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

  // 实时数据方法
  setRealTimeData(data: Partial<RealTimeMetrics>) {
    this.realTimeData = { ...this.realTimeData, ...data };
  }

  connectWebSocket() {
    // 模拟WebSocket连接
    if (this.wsConnection) {
      this.wsConnection.close();
    }
    
    // 这里可以实现真实的WebSocket连接
    console.log('WebSocket connected for real-time data');
  }

  disconnectWebSocket() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  updateRealTimeData(data: RealTimeMetrics) {
    this.setRealTimeData(data);
  }

  reset() {
    this.metrics = {
      totalUsers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      pageViews: 0,
      conversionRate: 0,
    };
    this.salesTrend = [];
    this.userAnalytics = [];
    this.loading = false;
    this.realTimeData = {
      activeUsers: 0,
      orders: 0,
      revenue: 0,
      pageViews: 0,
    };
    this.disconnectWebSocket();
  }
}

export const dashboardStore = new DashboardStore();