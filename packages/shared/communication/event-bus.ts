/**
 * 事件总线 - 微前端应用间通信核心
 * 提供发布订阅模式的事件通信机制，支持中间件处理流程
 */

import { EventBusInterface, EventHandler, EventSubscription, BaseEvent } from '../types/events';
import { EventMiddlewareManager, EventMiddleware } from './middleware/event-middleware';

// 类型声明
declare const process: any;

/**
 * 增强事件总线实现类
 */
export class EventBus implements EventBusInterface {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private onceListeners: Map<string, Set<EventHandler>> = new Map();
  private anyListeners: Set<EventHandler> = new Set(); // 监听所有事件的处理器
  private maxListeners: number = 100;
  private debug: boolean = false;
  private middlewareManager: EventMiddlewareManager;

  constructor(options?: { maxListeners?: number; debug?: boolean }) {
    this.maxListeners = options?.maxListeners || 100;
    this.debug = options?.debug || false;
    this.middlewareManager = new EventMiddlewareManager({
      debug: this.debug,
      performanceTracking: true
    });
  }

  /**
   * 发射事件 - 增强版本，支持中间件处理
   */
  async emit<T extends BaseEvent>(event: T): Promise<void> {
    const { type } = event;
    
    if (this.debug) {
      console.log(`[EventBus] Emitting event: ${type}`, event);
    }

    try {
      // 通过中间件处理事件
      const processedEvent = await this.middlewareManager.processEvent(event);
      
      // 执行原始发射逻辑
      this.emitProcessedEvent(processedEvent);
    } catch (error) {
      console.error(`[EventBus] Error processing event ${type}:`, error);
      // 根据错误类型决定是否继续执行
      if (this.shouldContinueOnError(error)) {
        this.emitProcessedEvent(event);
      }
    }
  }

