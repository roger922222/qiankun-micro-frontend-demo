/**
 * Vue Router 配置
 * 针对 qiankun 微前端环境优化的路由配置
 * 支持路由懒加载、组件缓存和性能监控
 */

import { RouteRecordRaw } from 'vue-router';

// 路由性能监控
const routePerformance = {
  startTime: 0,
  endTime: 0,
  
  start() {
    this.startTime = performance.now();
  },
  
  end(routeName: string) {
    this.endTime = performance.now();
    const loadTime = this.endTime - this.startTime;
    console.log(`[Route Performance] ${routeName} 加载时间: ${loadTime.toFixed(2)}ms`);
    
    // 在开发环境下记录性能数据
    if (process.env.NODE_ENV === 'development') {
      const perfData = {
        route: routeName,
        loadTime,
        timestamp: new Date().toISOString()
      };
      
      // 存储到 sessionStorage 用于性能分析
      const existingData = JSON.parse(sessionStorage.getItem('vue-app-1-route-performance') || '[]');
      existingData.push(perfData);
      sessionStorage.setItem('vue-app-1-route-performance', JSON.stringify(existingData));
    }
  }
};

// 创建路由懒加载函数，支持性能监控和错误处理
const createLazyComponent = (importFn: () => Promise<any>, routeName: string) => {
  return () => {
    routePerformance.start();
    
    return importFn()
      .then(component => {
        routePerformance.end(routeName);
        return component;
      })
      .catch(error => {
        console.error(`[Route Error] 加载路由 ${routeName} 失败:`, error);
        // 返回错误组件或重试
        return import('../views/ErrorPage.vue').catch(() => ({
          template: '<div class="route-error">路由加载失败，请刷新页面重试</div>'
        }));
      });
  };
};

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'MessageCenter',
    component: createLazyComponent(
      () => import('../views/MessageCenter.vue'),
      'MessageCenter'
    ),
    meta: {
      title: '消息中心',
      icon: 'MessageOutlined',
      keepAlive: true, // 启用组件缓存
      preload: true,   // 预加载组件
      requiresAuth: false
    }
  },
  {
    path: '/push',
    name: 'MessagePush',
    component: createLazyComponent(
      () => import('../views/MessagePush.vue'),
      'MessagePush'
    ),
    meta: {
      title: '消息推送',
      icon: 'SendOutlined',
      keepAlive: true,
      preload: false,
      requiresAuth: false
    }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: createLazyComponent(
      () => import('../views/Notifications.vue'),
      'Notifications'
    ),
    meta: {
      title: '通知中心',
      icon: 'BellOutlined',
      keepAlive: true,
      preload: false,
      requiresAuth: false
    }
  },
  {
    path: '/communication-demo',
    name: 'CommunicationDemo',
    component: createLazyComponent(
      () => import('../components/CommunicationDemo.vue'),
      'CommunicationDemo'
    ),
    meta: {
      title: '通信演示',
      icon: 'ApiOutlined',
      keepAlive: false, // 通信组件不需要缓存
      preload: false,
      requiresAuth: false
    }
  },
  {
    // 404 页面
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => ({
      template: `
        <div style="text-align: center; padding: 50px;">
          <h3>页面未找到</h3>
          <p>请检查 URL 是否正确</p>
          <a href="javascript:history.back()">返回上一页</a>
        </div>
      `
    }),
    meta: {
      title: '页面未找到',
      keepAlive: false
    }
  }
];

// 预加载路由组件
export const preloadRoutes = () => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    // 使用 requestIdleCallback 在浏览器空闲时预加载
    window.requestIdleCallback(() => {
      routes.forEach(route => {
        if (route.meta?.preload && route.component && typeof route.component === 'function') {
          (route.component as Function)().catch(() => {
            // 预加载失败不影响正常使用
          });
        }
      });
    });
  }
};

// 获取路由性能数据
export const getRoutePerformanceData = () => {
  if (typeof window !== 'undefined') {
    return JSON.parse(sessionStorage.getItem('vue-app-1-route-performance') || '[]');
  }
  return [];
};

// 清理路由性能数据
export const clearRoutePerformanceData = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('vue-app-1-route-performance');
  }
};

export default routes;