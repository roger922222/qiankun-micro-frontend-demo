/**
 * 事件中间件系统 - 微前端通信中间件基础架构
 * 提供事件处理的中间件管道机制
 */

import { BaseEvent } from '../../types/events';

// ==================== 中间件接口定义 ====================

/**
 * 事件中间件接口
 */
export interface EventMiddleware {
  /**
   * 中间件名称
   */
  name: string;

  /**
   * 处理事件
   * @param event 事件对象
   * @param next 下一个中间件函数
   */
  process<T extends BaseEvent>(event: T, next: (event: T) => Promise<void>): Promise<void>;

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
 * 中间件上下文
 */
export interface MiddlewareContext {
  /**
   * 事件ID
   */
  eventId: string;

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
 * 中间件错误处理器
 */
export type MiddlewareErrorHandler = (error: Error, event: BaseEvent, middleware: EventMiddleware) => void;

// ==================== 事件中间件管理器 ====================

/**
 * 事件中间件管理器
 */
export class EventMiddlewareManager {
  private middleware: EventMiddleware[] = [];
  private errorHandler?: MiddlewareErrorHandler;
  private debug: boolean = false;
  private performanceTracking: boolean = true;

  constructor(options?: {
    debug?: boolean;
    performanceTracking?: boolean;
    errorHandler?: MiddlewareErrorHandler;
  }) {
    this.debug = options?.debug || false;
    this.performanceTracking = options?.performanceTracking !== false;
    this.errorHandler = options?.errorHandler;
  }

  /**
   * 添加中间件
   */
  use(middleware: EventMiddleware): void {
    // 检查中间件是否已存在
    const existingIndex = this.middleware.findIndex(m => m.name === middleware.name);
    if (existingIndex !== -1) {
      console.warn(`[EventMiddleware] Middleware "${middleware.name}" already exists, replacing...`);
      this.middleware[existingIndex] = middleware;
    } else {
      this.middleware.push(middleware);
    }

    // 按优先级排序
    this.middleware.sort((a, b) => (a.priority || 100) - (b.priority || 100));

    if (this.debug) {
      console.log(`[EventMiddleware] Added middleware: ${middleware.name}, priority: ${middleware.priority || 100}`);
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
        console.log(`[EventMiddleware] Removed middleware: ${middlewareName}`);
      }
      return true;
    }
    return false;
  }

  /**
   * 获取中间件列表
   */
  getMiddleware(): EventMiddleware[] {
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
        console.log(`[EventMiddleware] ${enabled ? 'Enabled' : 'Disabled'} middleware: ${middlewareName}`);
      }
      return true;
    }
    return false;
  }

  /**
   * 处理事件通过中间件管道
   */
  async processEvent<T extends BaseEvent>(event: T): Promise<T> {
    // 创建中间件上下文
    const context: MiddlewareContext = {
      eventId: event.id,
      startTime: Date.now(),
      middlewareInfo: [],
      intercepted: false,
      metadata: {}
    };

    // 获取启用的中间件
    const enabledMiddleware = this.middleware.filter(m => m.enabled !== false);

    if (this.debug) {
      console.log(`[EventMiddleware] Processing event ${event.type} through ${enabledMiddleware.length} middleware`);
    }

    // 创建中间件执行链
    let processedEvent = event;
    let currentIndex = 0;

    const executeNext = async (evt: T): Promise<void> => {
      if (currentIndex >= enabledMiddleware.length || context.intercepted) {
        return;
      }

      const middleware = enabledMiddleware[currentIndex++];
      const middlewareStartTime = Date.now();

      try {
        if (this.debug) {
          console.log(`[EventMiddleware] Executing middleware: ${middleware.name}`);
        }

        await middleware.process(evt, async (nextEvent: T) => {
          processedEvent = nextEvent;
          await executeNext(nextEvent);
        });

        // 记录中间件执行信息
        if (this.performanceTracking) {
          context.middlewareInfo.push({
            name: middleware.name,
            startTime: middlewareStartTime,
            endTime: Date.now()
          });
        }

      } catch (error) {
        const middlewareError = error as Error;
        
        // 记录错误信息
        context.middlewareInfo.push({
          name: middleware.name,
          startTime: middlewareStartTime,
          endTime: Date.now(),
          error: middlewareError
        });

        // 调用错误处理器
        if (this.errorHandler) {
          this.errorHandler(middlewareError, evt, middleware);
        } else {
          console.error(`[EventMiddleware] Error in middleware "${middleware.name}":`, middlewareError);
        }

        // 决定是否继续执行后续中间件
        if (this.shouldStopOnError(middlewareError, middleware)) {
          context.intercepted = true;
          context.interceptReason = `Error in middleware: ${middleware.name}`;
          return;
        }
      }
    };

    // 开始执行中间件链
    await executeNext(processedEvent);

    // 性能追踪
    if (this.performanceTracking && this.debug) {
      const totalTime = Date.now() - context.startTime;
      console.log(`[EventMiddleware] Event ${event.type} processed in ${totalTime}ms`);
      context.middlewareInfo.forEach(info => {
        const duration = (info.endTime || Date.now()) - info.startTime;
        console.log(`  - ${info.name}: ${duration}ms${info.error ? ' (ERROR)' : ''}`);
      });
    }

    return processedEvent;
  }

  /**
   * 判断是否应该在错误时停止执行
   */
  private shouldStopOnError(_error: Error, _middleware: EventMiddleware): boolean {
    // 可以根据错误类型或中间件配置决定是否停止
    // 这里默认不停止，让后续中间件继续执行
    return false;
  }

  /**
   * 设置错误处理器
   */
  setErrorHandler(handler: MiddlewareErrorHandler): void {
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
      console.log('[EventMiddleware] Cleared all middleware');
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
 * 创建简单中间件
 */
export function createMiddleware(
  name: string,
  processor: <T extends BaseEvent>(event: T, next: (event: T) => Promise<void>) => Promise<void>,
  options?: {
    priority?: number;
    enabled?: boolean;
  }
): EventMiddleware {
  return {
    name,
    process: processor,
    priority: options?.priority,
    enabled: options?.enabled
  };
}

/**
 * 中间件拦截器 - 用于阻止事件继续传播
 */
export class MiddlewareInterceptor extends Error {
  constructor(
    public reason: string,
    public middlewareName: string
  ) {
    super(`Event intercepted by middleware "${middlewareName}": ${reason}`);
    this.name = 'MiddlewareInterceptor';
  }
}

/**
 * 创建拦截中间件
 */
export function createInterceptMiddleware(
  name: string,
  condition: <T extends BaseEvent>(event: T) => boolean,
  reason: string,
  options?: {
    priority?: number;
    enabled?: boolean;
  }
): EventMiddleware {
  return createMiddleware(
    name,
    async <T extends BaseEvent>(event: T, next: (event: T) => Promise<void>) => {
      if (condition(event)) {
        throw new MiddlewareInterceptor(reason, name);
      }
      await next(event);
    },
    options
  );
}

// ==================== 导出 ====================
// 所有导出已在上面通过 export 关键字直接声明，无需重复导出