  /**
   * 发射已处理的事件（原始逻辑）
   */
  private emitProcessedEvent<T extends BaseEvent>(event: T): void {
    const { type } = event;

    // 触发监听所有事件的处理器
    this.anyListeners.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Error in any event handler for ${type}:`, error);
      }
    });

    // 触发普通监听器
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Error in event handler for ${type}:`, error);
        }
      });
    }

    // 触发一次性监听器
    const onceListeners = this.onceListeners.get(type);
    if (onceListeners) {
      onceListeners.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Error in once event handler for ${type}:`, error);
        }
      });
      // 清除一次性监听器
      this.onceListeners.delete(type);
    }
  }

  /**
   * 判断是否在错误时继续执行
   */
  private shouldContinueOnError(error: any): boolean {
    // 如果是中间件拦截错误，不继续执行
    if (error.name === 'MiddlewareInterceptor') {
      return false;
    }
    // 其他错误可以继续执行
    return true;
  }

  /**
   * 监听事件
   */
  on<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    
    // 检查监听器数量限制
    if (listeners.size >= this.maxListeners) {
      console.warn(`[EventBus] Too many listeners for event ${eventType}. Maximum is ${this.maxListeners}`);
    }

    listeners.add(handler as EventHandler);

    if (this.debug) {
      console.log(`[EventBus] Added listener for event: ${eventType}`);
    }

    return {
      unsubscribe: () => this.off(eventType, handler)
    };
  }

  /**
   * 移除事件监听器
   */
  off<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(handler as EventHandler);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }

    const onceListeners = this.onceListeners.get(eventType);
    if (onceListeners) {
      onceListeners.delete(handler as EventHandler);
      if (onceListeners.size === 0) {
        this.onceListeners.delete(eventType);
      }
    }

    if (this.debug) {
      console.log(`[EventBus] Removed listener for event: ${eventType}`);
    }
  }

  /**
   * 监听事件一次
   */
  once<T extends BaseEvent>(eventType: string, handler: EventHandler<T>): EventSubscription {
    if (!this.onceListeners.has(eventType)) {
      this.onceListeners.set(eventType, new Set());
    }

    const onceListeners = this.onceListeners.get(eventType)!;
    onceListeners.add(handler as EventHandler);

    if (this.debug) {
      console.log(`[EventBus] Added once listener for event: ${eventType}`);
    }

    return {
      unsubscribe: () => this.off(eventType, handler)
    };
  }

  /**
   * 监听所有事件
   */
  onAny<T extends BaseEvent>(handler: EventHandler<T>): EventSubscription {
    // 检查监听器数量限制
    if (this.anyListeners.size >= this.maxListeners) {
      console.warn(`[EventBus] Too many any listeners. Maximum is ${this.maxListeners}`);
    }

    this.anyListeners.add(handler as EventHandler);

    if (this.debug) {
      console.log('[EventBus] Added any event listener');
    }

    return {
      unsubscribe: () => this.offAny(handler)
    };
  }

  /**
   * 移除监听所有事件的处理器
   */
  offAny<T extends BaseEvent>(handler: EventHandler<T>): void {
    this.anyListeners.delete(handler as EventHandler);

    if (this.debug) {
      console.log('[EventBus] Removed any event listener');
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
    this.anyListeners.clear();
    
    if (this.debug) {
      console.log('[EventBus] Cleared all listeners');
    }
  }

  /**
   * 获取指定事件类型的监听器列表
   */
  getListeners(eventType: string): EventHandler[] {
    const listeners = this.listeners.get(eventType);
    const onceListeners = this.onceListeners.get(eventType);
    
    const allListeners: EventHandler[] = [];
    
    if (listeners) {
      allListeners.push(...Array.from(listeners));
    }
    
    if (onceListeners) {
      allListeners.push(...Array.from(onceListeners));
    }
    
    return allListeners;
  }

  /**
   * 获取所有事件类型
   */
  getEventTypes(): string[] {
    const types = new Set<string>();
    
    this.listeners.forEach((_, type) => types.add(type));
    this.onceListeners.forEach((_, type) => types.add(type));
    
    return Array.from(types);
  }

  /**
   * 获取监听器统计信息
   */
  getStats(): {
    totalEventTypes: number;
    totalListeners: number;
    anyListeners: number;
    eventTypeStats: Record<string, { listeners: number; onceListeners: number }>;
  } {
    const eventTypeStats: Record<string, { listeners: number; onceListeners: number }> = {};
    let totalListeners = 0;

    // 统计普通监听器
    this.listeners.forEach((listeners, type) => {
      if (!eventTypeStats[type]) {
        eventTypeStats[type] = { listeners: 0, onceListeners: 0 };
      }
      eventTypeStats[type].listeners = listeners.size;
      totalListeners += listeners.size;
    });

    // 统计一次性监听器
    this.onceListeners.forEach((listeners, type) => {
      if (!eventTypeStats[type]) {
        eventTypeStats[type] = { listeners: 0, onceListeners: 0 };
      }
      eventTypeStats[type].onceListeners = listeners.size;
      totalListeners += listeners.size;
    });

    // 包含监听所有事件的处理器
    totalListeners += this.anyListeners.size;

    return {
      totalEventTypes: Object.keys(eventTypeStats).length,
      totalListeners,
      anyListeners: this.anyListeners.size,
      eventTypeStats
    };
  }

  /**
   * 设置调试模式
   */
  setDebug(debug: boolean): void {
    this.debug = debug;
  }

  /**
   * 设置最大监听器数量
   */
  setMaxListeners(max: number): void {
    this.maxListeners = max;
  }

  /**
   * 添加中间件
   */
  use(middleware: EventMiddleware): void {
    this.middlewareManager.use(middleware);
  }

  /**
   * 移除中间件
   */
  removeMiddleware(middlewareName: string): boolean {
    return this.middlewareManager.remove(middlewareName);
  }

  /**
   * 获取中间件列表
   */
  getMiddleware(): EventMiddleware[] {
    return this.middlewareManager.getMiddleware();
  }

  /**
   * 启用/禁用中间件
   */
  toggleMiddleware(middlewareName: string, enabled: boolean): boolean {
    return this.middlewareManager.toggle(middlewareName, enabled);
  }

  /**
   * 获取中间件统计信息
   */
  getMiddlewareStats() {
    return this.middlewareManager.getStats();
  }

  /**
   * 清除所有中间件
   */
  clearMiddleware(): void {
    this.middlewareManager.clear();
  }
}

/**
 * 全局事件总线实例
 */
export const globalEventBus = new EventBus({ debug: process.env.NODE_ENV === 'development' });

/**
 * 事件总线工厂函数
 */
export function createEventBus(options?: { maxListeners?: number; debug?: boolean }): EventBus {
  return new EventBus(options);
}

/**
 * 事件总线装饰器 - 用于自动注册和清理事件监听器
 */
export function EventListener(eventType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    // 存储监听器信息
    if (!target._eventListeners) {
      target._eventListeners = [];
    }
    
    target._eventListeners.push({
      eventType,
      handler: originalMethod,
      propertyKey
    });
    
    return descriptor;
  };
}

/**
 * 自动事件管理 Mixin
 */
export class EventMixin {
  private _subscriptions: EventSubscription[] = [];
  private _eventBus: EventBus;

  constructor(eventBus: EventBus = globalEventBus) {
    this._eventBus = eventBus;
  }

  /**
   * 监听事件并自动管理订阅
   */
  protected listen<T extends BaseEvent>(
    eventType: string, 
    handler: EventHandler<T>
  ): EventSubscription {
    const subscription = this._eventBus.on(eventType, handler);
    this._subscriptions.push(subscription);
    return subscription;
  }

  /**
   * 监听事件一次并自动管理订阅
   */
  protected listenOnce<T extends BaseEvent>(
    eventType: string, 
    handler: EventHandler<T>
  ): EventSubscription {
    const subscription = this._eventBus.once(eventType, handler);
    this._subscriptions.push(subscription);
    return subscription;
  }

  /**
   * 发射事件
   */
  protected async emit<T extends BaseEvent>(event: T): Promise<void> {
    await this._eventBus.emit(event);
  }

  /**
   * 清理所有订阅
   */
  protected cleanup(): void {
    this._subscriptions.forEach(subscription => subscription.unsubscribe());
    this._subscriptions = [];
  }

  /**
   * 析构函数 - 自动清理
   */
  destroy(): void {
    this.cleanup();
  }
}

/**
 * React Hook - 用于在React组件中使用事件总线
 */
export function useEventBus(eventBus: EventBus = globalEventBus) {
  const subscriptions = new Set<EventSubscription>();

  const emit = async <T extends BaseEvent>(event: T) => {
    await eventBus.emit(event);
  };

  const on = <T extends BaseEvent>(eventType: string, handler: EventHandler<T>) => {
    const subscription = eventBus.on(eventType, handler);
    subscriptions.add(subscription);
    return subscription;
  };

  const once = <T extends BaseEvent>(eventType: string, handler: EventHandler<T>) => {
    const subscription = eventBus.once(eventType, handler);
    subscriptions.add(subscription);
    return subscription;
  };

  const cleanup = () => {
    subscriptions.forEach(subscription => subscription.unsubscribe());
    subscriptions.clear();
  };

  return {
    emit,
    on,
    once,
    cleanup
  };
}

/**
 * Vue 3 Composition API Hook
 */
export function useEventBusVue(eventBus: EventBus = globalEventBus) {
  const subscriptions: EventSubscription[] = [];

  const emit = async <T extends BaseEvent>(event: T) => {
    await eventBus.emit(event);
  };

  const on = <T extends BaseEvent>(eventType: string, handler: EventHandler<T>) => {
    const subscription = eventBus.on(eventType, handler);
    subscriptions.push(subscription);
    return subscription;
  };

  const once = <T extends BaseEvent>(eventType: string, handler: EventHandler<T>) => {
    const subscription = eventBus.once(eventType, handler);
    subscriptions.push(subscription);
    return subscription;
  };

  // Vue 3 onUnmounted hook
  if (typeof window !== 'undefined' && (window as any).onUnmounted) {
    (window as any).onUnmounted(() => {
      subscriptions.forEach(subscription => subscription.unsubscribe());
    });
  }

  return {
    emit,
    on,
    once
  };
}