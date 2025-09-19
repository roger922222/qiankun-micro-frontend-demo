/**
 * API类型定义
 * 定义了微前端架构中API请求和响应的类型
 */

// ==================== 基础API类型 ====================

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
  traceId?: string;
}

export interface ApiError {
  code: number;
  message: string;
  details?: string;
  field?: string;
  timestamp: string;
  traceId?: string;
}

export interface PaginationRequest {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchRequest extends PaginationRequest {
  keyword?: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ==================== 请求配置类型 ====================

export interface RequestConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  method?: HttpMethod;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  withCredentials?: boolean;
  validateStatus?: (status: number) => boolean;
  transformRequest?: (data: any) => any;
  transformResponse?: (data: any) => any;
  onUploadProgress?: (progressEvent: ProgressEvent) => void;
  onDownloadProgress?: (progressEvent: ProgressEvent) => void;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

// ==================== 用户API类型 ====================

export interface LoginRequest {
  username: string;
  password: string;
  captcha?: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  permissions: string[];
  roles: string[];
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  captcha: string;
  agreementAccepted: boolean;
}

export interface ResetPasswordRequest {
  email: string;
  captcha: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  birthday?: string;
  gender?: 'male' | 'female' | 'other';
  address?: any;
}

export interface UserListRequest extends SearchRequest {
  status?: string;
  role?: string;
  department?: string;
}

// ==================== 商品API类型 ====================

export interface ProductListRequest extends SearchRequest {
  categoryId?: string;
  brandId?: string;
  status?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  inStock?: boolean;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku: string;
  categoryId: string;
  brandId?: string;
  price: {
    cost: number;
    retail: number;
    wholesale?: number;
  };
  inventory: {
    quantity: number;
    reorderPoint: number;
    maxStock: number;
  };
  images: string[];
  attributes: Array<{
    name: string;
    value: string;
    type: string;
  }>;
  tags: string[];
  status: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: string;
}

export interface ProductBatchRequest {
  action: 'update' | 'delete' | 'export';
  productIds: string[];
  data?: any;
}

// ==================== 订单API类型 ====================

export interface OrderListRequest extends SearchRequest {
  status?: string;
  customerId?: string;
  paymentStatus?: string;
  shippingStatus?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface CreateOrderRequest {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: any;
  paymentMethod: string;
  notes?: string;
}

export interface UpdateOrderRequest {
  id: string;
  status?: string;
  shippingInfo?: any;
  paymentInfo?: any;
  notes?: string;
}

export interface OrderStatsRequest {
  dateRange: {
    start: string;
    end: string;
  };
  groupBy?: 'day' | 'week' | 'month';
}

// ==================== 消息API类型 ====================

export interface MessageListRequest extends SearchRequest {
  type?: string;
  priority?: string;
  read?: boolean;
  senderId?: string;
}

export interface SendMessageRequest {
  title: string;
  content: string;
  type: string;
  priority: string;
  recipients: string[];
  scheduledAt?: string;
  expiresAt?: string;
  attachments?: string[];
}

export interface MessageBatchRequest {
  action: 'read' | 'delete' | 'archive';
  messageIds: string[];
}

// ==================== 文件API类型 ====================

export interface FileListRequest extends SearchRequest {
  folderId?: string;
  type?: string;
  owner?: string;
}

export interface UploadFileRequest {
  file: File;
  folderId?: string;
  tags?: string[];
  description?: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
  description?: string;
}

export interface FileShareRequest {
  fileId: string;
  users: string[];
  permission: 'read' | 'write' | 'delete';
  expiresAt?: string;
}

// ==================== 系统监控API类型 ====================

export interface SystemMetricsRequest {
  timeRange: {
    start: string;
    end: string;
  };
  interval?: '1m' | '5m' | '15m' | '1h' | '1d';
  metrics?: string[];
}

export interface LogQueryRequest extends PaginationRequest {
  level?: string;
  source?: string;
  message?: string;
  timeRange?: {
    start: string;
    end: string;
  };
}

export interface AlertRuleRequest {
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  duration: string;
  enabled: boolean;
  notifications: string[];
}

// ==================== 配置API类型 ====================

export interface ConfigUpdateRequest {
  key: string;
  value: any;
  description?: string;
  category?: string;
}

export interface ConfigListRequest {
  category?: string;
  key?: string;
}

export interface ThemeConfigRequest {
  name: string;
  colors: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
  isDefault?: boolean;
}

// ==================== 权限API类型 ====================

export interface PermissionListRequest extends SearchRequest {
  resource?: string;
  action?: string;
}

export interface RoleListRequest extends SearchRequest {
  level?: number;
}

export interface CreateRoleRequest {
  name: string;
  code: string;
  description?: string;
  permissions: string[];
  level: number;
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
  id: string;
}

export interface AssignRoleRequest {
  userId: string;
  roleIds: string[];
}

// ==================== 统计API类型 ====================

export interface DashboardStatsRequest {
  dateRange: {
    start: string;
    end: string;
  };
  metrics?: string[];
}

export interface ReportRequest {
  type: string;
  format: 'json' | 'csv' | 'excel' | 'pdf';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  groupBy?: string[];
}

// ==================== WebSocket消息类型 ====================

export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: string;
  id: string;
}

export interface WebSocketSubscription {
  channel: string;
  filters?: Record<string, any>;
}

export interface WebSocketResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// ==================== 批量操作类型 ====================

export interface BatchOperation<T = any> {
  action: string;
  items: T[];
  options?: Record<string, any>;
}

export interface BatchResult<T = any> {
  success: boolean;
  total: number;
  processed: number;
  failed: number;
  results: Array<{
    item: T;
    success: boolean;
    error?: string;
  }>;
}

// ==================== 导入导出类型 ====================

export interface ImportRequest {
  file: File;
  type: string;
  options?: {
    skipHeader?: boolean;
    delimiter?: string;
    encoding?: string;
    mapping?: Record<string, string>;
  };
}

export interface ExportRequest {
  type: string;
  format: 'csv' | 'excel' | 'json' | 'xml';
  filters?: Record<string, any>;
  fields?: string[];
  options?: Record<string, any>;
}

export interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

// ==================== API客户端接口 ====================

export interface ApiClient {
  get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>;
  upload<T = any>(url: string, file: File, config?: RequestConfig): Promise<ApiResponse<T>>;
  download(url: string, config?: RequestConfig): Promise<Blob>;
}

// ==================== 请求拦截器类型 ====================

export interface RequestInterceptor {
  onFulfilled?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onRejected?: (error: any) => any;
}

export interface ResponseInterceptor {
  onFulfilled?: (response: any) => any;
  onRejected?: (error: any) => any;
}

// ==================== 缓存类型 ====================

export interface CacheConfig {
  ttl?: number;
  key?: string | ((config: RequestConfig) => string);
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
  serialize?: (data: any) => string;
  deserialize?: (data: string) => any;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ==================== 重试类型 ====================

export interface RetryConfig {
  retries: number;
  retryDelay?: number | ((retryCount: number) => number);
  retryCondition?: (error: any) => boolean;
}

// ==================== 限流类型 ====================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// ==================== 导出所有类型 ====================

export type {
  ApiResponse,
  ApiError,
  PaginationRequest,
  PaginationResponse,
  SearchRequest,
  RequestConfig,
  HttpMethod,
  ApiClient,
  RequestInterceptor,
  ResponseInterceptor,
  CacheConfig,
  RetryConfig,
  RateLimitConfig
};