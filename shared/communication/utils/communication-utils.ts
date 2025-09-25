/**
 * 通信工具函数 - 微前端通信便捷API封装
 * 提供便捷的通信API、工具函数、常用模式等
 */

import { BaseEvent } from '../../types/events';
import { GlobalState, StateAction } from '../../types/store';
import { globalEventBus } from '../event-bus';
import { globalStateManager } from '../global-state';
import { globalNotificationService, NotificationType, NotificationPriority } from '../realtime/notification-service';
import { globalWebSocketManager } from '../realtime/websocket-manager';
import { defaultMessageQueue } from '../realtime/message-queue';
import { globalDataSynchronizer } from './data-sync';
import { globalConflictResolver } from './conflict-resolver';
import { globalPerformanceOptimizer } from './performance-utils';

// ==================== 类型定义 ====================

export interface CommunicationOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  persistent?: boolean;
  enableConflictDetection?: boolean;
  enablePerformanceMonitoring?: boolean;
}

export interface EventOptions extends CommunicationOptions {
  middleware?: string[];
  debounce?: number;
  throttle?: number;
}

export interface StateOptions extends CommunicationOptions {
  merge?: boolean;
  createSnapshot?: boolean;
  syncTargets?: string[];
}

export interface MessageOptions extends CommunicationOptions {
  target?: string;
  expiresAt?: string;
  metadata?: Record<string, any>;
}

export interface CommunicationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  duration: number;
  metadata?: Record<string, any>;
}

// ==================== 事件通信工具 ====================

/**
 * 发送事件（增强版）
 */
export async function sendEvent<T = any>(
  type: string,
  data: T,
  options: EventOptions = {}
): Promise<CommunicationResult> {
  const startTime = performance.now();
  
  try {
    const event: BaseEvent = {
      type,
      source: 'communication-utils',
      timestamp: new Date().toISOString(),
      id: generateId(),
      data,
      metadata: {
        priority: options.priority || 'normal',
        timeout: options.timeout,
        retries: options.retries
      }
    };

    // 应用防抖或节流
    let emitFunction = globalEventBus.emit.bind(globalEventBus);
    
    if (options.debounce) {
      emitFunction = globalPerformanceOptimizer.createDebouncedFunction(
        emitFunction,
        options.debounce
      );
    } else if (options.throttle) {
      emitFunction = globalPerformanceOptimizer.createThrottledFunction(
        emitFunction,
        options.throttle
      );
    }

    // 性能监控
    if (options.enablePerformanceMonitoring !== false) {
      emitFunction = globalPerformanceOptimizer.monitorFunction(emitFunction, 'event');
    }

    await emitFunction(event);

    const duration = performance.now() - startTime;
    return {
      success: true,
      data: event.id,
      timestamp: new Date().toISOString(),
      duration,
      metadata: { eventId: event.id }
    };

  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * 监听事件（增强版）
 */
export function listenToEvent<T = any>(
  eventType: string,
  handler: (data: T, event: BaseEvent) => void | Promise<void>,
  options: EventOptions = {}
): () => void {
  let wrappedHandler = handler;

  // 应用防抖或节流
  if (options.debounce) {
    wrappedHandler = globalPerformanceOptimizer.createDebouncedFunction(
      handler,
      options.debounce
    );
  } else if (options.throttle) {
    wrappedHandler = globalPerformanceOptimizer.createThrottledFunction(
      handler,
      options.throttle
    );
  }

  // 性能监控
  if (options.enablePerformanceMonitoring !== false) {
    wrappedHandler = globalPerformanceOptimizer.monitorFunction(wrappedHandler, 'event');
  }

  return globalEventBus.on(eventType, (event: BaseEvent) => {
    wrappedHandler(event.data, event);
  });
}

/**
 * 请求-响应模式
 */
export async function requestResponse<TRequest = any, TResponse = any>(
  requestType: string,
  responseType: string,
  data: TRequest,
  options: EventOptions = {}
): Promise<CommunicationResult<TResponse>> {
  const timeout = options.timeout || 5000;
  const requestId = generateId();

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve({
        success: false,
        error: 'Request timeout',
        timestamp: new Date().toISOString(),
        duration: timeout
      });
    }, timeout);

    const cleanup = globalEventBus.on(responseType, (event: BaseEvent) => {
      if (event.data?.requestId === requestId) {
        clearTimeout(timer);
        cleanup();
        resolve({
          success: true,
          data: event.data.response,
          timestamp: new Date().toISOString(),
          duration: performance.now() - startTime
        });
      }
    });

    const startTime = performance.now();
    sendEvent(requestType, { ...data, requestId }, options);
  });
}

