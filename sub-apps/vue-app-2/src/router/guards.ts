/**
 * 路由守卫配置 - 文件管理应用
 * 处理路由切换逻辑、状态保持、权限检查等
 */

import { Router } from 'vue-router';
import { globalLogger } from '@shared/utils/logger';

// 路由状态管理
interface RouteState {
  previousRoute: string | null;
  loadingStates: Map<string, boolean>;
  componentCache: Map<string, any>;
}

const routeState: RouteState = {
  previousRoute: null,
  loadingStates: new Map(),
  componentCache: new Map()
};

/**
 * 设置路由守卫
 */
export function setupRouterGuards(router: Router) {
  // 前置守卫 - 路由切换前的处理
  router.beforeEach(async (to, from, next) => {
    const startTime = performance.now();
    
    try {
      globalLogger.info(`路由切换: ${from.path} -> ${to.path}`);
      
      // 设置加载状态
      routeState.loadingStates.set(to.name as string, true);
      
      // 记录前一个路由
      routeState.previousRoute = from.path;
      
      // 在微前端环境下添加延迟，确保样式沙箱准备就绪
      if (window.__POWERED_BY_QIANKUN__) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // 权限检查（如果需要）
      if (to.meta?.requiresAuth) {
        // 这里可以添加权限检查逻辑
        // 目前所有路由都不需要认证
      }
      
      // 预加载组件（如果配置了预加载）
      if (to.meta?.preload && to.component && typeof to.component === 'function') {
        try {
          const component = await (to.component as Function)();
          routeState.componentCache.set(to.name as string, component);
        } catch (error) {
          globalLogger.warn(`预加载组件失败: ${to.name}`, error);
        }
      }
      
      next();
    } catch (error) {
      globalLogger.error('路由守卫错误', error);
      next(false); // 阻止路由切换
    } finally {
      const endTime = performance.now();
      globalLogger.debug(`路由守卫执行时间: ${(endTime - startTime).toFixed(2)}ms`);
    }
  });
  
  // 后置守卫 - 路由切换后的处理
  router.afterEach((to, from) => {
    try {
      // 清除加载状态
      routeState.loadingStates.set(to.name as string, false);
      
      // 更新页面标题
      if (to.meta?.title) {
        document.title = `${to.meta.title} - 文件管理系统`;
      }
      
      // 在微前端环境下通知主应用路由变化
      if (window.__POWERED_BY_QIANKUN__ && window.parent !== window) {
        try {
          window.parent.postMessage({
            type: 'route-change',
            source: 'vue-file-management',
            data: {
              from: from.path,
              to: to.path,
              title: to.meta?.title
            }
          }, '*');
        } catch (error) {
          globalLogger.warn('通知主应用路由变化失败', error);
        }
      }
      
      globalLogger.info(`路由切换完成: ${to.path}`, {
        title: to.meta?.title,
        keepAlive: to.meta?.keepAlive
      });
    } catch (error) {
      globalLogger.error('路由后置守卫错误', error);
    }
  });
  
  // 路由错误处理
  router.onError((error) => {
    globalLogger.error('路由错误', error);
    
    // 尝试恢复到安全路由
    const safeRoute = '/files';
    if (router.currentRoute.value.path !== safeRoute) {
      router.push(safeRoute).catch(() => {
        // 如果连安全路由都失败，则刷新页面
        window.location.reload();
      });
    }
  });
}

/**
 * 获取路由状态
 */
export function getRouteState() {
  return {
    ...routeState,
    loadingStates: new Map(routeState.loadingStates),
    componentCache: new Map(routeState.componentCache)
  };
}

/**
 * 清理路由状态
 */
export function clearRouteState() {
  routeState.previousRoute = null;
  routeState.loadingStates.clear();
  routeState.componentCache.clear();
}

/**
 * 检查路由是否正在加载
 */
export function isRouteLoading(routeName: string): boolean {
  return routeState.loadingStates.get(routeName) || false;
}

// 声明全局类型
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
  }
}