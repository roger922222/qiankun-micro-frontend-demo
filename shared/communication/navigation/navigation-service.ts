/**
 * 导航服务 - 跨应用导航功能封装
 * 提供高级导航功能、参数处理和导航状态管理
 */

import { globalRouteManager, RouteInfo, NavigationOptions, RouteParams } from './route-manager';
import { globalEventBus } from '../event-bus';
import { BaseEvent } from '../../types/events';

// ==================== 类型定义 ====================

export interface NavigationState {
  isNavigating: boolean;
  currentApp: string | null;
  currentPath: string | null;
  pendingNavigation: PendingNavigation | null;
  error: NavigationError | null;
}

export interface PendingNavigation {
  targetApp: string;
  path: string;
  options: NavigationOptions;
  timestamp: number;
  timeout?: number;
}

export interface NavigationError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export interface NavigationContext {
  source: string;
  metadata?: Record<string, any>;
  breadcrumbs?: string[];
  referrer?: RouteInfo;
}

export interface ParameterTransformer {
  name: string;
  transform: (params: RouteParams, context: NavigationContext) => RouteParams | Promise<RouteParams>;
}

// ==================== 事件类型 ====================

export interface NavigationStateEvent extends BaseEvent {
  type: 'NAVIGATION_STATE';
  data: NavigationState;
}

export interface ParameterEvent extends BaseEvent {
  type: 'PARAMETER_TRANSFER';
  data: {
    targetApp: string;
    parameters: RouteParams;
    transferType: 'url' | 'state' | 'event';
    context: NavigationContext;
  };
}

// ==================== 导航服务实现 ====================

export class NavigationService {
  private state: NavigationState;
  private parameterTransformers: ParameterTransformer[] = [];
  private navigationTimeout: number = 5000; // 5秒超时
  private debug: boolean = false;
  private navigationQueue: PendingNavigation[] = [];
  private isProcessingQueue: boolean = false;

  constructor(options?: { timeout?: number; debug?: boolean }) {
    this.navigationTimeout = options?.timeout || 5000;
    this.debug = options?.debug || false;
    
    this.state = {
      isNavigating: false,
      currentApp: null,
      currentPath: null,
      pendingNavigation: null,
      error: null
    };

    this.initializeNavigationService();
  }

  /**
   * 初始化导航服务
   */
  private initializeNavigationService(): void {
    // 监听路由变化事件
    globalEventBus.on('ROUTE_CHANGE', this.handleRouteChange.bind(this));
    
    // 监听导航事件
    globalEventBus.on('NAVIGATION', this.handleNavigationEvent.bind(this));
    
    // 初始化当前状态
    this.updateCurrentState();
    
    if (this.debug) {
      console.log('[NavigationService] Initialized with state:', this.state);
    }
  }

  /**
   * 智能导航 - 根据目标自动选择最佳导航方式
   */
  async smartNavigate(
    target: string,
    params?: RouteParams,
    context?: NavigationContext
  ): Promise<boolean> {
    try {
      this.setNavigating(true);
      
      const { appName, path } = this.parseNavigationTarget(target);
      const processedParams = await this.processParameters(params || {}, context || { source: 'smart-navigate' });
      
      // 构建导航选项
      const options: NavigationOptions = {
        params: processedParams,
        state: {
          context,
          timestamp: Date.now()
        }
      };

      // 根据参数类型选择传递方式
      const transferMethod = this.selectParameterTransferMethod(processedParams);
      
      if (transferMethod === 'url') {
        options.query = this.convertParamsToQuery(processedParams);
      } else if (transferMethod === 'event') {
        await this.transferParametersViaEvent(appName, processedParams, context || { source: 'smart-navigate' });
      }
      
      const success = await globalRouteManager.navigateToApp(appName, path, options);
      
      if (!success) {
        this.setError({
          code: 'NAVIGATION_FAILED',
          message: `Failed to navigate to ${target}`,
          timestamp: Date.now()
        });
      }
      
      return success;
    } catch (error) {
      this.setError({
        code: 'NAVIGATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown navigation error',
        details: error,
        timestamp: Date.now()
      });
      return false;
    } finally {
      this.setNavigating(false);
    }
  }

  /**
   * 批量导航 - 支持导航队列处理
   */
  async batchNavigate(navigations: Array<{
    target: string;
    params?: RouteParams;
    context?: NavigationContext;
    delay?: number;
  }>): Promise<boolean[]> {
    const results: boolean[] = [];
    
    for (const nav of navigations) {
      if (nav.delay) {
        await this.delay(nav.delay);
      }
      
      const result = await this.smartNavigate(nav.target, nav.params, nav.context);
      results.push(result);
      
      // 如果导航失败且没有设置继续标志，停止批量导航
      if (!result) {
        console.warn('[NavigationService] Batch navigation stopped due to failure');
        break;
      }
    }
    
    return results;
  }

