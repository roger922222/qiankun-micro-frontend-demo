/**
 * 路由管理器 - 跨应用导航核心
 * 提供跨应用路由跳转、参数传递和路由守卫功能
 */

import { globalEventBus } from '../event-bus';
import { BaseEvent } from '../../types/events';

// ==================== 类型定义 ====================

export interface RouteParams {
  [key: string]: any;
}

export interface NavigationOptions {
  replace?: boolean;
  state?: any;
  params?: RouteParams;
  query?: Record<string, string>;
  hash?: string;
}

export interface RouteGuard {
  name: string;
  guard: (to: RouteInfo, from: RouteInfo) => boolean | Promise<boolean>;
  priority?: number;
}

export interface RouteInfo {
  appName: string;
  path: string;
  fullPath: string;
  params: RouteParams;
  query: Record<string, string>;
  hash: string;
  state?: any;
  timestamp: number;
}

export interface RouteHistoryEntry {
  id: string;
  route: RouteInfo;
  timestamp: number;
  action: 'push' | 'replace' | 'pop';
}

export interface RouteMiddleware {
  name: string;
  process: (route: RouteInfo) => RouteInfo | Promise<RouteInfo>;
  priority?: number;
}

// ==================== 事件类型 ====================

export interface NavigationEvent extends BaseEvent {
  type: 'NAVIGATION';
  data: {
    action: 'navigate' | 'back' | 'forward' | 'replace';
    targetApp: string;
    path: string;
    options?: NavigationOptions;
    fromApp?: string;
    fromPath?: string;
  };
}

export interface RouteChangeEvent extends BaseEvent {
  type: 'ROUTE_CHANGE';
  data: {
    from: RouteInfo;
    to: RouteInfo;
    action: 'push' | 'replace' | 'pop';
  };
}

// ==================== 路由管理器实现 ====================

export class RouteManager {
  private guards: RouteGuard[] = [];
  private middleware: RouteMiddleware[] = [];
  private history: RouteHistoryEntry[] = [];
  private currentRoute: RouteInfo | null = null;
  private maxHistorySize: number = 50;
  private debug: boolean = false;

  constructor(options?: { maxHistorySize?: number; debug?: boolean }) {
    this.maxHistorySize = options?.maxHistorySize || 50;
    this.debug = options?.debug || false;
    
    this.initializeRouteManager();
  }

  /**
   * 初始化路由管理器
   */
  private initializeRouteManager(): void {
    // 监听浏览器历史变化
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // 监听导航事件
    globalEventBus.on('NAVIGATION', this.handleNavigationEvent.bind(this));
    
    // 初始化当前路由
    this.currentRoute = this.parseCurrentRoute();
    
    if (this.debug) {
      console.log('[RouteManager] Initialized with current route:', this.currentRoute);
    }
  }

  /**
   * 跨应用导航
   */
  async navigateToApp(
    appName: string, 
    path: string, 
    options: NavigationOptions = {}
  ): Promise<boolean> {
    try {
      const fromRoute = this.currentRoute;
      const toRoute = await this.buildRouteInfo(appName, path, options);
      
      // 执行路由守卫
      const canNavigate = await this.executeGuards(toRoute, fromRoute);
      if (!canNavigate) {
        if (this.debug) {
          console.warn('[RouteManager] Navigation blocked by guards');
        }
        return false;
      }

      // 应用中间件
      const processedRoute = await this.applyMiddleware(toRoute);      const navigationEvent: NavigationEvent = {
        type: 'NAVIGATION',
        source: 'route-manager',
        timestamp: new Date().toISOString(),
        id: `nav-forward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data: {
          action: options.replace ? 'replace' : 'navigate',
          targetApp: appName,
          path,
          options,
          fromApp: fromRoute?.appName,
          fromPath: fromRoute?.path
        }
      };

      await globalEventBus.emit(navigationEvent);
      
      // 更新浏览器历史
      this.updateBrowserHistory(processedRoute, options.replace || false);
      
      // 更新当前路由和历史记录
      this.updateCurrentRoute(processedRoute, options.replace ? 'replace' : 'push');
      
      if (this.debug) {
        console.log('[RouteManager] Navigation successful:', processedRoute);
      }
      
      return true;
    } catch (error) {
      console.error('[RouteManager] Navigation failed:', error);
      return false;
    }
  }

  /**
   * 带状态导航
   */
  async navigateWithState(path: string, state: any): Promise<boolean> {
    const currentApp = this.getCurrentApp();
    if (!currentApp) {
      console.error('[RouteManager] Cannot determine current app for navigation');
      return false;
    }
    
    return this.navigateToApp(currentApp, path, { state });
  }

  /**
   * 返回上一页
   */
  async goBack(): Promise<boolean> {
    try {
      if (this.history.length <= 1) {
        if (this.debug) {
          console.warn('[RouteManager] No history to go back to');
        }
        return false;
      }

      // 发送导航事件
      const navigationEvent: NavigationEvent = {
        type: 'NAVIGATION',
        source: 'route-manager',
        timestamp: new Date().toISOString(),
        id: `nav-back-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data: {
          action: 'back',
          targetApp: '',
          path: ''
        }
      };

      await globalEventBus.emit(navigationEvent);
      
      // 使用浏览器返回
      window.history.back();
      
      return true;
    } catch (error) {
      console.error('[RouteManager] Go back failed:', error);
      return false;
    }
  }

