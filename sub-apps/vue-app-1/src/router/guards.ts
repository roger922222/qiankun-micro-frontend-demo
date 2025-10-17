/**
 * 路由守卫配置
 * 针对 qiankun 微前端环境优化的路由守卫
 * 包含性能监控、状态管理和错误处理
 */

import { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { globalLogger } from '@shared/utils/logger';
import { preloadRoutes } from './index';

// 路由切换性能监控
class RoutePerformanceMonitor {
  private startTime: number = 0;
  private routeStats: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  start() {
    this.startTime = performance.now();
  }

  end(routeName: string) {
    const endTime = performance.now();
    const loadTime = endTime - this.startTime;
    
    // 更新统计数据
    const stats = this.routeStats.get(routeName) || { count: 0, totalTime: 0, avgTime: 0 };
    stats.count++;
    stats.totalTime += loadTime;
    stats.avgTime = stats.totalTime / stats.count;
    this.routeStats.set(routeName, stats);

    // 记录日志
    globalLogger.info(`路由切换性能`, {
      route: routeName,
      loadTime: `${loadTime.toFixed(2)}ms`,
      avgTime: `${stats.avgTime.toFixed(2)}ms`,
      count: stats.count
    });

    return loadTime;
  }

  getStats() {
    return Object.fromEntries(this.routeStats);
  }

  clearStats() {
    this.routeStats.clear();
  }
}

const performanceMonitor = new RoutePerformanceMonitor();

/**
 * 前置守卫 - 路由切换前的处理
 */
const beforeEachGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  // 开始性能监控
  performanceMonitor.start();

  globalLogger.info('路由切换开始', {
    from: from.path,
    to: to.path,
    name: to.name
  });

  // 在 qiankun 环境下的特殊处理
  if (window.__POWERED_BY_QIANKUN__) {
    // 确保微前端环境下路由切换的稳定性
    if (to.path !== from.path) {
      // 添加短暂延迟确保 DOM 更新完成
      setTimeout(() => {
        next();
      }, 10);
      return;
    }
  }

  // 检查路由权限（如果需要）
  if (to.meta?.requiresAuth) {
    // 这里可以添加权限检查逻辑
    // 目前所有路由都不需要认证
  }

  next();
};

/**
 * 后置守卫 - 路由切换完成后的处理
 */
const afterEachGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) => {
  // 结束性能监控
  const loadTime = performanceMonitor.end(to.name as string || to.path);

  // 更新页面标题
  if (to.meta?.title) {
    const baseTitle = 'Vue 消息中心';
    document.title = window.__POWERED_BY_QIANKUN__ 
      ? `${to.meta.title} - ${baseTitle}`
      : `${baseTitle} - ${to.meta.title}`;
  }

  // 在 qiankun 环境下发送路由变化事件
  if (window.__POWERED_BY_QIANKUN__) {
    try {
      // 通知主应用路由变化
      window.parent.postMessage({
        type: 'vue-app-1-route-change',
        data: {
          from: from.path,
          to: to.path,
          name: to.name,
          loadTime,
          timestamp: new Date().toISOString()
        }
      }, '*');
    } catch (error) {
      globalLogger.warn('发送路由变化事件失败', error);
    }
  }

  // 记录路由切换完成
  globalLogger.info('路由切换完成', {
    route: to.path,
    name: to.name,
    loadTime: `${loadTime.toFixed(2)}ms`
  });

  // 在开发环境下输出性能统计
  if (process.env.NODE_ENV === 'development') {
    console.log('[Route Performance Stats]', performanceMonitor.getStats());
  }
};

/**
 * 路由错误处理
 */
const routeErrorHandler = (error: Error, to: RouteLocationNormalized, from: RouteLocationNormalized) => {
  globalLogger.error('路由错误', error, {
    to: to.path,
    from: from.path
  });

  // 在开发环境下显示详细错误信息
  if (process.env.NODE_ENV === 'development') {
    console.error('[Route Error]', {
      error,
      to: to.path,
      from: from.path,
      stack: error.stack
    });
  }

  // 尝试恢复到安全路由
  if (to.path !== '/') {
    return '/';
  }
};

/**
 * 配置路由守卫
 */
export const setupRouterGuards = (router: Router) => {
  // 注册前置守卫
  router.beforeEach(beforeEachGuard);

  // 注册后置守卫
  router.afterEach(afterEachGuard);

  // 注册错误处理
  router.onError(routeErrorHandler);

  // 在应用启动后预加载路由
  router.isReady().then(() => {
    globalLogger.info('路由系统初始化完成');
    
    // 预加载路由组件
    preloadRoutes();
    
    // 在 qiankun 环境下通知主应用路由系统就绪
    if (window.__POWERED_BY_QIANKUN__) {
      try {
        window.parent.postMessage({
          type: 'vue-app-1-router-ready',
          data: {
            timestamp: new Date().toISOString(),
            routes: router.getRoutes().map(route => ({
              path: route.path,
              name: route.name,
              meta: route.meta
            }))
          }
        }, '*');
      } catch (error) {
        globalLogger.warn('发送路由就绪事件失败', error);
      }
    }
  });

  globalLogger.info('路由守卫配置完成');
};

/**
 * 获取路由性能统计
 */
export const getRoutePerformanceStats = () => {
  return performanceMonitor.getStats();
};

/**
 * 清理路由性能统计
 */
export const clearRoutePerformanceStats = () => {
  performanceMonitor.clearStats();
};

// 导出性能监控器供外部使用
export { performanceMonitor };