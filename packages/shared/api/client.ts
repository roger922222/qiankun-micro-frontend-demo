/**
 * API客户端
 * 提供统一的HTTP请求封装
 */

import { globalLogger } from '../utils/logger';
import { globalEventBus } from '../communication/event-bus';
import { EVENT_TYPES } from '../types/events';
import {
  ApiResponse,
  ApiError,
  RequestConfig,
  HttpMethod,
  ApiClient,
  RequestInterceptor,
  ResponseInterceptor,
  CacheConfig,
  RetryConfig,
  RateLimitConfig
} from '../types/api';

/**
 * HTTP状态码
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

/**
 * 请求缓存
 */
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * 限流器
 */
class RateLimiter {
  private requests = new Map<string, number[]>();

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const keyRequests = this.requests.get(key)!;
    
    // 清理过期的请求记录
    const validRequests = keyRequests.filter(time => time > windowStart);
    this.requests.set(key, validRequests);

    // 检查是否超过限制
    if (validRequests.length >= config.maxRequests) {
      return false;
    }

    // 记录新请求
    validRequests.push(now);
    return true;
  }
}

/**
 * HTTP客户端实现
 */
export class HttpClient implements ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private cache = new RequestCache();
  private rateLimiter = new RateLimiter();
  private retryConfig?: RetryConfig;
  private rateLimitConfig?: RateLimitConfig;

  constructor(config: {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retryConfig?: RetryConfig;
    rateLimitConfig?: RateLimitConfig;
  } = {}) {
    this.baseURL = config.baseURL || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    this.retryConfig = config.retryConfig;
    this.rateLimitConfig = config.rateLimitConfig;
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * 文件上传
   */
  async upload<T = any>(url: string, file: File, config?: RequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<T>({
      ...config,
      method: 'POST',
      url,
      data: formData,
      headers: {
        ...config?.headers,
        // 不设置Content-Type，让浏览器自动设置boundary
      }
    });
  }

  /**
   * 文件下载
   */
  async download(url: string, config?: RequestConfig): Promise<Blob> {
    const response = await this.request<Blob>({
      ...config,
      url,
      method: 'GET',
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(config: RequestConfig & { url: string }): Promise<ApiResponse<T>> {
    // 应用请求拦截器
    let processedConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onFulfilled) {
        processedConfig = await interceptor.onFulfilled(processedConfig);
      }
    }

    // 构建完整URL
    const fullUrl = this.buildUrl(processedConfig.url, processedConfig.params);
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey(processedConfig.method || 'GET', fullUrl, processedConfig.data);
    
    // 检查缓存（仅GET请求）
    if (processedConfig.method === 'GET') {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        globalLogger.debug('Request served from cache', { url: fullUrl });
        return cachedResponse;
      }
    }

    // 限流检查
    if (this.rateLimitConfig) {
      const rateLimitKey = this.getRateLimitKey(fullUrl);
      if (!this.rateLimiter.isAllowed(rateLimitKey, this.rateLimitConfig)) {
        throw new Error('Rate limit exceeded');
      }
    }

    // 执行请求（带重试）
    const response = await this.executeWithRetry(processedConfig, fullUrl);

    // 缓存响应（仅GET请求且成功）
    if (processedConfig.method === 'GET' && response.code === HTTP_STATUS.OK) {
      this.cache.set(cacheKey, response, 300000); // 默认缓存5分钟
    }

    return response;
  }

  /**
   * 带重试的请求执行
   */
  private async executeWithRetry<T>(config: RequestConfig & { url: string }, fullUrl: string): Promise<ApiResponse<T>> {
    const maxRetries = this.retryConfig?.retries || 0;
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(config, fullUrl);
      } catch (error) {
        lastError = error as Error;
        
        // 检查是否应该重试
        if (attempt < maxRetries && this.shouldRetry(error as Error)) {
          const delay = this.getRetryDelay(attempt);
          globalLogger.warn(`Request failed, retrying in ${delay}ms`, { 
            url: fullUrl, 
            attempt: attempt + 1, 
            error: error.message 
          });
          await this.sleep(delay);
          continue;
        }
        
        break;
      }
    }

    throw lastError!;
  }

  /**
   * 执行单次请求
   */
  private async executeRequest<T>(config: RequestConfig & { url: string }, fullUrl: string): Promise<ApiResponse<T>> {
    const startTime = performance.now();
    
    try {
      globalLogger.debug('Making HTTP request', {
        method: config.method,
        url: fullUrl,
        headers: config.headers
      });

      const response = await fetch(fullUrl, {
        method: config.method || 'GET',
        headers: {
          ...this.defaultHeaders,
          ...config.headers
        },
        body: this.prepareBody(config.data, config.headers),
        signal: this.createAbortSignal(config.timeout)
      });

      const duration = performance.now() - startTime;
      
      globalLogger.debug('HTTP request completed', {
        method: config.method,
        url: fullUrl,
        status: response.status,
        duration: `${duration.toFixed(2)}ms`
      });

      // 处理响应
      const result = await this.processResponse<T>(response, config);

      // 应用响应拦截器
      let processedResult = result;
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onFulfilled) {
          processedResult = await interceptor.onFulfilled(processedResult);
        }
      }

      return processedResult;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      globalLogger.error('HTTP request failed', error as Error, {
        method: config.method,
        url: fullUrl,
        duration: `${duration.toFixed(2)}ms`
      });

      // 应用响应拦截器的错误处理
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.onRejected) {
          await interceptor.onRejected(error);
        }
      }

      throw error;
    }
  }

  /**
   * 处理响应
   */
  private async processResponse<T>(response: Response, config: RequestConfig): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type') || '';
    
    let data: any;
    
    if (config.responseType === 'blob') {
      data = await response.blob();
    } else if (config.responseType === 'arraybuffer') {
      data = await response.arrayBuffer();
    } else if (config.responseType === 'text' || !contentType.includes('application/json')) {
      data = await response.text();
    } else {
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
    }

    // 检查HTTP状态码
    if (!response.ok) {
      const error: ApiError = {
        code: response.status,
        message: data?.message || response.statusText || 'Request failed',
        details: data?.details,
        timestamp: new Date().toISOString(),
        traceId: response.headers.get('x-trace-id') || undefined
      };

      // 发射错误事件
      globalEventBus.emit({
        type: EVENT_TYPES.SYSTEM_STATUS,
        source: 'http-client',
        timestamp: new Date().toISOString(),
        id: `http-error-${Date.now()}`,
        data: {
          status: 'error',
          message: `HTTP ${response.status}: ${error.message}`
        }
      });

      throw new Error(JSON.stringify(error));
    }

    // 标准化响应格式
    if (data && typeof data === 'object' && 'code' in data) {
      return data as ApiResponse<T>;
    }

    return {
      code: response.status,
      message: 'Success',
      data,
      timestamp: new Date().toISOString(),
      traceId: response.headers.get('x-trace-id') || undefined
    };
  }

  /**
   * 构建URL
   */
  private buildUrl(url: string, params?: Record<string, any>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    if (!params) return fullUrl;

    const urlObj = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlObj.searchParams.append(key, String(value));
      }
    });

    return urlObj.toString();
  }

  /**
   * 准备请求体
   */
  private prepareBody(data: any, headers?: Record<string, string>): string | FormData | null {
    if (!data) return null;
    
    if (data instanceof FormData) return data;
    
    const contentType = headers?.['Content-Type'] || this.defaultHeaders['Content-Type'];
    
    if (contentType.includes('application/json')) {
      return JSON.stringify(data);
    }
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      return params.toString();
    }
    
    return String(data);
  }

  /**
   * 创建中止信号
   */
  private createAbortSignal(timeout?: number): AbortSignal | undefined {
    if (!timeout) return undefined;
    
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(method: string, url: string, data?: any): string {
    const key = `${method}:${url}`;
    if (data) {
      return `${key}:${JSON.stringify(data)}`;
    }
    return key;
  }

  /**
   * 获取限流键
   */
  private getRateLimitKey(url: string): string {
    return new URL(url).pathname;
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: Error): boolean {
    if (this.retryConfig?.retryCondition) {
      return this.retryConfig.retryCondition(error);
    }
    
    // 默认重试条件：网络错误或5xx错误
    return error.message.includes('fetch') || 
           error.message.includes('network') ||
           error.message.includes('50');
  }

  /**
   * 获取重试延迟
   */
  private getRetryDelay(attempt: number): number {
    if (typeof this.retryConfig?.retryDelay === 'function') {
      return this.retryConfig.retryDelay(attempt);
    }
    return this.retryConfig?.retryDelay || 1000 * Math.pow(2, attempt);
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * 移除认证令牌
   */
  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }
}

