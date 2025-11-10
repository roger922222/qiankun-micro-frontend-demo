// 前端API调用优化
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';

// API配置
const API_CONFIG = {
  // 基础URL
  BASE_URL: process.env.VITE_BFF_API_URL || 'http://localhost:3013',
  
  // 超时配置
  TIMEOUT: 30000,
  
  // 重试配置
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    RETRY_CONDITION: (error: any) => {
      // 只在网络错误或5xx错误时重试
      return !error.response || error.response.status >= 500;
    },
  },
  
  // 缓存配置
  CACHE: {
    ENABLED: true,
    DEFAULT_TTL: 5 * 60 * 1000, // 5分钟
    MAX_SIZE: 100, // 最大缓存条目数
  },
  
  // 请求去重配置
  DEDUPLICATION: {
    ENABLED: true,
    WINDOW: 1000, // 1秒内相同请求去重
  },
  
  // 批量请求配置
  BATCH: {
    ENABLED: true,
    MAX_BATCH_SIZE: 10,
    BATCH_DELAY: 50, // 50ms内请求批量处理
  },
};

// 请求缓存类
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  
  /**
   * 生成缓存键
   */
  private generateKey(config: AxiosRequestConfig): string {
    const { method, url, params, data } = config;
    return JSON.stringify({ method, url, params, data });
  }
  
  /**
   * 获取缓存
   */
  get(config: AxiosRequestConfig): any | null {
    if (!API_CONFIG.CACHE.ENABLED) return null;
    
    const key = this.generateKey(config);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * 设置缓存
   */
  set(config: AxiosRequestConfig, data: any, ttl = API_CONFIG.CACHE.DEFAULT_TTL): void {
    if (!API_CONFIG.CACHE.ENABLED) return;
    
    const key = this.generateKey(config);
    
    // 控制缓存大小
    if (this.cache.size >= API_CONFIG.CACHE.MAX_SIZE) {
      // 删除最旧的缓存
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
  
  /**
   * 获取待处理请求
   */
  getPendingRequest(config: AxiosRequestConfig): Promise<any> | null {
    const key = this.generateKey(config);
    return this.pendingRequests.get(key) || null;
  }
  
  /**
   * 设置待处理请求
   */
  setPendingRequest(config: AxiosRequestConfig, promise: Promise<any>): void {
    const key = this.generateKey(config);
    this.pendingRequests.set(key, promise);
    
    // 请求完成后删除
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }
  
  /**
   * 使缓存失效
   */
  invalidate(pattern?: RegExp): void {
    if (!pattern) {
      this.clear();
      return;
    }
    
    for (const [key] of this.cache) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// 请求去重器
class RequestDeduplicator {
  private requests = new Map<string, number>();
  
  /**
   * 检查是否应该去重
   */
  shouldDeduplicate(config: AxiosRequestConfig): boolean {
    if (!API_CONFIG.DEDUPLICATION.ENABLED) return false;
    
    const key = JSON.stringify({ method: config.method, url: config.url, params: config.params });
    const now = Date.now();
    const lastRequest = this.requests.get(key);
    
    if (lastRequest && now - lastRequest < API_CONFIG.DEDUPLICATION.WINDOW) {
      return true;
    }
    
    this.requests.set(key, now);
    return false;
  }
  
  /**
   * 清理过期记录
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - API_CONFIG.DEDUPLICATION.WINDOW * 2;
    
    for (const [key, timestamp] of this.requests) {
      if (timestamp < cutoff) {
        this.requests.delete(key);
      }
    }
  }
}

// 批量请求管理器
class BatchRequestManager {
  private queue: Array<{
    config: AxiosRequestConfig;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  
  private timeoutId: NodeJS.Timeout | null = null;
  
  /**
   * 添加请求到队列
   */
  add(config: AxiosRequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ config, resolve, reject });
      
      // 清除之前的定时器
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }
      
      // 设置新的定时器
      this.timeoutId = setTimeout(() => {
        this.processBatch();
      }, API_CONFIG.BATCH.BATCH_DELAY);
    });
  }
  
  /**
   * 处理批量请求
   */
  private async processBatch(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, API_CONFIG.BATCH.MAX_BATCH_SIZE);
    this.queue = []; // 清空剩余队列
    
    // 按URL分组
    const groups = new Map<string, typeof batch>();
    
    for (const item of batch) {
      const key = `${item.config.method?.toUpperCase()}:${item.config.url}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    
    // 处理每个组
    for (const [key, items] of groups) {
      try {
        // 合并请求参数
        const mergedConfig = this.mergeConfigs(items.map(item => item.config));
        
        // 执行合并后的请求
        const response = await axiosInstance.request(mergedConfig);
        
        // 分发结果
        for (const item of items) {
          item.resolve(response);
        }
      } catch (error) {
        // 所有请求都失败
        for (const item of items) {
          item.reject(error);
        }
      }
    }
  }
  
  /**
   * 合并配置
   */
  private mergeConfigs(configs: AxiosRequestConfig[]): AxiosRequestConfig {
    if (configs.length === 0) throw new Error('No configs to merge');
    if (configs.length === 1) return configs[0];
    
    const baseConfig = configs[0];
    
    // 合并params
    const mergedParams = configs.reduce((acc, config) => {
      return { ...acc, ...config.params };
    }, {});
    
    // 合并data（如果是数组）
    let mergedData = baseConfig.data;
    if (Array.isArray(baseConfig.data)) {
      mergedData = configs.flatMap(config => config.data || []);
    }
    
    return {
      ...baseConfig,
      params: mergedParams,
      data: mergedData,
    };
  }
}

// 重试机制
class RetryManager {
  /**
   * 执行带重试的请求
   */
  async requestWithRetry(
    fn: () => Promise<any>,
    retries = API_CONFIG.RETRY.MAX_RETRIES,
    delay = API_CONFIG.RETRY.RETRY_DELAY
  ): Promise<any> {
    let lastError: any;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // 检查是否应该重试
        if (i === retries || !API_CONFIG.RETRY.RETRY_CONDITION(error)) {
          throw error;
        }
        
        // 等待重试延迟
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw lastError;
  }
}

// 创建实例
const requestCache = new RequestCache();
const requestDeduplicator = new RequestDeduplicator();
const batchRequestManager = new BatchRequestManager();
const retryManager = new RetryManager();

// 创建优化的Axios实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  async (config) => {
    // 请求去重检查
    if (requestDeduplicator.shouldDeduplicate(config)) {
      const cachedPromise = requestCache.getPendingRequest(config);
      if (cachedPromise) {
        return cachedPromise;
      }
    }
    
    // 检查缓存
    const cachedData = requestCache.get(config);
    if (cachedData) {
      // 创建虚拟响应
      return Promise.reject({
        __CACHED__: true,
        data: cachedData,
        config,
      });
    }
    
    // 批量请求处理
    if (API_CONFIG.BATCH.ENABLED && shouldBatchRequest(config)) {
      const promise = batchRequestManager.add(config);
      requestCache.setPendingRequest(config, promise);
      return promise;
    }
    
    // 设置请求ID
    config.headers['X-Request-ID'] = uuidv4();
    
    // 设置重试信息
    (config as any).__retryCount = 0;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    // 缓存响应数据
    if (response.config.method?.toLowerCase() === 'get') {
      requestCache.set(response.config, response.data);
    }
    
    return response;
  },
  async (error) => {
    // 处理缓存响应
    if (error.__CACHED__) {
      return {
        data: error.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      };
    }
    
    // 重试机制
    if (error.config && API_CONFIG.RETRY.RETRY_CONDITION(error)) {
      const retryCount = (error.config as any).__retryCount || 0;
      
      if (retryCount < API_CONFIG.RETRY.MAX_RETRIES) {
        (error.config as any).__retryCount = retryCount + 1;
        
        console.log(`🔄 请求重试 ${retryCount + 1}/${API_CONFIG.RETRY.MAX_RETRIES}`);
        
        // 延迟重试
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY.RETRY_DELAY * Math.pow(2, retryCount)));
        
        return axiosInstance.request(error.config);
      }
    }
    
    return Promise.reject(error);
  }
);

// 判断是否应该批量处理
function shouldBatchRequest(config: AxiosRequestConfig): boolean {
  // GET请求不批量处理
  if (config.method?.toLowerCase() === 'get') {
    return false;
  }
  
  // 特定路径不批量处理
  const excludePaths = ['/auth', '/upload', '/download'];
  return !excludePaths.some(path => config.url?.includes(path));
}

// 便捷函数
export const apiClient = {
  /**
   * GET请求
   */
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return axiosInstance.get(url, config);
  },
  
  /**
   * POST请求
   */
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return axiosInstance.post(url, data, config);
  },
  
  /**
   * PUT请求
   */
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return axiosInstance.put(url, data, config);
  },
  
  /**
   * DELETE请求
   */
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return axiosInstance.delete(url, config);
  },
  
  /**
   * 清除缓存
   */
  clearCache(pattern?: RegExp): void {
    requestCache.invalidate(pattern);
  },
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: requestCache['cache'].size,
      keys: Array.from(requestCache['cache'].keys()),
    };
  },
};

// 导出实例
export default axiosInstance;
export { axiosInstance as bffApiClient };