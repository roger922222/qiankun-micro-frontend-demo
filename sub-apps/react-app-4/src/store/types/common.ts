// 通用类型定义
export interface BaseResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface CacheConfig {
  ttl: number; // 缓存时间（毫秒）
  key: string;
  timestamp: number;
}

export interface CachedData<T> {
  data: T;
  config: CacheConfig;
}

// 通用状态接口
export interface BaseStoreState extends LoadingState {
  initialized: boolean;
  lastUpdated: number;
}

// 数据源状态枚举
export enum DataSourceStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error',
}

// 告警级别
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// 用户权限
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ANALYST = 'analyst',
  VIEWER = 'viewer',
}

// 图表类型
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  PIE = 'pie',
  AREA = 'area',
  SCATTER = 'scatter',
  GAUGE = 'gauge',
  HEATMAP = 'heatmap',
}

// 通用筛选条件
export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: any;
}

export interface SortCondition {
  field: string;
  order: 'asc' | 'desc';
}

export interface QueryParams {
  filters?: FilterCondition[];
  sort?: SortCondition[];
  pagination?: PaginationParams;
}

// 导出配置
export interface ExportConfig {
  format: 'excel' | 'pdf' | 'csv' | 'png' | 'svg';
  filename?: string;
  options?: Record<string, any>;
}

// 时间范围
export interface TimeRange {
  start: string | Date;
  end: string | Date;
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';
}

// WebSocket 消息类型
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: number;
  id?: string;
}

// 操作日志
export interface OperationLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: number;
  ip?: string;
  userAgent?: string;
}