  /**
   * 条件导航 - 根据条件决定是否导航
   */
  async conditionalNavigate(
    target: string,
    condition: () => boolean | Promise<boolean>,
    params?: RouteParams,
    context?: NavigationContext
  ): Promise<boolean> {
    try {
      const shouldNavigate = await condition();
      
      if (!shouldNavigate) {
        if (this.debug) {
          console.log('[NavigationService] Conditional navigation skipped');
        }
        return false;
      }
      
      return this.smartNavigate(target, params, context);
    } catch (error) {
      console.error('[NavigationService] Conditional navigation error:', error);
      return false;
    }
  }

  /**
   * 安全导航 - 带有回退机制的导航
   */
  async safeNavigate(
    target: string,
    fallbackTarget?: string,
    params?: RouteParams,
    context?: NavigationContext
  ): Promise<boolean> {
    const success = await this.smartNavigate(target, params, context);
    
    if (!success && fallbackTarget) {
      if (this.debug) {
        console.log('[NavigationService] Primary navigation failed, trying fallback');
      }
      return this.smartNavigate(fallbackTarget, params, {
        ...context,
        source: 'safe-navigate-fallback'
      });
    }
    
    return success;
  }

  /**
   * 延迟导航 - 在指定时间后执行导航
   */
  async delayedNavigate(
    target: string,
    delay: number,
    params?: RouteParams,
    context?: NavigationContext
  ): Promise<boolean> {
    await this.delay(delay);
    return this.smartNavigate(target, params, context);
  }

  /**
   * 队列导航 - 将导航添加到队列中按顺序执行
   */
  async queueNavigation(
    target: string,
    params?: RouteParams,
    context?: NavigationContext,
    priority: number = 0
  ): Promise<void> {
    const { appName, path } = this.parseNavigationTarget(target);
    
    const navigation: PendingNavigation = {
      targetApp: appName,
      path,
      options: {
        params,
        state: { context, timestamp: Date.now() }
      },
      timestamp: Date.now(),
      timeout: this.navigationTimeout
    };
    
    // 按优先级插入队列
    const insertIndex = this.navigationQueue.findIndex(nav => 
      (nav.options.state?.priority || 0) < priority
    );
    
    if (insertIndex === -1) {
      this.navigationQueue.push(navigation);
    } else {
      this.navigationQueue.splice(insertIndex, 0, navigation);
    }
    
    // 处理队列
    this.processNavigationQueue();
  }

  /**
   * 取消导航
   */
  cancelNavigation(): void {
    if (this.state.pendingNavigation) {
      this.state.pendingNavigation = null;
      this.setNavigating(false);
      
      if (this.debug) {
        console.log('[NavigationService] Navigation cancelled');
      }
    }
  }

  /**
   * 清空导航队列
   */
  clearNavigationQueue(): void {
    this.navigationQueue = [];
    if (this.debug) {
      console.log('[NavigationService] Navigation queue cleared');
    }
  }

  /**
   * 添加参数转换器
   */
  addParameterTransformer(transformer: ParameterTransformer): void {
    this.parameterTransformers.push(transformer);
    
    if (this.debug) {
      console.log('[NavigationService] Added parameter transformer:', transformer.name);
    }
  }

  /**
   * 移除参数转换器
   */
  removeParameterTransformer(transformerName: string): void {
    this.parameterTransformers = this.parameterTransformers.filter(
      t => t.name !== transformerName
    );
    
    if (this.debug) {
      console.log('[NavigationService] Removed parameter transformer:', transformerName);
    }
  }

  /**
   * 获取导航状态
   */
  getNavigationState(): NavigationState {
    return { ...this.state };
  }

  /**
   * 获取当前路由信息
   */
  getCurrentRoute(): RouteInfo | null {
    return globalRouteManager.getCurrentRoute();
  }