// ==================== 状态管理工具 ====================

/**
 * 更新状态（增强版）
 */
export async function updateState<T = Partial<GlobalState>>(
  updates: T,
  options: StateOptions = {}
): Promise<CommunicationResult> {
  const startTime = performance.now();

  try {
    // 创建快照
    if (options.createSnapshot) {
      globalStateManager.createSnapshot('Before update via communication-utils');
    }

    // 冲突检测
    if (options.enableConflictDetection) {
      const currentState = globalStateManager.getState();
      // 这里可以添加更复杂的冲突检测逻辑
    }

    // 执行更新
    if (options.merge) {
      const currentState = globalStateManager.getState();
      const mergedUpdates = deepMerge(currentState, updates);
      globalStateManager.setState(mergedUpdates);
    } else {
      globalStateManager.setState(updates);
    }

    // 同步到其他应用
    if (options.syncTargets && options.syncTargets.length > 0) {
      for (const path of Object.keys(updates)) {
        try {
          await globalDataSynchronizer.syncData(path, 'push');
        } catch (error) {
          console.warn(`[CommunicationUtils] Failed to sync ${path}:`, error);
        }
      }
    }

    const duration = performance.now() - startTime;
    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * 监听状态变化（增强版）
 */
export function watchState<T = any>(
  path: string,
  handler: (newValue: T, oldValue: T, fullState: GlobalState) => void,
  options: StateOptions = {}
): () => void {
  let previousValue = getStateByPath(globalStateManager.getState(), path);

  let wrappedHandler = handler;

  // 应用防抖或节流
  if (options.debounce) {
    wrappedHandler = globalPerformanceOptimizer.createDebouncedFunction(
      handler,
      options.debounce
    );
  } else if (options.throttle) {
    wrappedHandler = globalPerformanceOptimizer.createThrottledFunction(
      handler,
      options.throttle
    );
  }

  return globalStateManager.subscribe((state) => {
    const currentValue = getStateByPath(state, path);
    
    if (!isEqual(currentValue, previousValue)) {
      wrappedHandler(currentValue, previousValue, state);
      previousValue = currentValue;
    }
  });
}

/**
 * 批量状态更新
 */
export function createStateBatcher(
  flushInterval: number = 100,
  maxBatchSize: number = 10
) {
  return globalPerformanceOptimizer.createBatchProcessor('state-updates', {
    batchSize: maxBatchSize,
    flushInterval,
    maxWaitTime: 500,
    processor: async (updates: any[]) => {
      const mergedUpdates = updates.reduce((acc, update) => {
        return deepMerge(acc, update);
      }, {});
      
      await updateState(mergedUpdates);
    }
  });
}

// ==================== 通知工具 ====================

/**
 * 发送通知（便捷函数）
 */
export async function notify(
  title: string,
  message: string,
  type: NotificationType = 'info',
  priority: NotificationPriority = 'normal',
  options: CommunicationOptions = {}
): Promise<CommunicationResult<string>> {
  const startTime = performance.now();

  try {
    const notificationId = await globalNotificationService.sendNotification({
      title,
      message,
      type,
      priority,
      persistent: options.persistent,
      metadata: {
        source: 'communication-utils'
      }
    });

    const duration = performance.now() - startTime;
    return {
      success: true,
      data: notificationId,
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * 订阅通知
 */
export function subscribeToNotifications(
  types: NotificationType[],
  handler: (notification: any) => void,
  options: { appId?: string; userId?: string } = {}
): () => void {
  return globalNotificationService.subscribe(types, handler, options);
}

// ==================== 消息队列工具 ====================

/**
 * 发送队列消息
 */
export async function sendQueueMessage<T = any>(
  type: string,
  data: T,
  options: MessageOptions = {}
): Promise<CommunicationResult<string>> {
  const startTime = performance.now();

  try {
    const messageId = await defaultMessageQueue.enqueue({
      type,
      data,
      priority: options.priority || 'normal',
      target: options.target,
      expiresAt: options.expiresAt,
      maxRetries: options.retries || 3,
      source: 'communication-utils',
      metadata: options.metadata
    });

    const duration = performance.now() - startTime;
    return {
      success: true,
      data: messageId,
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * 注册消息处理器
 */
export function registerMessageHandler<T = any>(
  messageType: string,
  handler: (data: T, message: any) => Promise<void> | void
): () => void {
  return defaultMessageQueue.registerProcessor(messageType, async (message) => {
    await handler(message.data, message);
  });
}

// ==================== WebSocket工具 ====================

/**
 * 创建WebSocket连接
 */
export async function createWebSocketConnection(
  url: string,
  options: CommunicationOptions = {}
): Promise<CommunicationResult<string>> {
  const startTime = performance.now();

  try {
    const connectionId = await globalWebSocketManager.createConnection({
      url,
      enableAutoReconnect: true,
      enableHeartbeat: true,
      connectionTimeout: options.timeout || 10000
    });

    const duration = performance.now() - startTime;
    return {
      success: true,
      data: connectionId,
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

/**
 * 发送WebSocket消息
 */
export function sendWebSocketMessage<T = any>(
  connectionId: string,
  type: string,
  data: T,
  options: MessageOptions = {}
): CommunicationResult<boolean> {
  const startTime = performance.now();

  try {
    const success = globalWebSocketManager.sendMessage(connectionId, {
      type,
      data,
      priority: options.priority || 'normal',
      target: options.target,
      metadata: options.metadata
    });

    const duration = performance.now() - startTime;
    return {
      success,
      data: success,
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

// ==================== 数据同步工具 ====================

/**
 * 同步数据到其他应用
 */
export async function syncDataToApps<T = any>(
  path: string,
  data: T,
  targetApps: string[] = ['*'],
  options: CommunicationOptions = {}
): Promise<CommunicationResult> {
  const startTime = performance.now();

  try {
    // 更新本地状态
    const updates: any = {};
    setValueByPath(updates, path.split('.'), data);
    await updateState(updates, { syncTargets: [path] });

    // 检测冲突
    if (options.enableConflictDetection) {
      const conflict = globalConflictResolver.detectConflict(
        path,
        data,
        data, // 这里应该是远程数据，简化处理
        {
          localSource: 'local',
          remoteSource: 'remote'
        }
      );

      if (conflict) {
        console.warn('[CommunicationUtils] Conflict detected during sync:', conflict);
      }
    }

    const duration = performance.now() - startTime;
    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration
    };

  } catch (error) {
    const duration = performance.now() - startTime;
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
      duration
    };
  }
}

// ==================== 工具函数 ====================

/**
 * 深度合并对象
 */
function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || typeof source !== 'object') {
    return source;
  }

  const result = { ...target };

  Object.keys(source).forEach(key => {
    if (typeof source[key] === 'object' && source[key] !== null) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  });

  return result;
}

/**
 * 根据路径获取状态值
 */
function getStateByPath(state: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], state);
}

/**
 * 根据路径设置值
 */
function setValueByPath(obj: any, pathArray: string[], value: any): void {
  const lastKey = pathArray.pop()!;
  const target = pathArray.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * 比较两个值是否相等
 */
function isEqual(value1: any, value2: any): boolean {
  if (value1 === value2) {
    return true;
  }

  if (typeof value1 !== typeof value2) {
    return false;
  }

  if (typeof value1 === 'object' && value1 !== null && value2 !== null) {
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!keys2.includes(key) || !isEqual(value1[key], value2[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== 通信模式工具 ====================

/**
 * 发布-订阅模式
 */
export class PubSub<T = any> {
  private subscribers: Map<string, Set<(data: T) => void>> = new Map();

  subscribe(topic: string, handler: (data: T) => void): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    
    this.subscribers.get(topic)!.add(handler);
    
    return () => {
      this.subscribers.get(topic)?.delete(handler);
    };
  }

  publish(topic: string, data: T): void {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('[PubSub] Handler error:', error);
        }
      });
    }
  }

  clear(topic?: string): void {
    if (topic) {
      this.subscribers.delete(topic);
    } else {
      this.subscribers.clear();
    }
  }
}

/**
 * 命令模式
 */
export interface Command<T = any> {
  execute(data: T): Promise<any> | any;
  undo?(data: T): Promise<any> | any;
  canExecute?(data: T): boolean;
}

export class CommandBus {
  private commands: Map<string, Command> = new Map();
  private history: Array<{ command: string; data: any; timestamp: string }> = [];

  register(name: string, command: Command): void {
    this.commands.set(name, command);
  }

  async execute<T = any>(commandName: string, data: T): Promise<any> {
    const command = this.commands.get(commandName);
    if (!command) {
      throw new Error(`Command not found: ${commandName}`);
    }

    if (command.canExecute && !command.canExecute(data)) {
      throw new Error(`Command cannot be executed: ${commandName}`);
    }

    const result = await command.execute(data);
    
    this.history.push({
      command: commandName,
      data,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  getHistory(): Array<{ command: string; data: any; timestamp: string }> {
    return [...this.history];
  }
}

// ==================== 导出便捷实例 ====================

export const globalPubSub = new PubSub();
export const globalCommandBus = new CommandBus();

// ==================== 通信健康检查 ====================

export interface CommunicationHealth {
  eventBus: boolean;
  stateManager: boolean;
  notifications: boolean;
  webSocket: boolean;
  messageQueue: boolean;
  dataSync: boolean;
  overall: boolean;
  timestamp: string;
}

/**
 * 检查通信系统健康状态
 */
export async function checkCommunicationHealth(): Promise<CommunicationHealth> {
  const health: CommunicationHealth = {
    eventBus: false,
    stateManager: false,
    notifications: false,
    webSocket: false,
    messageQueue: false,
    dataSync: false,
    overall: false,
    timestamp: new Date().toISOString()
  };

  try {
    // 检查事件总线
    const testEvent: BaseEvent = {
      type: 'HEALTH_CHECK',
      source: 'communication-utils',
      timestamp: new Date().toISOString(),
      id: generateId(),
      data: { test: true }
    };
    
    globalEventBus.emit(testEvent);
    health.eventBus = true;
  } catch (error) {
    console.error('[HealthCheck] EventBus failed:', error);
  }

  try {
    // 检查状态管理器
    const currentState = globalStateManager.getState();
    health.stateManager = currentState !== null && currentState !== undefined;
  } catch (error) {
    console.error('[HealthCheck] StateManager failed:', error);
  }

  try {
    // 检查通知服务
    const stats = globalNotificationService.getStats();
    health.notifications = stats !== null;
  } catch (error) {
    console.error('[HealthCheck] NotificationService failed:', error);
  }

  try {
    // 检查WebSocket管理器
    const wsStats = globalWebSocketManager.getStats();
    health.webSocket = wsStats !== null;
  } catch (error) {
    console.error('[HealthCheck] WebSocketManager failed:', error);
  }

  try {
    // 检查消息队列
    const queueStats = defaultMessageQueue.getStats();
    health.messageQueue = queueStats !== null;
  } catch (error) {
    console.error('[HealthCheck] MessageQueue failed:', error);
  }

  try {
    // 检查数据同步
    const syncStats = globalDataSynchronizer.getStats();
    health.dataSync = syncStats !== null;
  } catch (error) {
    console.error('[HealthCheck] DataSynchronizer failed:', error);
  }

  // 计算整体健康状态
  const healthValues = [
    health.eventBus,
    health.stateManager,
    health.notifications,
    health.webSocket,
    health.messageQueue,
    health.dataSync
  ];
  
  const healthyCount = healthValues.filter(Boolean).length;
  health.overall = healthyCount >= healthValues.length * 0.8; // 80%以上组件健康

  return health;
}