import { BaseStoreState, QueryParams, TimeRange } from './common';
import { ChartData } from './dashboard';

export interface AnalyticsMetrics {
  totalSessions: number;
  uniqueUsers: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
  goalCompletions: number;
  revenuePerUser: number;
}

export interface UserBehaviorData {
  userId: string;
  sessionId: string;
  events: UserEvent[];
  startTime: number;
  endTime: number;
  pageViews: number;
  conversions: number;
}

export interface UserEvent {
  type: 'pageview' | 'click' | 'form_submit' | 'purchase' | 'custom';
  page?: string;
  element?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: number;
}

export interface FunnelStep {
  name: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface FunnelAnalysis {
  name: string;
  steps: FunnelStep[];
  totalUsers: number;
  overallConversionRate: number;
}

export interface CohortData {
  cohort: string; // 队列标识（如注册月份）
  period: number; // 时期（如第1周、第2周）
  users: number;
  retentionRate: number;
}

export interface SegmentData {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  userCount: number;
  metrics: AnalyticsMetrics;
}

export interface SegmentCriteria {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface AttributionData {
  channel: string;
  source: string;
  medium: string;
  campaign?: string;
  users: number;
  sessions: number;
  conversions: number;
  revenue: number;
  cost?: number;
  roas?: number; // Return on Ad Spend
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  type: 'standard' | 'custom' | 'scheduled';
  metrics: string[];
  dimensions: string[];
  filters: QueryParams;
  timeRange: TimeRange;
  data: ChartData[];
  createdAt: number;
  updatedAt: number;
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

export interface AnalyticsState extends BaseStoreState {
  // 基础指标
  metrics: AnalyticsMetrics;
  
  // 用户行为数据
  userBehavior: UserBehaviorData[];
  
  // 漏斗分析
  funnels: FunnelAnalysis[];
  
  // 队列分析
  cohorts: CohortData[];
  
  // 用户分群
  segments: SegmentData[];
  
  // 归因分析
  attribution: AttributionData[];
  
  // 报告
  reports: AnalyticsReport[];
  
  // 实时分析
  realTimeUsers: number;
  realTimeEvents: UserEvent[];
  
  // 筛选条件
  timeRange: TimeRange;
  selectedSegments: string[];
  selectedChannels: string[];
  
  // 比较模式
  comparisonEnabled: boolean;
  comparisonTimeRange?: TimeRange;
  
  // 数据采样
  samplingRate: number;
  sampledData: boolean;
}

export interface AnalyticsActions {
  // 数据加载
  loadAnalyticsData: (timeRange?: TimeRange) => Promise<void>;
  loadMetrics: (filters?: QueryParams) => Promise<void>;
  loadUserBehavior: (userId?: string, timeRange?: TimeRange) => Promise<void>;
  
  // 漏斗分析
  createFunnel: (name: string, steps: string[]) => Promise<void>;
  loadFunnelData: (funnelId: string, timeRange?: TimeRange) => Promise<void>;
  deleteFunnel: (funnelId: string) => Promise<void>;
  
  // 队列分析
  loadCohortData: (type: 'retention' | 'revenue', timeRange?: TimeRange) => Promise<void>;
  
  // 用户分群
  createSegment: (segment: Omit<SegmentData, 'id' | 'userCount' | 'metrics'>) => Promise<void>;
  loadSegments: () => Promise<void>;
  updateSegment: (segmentId: string, updates: Partial<SegmentData>) => Promise<void>;
  deleteSegment: (segmentId: string) => Promise<void>;
  
  // 归因分析
  loadAttributionData: (model: 'first_click' | 'last_click' | 'linear' | 'time_decay') => Promise<void>;
  
  // 报告管理
  createReport: (report: Omit<AnalyticsReport, 'id' | 'createdAt' | 'updatedAt' | 'data'>) => Promise<void>;
  loadReports: () => Promise<void>;
  generateReport: (reportId: string) => Promise<void>;
  scheduleReport: (reportId: string, schedule: AnalyticsReport['schedule']) => Promise<void>;
  deleteReport: (reportId: string) => Promise<void>;
  
  // 实时数据
  startRealTimeTracking: () => void;
  stopRealTimeTracking: () => void;
  
  // 筛选和比较
  updateTimeRange: (timeRange: TimeRange) => void;
  toggleComparison: () => void;
  updateComparisonTimeRange: (timeRange: TimeRange) => void;
  updateSegmentFilter: (segments: string[]) => void;
  updateChannelFilter: (channels: string[]) => void;
  
  // 数据采样
  setSamplingRate: (rate: number) => void;
  
  // 导出
  exportAnalytics: (format: 'excel' | 'csv' | 'pdf', reportId?: string) => Promise<void>;
  
  // 重置
  reset: () => void;
}

// 预定义的分析维度
export interface AnalyticsDimension {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  category: 'user' | 'session' | 'event' | 'custom';
  description: string;
}

// 预定义的分析指标
export interface AnalyticsMetric {
  id: string;
  name: string;
  type: 'count' | 'sum' | 'avg' | 'rate' | 'ratio';
  format: 'number' | 'percentage' | 'currency' | 'duration';
  description: string;
  calculation?: string;
}