/**
 * 创建HTTP客户端实例
 */
export function createHttpClient(config?: {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retryConfig?: RetryConfig;
  rateLimitConfig?: RateLimitConfig;
}): HttpClient {
  return new HttpClient(config);
}

/**
 * 默认HTTP客户端实例
 */
export const httpClient = createHttpClient({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
  retryConfig: {
    retries: 3,
    retryDelay: (attempt) => 1000 * Math.pow(2, attempt),
    retryCondition: (error) => {
      return error.message.includes('fetch') || 
             error.message.includes('network') ||
             error.message.includes('50');
    }
  },
  rateLimitConfig: {
    maxRequests: 100,
    windowMs: 60000 // 1分钟
  }
});

// 添加默认拦截器
httpClient.addRequestInterceptor({
  onFulfilled: (config) => {
    // 添加请求ID用于追踪
    config.headers = {
      ...config.headers,
      'X-Request-ID': `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    return config;
  }
});

httpClient.addResponseInterceptor({
  onRejected: (error) => {
    // 统一错误处理
    if (error.message.includes('401')) {
      globalEventBus.emit({
        type: EVENT_TYPES.USER_LOGOUT,
        source: 'http-client',
        timestamp: new Date().toISOString(),
        id: `logout-${Date.now()}`,
        data: {
          userId: 'current',
          reason: 'Token expired'
        }
      });
    }
  }
});