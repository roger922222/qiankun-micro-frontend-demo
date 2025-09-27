import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { BaseResponse, PaginatedResponse } from '../types/common';
import { CacheManager, CacheStrategy, SmartCache } from './cache';

// API 配置
export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

// 默认配置
const defaultConfig: ApiConfig = {
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5分钟
};

// API 客户端类
export class ApiClient {
  private instance: AxiosInstance;
  private config: ApiConfig;
  private cache: SmartCache;

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.cache = new SmartCache(CacheStrategy.CACHE_FIRST, this.config.cacheTTL);
    
    this.instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // 设置拦截器
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 添加认证token
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加请求ID用于追踪
        config.headers['X-Request-ID'] = this.generateRequestId();

        // 添加时间戳
        config.headers['X-Timestamp'] = Date.now().toString();

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // 处理401未授权错误
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            await this.refreshToken();
            return this.instance(originalRequest);
          } catch (refreshError) {
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        // 处理网络错误重试
        if (this.shouldRetry(error) && !originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        if (originalRequest._retryCount < this.config.retryCount) {
          originalRequest._retryCount++;
          await this.delay(this.config.retryDelay * originalRequest._retryCount);
          return this.instance(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  // GET 请求
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig & { 
      cache?: boolean;
      cacheTTL?: number;
      cacheStrategy?: CacheStrategy;
    }
  ): Promise<BaseResponse<T>> {
    const cacheEnabled = config?.cache ?? this.config.cacheEnabled;
    const cacheKey = this.generateCacheKey('GET', url, config?.params);

    if (cacheEnabled) {
      return this.cache.execute(
        cacheKey,
        () => this.instance.get<BaseResponse<T>>(url, config).then(res => res.data),
        {
          ttl: config?.cacheTTL,
          strategy: config?.cacheStrategy,
        }
      );
    }

    const response = await this.instance.get<BaseResponse<T>>(url, config);
    return response.data;
  }

  // POST 请求
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<BaseResponse<T>> {
    const response = await this.instance.post<BaseResponse<T>>(url, data, config);
    
    // POST 请求后清除相关缓存
    this.invalidateCache(url);
    
    return response.data;
  }

  // PUT 请求
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<BaseResponse<T>> {
    const response = await this.instance.put<BaseResponse<T>>(url, data, config);
    
    // PUT 请求后清除相关缓存
    this.invalidateCache(url);
    
    return response.data;
  }

  // DELETE 请求
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<BaseResponse<T>> {
    const response = await this.instance.delete<BaseResponse<T>>(url, config);
    
    // DELETE 请求后清除相关缓存
    this.invalidateCache(url);
    
    return response.data;
  }

  // 分页查询
  async getPaginated<T = any>(
    url: string,
    params?: {
      page?: number;
      pageSize?: number;
      [key: string]: any;
    },
    config?: AxiosRequestConfig & { cache?: boolean; cacheTTL?: number }
  ): Promise<PaginatedResponse<T>> {
    const queryParams = {
      page: 1,
      pageSize: 20,
      ...params,
    };

    return this.get<T[]>(url, {
      ...config,
      params: queryParams,
    }) as Promise<PaginatedResponse<T>>;
  }

  // 批量请求
  async batch<T = any>(
    requests: Array<{
      method: 'get' | 'post' | 'put' | 'delete';
      url: string;
      data?: any;
      config?: AxiosRequestConfig;
    }>
  ): Promise<BaseResponse<T>[]> {
    const promises = requests.map(req => {
      switch (req.method) {
        case 'get':
          return this.get(req.url, req.config);
        case 'post':
          return this.post(req.url, req.data, req.config);
        case 'put':
          return this.put(req.url, req.data, req.config);
        case 'delete':
          return this.delete(req.url, req.config);
        default:
          throw new Error(`Unsupported method: ${req.method}`);
      }
    });

    return Promise.all(promises);
  }

  // 上传文件
  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: AxiosRequestConfig
  ): Promise<BaseResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // 下载文件
  async download(
    url: string,
    filename?: string,
    config?: AxiosRequestConfig
  ): Promise<void> {
    const response = await this.instance.get(url, {
      ...config,
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || this.extractFilenameFromUrl(url);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // 获取认证token
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // 刷新token
  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.instance.post('/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('refresh_token', newRefreshToken);
  }

  // 处理认证错误
  private handleAuthError(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    // 可以触发全局事件或重定向到登录页
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  // 生成请求ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 生成缓存键
  private generateCacheKey(method: string, url: string, params?: any): string {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `api:${method}:${url}:${paramsStr}`;
  }

  // 清除相关缓存
  private invalidateCache(url: string): void {
    const stats = CacheManager.getStats();
    const keysToDelete = stats.keys.filter(key => key.includes(url));
    keysToDelete.forEach(key => CacheManager.delete(key));
  }

  // 判断是否应该重试
  private shouldRetry(error: any): boolean {
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 从URL提取文件名
  private extractFilenameFromUrl(url: string): string {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'download';
  }

  // 设置基础URL
  setBaseURL(baseURL: string): void {
    this.config.baseURL = baseURL;
    this.instance.defaults.baseURL = baseURL;
  }

  // 设置超时时间
  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
    this.instance.defaults.timeout = timeout;
  }

  // 清除所有缓存
  clearCache(): void {
    CacheManager.clear();
  }

  // 获取缓存统计
  getCacheStats() {
    return CacheManager.getStats();
  }
}

// 创建默认API客户端实例
export const apiClient = new ApiClient();

// 导出便捷方法
export const api = {
  get: <T = any>(url: string, config?: Parameters<typeof apiClient.get>[1]) => 
    apiClient.get<T>(url, config),
  
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.post<T>(url, data, config),
  
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => 
    apiClient.put<T>(url, data, config),
  
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => 
    apiClient.delete<T>(url, config),
  
  upload: <T = any>(url: string, file: File, onProgress?: (progress: number) => void) => 
    apiClient.upload<T>(url, file, onProgress),
  
  download: (url: string, filename?: string) => 
    apiClient.download(url, filename),
  
  getPaginated: <T = any>(url: string, params?: Parameters<typeof apiClient.getPaginated>[1]) => 
    apiClient.getPaginated<T>(url, params),
  
  batch: <T = any>(requests: Parameters<typeof apiClient.batch>[0]) => 
    apiClient.batch<T>(requests),
};