  /**
   * 前进到下一页
   */
  async goForward(): Promise<boolean> {
    try {
      const navigationEvent: NavigationEvent = {
        type: 'NAVIGATION',
        source: 'route-manager',
        timestamp: new Date().toISOString(),
        id: `nav-back-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data: {
          action: 'forward',
          targetApp: '',
          path: ''
        }
      };

      await globalEventBus.emit(navigationEvent);
      
      window.history.forward();
      return true;
    } catch (error) {
      console.error('[RouteManager] Go forward failed:', error);
      return false;
    }
  }

  /**
   * 添加路由守卫
   */
  addGuard(guard: RouteGuard): void {
    this.guards.push(guard);
    // 按优先级排序
    this.guards.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    if (this.debug) {
      console.log('[RouteManager] Added guard:', guard.name);
    }
  }

  /**
   * 移除路由守卫
   */
  removeGuard(guardName: string): void {
    this.guards = this.guards.filter(guard => guard.name !== guardName);
    
    if (this.debug) {
      console.log('[RouteManager] Removed guard:', guardName);
    }
  }

  /**
   * 添加路由中间件
   */
  addMiddleware(middleware: RouteMiddleware): void {
    this.middleware.push(middleware);
    // 按优先级排序
    this.middleware.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    if (this.debug) {
      console.log('[RouteManager] Added middleware:', middleware.name);
    }
  }

  /**
   * 移除路由中间件
   */
  removeMiddleware(middlewareName: string): void {
    this.middleware = this.middleware.filter(mw => mw.name !== middlewareName);
    
    if (this.debug) {
      console.log('[RouteManager] Removed middleware:', middlewareName);
    }
  }

  /**
   * 获取导航历史
   */
  getHistory(): RouteHistoryEntry[] {
    return [...this.history];
  }

  /**
   * 获取当前路由信息
   */
  getCurrentRoute(): RouteInfo | null {
    return this.currentRoute;
  }

  /**
   * 清空导航历史
   */
  clearHistory(): void {
    this.history = [];
    if (this.debug) {
      console.log('[RouteManager] History cleared');
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 处理浏览器历史变化
   */
  private handlePopState(event: PopStateEvent): void {
    const newRoute = this.parseCurrentRoute();
    if (newRoute && this.currentRoute) {
      this.emitRouteChangeEvent(this.currentRoute, newRoute, 'pop');
      this.currentRoute = newRoute;
    }
  }

  /**
   * 处理导航事件
   */
  private async handleNavigationEvent(event: NavigationEvent): Promise<void> {
    if (this.debug) {
      console.log('[RouteManager] Handling navigation event:', event);
    }
    
    // 这里可以添加额外的导航事件处理逻辑
    // 比如通知其他应用、更新状态等
  }

  /**
   * 解析当前路由
   */
  private parseCurrentRoute(): RouteInfo {
    const url = new URL(window.location.href);
    const pathname = url.pathname;
    const appName = this.extractAppName(pathname);
    const path = this.extractAppPath(pathname, appName);
    
    return {
      appName,
      path,
      fullPath: pathname,
      params: this.parseParams(path),
      query: Object.fromEntries(url.searchParams.entries()),
      hash: url.hash.slice(1),
      state: window.history.state,
      timestamp: Date.now()
    };
  }

  /**
   * 构建路由信息
   */
  private async buildRouteInfo(
    appName: string, 
    path: string, 
    options: NavigationOptions
  ): Promise<RouteInfo> {
    const fullPath = this.buildAppPath(appName, path);
    const url = new URL(fullPath, window.location.origin);
    
    // 添加查询参数
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    // 添加hash
    if (options.hash) {
      url.hash = options.hash;
    }
    
    return {
      appName,
      path,
      fullPath: url.pathname,
      params: options.params || {},
      query: Object.fromEntries(url.searchParams.entries()),
      hash: url.hash.slice(1),
      state: options.state,
      timestamp: Date.now()
    };
  }

  /**
   * 执行路由守卫
   */
  private async executeGuards(to: RouteInfo, from: RouteInfo | null): Promise<boolean> {
    for (const guard of this.guards) {
      try {
        const result = await guard.guard(to, from || {} as RouteInfo);
        if (!result) {
          if (this.debug) {
            console.warn(`[RouteManager] Guard ${guard.name} blocked navigation`);
          }
          return false;
        }
      } catch (error) {
        console.error(`[RouteManager] Guard ${guard.name} error:`, error);
        return false;
      }
    }
    return true;
  }

  /**
   * 应用路由中间件
   */
  private async applyMiddleware(route: RouteInfo): Promise<RouteInfo> {
    let processedRoute = route;
    
    for (const middleware of this.middleware) {
      try {
        processedRoute = await middleware.process(processedRoute);
      } catch (error) {
        console.error(`[RouteManager] Middleware ${middleware.name} error:`, error);
        // 继续处理，不中断流程
      }
    }
    
    return processedRoute;
  }

  /**
   * 更新浏览器历史
   */
  private updateBrowserHistory(route: RouteInfo, replace: boolean): void {
    const url = this.buildFullUrl(route);
    
    if (replace) {
      window.history.replaceState(route.state, '', url);
    } else {
      window.history.pushState(route.state, '', url);
    }
  }

  /**
   * 更新当前路由和历史记录
   */
  private updateCurrentRoute(route: RouteInfo, action: 'push' | 'replace'): void {
    const fromRoute = this.currentRoute;
    this.currentRoute = route;
    
    // 添加到历史记录
    if (action === 'push') {
      this.addToHistory(route, action);
    }
    
    // 发送路由变化事件
    if (fromRoute) {
      this.emitRouteChangeEvent(fromRoute, route, action);
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(route: RouteInfo, action: 'push' | 'replace' | 'pop'): void {
    const entry: RouteHistoryEntry = {
      id: this.generateId(),
      route,
      timestamp: Date.now(),
      action
    };
    
    this.history.push(entry);
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * 发送路由变化事件
   */
  private emitRouteChangeEvent(from: RouteInfo, to: RouteInfo, action: 'push' | 'replace' | 'pop'): void {
    const event: RouteChangeEvent = {
      type: 'ROUTE_CHANGE',
      source: 'route-manager',
      timestamp: new Date().toISOString(),
      id: `route-change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: { from, to, action }
    };
    
    globalEventBus.emit(event);
  }

  /**
   * 提取应用名称
   */
  private extractAppName(pathname: string): string {
    // 假设路径格式为 /app-name/path 或者根据实际项目结构调整
    const segments = pathname.split('/').filter(Boolean);
    return segments[0] || 'main';
  }

  /**
   * 提取应用内路径
   */
  private extractAppPath(pathname: string, appName: string): string {
    const appPrefix = `/${appName}`;
    return pathname.startsWith(appPrefix) 
      ? pathname.slice(appPrefix.length) || '/'
      : pathname;
  }

  /**
   * 构建应用路径
   */
  private buildAppPath(appName: string, path: string): string {
    if (appName === 'main') {
      return path.startsWith('/') ? path : `/${path}`;
    }
    
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `/${appName}${normalizedPath}`;
  }

  /**
   * 构建完整URL
   */
  private buildFullUrl(route: RouteInfo): string {
    const url = new URL(route.fullPath, window.location.origin);
    
    // 添加查询参数
    Object.entries(route.query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    // 添加hash
    if (route.hash) {
      url.hash = route.hash;
    }
    
    return url.toString();
  }

  /**
   * 解析路径参数
   */
  private parseParams(path: string): RouteParams {
    // 这里可以实现更复杂的参数解析逻辑
    // 目前返回空对象，可以根据实际需求扩展
    return {};
  }

  /**
   * 获取当前应用名称
   */
  private getCurrentApp(): string | null {
    return this.currentRoute?.appName || null;
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 全局实例 ====================

export const globalRouteManager = new RouteManager({
  debug: typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development'
});

// ==================== 导出类型 ====================

export type {
  RouteParams,
  NavigationOptions,
  RouteGuard,
  RouteInfo,
  RouteHistoryEntry,
  RouteMiddleware,
  NavigationEvent,
  RouteChangeEvent
};