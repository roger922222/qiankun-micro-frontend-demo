/**
 * 消息队列管理器 - 微前端消息队列和离线消息处理
 * 提供消息队列管理、离线消息存储、消息重试、优先级处理等功能
 */

import { BaseEvent } from '../../types/events';
import { globalErrorManager } from '../error/error-manager';
import { globalNotificationService } from './notification-service';

// ==================== 类型定义 ====================

export interface QueueMessage {
  id: string;
  type: string;
  data: any;
  priority: MessagePriority;
  timestamp: string;
  expiresAt?: string;
  retryCount: number;
  maxRetries: number;
  source: string;
  target?: string;
  metadata?: Record<string, any>;
}

export interface QueueConfig {
  id: string;
  name: string;
  maxSize: number;
  processingMode: 'fifo' | 'lifo' | 'priority';
  autoProcess: boolean;
  processingInterval: number;
  retryPolicy: RetryPolicy;
  persistOffline: boolean;
  storageKey?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  retryCondition?: (message: QueueMessage, error: Error) => boolean;
}

export interface QueueStats {
  totalMessages: number;
  processedMessages: number;
  failedMessages: number;
  pendingMessages: number;
  averageProcessingTime: number;
  throughput: number;
  errorRate: number;
  queueSize: number;
  oldestMessage?: string;
}

export interface OfflineStorage {
  save(key: string, messages: QueueMessage[]): Promise<void>;
  load(key: string): Promise<QueueMessage[]>;
  clear(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
export type MessageProcessor = (message: QueueMessage) => Promise<any>;
export type MessageFilter = (message: QueueMessage) => boolean;

// ==================== 默认离线存储实现 ====================

class LocalStorageOfflineStorage implements OfflineStorage {
  async save(key: string, messages: QueueMessage[]): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.warn('[MessageQueue] Failed to save to localStorage:', error);
    }
  }

  async load(key: string): Promise<QueueMessage[]> {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('[MessageQueue] Failed to load from localStorage:', error);
      return [];
    }
  }

  async clear(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('[MessageQueue] Failed to clear localStorage:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(key) !== null;
  }
}

// ==================== 消息队列实现 ====================

export class MessageQueue {
  private messages: QueueMessage[] = [];
  private processors: Map<string, MessageProcessor> = new Map();
  private filters: MessageFilter[] = [];
  private config: QueueConfig;
  private stats: QueueStats = {
    totalMessages: 0,
    processedMessages: 0,
    failedMessages: 0,
    pendingMessages: 0,
    averageProcessingTime: 0,
    throughput: 0,
    errorRate: 0,
    queueSize: 0
  };
  private processingTimer: NodeJS.Timeout | null = null;
  private processingTimes: number[] = [];
  private isProcessing: boolean = false;
  private offlineStorage: OfflineStorage;
  private observers: Set<(stats: QueueStats) => void> = new Set();

  constructor(config: QueueConfig, offlineStorage?: OfflineStorage) {
    this.config = config;
    this.offlineStorage = offlineStorage || new LocalStorageOfflineStorage();
    
    if (config.autoProcess) {
      this.startAutoProcessing();
    }

    // 如果启用离线持久化，加载离线消息
    if (config.persistOffline) {
      this.loadOfflineMessages();
    }
  }

  /**
   * 添加消息到队列
   */
  async enqueue(message: Omit<QueueMessage, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const queueMessage: QueueMessage = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
      ...message
    };

    // 检查队列大小限制
    if (this.messages.length >= this.config.maxSize) {
      // 移除最旧的消息
      const removed = this.messages.shift();
      if (removed) {
        console.warn(`[MessageQueue] Queue full, removed message: ${removed.id}`);
      }
    }

    // 应用过滤器
    for (const filter of this.filters) {
      if (!filter(queueMessage)) {
        console.log(`[MessageQueue] Message filtered out: ${queueMessage.id}`);
        return queueMessage.id;
      }
    }

    // 添加到队列
    this.addToQueue(queueMessage);
    
    // 更新统计
    this.stats.totalMessages++;
    this.updateStats();

    // 持久化到离线存储
    if (this.config.persistOffline) {
      await this.saveOfflineMessages();
    }

    // 通知观察者
    this.notifyObservers();

