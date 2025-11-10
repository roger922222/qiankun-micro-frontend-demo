/**
 * 实时通知服务 - 微前端实时消息推送系统
 * 提供实时通知推送、消息分发、订阅管理等功能
 */

import { BaseEvent } from '../../types/events';
import { globalEventBus } from '../event-bus';
import { globalWebSocketManager, WebSocketMessage } from './websocket-manager';
import { globalErrorManager } from '../error/error-manager';

// ==================== 类型定义 ====================

export interface NotificationConfig {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  persistent?: boolean;
  autoClose?: boolean;
  closeDelay?: number;
  actions?: NotificationAction[];
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: () => void | Promise<void>;
  style?: 'primary' | 'secondary' | 'danger';
}

export type NotificationType = 
  | 'info' | 'success' | 'warning' | 'error' 
  | 'system' | 'user' | 'app' | 'broadcast';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationSubscription {
  id: string;
  types: NotificationType[];
  appId?: string;
  userId?: string;
  handler: NotificationHandler;
  filter?: NotificationFilter;
  active: boolean;
  createdAt: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  type: 'websocket' | 'event-bus' | 'broadcast' | 'push';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface NotificationStats {
  totalSent: number;
  totalReceived: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  byChannel: Record<string, number>;
  averageDeliveryTime: number;
  failureRate: number;
  activeSubscriptions: number;
}

export type NotificationHandler = (notification: NotificationConfig) => void | Promise<void>;
export type NotificationFilter = (notification: NotificationConfig) => boolean;

// ==================== 通知服务实现 ====================

export class NotificationService {
  private subscriptions: Map<string, NotificationSubscription> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private notificationHistory: NotificationConfig[] = [];
  private stats: NotificationStats = {
    totalSent: 0,
    totalReceived: 0,
    byType: {} as Record<NotificationType, number>,
    byPriority: {} as Record<NotificationPriority, number>,
    byChannel: {},
    averageDeliveryTime: 0,
    failureRate: 0,
    activeSubscriptions: 0
  };
  private deliveryTimes: number[] = [];
  private maxHistorySize: number = 1000;
  private enabled: boolean = true;
  private observers: Set<(stats: NotificationStats) => void> = new Set();

  constructor() {
    this.initializeDefaultChannels();
    this.setupEventListeners();
    this.initializeStats();
  }

  /**
   * 发送通知
   */
  async sendNotification(config: Omit<NotificationConfig, 'id'>): Promise<string> {
    if (!this.enabled) {
      return '';
    }

    const notification: NotificationConfig = {
      id: this.generateId(),
      ...config
    };

    const startTime = performance.now();

    try {
      // 添加到历史记录
      this.addToHistory(notification);

      // 更新统计
      this.updateSendStats(notification);

      // 通过所有启用的通道发送
      const deliveryPromises = Array.from(this.channels.values())
        .filter(channel => channel.enabled)
        .map(channel => this.deliverThroughChannel(notification, channel));

      await Promise.allSettled(deliveryPromises);

      // 记录投递时间
      const deliveryTime = performance.now() - startTime;
      this.recordDeliveryTime(deliveryTime);

      return notification.id;

    } catch (error) {
      globalErrorManager.handleCustomError(
        `Failed to send notification: ${(error as Error).message}`,
        'system',
        'medium',
        { notificationId: notification.id }
      );
      throw error;
    }
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(
    title: string,
    message: string,
    priority: NotificationPriority = 'normal'
  ): Promise<string> {
    return this.sendNotification({
      title,
      message,
      type: 'system',
      priority,
      autoClose: priority !== 'urgent',
      closeDelay: priority === 'urgent' ? 0 : 5000
    });
  }

  /**
   * 发送用户通知
   */
  async sendUserNotification(
    userId: string,
    title: string,
    message: string,
    options?: Partial<NotificationConfig>
  ): Promise<string> {
    return this.sendNotification({
      title,
      message,
      type: 'user',
      priority: 'normal',
      metadata: { userId },
      ...options
    });
  }

  /**
   * 发送应用通知
   */
  async sendAppNotification(
    appId: string,
    title: string,
    message: string,
    options?: Partial<NotificationConfig>
  ): Promise<string> {
    return this.sendNotification({
      title,
      message,
      type: 'app',
      priority: 'normal',
      metadata: { appId },
      ...options
    });
  }

  /**
   * 广播通知
   */
  async broadcastNotification(
    title: string,
    message: string,
    priority: NotificationPriority = 'normal'
  ): Promise<string> {
    return this.sendNotification({
      title,
      message,
      type: 'broadcast',
      priority,
      persistent: priority === 'urgent'
    });
  }

  /**
   * 订阅通知
   */
  subscribe(
    types: NotificationType[],
    handler: NotificationHandler,
    options?: {
      appId?: string;
      userId?: string;
      filter?: NotificationFilter;
    }
  ): string {
    const subscription: NotificationSubscription = {
      id: this.generateId(),
      types,
      appId: options?.appId,
      userId: options?.userId,
      handler,
      filter: options?.filter,
      active: true,
      createdAt: new Date().toISOString()
    };

    this.subscriptions.set(subscription.id, subscription);
    this.updateSubscriptionStats();

    return subscription.id;
  }

  /**
   * 取消订阅
   */
  unsubscribe(subscriptionId: string): boolean {
    const success = this.subscriptions.delete(subscriptionId);
    if (success) {
      this.updateSubscriptionStats();
    }
    return success;
  }

  /**
   * 获取订阅列表
   */
  getSubscriptions(appId?: string, userId?: string): NotificationSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => {
      if (appId && sub.appId !== appId) return false;
      if (userId && sub.userId !== userId) return false;
      return true;
    });
  }

  /**
   * 添加通知通道
   */
  addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
  }

  /**
   * 移除通知通道
   */
  removeChannel(channelId: string): boolean {
    return this.channels.delete(channelId);
  }

  /**
   * 启用/禁用通道
   */
  setChannelEnabled(channelId: string, enabled: boolean): boolean {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * 获取通知历史
   */
  getNotificationHistory(limit?: number): NotificationConfig[] {
    const history = [...this.notificationHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * 清除通知历史
   */
  clearHistory(): void {
    this.notificationHistory = [];
  }

  /**
   * 获取统计信息
   */
  getStats(): NotificationStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 订阅统计更新
   */
  subscribeToStats(observer: (stats: NotificationStats) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 启用/禁用服务
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.enabled = false;
    this.subscriptions.clear();
    this.channels.clear();
    this.notificationHistory = [];
    this.observers.clear();
  }

  // ==================== 私有方法 ====================

  private initializeDefaultChannels(): void {
    // WebSocket通道
    this.addChannel({
      id: 'websocket',
      name: 'WebSocket Channel',
      description: 'Real-time notifications via WebSocket',
      type: 'websocket',
      enabled: true
    });

    // 事件总线通道
    this.addChannel({
      id: 'event-bus',
      name: 'Event Bus Channel',
      description: 'Notifications via internal event bus',
      type: 'event-bus',
      enabled: true
    });

    // 广播通道
    this.addChannel({
      id: 'broadcast',
      name: 'Broadcast Channel',
      description: 'Browser broadcast channel for cross-tab notifications',
      type: 'broadcast',
      enabled: typeof BroadcastChannel !== 'undefined'
    });
  }

  private setupEventListeners(): void {
    // 监听WebSocket消息
    globalWebSocketManager.subscribe((stats) => {
      // 可以根据WebSocket状态调整通知策略
    });

    // 监听事件总线事件
    globalEventBus.on('NOTIFICATION_REQUEST', (event: BaseEvent) => {
      if (event.data && event.data.notification) {
        this.sendNotification(event.data.notification);
      }
    });
  }

  private async deliverThroughChannel(
    notification: NotificationConfig,
    channel: NotificationChannel
  ): Promise<void> {
    try {
      switch (channel.type) {
        case 'websocket':
          await this.deliverViaWebSocket(notification);
          break;
        case 'event-bus':
          await this.deliverViaEventBus(notification);
          break;
        case 'broadcast':
          await this.deliverViaBroadcast(notification);
          break;
        default:
          console.warn(`[NotificationService] Unknown channel type: ${channel.type}`);
      }

      this.updateChannelStats(channel.id);

    } catch (error) {
      globalErrorManager.handleCustomError(
        `Failed to deliver notification via ${channel.type}: ${(error as Error).message}`,
        'system',
        'medium',
        { 
          notificationId: notification.id, 
          channelId: channel.id 
        }
      );
    }
  }

  private async deliverViaWebSocket(notification: NotificationConfig): Promise<void> {
    const message: WebSocketMessage = {
      id: this.generateId(),
      type: 'notification',
      data: notification,
      timestamp: new Date().toISOString(),
      source: 'notification-service'
    };

    const deliveredCount = globalWebSocketManager.broadcast(message);
    
    if (deliveredCount === 0) {
      console.warn('[NotificationService] No active WebSocket connections for notification delivery');
    }
  }

  private async deliverViaEventBus(notification: NotificationConfig): Promise<void> {
    const event: BaseEvent = {
      type: 'NOTIFICATION',
      source: 'notification-service',
      timestamp: new Date().toISOString(),
      id: this.generateId(),
      data: notification
    };

    globalEventBus.emit(event);
    
    // 分发给匹配的订阅者
    await this.distributeToSubscribers(notification);
  }

  private async deliverViaBroadcast(notification: NotificationConfig): Promise<void> {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    try {
      const channel = new BroadcastChannel('qiankun-notifications');
      channel.postMessage({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      });
      channel.close();
    } catch (error) {
      console.warn('[NotificationService] BroadcastChannel not available:', error);
    }
  }

  private async distributeToSubscribers(notification: NotificationConfig): Promise<void> {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => this.isSubscriptionMatch(sub, notification));

    const deliveryPromises = matchingSubscriptions.map(async (subscription) => {
      try {
        // 应用过滤器
        if (subscription.filter && !subscription.filter(notification)) {
          return;
        }

        await subscription.handler(notification);
        this.stats.totalReceived++;

      } catch (error) {
        globalErrorManager.handleCustomError(
          `Notification handler failed: ${(error as Error).message}`,
          'system',
          'low',
          { 
            notificationId: notification.id, 
            subscriptionId: subscription.id 
          }
        );
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  private isSubscriptionMatch(
    subscription: NotificationSubscription,
    notification: NotificationConfig
  ): boolean {
    if (!subscription.active) {
      return false;
    }

    // 检查通知类型
    if (!subscription.types.includes(notification.type)) {
      return false;
    }

    // 检查应用ID
    if (subscription.appId && notification.metadata?.appId !== subscription.appId) {
      return false;
    }

    // 检查用户ID
    if (subscription.userId && notification.metadata?.userId !== subscription.userId) {
      return false;
    }

    return true;
  }

  private addToHistory(notification: NotificationConfig): void {
    this.notificationHistory.push(notification);
    
    // 限制历史记录大小
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(-this.maxHistorySize);
    }
  }

  private updateSendStats(notification: NotificationConfig): void {
    this.stats.totalSent++;
    
    // 按类型统计
    this.stats.byType[notification.type] = (this.stats.byType[notification.type] || 0) + 1;
    
    // 按优先级统计
    this.stats.byPriority[notification.priority] = (this.stats.byPriority[notification.priority] || 0) + 1;
  }

  private updateChannelStats(channelId: string): void {
    this.stats.byChannel[channelId] = (this.stats.byChannel[channelId] || 0) + 1;
  }

  private updateSubscriptionStats(): void {
    this.stats.activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active).length;
  }

  private recordDeliveryTime(time: number): void {
    this.deliveryTimes.push(time);
    
    // 保持最近1000次的记录
    if (this.deliveryTimes.length > 1000) {
      this.deliveryTimes = this.deliveryTimes.slice(-1000);
    }
    
    // 更新平均投递时间
    this.stats.averageDeliveryTime = this.deliveryTimes.reduce((a, b) => a + b, 0) / this.deliveryTimes.length;
  }

  private updateStats(): void {
    this.updateSubscriptionStats();
    
    // 计算失败率
    const totalAttempts = this.stats.totalSent;
    const totalSuccesses = this.stats.totalReceived;
    this.stats.failureRate = totalAttempts > 0 ? (totalAttempts - totalSuccesses) / totalAttempts : 0;
  }

  private initializeStats(): void {
    const types: NotificationType[] = ['info', 'success', 'warning', 'error', 'system', 'user', 'app', 'broadcast'];
    const priorities: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];
    
    types.forEach(type => {
      this.stats.byType[type] = 0;
    });
    
    priorities.forEach(priority => {
      this.stats.byPriority[priority] = 0;
    });
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 单例实例 ====================

export const globalNotificationService = new NotificationService();

// ==================== 工具函数 ====================

/**
 * 发送快速通知
 */
export async function notify(
  title: string,
  message: string,
  type: NotificationType = 'info',
  priority: NotificationPriority = 'normal'
): Promise<string> {
  return globalNotificationService.sendNotification({
    title,
    message,
    type,
    priority
  });
}

/**
 * 发送成功通知
 */
export async function notifySuccess(title: string, message: string): Promise<string> {
  return notify(title, message, 'success', 'normal');
}

/**
 * 发送错误通知
 */
export async function notifyError(title: string, message: string): Promise<string> {
  return notify(title, message, 'error', 'high');
}

/**
 * 发送警告通知
 */
export async function notifyWarning(title: string, message: string): Promise<string> {
  return notify(title, message, 'warning', 'normal');
}

/**
 * 发送信息通知
 */
export async function notifyInfo(title: string, message: string): Promise<string> {
  return notify(title, message, 'info', 'normal');
}

/**
 * 订阅通知的便捷函数
 */
export function subscribeToNotifications(
  types: NotificationType[],
  handler: NotificationHandler,
  options?: {
    appId?: string;
    userId?: string;
    filter?: NotificationFilter;
  }
): () => void {
  const subscriptionId = globalNotificationService.subscribe(types, handler, options);
  return () => globalNotificationService.unsubscribe(subscriptionId);
}

/**
 * 创建通知过滤器
 */
export function createNotificationFilter(
  conditions: {
    minPriority?: NotificationPriority;
    excludeTypes?: NotificationType[];
    includeMetadata?: Record<string, any>;
  }
): NotificationFilter {
  const priorityOrder: Record<NotificationPriority, number> = {
    low: 0,
    normal: 1,
    high: 2,
    urgent: 3
  };

  return (notification: NotificationConfig) => {
    // 检查最小优先级
    if (conditions.minPriority) {
      const minLevel = priorityOrder[conditions.minPriority];
      const notificationLevel = priorityOrder[notification.priority];
      if (notificationLevel < minLevel) {
        return false;
      }
    }

    // 检查排除类型
    if (conditions.excludeTypes && conditions.excludeTypes.includes(notification.type)) {
      return false;
    }

    // 检查元数据匹配
    if (conditions.includeMetadata && notification.metadata) {
      for (const [key, value] of Object.entries(conditions.includeMetadata)) {
        if (notification.metadata[key] !== value) {
          return false;
        }
      }
    }

    return true;
  };
}