  /**
   * 检查是否可以导航到目标
   */
  async canNavigateTo(target: string): Promise<boolean> {
    try {
      const { appName, path } = this.parseNavigationTarget(target);
      const currentRoute = this.getCurrentRoute();
      
      // 这里可以添加更复杂的权限检查逻辑
      // 目前简单检查是否是有效的目标
      return appName && path ? true : false;
    } catch (error) {
      return false;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 处理路由变化事件
   */
  private handleRouteChange(event: any): void {
    this.updateCurrentState();
    
    if (this.debug) {
      console.log('[NavigationService] Route changed:', event.data);
    }
  }

  /**
   * 处理导航事件
   */
  private handleNavigationEvent(event: any): void {
    if (this.debug) {
      console.log('[NavigationService] Navigation event:', event.data);
    }
  }

  /**
   * 更新当前状态
   */
  private updateCurrentState(): void {
    const currentRoute = globalRouteManager.getCurrentRoute();
    
    this.state.currentApp = currentRoute?.appName || null;
    this.state.currentPath = currentRoute?.path || null;
    
    // 发送状态变化事件
    this.emitStateEvent();
  }

  /**
   * 设置导航中状态
   */
  private setNavigating(navigating: boolean): void {
    this.state.isNavigating = navigating;
    this.emitStateEvent();
  }

  /**
   * 设置错误状态
   */
  private setError(error: NavigationError): void {
    this.state.error = error;
    this.emitStateEvent();
    
    console.error('[NavigationService] Navigation error:', error);
  }

  /**
   * 发送状态事件
   */
  private emitStateEvent(): void {
    const event: NavigationStateEvent = {
      type: 'NAVIGATION_STATE',
      source: 'navigation-service',
      timestamp: new Date().toISOString(),
      id: `nav-state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: { ...this.state }
    };
    
    globalEventBus.emit(event);
  }

  /**
   * 解析导航目标
   */
  private parseNavigationTarget(target: string): { appName: string; path: string } {
    // 支持多种格式：
    // 1. "app-name/path" 
    // 2. "app-name:path"
    // 3. "/app-name/path"
    
    let appName: string;
    let path: string;
    
    if (target.includes(':')) {
      [appName, path] = target.split(':', 2);
    } else if (target.startsWith('/')) {
      const segments = target.slice(1).split('/');
      appName = segments[0];
      path = '/' + segments.slice(1).join('/');
    } else {
      const segments = target.split('/');
      appName = segments[0];
      path = '/' + segments.slice(1).join('/');
    }
    
    return { appName, path: path || '/' };
  }

  /**
   * 处理参数
   */
  private async processParameters(
    params: RouteParams,
    context: NavigationContext
  ): Promise<RouteParams> {
    let processedParams = { ...params };
    
    for (const transformer of this.parameterTransformers) {
      try {
        processedParams = await transformer.transform(processedParams, context);
      } catch (error) {
        console.error(`[NavigationService] Parameter transformer ${transformer.name} error:`, error);
      }
    }
    
    return processedParams;
  }

  /**
   * 选择参数传递方法
   */
  private selectParameterTransferMethod(params: RouteParams): 'url' | 'state' | 'event' {
    const paramString = JSON.stringify(params);
    
    // 如果参数太大，使用事件传递
    if (paramString.length > 2000) {
      return 'event';
    }
    
    // 如果包含复杂对象，使用状态传递
    if (this.hasComplexObjects(params)) {
      return 'state';
    }
    
    // 默认使用URL传递
    return 'url';
  }

  /**
   * 检查是否包含复杂对象
   */
  private hasComplexObjects(params: RouteParams): boolean {
    for (const value of Object.values(params)) {
      if (typeof value === 'object' && value !== null) {
        return true;
      }
    }
    return false;
  }

  /**
   * 转换参数为查询字符串
   */
  private convertParamsToQuery(params: RouteParams): Record<string, string> {
    const query: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' || typeof value === 'number') {
        query[key] = String(value);
      } else {
        query[key] = JSON.stringify(value);
      }
    }
    
    return query;
  }

  /**
   * 通过事件传递参数
   */
  private async transferParametersViaEvent(
    targetApp: string,
    parameters: RouteParams,
    context: NavigationContext
  ): Promise<void> {
    const event: ParameterEvent = {
      type: 'PARAMETER_TRANSFER',
      source: 'navigation-service',
      timestamp: new Date().toISOString(),
      id: `param-transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        targetApp,
        parameters,
        transferType: 'event',
        context
      }
    };
    
    await globalEventBus.emit(event);
  }

  /**
   * 处理导航队列
   */
  private async processNavigationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.navigationQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      while (this.navigationQueue.length > 0) {
        const navigation = this.navigationQueue.shift()!;
        
        // 检查是否超时
        if (Date.now() - navigation.timestamp > (navigation.timeout || this.navigationTimeout)) {
          console.warn('[NavigationService] Navigation timeout, skipping:', navigation);
          continue;
        }
        
        await globalRouteManager.navigateToApp(
          navigation.targetApp,
          navigation.path,
          navigation.options
        );
        
        // 添加小延迟避免过快的导航
        await this.delay(100);
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 全局实例 ====================

export const globalNavigationService = new NavigationService({
  debug: typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development'
});

// ==================== 导出类型 ====================

export type {
  NavigationState,
  PendingNavigation,
  NavigationError,
  NavigationContext,
  ParameterTransformer,
  NavigationStateEvent,
  ParameterEvent
};