    return queueMessage.id;
  }

  /**
   * 处理队列中的消息
   */
  async processMessages(): Promise<void> {
    if (this.isProcessing || this.messages.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.messages.length > 0) {
        const message = this.getNextMessage();
        if (!message) {
          break;
        }

        await this.processMessage(message);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 注册消息处理器
   */
  registerProcessor(messageType: string, processor: MessageProcessor): () => void {
    this.processors.set(messageType, processor);
    return () => this.processors.delete(messageType);
  }

  /**
   * 添加消息过滤器
   */
  addFilter(filter: MessageFilter): () => void {
    this.filters.push(filter);
    return () => {
      const index = this.filters.indexOf(filter);
      if (index > -1) {
        this.filters.splice(index, 1);
      }
    };
  }

  /**
   * 获取队列中的消息
   */
  getMessages(filter?: MessageFilter): QueueMessage[] {
    let messages = [...this.messages];
    
    if (filter) {
      messages = messages.filter(filter);
    }
    
    return messages;
  }

  /**
   * 获取指定消息
   */
  getMessage(messageId: string): QueueMessage | undefined {
    return this.messages.find(msg => msg.id === messageId);
  }

  /**
   * 移除消息
   */
  removeMessage(messageId: string): boolean {
    const index = this.messages.findIndex(msg => msg.id === messageId);
    if (index > -1) {
      this.messages.splice(index, 1);
      this.updateStats();
      this.notifyObservers();
      return true;
    }
    return false;
  }

  /**
   * 清空队列
   */
  async clear(): Promise<void> {
    this.messages = [];
    this.updateStats();
    
    if (this.config.persistOffline) {
      await this.clearOfflineMessages();
    }
    
    this.notifyObservers();
  }

  /**
   * 重试失败的消息
   */
  async retryFailedMessages(): Promise<void> {
    const failedMessages = this.messages.filter(msg => 
      msg.retryCount > 0 && msg.retryCount < msg.maxRetries
    );

    for (const message of failedMessages) {
      await this.processMessage(message);
    }
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 订阅统计更新
   */
  subscribe(observer: (stats: QueueStats) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 启动自动处理
   */
  startAutoProcessing(): void {
    if (this.processingTimer) {
      return;
    }

    this.processingTimer = setInterval(() => {
      this.processMessages();
    }, this.config.processingInterval);
  }

  /**
   * 停止自动处理
   */
  stopAutoProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * 销毁队列
   */
  async destroy(): Promise<void> {
    this.stopAutoProcessing();
    
    if (this.config.persistOffline) {
      await this.saveOfflineMessages();
    }
    
    this.messages = [];
    this.processors.clear();
    this.filters = [];
    this.observers.clear();
  }

  // ==================== 私有方法 ====================

  private addToQueue(message: QueueMessage): void {
    switch (this.config.processingMode) {
      case 'fifo':
        this.messages.push(message);
        break;
      case 'lifo':
        this.messages.unshift(message);
        break;
      case 'priority':
        this.insertByPriority(message);
        break;
    }
  }

  private insertByPriority(message: QueueMessage): void {
    const priorityOrder: Record<MessagePriority, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1
    };

    const messagePriority = priorityOrder[message.priority];
    let insertIndex = this.messages.length;

    for (let i = 0; i < this.messages.length; i++) {
      const existingPriority = priorityOrder[this.messages[i].priority];
      if (messagePriority > existingPriority) {
        insertIndex = i;
        break;
      }
    }

    this.messages.splice(insertIndex, 0, message);
  }

  private getNextMessage(): QueueMessage | undefined {
    // 检查过期消息
    this.removeExpiredMessages();
    
    return this.messages.shift();
  }

  private removeExpiredMessages(): void {
    const now = new Date();
    this.messages = this.messages.filter(message => {
      if (message.expiresAt) {
        const expiresAt = new Date(message.expiresAt);
        if (now > expiresAt) {
          console.log(`[MessageQueue] Message expired: ${message.id}`);
          return false;
        }
      }
      return true;
    });
  }

  private async processMessage(message: QueueMessage): Promise<void> {
    const startTime = performance.now();

    try {
      const processor = this.processors.get(message.type);
      
      if (!processor) {
        throw new Error(`No processor found for message type: ${message.type}`);
      }

      await processor(message);
      
      // 处理成功
      this.stats.processedMessages++;
      const processingTime = performance.now() - startTime;
      this.recordProcessingTime(processingTime);

      // 移除已处理的消息
      this.removeMessage(message.id);

    } catch (error) {
      await this.handleProcessingError(message, error as Error);
    }
  }

  private async handleProcessingError(message: QueueMessage, error: Error): Promise<void> {
    message.retryCount++;
    this.stats.failedMessages++;

    // 检查重试策略
    const retryPolicy = this.config.retryPolicy;
    
    if (message.retryCount >= message.maxRetries) {
      // 超过最大重试次数，移除消息
      this.removeMessage(message.id);
      
      globalErrorManager.handleCustomError(
        `Message processing failed after ${message.retryCount} retries: ${error.message}`,
        'system',
        'medium',
        { messageId: message.id, messageType: message.type }
      );

      // 发送失败通知
      await globalNotificationService.sendSystemNotification(
        'Message Processing Failed',
        `Message ${message.id} failed after ${message.retryCount} retries`,
        'normal'
      );

      return;
    }

    // 检查重试条件
    if (retryPolicy.retryCondition && !retryPolicy.retryCondition(message, error)) {
      this.removeMessage(message.id);
      return;
    }

    // 计算重试延迟
    const delay = Math.min(
      retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, message.retryCount - 1),
      retryPolicy.maxDelay
    );

    // 延迟重试
    setTimeout(async () => {
      await this.processMessage(message);
    }, delay);

    console.warn(`[MessageQueue] Message processing failed, retrying in ${delay}ms:`, {
      messageId: message.id,
      retryCount: message.retryCount,
      error: error.message
    });
  }

  private recordProcessingTime(time: number): void {
    this.processingTimes.push(time);
    
    // 保持最近1000次的记录
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000);
    }
    
    // 更新平均处理时间
    this.stats.averageProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  private updateStats(): void {
    this.stats.pendingMessages = this.messages.length;
    this.stats.queueSize = this.messages.length;
    
    // 计算错误率
    const totalProcessed = this.stats.processedMessages + this.stats.failedMessages;
    this.stats.errorRate = totalProcessed > 0 ? this.stats.failedMessages / totalProcessed : 0;
    
    // 计算吞吐量 (每秒处理的消息数)
    if (this.processingTimes.length > 0) {
      const totalTime = this.processingTimes.reduce((a, b) => a + b, 0) / 1000; // 转换为秒
      this.stats.throughput = this.processingTimes.length / totalTime;
    }
    
    // 最旧消息时间
    if (this.messages.length > 0) {
      this.stats.oldestMessage = this.messages[this.messages.length - 1].timestamp;
    }
  }

  private async loadOfflineMessages(): Promise<void> {
    if (!this.config.storageKey) {
      return;
    }

    try {
      const offlineMessages = await this.offlineStorage.load(this.config.storageKey);
      
      // 检查消息是否过期
      const now = new Date();
      const validMessages = offlineMessages.filter(message => {
        if (message.expiresAt) {
          return new Date(message.expiresAt) > now;
        }
        return true;
      });

      this.messages = validMessages;
      this.updateStats();
      
      console.log(`[MessageQueue] Loaded ${validMessages.length} offline messages`);

    } catch (error) {
      globalErrorManager.handleCustomError(
        `Failed to load offline messages: ${(error as Error).message}`,
        'system',
        'low'
      );
    }
  }

  private async saveOfflineMessages(): Promise<void> {
    if (!this.config.storageKey) {
      return;
    }

    try {
      await this.offlineStorage.save(this.config.storageKey, this.messages);
    } catch (error) {
      globalErrorManager.handleCustomError(
        `Failed to save offline messages: ${(error as Error).message}`,
        'system',
        'low'
      );
    }
  }

  private async clearOfflineMessages(): Promise<void> {
    if (!this.config.storageKey) {
      return;
    }

    try {
      await this.offlineStorage.clear(this.config.storageKey);
    } catch (error) {
      console.warn('[MessageQueue] Failed to clear offline messages:', error);
    }
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer(this.getStats());
      } catch (error) {
        console.error('[MessageQueue] Error notifying observer:', error);
      }
    });
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 消息队列管理器 ====================

