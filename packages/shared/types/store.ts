/**
 * 状态管理类型定义
 * 定义了微前端架构中全局状态管理的类型
 */

import { User, ThemeConfig } from './index';

// ==================== 全局状态接口 ====================

export interface GlobalState {
  // 用户信息
  user: UserState;
  
  // 应用配置
  app: AppState;
  
  // 主题配置
  theme: ThemeState;
  
  // 权限信息
  auth: AuthState;
  
  // 路由信息
  router: RouterState;
  
  // 通知信息
  notification: NotificationState;
  
  // 系统配置
  system: SystemState;
}

// ==================== 用户状态 ====================

export interface UserState {
  // 当前用户信息
  currentUser: User | null;
  
  // 用户偏好设置
  preferences: UserPreferences;
  
  // 登录状态
  isAuthenticated: boolean;
  
  // 用户权限
  permissions: string[];
  
  // 用户角色
  roles: string[];
  
  // 登录时间
  loginTime: string | null;
  
  // 最后活动时间
  lastActivity: string | null;
}

export interface UserPreferences {
  // 语言设置
  language: string;
  
  // 时区设置
  timezone: string;
  
  // 通知设置
  notifications: {
    email: boolean;
    push: boolean;
    sound: boolean;
  };
  
  // 界面设置
  ui: {
    sidebarCollapsed: boolean;
    tablePageSize: number;
    dateFormat: string;
    timeFormat: string;
  };
}

// ==================== 应用状态 ====================

export interface AppState {
  // 应用信息
  name: string;
  version: string;
  
  // 加载状态
  loading: boolean;
  
  // 错误信息
  error: string | null;
  
  // 已注册的微应用
  microApps: MicroAppState[];
  
  // 当前活跃的微应用
  activeMicroApp: string | null;
  
  // 应用配置
  config: AppConfig;
  
  // 菜单数据
  menus: MenuItem[];
  
  // 面包屑
  breadcrumbs: BreadcrumbItem[];
}

export interface MicroAppState {
  name: string;
  status: 'loading' | 'mounted' | 'unmounted' | 'error';
  props: Record<string, any>;
  error?: string;
  mountTime?: string;
  unmountTime?: string;
}

export interface AppConfig {
  title: string;
  logo: string;
  description: string;
  version: string;
  apiBaseUrl: string;
  enableDevTools: boolean;
  enableMock: boolean;
  features: {
    [key: string]: boolean;
  };
}

export interface MenuItem {
  key: string;
  label: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  permissions?: string[];
  hidden?: boolean;
  external?: boolean;
  badge?: {
    count: number;
    color: string;
  };
}

export interface BreadcrumbItem {
  key: string;
  label: string;
  path?: string;
  icon?: string;
}

// ==================== 主题状态 ====================

export interface ThemeState {
  // 当前主题
  current: 'light' | 'dark' | 'auto';
  
  // 主题配置
  config: ThemeConfig;
  
  // 自定义主题
  customThemes: Record<string, ThemeConfig>;
  
  // 主题切换动画
  animating: boolean;
  
  // 系统主题偏好
  systemPreference: 'light' | 'dark';
}

// ==================== 认证状态 ====================

export interface AuthState {
  // 访问令牌
  accessToken: string | null;
  
  // 刷新令牌
  refreshToken: string | null;
  
  // 令牌过期时间
  tokenExpiry: string | null;
  
  // 登录状态
  isLoggedIn: boolean;
  
  // 登录加载状态
  loginLoading: boolean;
  
  // 权限列表
  permissions: Permission[];
  
  // 角色列表
  roles: Role[];
  
  // 会话信息
  session: SessionInfo | null;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  resource: string;
  action: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: Permission[];
  level: number;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: {
    type: 'desktop' | 'mobile' | 'tablet';
    os: string;
    browser: string;
  };
}

// ==================== 路由状态 ====================

export interface RouterState {
  // 当前路由
  currentRoute: RouteInfo;
  
  // 路由历史
  history: RouteInfo[];
  
  // 路由加载状态
  loading: boolean;
  
  // 路由错误
  error: string | null;
  
  // 路由缓存
  cache: Record<string, any>;
  
  // 路由守卫状态
  guards: {
    beforeEach: boolean;
    afterEach: boolean;
  };
}

export interface RouteInfo {
  path: string;
  name?: string;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
  fullPath: string;
  matched: RouteRecord[];
  meta: RouteMeta;
  timestamp: string;
}

export interface RouteRecord {
  path: string;
  name?: string;
  component?: any;
  components?: Record<string, any>;
  redirect?: string;
  meta?: RouteMeta;
  children?: RouteRecord[];
}

export interface RouteMeta {
  title?: string;
  icon?: string;
  requiresAuth?: boolean;
  permissions?: string[];
  roles?: string[];
  hidden?: boolean;
  keepAlive?: boolean;
  breadcrumb?: boolean;
  [key: string]: any;
}

// ==================== 通知状态 ====================

export interface NotificationState {
  // 通知列表
  notifications: NotificationItem[];
  
  // 未读数量
  unreadCount: number;
  
  // 显示设置
  settings: NotificationSettings;
  
  // 加载状态
  loading: boolean;
  
  // 错误信息
  error: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  timestamp: string;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  categories: string[];
  doNotDisturb: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

// ==================== 系统状态 ====================

export interface SystemState {
  // 系统信息
  info: SystemInfo;
  
  // 性能监控
  performance: PerformanceMetrics;
  
  // 错误日志
  errors: ErrorLog[];
  
  // 系统配置
  config: SystemConfig;
  
  // 功能开关
  features: Record<string, boolean>;
  
  // 维护模式
  maintenance: MaintenanceInfo;
}

export interface SystemInfo {
  name: string;
  version: string;
  buildTime: string;
  environment: 'development' | 'staging' | 'production';
  nodeVersion: string;
  platform: string;
  uptime: number;
}

export interface PerformanceMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  network: {
    latency: number;
    bandwidth: number;
  };
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  source: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface SystemConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  rateLimiting: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

export interface MaintenanceInfo {
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  message?: string;
  allowedUsers?: string[];
}

// ==================== 状态操作类型 ====================

export interface StateAction<T = any> {
  type: string;
  payload?: T;
  meta?: {
    timestamp: string;
    source: string;
    [key: string]: any;
  };
}

export interface AsyncAction<T = any> extends StateAction<T> {
  loading?: boolean;
  error?: string | null;
}

// ==================== 状态管理器接口 ====================

export interface StateManager {
  getState(): GlobalState;
  setState(state: Partial<GlobalState>): void;
  subscribe(listener: StateListener): () => void;
  dispatch(action: StateAction): void;
}

export type StateListener = (state: GlobalState, prevState: GlobalState) => void;

// ==================== 状态选择器类型 ====================

export type StateSelector<T = any> = (state: GlobalState) => T;

export interface StateSelectorMap {
  [key: string]: StateSelector;
}

// ==================== 状态中间件类型 ====================

export type StateMiddleware = (
  action: StateAction,
  state: GlobalState,
  next: (action: StateAction) => void
) => void;

// ==================== 状态持久化类型 ====================

export interface StatePersistConfig {
  key: string;
  storage: 'localStorage' | 'sessionStorage' | 'indexedDB';
  whitelist?: string[];
  blacklist?: string[];
  transforms?: StateTransform[];
}

export interface StateTransform {
  in: (state: any) => any;
  out: (state: any) => any;
}

// ==================== 导出类型 ====================

export type {
  GlobalState,
  UserState,
  AppState,
  ThemeState,
  AuthState,
  RouterState,
  NotificationState,
  SystemState
};