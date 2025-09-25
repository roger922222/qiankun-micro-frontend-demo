/**
 * 状态中间件系统 - 全局状态管理增强
 * 提供状态变更的中间件处理机制
 */

import { GlobalState, StateAction } from '../../types/store';

// ==================== 状态中间件接口定义 ====================

/**
 * 状态中间件接口
 */
export interface StateMiddleware {
  /**
   * 中间件名称
   */
  name: string;

  /**
   * 处理状态变更
   * @param action 状态动作
   * @param currentState 当前状态
   * @param next 下一个中间件函数
   */
  process(
    action: StateAction,
    currentState: GlobalState,
    next: (action: StateAction) => void
  ): void | Promise<void>;

  /**
   * 中间件优先级 (数字越小优先级越高)
   */
  priority?: number;

  /**
   * 是否启用
   */
  enabled?: boolean;
}

/**
 * 状态中间件上下文
 */
export interface StateMiddlewareContext {
  /**
   * 动作ID
   */
  actionId: string;

  /**
   * 处理开始时间
   */
  startTime: number;

  /**
   * 中间件执行信息
   */
  middlewareInfo: {
    name: string;
    startTime: number;
    endTime?: number;
    error?: Error;
  }[];

  /**
   * 是否已被拦截
   */
  intercepted: boolean;

  /**
   * 拦截原因
   */
  interceptReason?: string;

  /**
   * 附加数据
   */
  metadata: Record<string, any>;
}

/**
 * 状态中间件错误处理器
 */
export type StateMiddlewareErrorHandler = (
  error: Error,
  action: StateAction,
  middleware: StateMiddleware
) => void;

// ==================== 状态中间件管理器 ====================

/**
 * 状态中间件管理器
 */
export class StateMiddlewareManager {
  private middleware: StateMiddleware[] = [];
  private errorHandler?: StateMiddlewareErrorHandler;
  private debug: boolean = false;
  private performanceTracking: boolean = true;

  constructor(options?: {
    debug?: boolean;
    performanceTracking?: boolean;
    errorHandler?: StateMiddlewareErrorHandler;
  }) {
    this.debug = options?.debug || false;
    this.performanceTracking = options?.performanceTracking !== false;
    this.errorHandler = options?.errorHandler;
  }

  /**
   * 添加中间件
   */
  use(middleware: StateMiddleware): void {
    // 检查中间件是否已存在
    const existingIndex = this.middleware.findIndex(m => m.name === middleware.name);
    if (existingIndex !== -1) {
      console.warn(`[StateMiddleware] Middleware "${middleware.name}" already exists, replacing...`);
      this.middleware[existingIndex] = middleware;
    } else {
      this.middleware.push(middleware);
    }

    // 按优先级排序
    this.middleware.sort((a, b) => (a.priority || 100) - (b.priority || 100));

    if (this.debug) {
      console.log(`[StateMiddleware] Added middleware: ${middleware.name}, priority: ${middleware.priority || 100}`);
    }
  }

