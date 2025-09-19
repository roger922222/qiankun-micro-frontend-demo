/**
 * 事件总线 - 微前端应用间通信核心
 * 提供发布订阅模式的事件通信机制
 */

import { EventBusInterface, EventHandler, EventSubscription, BaseEvent } from '../types/events';

/**
 * 事件总线实现类
 */
export class EventBus implements EventBusInterface {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private onceListeners: Map<string, Set<EventHandler>> = new Map();
  private maxListeners: number = 100;
  private debug: boolean = false;

  constructor(options?: { maxListeners?: number; debug?: boolean }) {
    this.maxListeners = options?.maxListeners || 100;
    this.debug = options?.debug || false;
  }

  /**
   * 发射事件
   */
  emit<T extends BaseEvent>(event: T): void {
    const { type } = event;
    
    if (this.debug) {
      console.log(`[EventBus] Emitting event: ${type}`, event);
    }

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
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear();
    this.onceListeners.clear();
    
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

    return {
      totalEventTypes: Object.keys(eventTypeStats).length,
      totalListeners,
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
  protected emit<T extends BaseEvent>(event: T): void {
    this._eventBus.emit(event);
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

  const emit = <T extends BaseEvent>(event: T) => {
    eventBus.emit(event);
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

  const emit = <T extends BaseEvent>(event: T) => {
    eventBus.emit(event);
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