export class MessageQueueManager {
  private queues: Map<string, MessageQueue> = new Map();
  private globalStats: {
    totalQueues: number;
    totalMessages: number;
    totalProcessed: number;
    totalFailed: number;
  } = {
    totalQueues: 0,
    totalMessages: 0,
    totalProcessed: 0,
    totalFailed: 0
  };

  /**
   * 创建消息队列
   */
  createQueue(config: QueueConfig, offlineStorage?: OfflineStorage): string {
    const queue = new MessageQueue(config, offlineStorage);
    this.queues.set(config.id, queue);
    this.globalStats.totalQueues++;
    
    // 订阅队列统计更新
    queue.subscribe((stats) => {
      this.updateGlobalStats();
    });

    return config.id;
  }

  /**
   * 获取消息队列
   */
  getQueue(queueId: string): MessageQueue | undefined {
    return this.queues.get(queueId);
  }

  /**
   * 删除消息队列
   */
  async removeQueue(queueId: string): Promise<boolean> {
    const queue = this.queues.get(queueId);
    if (queue) {
      await queue.destroy();
      this.queues.delete(queueId);
      this.globalStats.totalQueues--;
      this.updateGlobalStats();
      return true;
    }
    return false;
  }

  /**
   * 获取所有队列
   */
  getAllQueues(): Map<string, MessageQueue> {
    return new Map(this.queues);
  }