  /**
   * 移除中间件
   */
  remove(middlewareName: string): boolean {
    const index = this.middleware.findIndex(m => m.name === middlewareName);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      if (this.debug) {
        console.log(`[StateMiddleware] Removed middleware: ${middlewareName}`);
      }
      return true;
    }
    return false;
  }

  /**
   * 获取中间件列表
   */
  getMiddleware(): StateMiddleware[] {
    return [...this.middleware];
  }

  /**
   * 启用/禁用中间件
   */
  toggle(middlewareName: string, enabled: boolean): boolean {
    const middleware = this.middleware.find(m => m.name === middlewareName);
    if (middleware) {
      middleware.enabled = enabled;
      if (this.debug) {
        console.log(`[StateMiddleware] ${enabled ? 'Enabled' : 'Disabled'} middleware: ${middlewareName}`);
      }
      return true;
    }
    return false;
  }

  /**
   * 处理状态动作通过中间件管道
   */
  async processAction(
    action: StateAction,
    currentState: GlobalState,
    executeAction: (action: StateAction) => void
  ): Promise<void> {
    // 创建中间件上下文
    const context: StateMiddlewareContext = {
      actionId: `${action.type}-${Date.now()}`,
      startTime: Date.now(),
      middlewareInfo: [],
      intercepted: false,
      metadata: {}
    };

    // 获取启用的中间件
    const enabledMiddleware = this.middleware.filter(m => m.enabled !== false);

    if (this.debug) {
      console.log(`[StateMiddleware] Processing action ${action.type} through ${enabledMiddleware.length} middleware`);
    }

    // 创建中间件执行链
    let currentIndex = 0;

    const executeNext = (actionToExecute: StateAction): void => {
      if (currentIndex >= enabledMiddleware.length || context.intercepted) {
        // 所有中间件执行完毕，执行最终动作
        executeAction(actionToExecute);
        return;
      }

      const middleware = enabledMiddleware[currentIndex++];
      const middlewareStartTime = Date.now();

      try {
        if (this.debug) {
          console.log(`[StateMiddleware] Executing middleware: ${middleware.name}`);
        }

        const result = middleware.process(actionToExecute, currentState, executeNext);

        // 处理异步中间件
        if (result instanceof Promise) {
          result
            .then(() => {
              // 记录中间件执行信息
              if (this.performanceTracking) {
                context.middlewareInfo.push({
                  name: middleware.name,
                  startTime: middlewareStartTime,
                  endTime: Date.now()
                });
              }
            })
            .catch(error => {
              this.handleMiddlewareError(error, actionToExecute, middleware, context);
            });
        } else {
          // 同步中间件
          if (this.performanceTracking) {
            context.middlewareInfo.push({
              name: middleware.name,
              startTime: middlewareStartTime,
              endTime: Date.now()
            });
          }
        }

      } catch (error) {
        this.handleMiddlewareError(error as Error, actionToExecute, middleware, context);
      }
    };

    // 开始执行中间件链
    executeNext(action);

    // 性能追踪
    if (this.performanceTracking && this.debug) {
      setTimeout(() => {
        const totalTime = Date.now() - context.startTime;
        console.log(`[StateMiddleware] Action ${action.type} processed in ${totalTime}ms`);
        context.middlewareInfo.forEach(info => {
          const duration = (info.endTime || Date.now()) - info.startTime;
          console.log(`  - ${info.name}: ${duration}ms${info.error ? ' (ERROR)' : ''}`);
        });
      }, 0);
    }
  }

  /**
   * 处理中间件错误
   */
  private handleMiddlewareError(
    error: Error,
    action: StateAction,
    middleware: StateMiddleware,
    context: StateMiddlewareContext
  ): void {
    // 记录错误信息
    const middlewareInfo = context.middlewareInfo.find(info => info.name === middleware.name);
    if (middlewareInfo) {
      middlewareInfo.error = error;
      middlewareInfo.endTime = Date.now();
    }

    // 调用错误处理器
    if (this.errorHandler) {
      this.errorHandler(error, action, middleware);
    } else {
      console.error(`[StateMiddleware] Error in middleware "${middleware.name}":`, error);
    }

    // 决定是否继续执行后续中间件
    if (this.shouldStopOnError(error, middleware)) {
      context.intercepted = true;
      context.interceptReason = `Error in middleware: ${middleware.name}`;
    }
  }

  /**
   * 判断是否应该在错误时停止执行
   */
  private shouldStopOnError(_error: Error, _middleware: StateMiddleware): boolean {
    // 可以根据错误类型或中间件配置决定是否停止
    // 这里默认不停止，让后续中间件继续执行
    return false;
  }

  /**
   * 设置错误处理器
   */
  setErrorHandler(handler: StateMiddlewareErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * 设置调试模式
   */
  setDebug(debug: boolean): void {
    this.debug = debug;
  }

  /**
   * 设置性能追踪
   */
  setPerformanceTracking(enabled: boolean): void {
    this.performanceTracking = enabled;
  }

  /**
   * 清除所有中间件
   */
  clear(): void {
    this.middleware = [];
    if (this.debug) {
      console.log('[StateMiddleware] Cleared all middleware');
    }
  }

  /**
   * 获取中间件统计信息
   */
  getStats(): {
    totalMiddleware: number;
    enabledMiddleware: number;
    disabledMiddleware: number;
    middlewareList: Array<{
      name: string;
      enabled: boolean;
      priority: number;
    }>;
  } {
    const enabled = this.middleware.filter(m => m.enabled !== false);
    const disabled = this.middleware.filter(m => m.enabled === false);

    return {
      totalMiddleware: this.middleware.length,
      enabledMiddleware: enabled.length,
      disabledMiddleware: disabled.length,
      middlewareList: this.middleware.map(m => ({
        name: m.name,
        enabled: m.enabled !== false,
        priority: m.priority || 100
      }))
    };
  }
}

// ==================== 中间件工具函数 ====================

/**
 * 创建简单状态中间件
 */
export function createStateMiddleware(
  name: string,
  processor: (
    action: StateAction,
    currentState: GlobalState,
    next: (action: StateAction) => void
  ) => void | Promise<void>,
  options?: {
    priority?: number;
    enabled?: boolean;
  }
): StateMiddleware {
  return {
    name,
    process: processor,
    priority: options?.priority,
    enabled: options?.enabled
  };
}

/**
 * 状态中间件拦截器 - 用于阻止状态变更
 */
export class StateMiddlewareInterceptor extends Error {
  constructor(
    public reason: string,
    public middlewareName: string
  ) {
    super(`State action intercepted by middleware "${middlewareName}": ${reason}`);
    this.name = 'StateMiddlewareInterceptor';
  }
}

/**
 * 创建拦截状态中间件
 */
export function createInterceptStateMiddleware(
  name: string,
  condition: (action: StateAction, state: GlobalState) => boolean,
  reason: string,
  options?: {
    priority?: number;
    enabled?: boolean;
  }
): StateMiddleware {
  return createStateMiddleware(
    name,
    (action: StateAction, currentState: GlobalState, next: (action: StateAction) => void) => {
      if (condition(action, currentState)) {
        throw new StateMiddlewareInterceptor(reason, name);
      }
      next(action);
    },
    options
  );
}

// ==================== 导出 ====================
// 所有导出已在上面通过 export 关键字直接声明，无需重复导出