// Service Worker 多层缓存架构
const CACHE_VERSION = 'v1.0.0';
const CACHE_CONFIGS = [
  {
    name: 'app-shell-v1',
    strategy: 'CacheFirst',
    maxEntries: 50,
    maxAgeSeconds: 24 * 60 * 60 // 1天
  },
  {
    name: 'api-cache-v1',
    strategy: 'NetworkFirst',
    maxEntries: 100,
    maxAgeSeconds: 5 * 60 // 5分钟
  },
  {
    name: 'static-resources-v1',
    strategy: 'CacheFirst',
    maxEntries: 200,
    maxAgeSeconds: 7 * 24 * 60 * 60 // 7天
  },
  {
    name: 'chart-data-v1',
    strategy: 'StaleWhileRevalidate',
    maxEntries: 50,
    maxAgeSeconds: 2 * 60 // 2分钟
  }
];

class SmartCacheManager {
  constructor() {
    this.caches = new Map();
    this.initializeCaches();
  }

  async initializeCaches() {
    for (const config of CACHE_CONFIGS) {
      this.caches.set(config.name, await caches.open(config.name));
    }
  }

  // 预测性缓存预热
  async predictivePreload() {
    const criticalRoutes = ['/dashboard', '/analytics', '/realtime'];
    const criticalAPIs = [
      '/api/dashboard/metrics',
      '/api/charts/sales',
      '/api/realtime/data'
    ];
    
    console.log('Starting predictive preload...');
    
    // 后台预加载关键资源
    const preloadPromises = [
      ...criticalRoutes.map(route => this.preloadRoute(route)),
      ...criticalAPIs.map(api => this.preloadAPI(api))
    ];
    
    await Promise.allSettled(preloadPromises);
    console.log('Predictive preload completed');
  }

  async preloadRoute(route) {
    try {
      const response = await fetch(route);
      if (response.ok) {
        const cache = await caches.open('app-shell-v1');
        await cache.put(route, response.clone());
      }
    } catch (error) {
      console.warn(`Failed to preload route ${route}:`, error);
    }
  }

  async preloadAPI(apiPath) {
    try {
      const response = await fetch(apiPath);
      if (response.ok) {
        const cache = await caches.open('api-cache-v1');
        await cache.put(apiPath, response.clone());
      }
    } catch (error) {
      console.warn(`Failed to preload API ${apiPath}:`, error);
    }
  }

  // 基于用户行为的智能缓存
  async adaptiveCaching(userBehavior) {
    if (userBehavior && userBehavior.frequentPages) {
      if (userBehavior.frequentPages.includes('/analytics')) {
        await this.preloadAnalyticsData();
      }
      
      if (userBehavior.preferredChartTypes && userBehavior.preferredChartTypes.includes('realtime')) {
        await this.preloadRealtimeCharts();
      }
    }
  }

  async preloadAnalyticsData() {
    const analyticsAPIs = [
      '/api/analytics/summary',
      '/api/analytics/trends',
      '/api/analytics/reports'
    ];
    
    for (const api of analyticsAPIs) {
      await this.preloadAPI(api);
    }
  }

  async preloadRealtimeCharts() {
    const realtimeAPIs = [
      '/api/realtime/metrics',
      '/api/realtime/charts',
      '/api/realtime/websocket-data'
    ];
    
    for (const api of realtimeAPIs) {
      await this.preloadAPI(api);
    }
  }

  // 缓存策略处理
  async handleRequest(request) {
    const url = new URL(request.url);
    
    // 确定缓存策略
    let cacheConfig;
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname.includes('chart') || url.pathname.includes('realtime')) {
        cacheConfig = CACHE_CONFIGS.find(c => c.name.includes('chart-data'));
      } else {
        cacheConfig = CACHE_CONFIGS.find(c => c.name.includes('api-cache'));
      }
    } else if (url.pathname.match(/\.(js|css|png|jpg|svg|woff|woff2)$/)) {
      cacheConfig = CACHE_CONFIGS.find(c => c.name.includes('static-resources'));
    } else {
      cacheConfig = CACHE_CONFIGS.find(c => c.name.includes('app-shell'));
    }

    if (!cacheConfig) {
      return fetch(request);
    }

    return this.executeStrategy(request, cacheConfig);
  }

  async executeStrategy(request, config) {
    const cache = await caches.open(config.name);
    
    switch (config.strategy) {
      case 'CacheFirst':
        return this.cacheFirstStrategy(request, cache);
      case 'NetworkFirst':
        return this.networkFirstStrategy(request, cache);
      case 'StaleWhileRevalidate':
        return this.staleWhileRevalidateStrategy(request, cache);
      default:
        return fetch(request);
    }
  }

  async cacheFirstStrategy(request, cache) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }

  async networkFirstStrategy(request, cache) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }

  async staleWhileRevalidateStrategy(request, cache) {
    const cachedResponse = await cache.match(request);
    
    // 后台更新缓存
    const networkUpdate = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => {
      // 网络失败时忽略
    });
    
    return cachedResponse || networkUpdate;
  }
}

// 初始化缓存管理器
const cacheManager = new SmartCacheManager();

// Service Worker 事件监听
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    cacheManager.predictivePreload().then(() => {
      self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    clients.claim().then(() => {
      console.log('Service Worker activated');
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(cacheManager.handleRequest(event.request));
});

// 监听用户行为消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'USER_BEHAVIOR') {
    cacheManager.adaptiveCaching(event.data.behavior);
  }
});