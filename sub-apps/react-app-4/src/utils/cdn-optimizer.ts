// CDN 资源加载优化
interface CDNEndpoint {
  url: string;
  priority: number;
  region: string;
}

interface ResourceConfig {
  path: string;
  type: 'script' | 'style' | 'font' | 'image';
  priority: 'high' | 'medium' | 'low';
}

export class CDNOptimizer {
  private cdnEndpoints: CDNEndpoint[] = [
    { url: 'https://cdn1.example.com', priority: 1, region: 'global' },
    { url: 'https://cdn2.example.com', priority: 2, region: 'asia' },
    { url: 'https://cdn3.example.com', priority: 3, region: 'backup' }
  ];

  private optimalCDN: string | null = null;
  private latencyCache = new Map<string, number>();
  private fallbackManager: ResourceFallbackManager;

  constructor() {
    this.fallbackManager = new ResourceFallbackManager();
    this.initializeOptimalCDN();
  }

  // 延迟检测和最优CDN选择
  async selectOptimalCDN(): Promise<string> {
    if (this.optimalCDN) {
      return this.optimalCDN;
    }

    console.log('Selecting optimal CDN...');
    
    const latencyTests = this.cdnEndpoints.map(async (endpoint) => {
      const cached = this.latencyCache.get(endpoint.url);
      if (cached && Date.now() - cached < 300000) { // 5分钟缓存
        return { endpoint: endpoint.url, latency: cached };
      }

      const start = performance.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        await fetch(`${endpoint.url}/health-check`, { 
          method: 'HEAD',
          cache: 'no-cache',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const latency = performance.now() - start;
        this.latencyCache.set(endpoint.url, latency);
        
        return { endpoint: endpoint.url, latency };
      } catch {
        return { endpoint: endpoint.url, latency: Infinity };
      }
    });
    
    const results = await Promise.all(latencyTests);
    const optimal = results.reduce((best, current) => 
      current.latency < best.latency ? current : best
    );
    
    this.optimalCDN = optimal.endpoint;
    console.log(`Selected optimal CDN: ${this.optimalCDN} (${optimal.latency}ms)`);
    
    return this.optimalCDN;
  }

  // 资源预加载策略
  async preloadCriticalResources(cdnEndpoint?: string): Promise<void> {
    const endpoint = cdnEndpoint || await this.selectOptimalCDN();
    
    const criticalResources: ResourceConfig[] = [
      { path: '/static/js/charts.bundle.js', type: 'script', priority: 'high' },
      { path: '/static/css/antd.css', type: 'style', priority: 'high' },
      { path: '/static/fonts/antd-icons.woff2', type: 'font', priority: 'medium' },
      { path: '/static/js/mobx.bundle.js', type: 'script', priority: 'high' },
      { path: '/static/images/logo.svg', type: 'image', priority: 'low' }
    ];
    
    const preloadPromises = criticalResources.map(resource => 
      this.preloadResource(endpoint, resource)
    );
    
    await Promise.allSettled(preloadPromises);
    console.log('Critical resources preloaded');
  }

  private async preloadResource(endpoint: string, resource: ResourceConfig): Promise<void> {
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = `${endpoint}${resource.path}`;
      link.as = this.getResourceType(resource.type);
      
      if (resource.type === 'font') {
        link.crossOrigin = 'anonymous';
      }
      
      // 设置优先级
      if (resource.priority === 'high') {
        link.setAttribute('importance', 'high');
      }
      
      document.head.appendChild(link);
      
      // 验证资源加载
      await this.verifyResourceLoad(link);
    } catch (error) {
      console.warn(`Failed to preload resource ${resource.path}:`, error);
    }
  }

  private getResourceType(type: string): string {
    const typeMap = {
      'script': 'script',
      'style': 'style',
      'font': 'font',
      'image': 'image'
    };
    return typeMap[type] || 'fetch';
  }

  private async verifyResourceLoad(link: HTMLLinkElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Resource load timeout'));
      }, 10000);

      link.onload = () => {
        clearTimeout(timeout);
        resolve();
      };

      link.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Resource load failed'));
      };
    });
  }

  // 智能资源加载
  async loadResourceWithOptimization(resourcePath: string): Promise<string> {
    const optimalCDN = await this.selectOptimalCDN();
    
    try {
      return await this.fallbackManager.loadResourceWithFallback(resourcePath, optimalCDN);
    } catch (error) {
      console.error(`Failed to load resource ${resourcePath}:`, error);
      throw error;
    }
  }

  private async initializeOptimalCDN(): Promise<void> {
    // 后台选择最优CDN，不阻塞主流程
    setTimeout(async () => {
      try {
        await this.selectOptimalCDN();
        await this.preloadCriticalResources();
      } catch (error) {
        console.warn('CDN optimization initialization failed:', error);
      }
    }, 1000);
  }
}

// 资源降级管理器
export class ResourceFallbackManager {
  private fallbackChain: string[] = [
    'https://primary-cdn.com',
    'https://backup-cdn.com',
    '/local-assets'
  ];

  async loadResourceWithFallback(resourcePath: string, primaryCDN?: string): Promise<string> {
    const endpoints = primaryCDN ? [primaryCDN, ...this.fallbackChain] : this.fallbackChain;
    
    for (const endpoint of endpoints) {
      try {
        const fullUrl = `${endpoint}${resourcePath}`;
        const response = await fetch(fullUrl, {
          method: 'HEAD',
          cache: 'force-cache'
        });
        
        if (response.ok) {
          return fullUrl;
        }
      } catch (error) {
        console.warn(`Failed to load from ${endpoint}, trying next...`);
      }
    }
    
    throw new Error(`All fallback attempts failed for ${resourcePath}`);
  }

  // 错误恢复机制
  async handleResourceError(resourcePath: string, failedEndpoint: string): Promise<string> {
    console.warn(`Resource failed from ${failedEndpoint}, attempting recovery...`);
    
    // 从失败列表中移除该端点
    const availableEndpoints = this.fallbackChain.filter(endpoint => endpoint !== failedEndpoint);
    
    for (const endpoint of availableEndpoints) {
      try {
        const response = await fetch(`${endpoint}${resourcePath}`);
        if (response.ok) {
          console.log(`Resource recovered from ${endpoint}`);
          return response.url;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error(`Resource recovery failed for ${resourcePath}`);
  }
}

// 单例导出
export const cdnOptimizer = new CDNOptimizer();