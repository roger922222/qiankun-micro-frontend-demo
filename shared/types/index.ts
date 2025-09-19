/**
 * 共享类型定义
 * 定义了微前端架构中所有应用共享的TypeScript类型
 */

// ==================== 基础类型 ====================

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== 用户相关类型 ====================

export interface User extends BaseEntity {
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  nickname?: string;
  status: UserStatus;
  roles: Role[];
  permissions: Permission[];
  lastLoginAt?: string;
  profile?: UserProfile;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'other';
  address?: Address;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  categories: string[];
}

export interface Address {
  country: string;
  province: string;
  city: string;
  district?: string;
  street?: string;
  zipCode?: string;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export interface Role extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  permissions: Permission[];
  level: number;
}

export interface Permission extends BaseEntity {
  name: string;
  code: string;
  resource: string;
  action: string;
  description?: string;
}

// ==================== 商品相关类型 ====================

export interface Product extends BaseEntity {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: ProductCategory;
  brand?: Brand;
  price: ProductPrice;
  inventory: ProductInventory;
  images: ProductImage[];
  attributes: ProductAttribute[];
  status: ProductStatus;
  tags: string[];
  seo?: ProductSEO;
}

export interface ProductCategory extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  level: number;
  path: string;
  children?: ProductCategory[];
}

export interface Brand extends BaseEntity {
  name: string;
  logo?: string;
  description?: string;
  website?: string;
}

export interface ProductPrice {
  cost: number;
  retail: number;
  wholesale?: number;
  discount?: number;
  currency: string;
  priceHistory: PriceHistory[];
}

export interface PriceHistory {
  price: number;
  type: 'cost' | 'retail' | 'wholesale';
  effectiveDate: string;
  reason?: string;
}

export interface ProductInventory {
  quantity: number;
  reserved: number;
  available: number;
  reorderPoint: number;
  maxStock: number;
  locations: InventoryLocation[];
}

export interface InventoryLocation {
  warehouse: string;
  location: string;
  quantity: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductAttribute {
  name: string;
  value: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  options?: string[];
}

export interface ProductSEO {
  title?: string;
  description?: string;
  keywords?: string[];
  slug?: string;
}

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

// ==================== 订单相关类型 ====================

export interface Order extends BaseEntity {
  orderNumber: string;
  customer: Customer;
  items: OrderItem[];
  shipping: ShippingInfo;
  payment: PaymentInfo;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  shippingAmount: number;
  finalAmount: number;
  currency: string;
  notes?: string;
  tags: string[];
  timeline: OrderTimeline[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'individual' | 'business';
  addresses: Address[];
}

export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  notes?: string;
}

export interface ShippingInfo {
  method: string;
  carrier?: string;
  trackingNumber?: string;
  address: Address;
  estimatedDelivery?: string;
  actualDelivery?: string;
  cost: number;
}

export interface PaymentInfo {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  amount: number;
  currency: string;
  gateway?: string;
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PAYPAL = 'paypal',
  ALIPAY = 'alipay',
  WECHAT_PAY = 'wechat_pay',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  notes?: string;
  operator?: string;
}

// ==================== 消息相关类型 ====================

export interface Message extends BaseEntity {
  title: string;
  content: string;
  type: MessageType;
  priority: MessagePriority;
  sender: User;
  recipients: MessageRecipient[];
  attachments: MessageAttachment[];
  status: MessageStatus;
  readAt?: string;
  scheduledAt?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export enum MessageType {
  NOTIFICATION = 'notification',
  ALERT = 'alert',
  REMINDER = 'reminder',
  ANNOUNCEMENT = 'announcement',
  SYSTEM = 'system'
}

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface MessageRecipient {
  userId: string;
  readAt?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export enum MessageStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed'
}

// ==================== 文件相关类型 ====================

export interface FileInfo extends BaseEntity {
  name: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  extension: string;
  hash: string;
  owner: User;
  folder?: Folder;
  permissions: FilePermission[];
  metadata?: FileMetadata;
  tags: string[];
  status: FileStatus;
}

export interface Folder extends BaseEntity {
  name: string;
  path: string;
  parentId?: string;
  owner: User;
  permissions: FilePermission[];
  children?: Folder[];
  fileCount: number;
  totalSize: number;
}

export interface FilePermission {
  userId: string;
  permission: 'read' | 'write' | 'delete' | 'share';
  grantedBy: string;
  grantedAt: string;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  bitrate?: number;
  format?: string;
  [key: string]: any;
}

export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
  DELETED = 'deleted'
}

// ==================== 系统监控相关类型 ====================

export interface SystemMetrics {
  timestamp: string;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  applications: ApplicationMetrics[];
}

export interface CPUMetrics {
  usage: number;
  cores: number;
  loadAverage: number[];
  processes: number;
}

export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  available: number;
  usage: number;
}

export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usage: number;
  readSpeed: number;
  writeSpeed: number;
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  connections: number;
}

export interface ApplicationMetrics {
  name: string;
  status: 'running' | 'stopped' | 'error';
  cpu: number;
  memory: number;
  uptime: number;
  requests: number;
  errors: number;
  responseTime: number;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  source: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

// ==================== 微前端相关类型 ====================

export interface MicroAppConfig {
  name: string;
  entry: string;
  container: string;
  activeRule: string | ((location: Location) => boolean);
  props?: Record<string, any>;
  loader?: (loading: boolean) => void;
}

export interface MicroAppInfo {
  name: string;
  status: 'loading' | 'mounted' | 'unmounted' | 'error';
  props: Record<string, any>;
  container: HTMLElement | null;
}

export interface GlobalState {
  user: User | null;
  theme: 'light' | 'dark';
  language: string;
  permissions: string[];
  [key: string]: any;
}

export interface AppCommunication {
  type: 'event' | 'state' | 'props';
  source: string;
  target?: string;
  data: any;
  timestamp: string;
}

// ==================== 路由相关类型 ====================

export interface RouteConfig {
  path: string;
  name: string;
  component?: any;
  microApp?: string;
  meta?: RouteMeta;
  children?: RouteConfig[];
  redirect?: string;
}

export interface RouteMeta {
  title: string;
  icon?: string;
  requiresAuth?: boolean;
  permissions?: string[];
  roles?: string[];
  hidden?: boolean;
  keepAlive?: boolean;
  breadcrumb?: boolean;
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
}

// ==================== 主题相关类型 ====================

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: string;
    border: string;
    [key: string]: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    [key: string]: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

// ==================== 工具类型 ====================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type EventHandler<T = any> = (data: T) => void;

export type AsyncEventHandler<T = any> = (data: T) => Promise<void>;

// ==================== 导出所有类型 ====================

export * from './events';
export * from './store';
export * from './api';