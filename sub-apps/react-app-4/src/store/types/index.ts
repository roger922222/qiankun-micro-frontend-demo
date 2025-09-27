// 导出所有类型定义
export * from './common';
export * from './dashboard';
export * from './analytics';

// 用户管理相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: import('./common').UserRole;
  permissions: string[];
  preferences: UserPreferences;
  lastLoginAt?: number;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  dashboardLayout?: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  alertThresholds: Record<string, number>;
}

// 数据源管理相关类型
export interface DataSource {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'mongodb' | 'redis' | 'elasticsearch' | 'api' | 'file';
  status: import('./common').DataSourceStatus;
  config: DataSourceConfig;
  lastSyncAt?: number;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface DataSourceConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  ssl?: boolean;
  extra?: Record<string, any>;
}

export interface DataQuality {
  dataSourceId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateRecords: number;
  missingFields: string[];
  lastCheckAt: number;
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  type: 'missing' | 'invalid' | 'duplicate' | 'inconsistent';
  field: string;
  description: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// 告警通知相关类型
export interface Alert {
  id: string;
  name: string;
  description: string;
  type: 'threshold' | 'anomaly' | 'data_quality' | 'system';
  level: import('./common').AlertLevel;
  conditions: AlertCondition[];
  actions: AlertAction[];
  isActive: boolean;
  lastTriggeredAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number;
  timeWindow: number; // 时间窗口（分钟）
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'sms' | 'push';
  config: {
    recipients?: string[];
    url?: string;
    message?: string;
    template?: string;
  };
}

export interface AlertHistory {
  id: string;
  alertId: string;
  triggeredAt: number;
  resolvedAt?: number;
  level: import('./common').AlertLevel;
  message: string;
  data: Record<string, any>;
  actions: AlertActionResult[];
}

export interface AlertActionResult {
  type: AlertAction['type'];
  success: boolean;
  message?: string;
  executedAt: number;
}

// 图表配置相关类型
export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  type: import('./common').ChartType;
  category: string;
  thumbnail?: string;
  config: ChartTemplateConfig;
  isPublic: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChartTemplateConfig {
  defaultOptions: Record<string, any>;
  requiredFields: string[];
  optionalFields: string[];
  supportedDataTypes: string[];
  minDataPoints?: number;
  maxDataPoints?: number;
}

export interface ChartStyle {
  id: string;
  name: string;
  colors: string[];
  fonts: {
    title: string;
    label: string;
    value: string;
  };
  spacing: Record<string, number>;
  borders: {
    width: number;
    color: string;
    radius: number;
  };
}

// 系统设置相关类型
export interface SystemConfig {
  id: string;
  category: 'general' | 'security' | 'performance' | 'integration' | 'backup';
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  description: string;
  isPublic: boolean;
  updatedBy: string;
  updatedAt: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    load: number[];
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    responseTime: number;
  };
  cache: {
    hitRate: number;
    memory: number;
    keys: number;
  };
  lastCheckAt: number;
}

export interface BackupConfig {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  schedule: string; // cron expression
  retention: number; // days
  compression: boolean;
  encryption: boolean;
  destination: {
    type: 'local' | 's3' | 'ftp' | 'sftp';
    config: Record<string, any>;
  };
  isActive: boolean;
  lastBackupAt?: number;
  nextBackupAt?: number;
}

// Store 根状态类型
export interface RootState {
  dashboard: import('./dashboard').DashboardState;
  analytics: import('./analytics').AnalyticsState;
  user: {
    currentUser: User | null;
    preferences: UserPreferences;
    loading: boolean;
    error: string | null;
  };
  dataSource: {
    sources: DataSource[];
    quality: Record<string, DataQuality>;
    loading: boolean;
    error: string | null;
  };
  alert: {
    alerts: Alert[];
    history: AlertHistory[];
    loading: boolean;
    error: string | null;
  };
  system: {
    config: SystemConfig[];
    health: SystemHealth | null;
    backups: BackupConfig[];
    loading: boolean;
    error: string | null;
  };
}