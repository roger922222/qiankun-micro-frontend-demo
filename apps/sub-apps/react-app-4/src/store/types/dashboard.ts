import { BaseStoreState, ChartType, TimeRange } from './common';

export interface DashboardMetrics {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pageViews: number;
  conversionRate: number;
  activeUsers?: number;
  bounceRate?: number;
  avgSessionDuration?: number;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
  category?: string;
  extra?: Record<string, any>;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  data: ChartData[];
  options: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  refreshInterval?: number; // 自动刷新间隔（秒）
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  charts: ChartConfig[];
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}

export interface RealTimeMetrics {
  activeUsers: number;
  orders: number;
  revenue: number;
  pageViews: number;
  timestamp: number;
}

export interface DashboardFilter {
  timeRange: TimeRange;
  region?: string[];
  channel?: string[];
  userType?: string[];
}

export interface DashboardState extends BaseStoreState {
  // 基础指标
  metrics: DashboardMetrics;
  
  // 图表数据
  salesTrend: ChartData[];
  userAnalytics: ChartData[];
  revenueByRegion: ChartData[];
  topProducts: ChartData[];
  
  // 实时数据
  realTimeData: RealTimeMetrics;
  wsConnection: WebSocket | null;
  
  // 布局配置
  layouts: DashboardLayout[];
  currentLayout: string | null;
  
  // 筛选条件
  filters: DashboardFilter;
  
  // 自动刷新
  autoRefresh: boolean;
  refreshInterval: number;
  
  // 缓存状态
  cacheEnabled: boolean;
  lastCacheUpdate: number;
}

export interface DashboardActions {
  // 数据加载
  loadDashboardData: () => Promise<void>;
  loadMetrics: (filters?: DashboardFilter) => Promise<void>;
  loadChartData: (chartType: string, filters?: DashboardFilter) => Promise<void>;
  
  // 实时数据
  connectRealTime: () => void;
  disconnectRealTime: () => void;
  updateRealTimeData: (data: RealTimeMetrics) => void;
  
  // 布局管理
  saveLayout: (layout: Omit<DashboardLayout, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  loadLayouts: () => Promise<void>;
  switchLayout: (layoutId: string) => void;
  deleteLayout: (layoutId: string) => Promise<void>;
  
  // 图表配置
  addChart: (chart: Omit<ChartConfig, 'id'>) => void;
  updateChart: (chartId: string, updates: Partial<ChartConfig>) => void;
  removeChart: (chartId: string) => void;
  moveChart: (chartId: string, position: ChartConfig['position']) => void;
  
  // 筛选和刷新
  updateFilters: (filters: Partial<DashboardFilter>) => void;
  toggleAutoRefresh: () => void;
  setRefreshInterval: (interval: number) => void;
  refreshData: () => Promise<void>;
  
  // 缓存管理
  clearCache: () => void;
  toggleCache: () => void;
  
  // 导出功能
  exportDashboard: (format: 'pdf' | 'excel' | 'png') => Promise<void>;
  
  // 重置
  reset: () => void;
}

// 图表模板
export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  type: ChartType;
  defaultOptions: Record<string, any>;
  thumbnail?: string;
  category: string;
}

// 仪表板主题
export interface DashboardTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  spacing: Record<string, number>;
}