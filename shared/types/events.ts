/**
 * 事件类型定义
 * 定义了微前端架构中应用间通信的事件类型
 */

// ==================== 基础事件类型 ====================

export interface BaseEvent {
  type: string;
  source: string;
  timestamp: string;
  id: string;
}

export interface EventPayload<T = any> extends BaseEvent {
  data: T;
}

// ==================== 用户相关事件 ====================

export interface UserLoginEvent extends EventPayload<{
  user: any;
  token: string;
  permissions: string[];
}> {
  type: 'USER_LOGIN';
}

export interface UserLogoutEvent extends EventPayload<{
  userId: string;
  reason?: string;
}> {
  type: 'USER_LOGOUT';
}

export interface UserUpdateEvent extends EventPayload<{
  user: any;
  changedFields: string[];
}> {
  type: 'USER_UPDATE';
}

export interface UserPermissionChangeEvent extends EventPayload<{
  userId: string;
  permissions: string[];
  roles: string[];
}> {
  type: 'USER_PERMISSION_CHANGE';
}

// ==================== 主题相关事件 ====================

export interface ThemeChangeEvent extends EventPayload<{
  theme: 'light' | 'dark';
  colors?: Record<string, string>;
}> {
  type: 'THEME_CHANGE';
}

export interface LanguageChangeEvent extends EventPayload<{
  language: string;
  locale: string;
}> {
  type: 'LANGUAGE_CHANGE';
}

// ==================== 路由相关事件 ====================

export interface RouteChangeEvent extends EventPayload<{
  from: string;
  to: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
}> {
  type: 'ROUTE_CHANGE';
}

export interface NavigationEvent extends EventPayload<{
  path: string;
  replace?: boolean;
  state?: any;
}> {
  type: 'NAVIGATION';
}

// ==================== 应用生命周期事件 ====================

export interface AppMountEvent extends EventPayload<{
  appName: string;
  props: Record<string, any>;
}> {
  type: 'APP_MOUNT';
}

export interface AppUnmountEvent extends EventPayload<{
  appName: string;
}> {
  type: 'APP_UNMOUNT';
}

export interface AppErrorEvent extends EventPayload<{
  appName: string;
  error: Error;
  errorInfo?: any;
}> {
  type: 'APP_ERROR';
}

// ==================== 数据相关事件 ====================

export interface DataUpdateEvent extends EventPayload<{
  entity: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  id?: string;
}> {
  type: 'DATA_UPDATE';
}

export interface CacheInvalidateEvent extends EventPayload<{
  keys: string[];
  pattern?: string;
}> {
  type: 'CACHE_INVALIDATE';
}

// ==================== 通知相关事件 ====================

export interface NotificationEvent extends EventPayload<{
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}> {
  type: 'NOTIFICATION';
}

export interface MessageReceiveEvent extends EventPayload<{
  message: any;
  sender: string;
  channel?: string;
}> {
  type: 'MESSAGE_RECEIVE';
}

// ==================== 系统相关事件 ====================

export interface SystemStatusEvent extends EventPayload<{
  status: 'online' | 'offline' | 'maintenance';
  message?: string;
}> {
  type: 'SYSTEM_STATUS';
}

export interface ConfigUpdateEvent extends EventPayload<{
  config: Record<string, any>;
  changedKeys: string[];
}> {
  type: 'CONFIG_UPDATE';
}

// ==================== 业务相关事件 ====================

export interface OrderStatusChangeEvent extends EventPayload<{
  orderId: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
}> {
  type: 'ORDER_STATUS_CHANGE';
}

export interface ProductUpdateEvent extends EventPayload<{
  productId: string;
  changes: Record<string, any>;
  action: 'create' | 'update' | 'delete';
}> {
  type: 'PRODUCT_UPDATE';
}

export interface InventoryChangeEvent extends EventPayload<{
  productId: string;
  oldQuantity: number;
  newQuantity: number;
  reason: string;
}> {
  type: 'INVENTORY_CHANGE';
}

// ==================== 文件相关事件 ====================

export interface FileUploadEvent extends EventPayload<{
  fileId: string;
  fileName: string;
  status: 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}> {
  type: 'FILE_UPLOAD';
}

export interface FileDeleteEvent extends EventPayload<{
  fileId: string;
  fileName: string;
  path: string;
}> {
  type: 'FILE_DELETE';
}

// ==================== 事件联合类型 ====================

export type MicroFrontendEvent =
  | UserLoginEvent
  | UserLogoutEvent
  | UserUpdateEvent
  | UserPermissionChangeEvent
  | ThemeChangeEvent
  | LanguageChangeEvent
  | RouteChangeEvent
  | NavigationEvent
  | AppMountEvent
  | AppUnmountEvent
  | AppErrorEvent
  | DataUpdateEvent
  | CacheInvalidateEvent
  | NotificationEvent
  | MessageReceiveEvent
  | SystemStatusEvent
  | ConfigUpdateEvent
  | OrderStatusChangeEvent
  | ProductUpdateEvent
  | InventoryChangeEvent
  | FileUploadEvent
  | FileDeleteEvent;

// ==================== 事件处理器类型 ====================

export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => void;

export type AsyncEventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void>;

export interface EventSubscription {
  unsubscribe: () => void;
}

export interface EventBusInterface {
  emit<T extends BaseEvent>(event: T): void;
  on<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): EventSubscription;
  off<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): void;
  once<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): EventSubscription;
  clear(): void;
  getListeners(eventType: string): EventHandler[];
}

// ==================== 事件常量 ====================

export const EVENT_TYPES = {
  // 用户相关
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_UPDATE: 'USER_UPDATE',
  USER_PERMISSION_CHANGE: 'USER_PERMISSION_CHANGE',
  
  // 主题相关
  THEME_CHANGE: 'THEME_CHANGE',
  LANGUAGE_CHANGE: 'LANGUAGE_CHANGE',
  
  // 路由相关
  ROUTE_CHANGE: 'ROUTE_CHANGE',
  NAVIGATION: 'NAVIGATION',
  
  // 应用生命周期
  APP_MOUNT: 'APP_MOUNT',
  APP_UNMOUNT: 'APP_UNMOUNT',
  APP_ERROR: 'APP_ERROR',
  
  // 数据相关
  DATA_UPDATE: 'DATA_UPDATE',
  CACHE_INVALIDATE: 'CACHE_INVALIDATE',
  
  // 通知相关
  NOTIFICATION: 'NOTIFICATION',
  MESSAGE_RECEIVE: 'MESSAGE_RECEIVE',
  
  // 系统相关
  SYSTEM_STATUS: 'SYSTEM_STATUS',
  CONFIG_UPDATE: 'CONFIG_UPDATE',
  
  // 业务相关
  ORDER_STATUS_CHANGE: 'ORDER_STATUS_CHANGE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  INVENTORY_CHANGE: 'INVENTORY_CHANGE',
  
  // 文件相关
  FILE_UPLOAD: 'FILE_UPLOAD',
  FILE_DELETE: 'FILE_DELETE'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];