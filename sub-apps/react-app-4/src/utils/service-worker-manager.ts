// Service Worker 管理器

interface ServiceWorkerConfig {
  swUrl: string;
  scope?: string;
  updateViaCache?: 'imports' | 'all' | 'none';
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

interface UserBehaviorData {
  frequentPages: string[];
  preferredChartTypes: string[];
  lastVisitTime: number;
  sessionCount: number;
}

export class ServiceWorkerManager {
  private wb: any | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private isSupported = false;
  private config: ServiceWorkerConfig;

  constructor(config: ServiceWorkerConfig) {
    this.config = config;
    this.isSupported = 'serviceWorker' in navigator;
    
    if (this.isSupported) {
      this.initializeWorkbox();
    }
  }

  private async initializeWorkbox(): Promise<void> {
    try {
      // 动态导入 workbox-window
      const { Workbox } = await import('workbox-window');
      
      this.wb = new Workbox(this.config.swUrl, {
        scope: this.config.scope || '/',
        updateViaCache: this.config.updateViaCache || 'none'
      });

      // 监听 Service Worker 事件
      this.setupEventListeners();
    } catch (error) {
      console.warn('Workbox not available:', error);
      this.wb = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.wb) return;

    // Service Worker 安装成功
    this.wb.addEventListener('installed', (event) => {
      console.log('Service Worker installed');
      if (this.config.onSuccess && this.registration) {
        this.config.onSuccess(this.registration);
      }
    });

    // Service Worker 激活
    this.wb.addEventListener('activated', (event) => {
      console.log('Service Worker activated');
    });

    // Service Worker 更新可用
    this.wb.addEventListener('waiting', (event) => {
      console.log('Service Worker update available');
      if (this.config.onUpdate && this.registration) {
        this.config.onUpdate(this.registration);
      }
    });

    // Service Worker 控制页面
    this.wb.addEventListener('controlling', (event) => {
      console.log('Service Worker controlling page');
      // 刷新页面以使用新的 Service Worker
      window.location.reload();
    });

    // Service Worker 错误
    this.wb.addEventListener('redundant', (event) => {
      console.warn('Service Worker became redundant');
    });
  }

  // 注册 Service Worker
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported) {
      console.warn('Service Worker not supported');
      return null;
    }

    // 确保 workbox 已初始化
    if (!this.wb) {
      await this.initializeWorkbox();
    }

    if (!this.wb) {
      console.warn('Workbox initialization failed');
      return null;
    }

    try {
      this.registration = await this.wb.register();
      console.log('Service Worker registered successfully');
      
      // 发送用户行为数据到 Service Worker
      this.sendUserBehaviorData();
      
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
      return null;
    }
  }

  // 更新 Service Worker
  async update(): Promise<void> {
    if (!this.registration) {
      console.warn('No Service Worker registration found');
      return;
    }

    try {
      await this.registration.update();
      console.log('Service Worker update initiated');
    } catch (error) {
      console.error('Service Worker update failed:', error);
    }
  }

  // 跳过等待并激活新的 Service Worker
  skipWaiting(): void {
    if (!this.wb) return;

    // 发送消息到 Service Worker 跳过等待
    this.wb.messageSkipWaiting();
  }

  // 发送消息到 Service Worker
  sendMessage(message: any): void {
    if (!this.wb) return;

    this.wb.messageSW(message);
  }

  // 发送用户行为数据
  private sendUserBehaviorData(): void {
    const behaviorData = this.getUserBehaviorData();
    
    this.sendMessage({
      type: 'USER_BEHAVIOR',
      behavior: behaviorData
    });
  }

  // 获取用户行为数据
  private getUserBehaviorData(): UserBehaviorData {
    try {
      const stored = localStorage.getItem('user-behavior-data');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load user behavior data:', error);
    }

    // 默认行为数据
    return {
      frequentPages: ['/dashboard', '/analytics'],
      preferredChartTypes: ['line', 'bar'],
      lastVisitTime: Date.now(),
      sessionCount: 1
    };
  }

  // 更新用户行为数据
  updateUserBehavior(updates: Partial<UserBehaviorData>): void {
    const current = this.getUserBehaviorData();
    const updated = { ...current, ...updates };
    
    try {
      localStorage.setItem('user-behavior-data', JSON.stringify(updated));
      this.sendUserBehaviorData(); // 同步到 Service Worker
    } catch (error) {
      console.warn('Failed to save user behavior data:', error);
    }
  }

  // 跟踪页面访问
  trackPageVisit(page: string): void {
    const behavior = this.getUserBehaviorData();
    
    // 更新频繁访问页面
    if (!behavior.frequentPages.includes(page)) {
      behavior.frequentPages.push(page);
    }
    
    // 保持最近访问的页面
    if (behavior.frequentPages.length > 10) {
      behavior.frequentPages = behavior.frequentPages.slice(-10);
    }
    
    behavior.lastVisitTime = Date.now();
    
    this.updateUserBehavior(behavior);
  }

  // 跟踪图表类型偏好
  trackChartPreference(chartType: string): void {
    const behavior = this.getUserBehaviorData();
    
    if (!behavior.preferredChartTypes.includes(chartType)) {
      behavior.preferredChartTypes.push(chartType);
    }
    
    // 保持最近使用的图表类型
    if (behavior.preferredChartTypes.length > 5) {
      behavior.preferredChartTypes = behavior.preferredChartTypes.slice(-5);
    }
    
    this.updateUserBehavior(behavior);
  }

  // 预加载资源
  preloadResource(url: string): void {
    this.sendMessage({
      type: 'PRELOAD_RESOURCE',
      url
    });
  }

  // 清除缓存
  clearCache(): void {
    this.sendMessage({
      type: 'CLEAR_CACHE'
    });
  }

  // 获取缓存统计
  async getCacheStats(): Promise<any> {
    return new Promise((resolve) => {
      if (!this.wb) {
        resolve(null);
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.wb.messageSW({
        type: 'GET_CACHE_STATS'
      }, [messageChannel.port2]);
    });
  }

  // 卸载 Service Worker
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  // 检查 Service Worker 状态
  getStatus(): {
    isSupported: boolean;
    isRegistered: boolean;
    isActive: boolean;
    isControlling: boolean;
  } {
    return {
      isSupported: this.isSupported,
      isRegistered: !!this.registration,
      isActive: !!this.registration?.active,
      isControlling: !!navigator.serviceWorker.controller
    };
  }
}

// 默认配置
const defaultConfig: ServiceWorkerConfig = {
  swUrl: '/sw.js',
  scope: '/',
  onUpdate: (registration) => {
    console.log('Service Worker update available');
    
    // 显示更新提示
    if (confirm('新版本可用，是否立即更新？')) {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  },
  onSuccess: (registration) => {
    console.log('Service Worker registered successfully');
  },
  onError: (error) => {
    console.error('Service Worker registration failed:', error);
  }
};

// 单例实例
export const serviceWorkerManager = new ServiceWorkerManager(defaultConfig);

// 自动注册 Service Worker
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    serviceWorkerManager.register();
  });
}

// 导出默认实例
export default serviceWorkerManager;