  /**
   * 获取全局统计
   */
  getGlobalStats(): typeof this.globalStats {
    this.updateGlobalStats();
    return { ...this.globalStats };
  }

  /**
   * 销毁所有队列
   */
  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.queues.values()).map(queue => queue.destroy());
    await Promise.all(destroyPromises);
    
    this.queues.clear();
    this.globalStats = {
      totalQueues: 0,
      totalMessages: 0,
      totalProcessed: 0,
      totalFailed: 0
    };
  }

  // ==================== 私有方法 ====================

  private updateGlobalStats(): void {
    let totalMessages = 0;
    let totalProcessed = 0;
    let totalFailed = 0;

    this.queues.forEach(queue => {
      const stats = queue.getStats();
      totalMessages += stats.totalMessages;
      totalProcessed += stats.processedMessages;
      totalFailed += stats.failedMessages;
    });

    this.globalStats.totalMessages = totalMessages;
    this.globalStats.totalProcessed = totalProcessed;
    this.globalStats.totalFailed = totalFailed;
  }
}

// ==================== 单例实例 ====================

export const globalMessageQueueManager = new MessageQueueManager();

// 创建默认队列
export const defaultMessageQueue = (() => {
  const queueId = globalMessageQueueManager.createQueue({
    id: 'default',
    name: 'Default Message Queue',
    maxSize: 1000,
    processingMode: 'priority',
    autoProcess: true,
    processingInterval: 1000,
    retryPolicy: {
      maxRetries: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000
    },
    persistOffline: true,
    storageKey: 'qiankun-default-queue'
  });
  
  return globalMessageQueueManager.getQueue(queueId)!;
})();

// ==================== 工具函数 ====================

/**
 * 发送消息到默认队列
 */
export async function sendMessage(
  type: string,
  data: any,
  options?: {
    priority?: MessagePriority;
    target?: string;
    expiresAt?: string;
    maxRetries?: number;
    metadata?: Record<string, any>;
  }
): Promise<string> {
  return defaultMessageQueue.enqueue({
    type,
    data,
    priority: options?.priority || 'normal',
    target: options?.target,
    expiresAt: options?.expiresAt,
    maxRetries: options?.maxRetries || 3,
    source: 'message-queue-utils',
    metadata: options?.metadata
  });
}

/**
 * 注册消息处理器到默认队列
 */
export function registerMessageProcessor(
  messageType: string,
  processor: MessageProcessor
): () => void {
  return defaultMessageQueue.registerProcessor(messageType, processor);
}

/**
 * 创建消息过滤器
 */
export function createMessageFilter(
  conditions: {
    types?: string[];
    priorities?: MessagePriority[];
    sources?: string[];
    maxAge?: number; // 毫秒
  }
): MessageFilter {
  return (message: QueueMessage) => {
    // 检查消息类型
    if (conditions.types && !conditions.types.includes(message.type)) {
      return false;
    }

    // 检查优先级
    if (conditions.priorities && !conditions.priorities.includes(message.priority)) {
      return false;
    }

    // 检查来源
    if (conditions.sources && !conditions.sources.includes(message.source)) {
      return false;
    }

    // 检查消息年龄
    if (conditions.maxAge) {
      const messageAge = Date.now() - new Date(message.timestamp).getTime();
      if (messageAge > conditions.maxAge) {
        return false;
      }
    }

    return true;
  };
}