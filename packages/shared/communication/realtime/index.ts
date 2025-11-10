/**
 * 实时通信系统统一导出
 * 提供WebSocket管理、实时通知、消息队列的统一接口
 */

// WebSocket管理器
export {
  WebSocketConnection,
  WebSocketManager,
  globalWebSocketManager,
  createWebSocketConnection,
  sendWebSocketMessage,
  broadcastWebSocketMessage
} from './websocket-manager';

export type {
  WebSocketConfig,
  WebSocketMessage,
  ConnectionInfo,
  WebSocketStats,
  WebSocketEventType,
  WebSocketEventHandler
} from './websocket-manager';

// 实时通知服务
export {
  NotificationService,
  globalNotificationService,
  notify,
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  subscribeToNotifications,
  createNotificationFilter
} from './notification-service';

export type {
  NotificationConfig,
  NotificationAction,
  NotificationType,
  NotificationPriority,
  NotificationSubscription,
  NotificationChannel,
  NotificationStats,
  NotificationHandler,
  NotificationFilter
} from './notification-service';

// 消息队列管理
export {
  MessageQueue,
  MessageQueueManager,
  globalMessageQueueManager,
  defaultMessageQueue,
  sendMessage,
  registerMessageProcessor,
  createMessageFilter
} from './message-queue';

export type {
  QueueMessage,
  QueueConfig,
  RetryPolicy,
  QueueStats,
  OfflineStorage,
  MessagePriority,
  MessageProcessor,
  MessageFilter
} from './message-queue';

// 工具函数
export const RealtimeUtils = {
  /**
   * 初始化实时通信系统
   */
  initialize: (options?: {
    enableWebSocket?: boolean;
    enableNotifications?: boolean;
    enableMessageQueue?: boolean;
    webSocketUrl?: string;
  }) => {
    const { 
      enableWebSocket = true, 
      enableNotifications = true, 
      enableMessageQueue = true,
      webSocketUrl 
    } = options || {};

    console.log('[RealtimeUtils] Initializing realtime communication system...');

    // 初始化通知服务
    if (enableNotifications) {
      globalNotificationService.setEnabled(true);
      console.log('[RealtimeUtils] Notification service enabled');
    }

    // 初始化消息队列
    if (enableMessageQueue) {
      defaultMessageQueue.startAutoProcessing();
      console.log('[RealtimeUtils] Message queue enabled');
    }

    // 初始化WebSocket连接
    if (enableWebSocket && webSocketUrl) {
      createWebSocketConnection(webSocketUrl)
        .then(connectionId => {
          console.log(`[RealtimeUtils] WebSocket connection created: ${connectionId}`);
        })
        .catch(error => {
          console.error('[RealtimeUtils] Failed to create WebSocket connection:', error);
        });
    }

    console.log('[RealtimeUtils] Realtime communication system initialized');
  },

  /**
   * 获取实时通信统计
   */
  getStats: () => {
    return {
      webSocket: globalWebSocketManager.getStats(),
      notifications: globalNotificationService.getStats(),
      messageQueue: defaultMessageQueue.getStats(),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * 发送实时消息到所有连接
   */
  broadcast: async (type: string, data: any, options?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    persistent?: boolean;
  }) => {
    const { priority = 'normal', persistent = false } = options || {};

    // 通过WebSocket广播
    const wsCount = broadcastWebSocketMessage(type, data, { priority });

    // 通过通知系统广播
    await globalNotificationService.broadcastNotification(
      'Broadcast Message',
      `${type}: ${JSON.stringify(data)}`,
      priority as any
    );

    // 通过消息队列广播
    await sendMessage(type, data, { priority: priority as any });

    return {
      webSocketConnections: wsCount,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * 创建实时数据流
   */
  createDataStream: (streamId: string, options?: {
    bufferSize?: number;
    flushInterval?: number;
  }) => {
    const { bufferSize = 100, flushInterval = 1000 } = options || {};
    const buffer: any[] = [];
    let subscribers: Set<(data: any[]) => void> = new Set();
    let timer: NodeJS.Timeout | null = null;

    const flush = () => {
      if (buffer.length > 0) {
        const data = [...buffer];
        buffer.length = 0;
        subscribers.forEach(subscriber => {
          try {
            subscriber(data);
          } catch (error) {
            console.error(`[RealtimeUtils] Stream subscriber error:`, error);
          }
        });
      }
    };

    const startTimer = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(flush, flushInterval);
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    return {
      push: (data: any) => {
        buffer.push({
          ...data,
          streamId,
          timestamp: new Date().toISOString()
        });

        if (buffer.length >= bufferSize) {
          flush();
        }

        if (!timer && subscribers.size > 0) {
          startTimer();
        }
      },

      subscribe: (callback: (data: any[]) => void) => {
        subscribers.add(callback);
        
        if (subscribers.size === 1) {
          startTimer();
        }

        return () => {
          subscribers.delete(callback);
          if (subscribers.size === 0) {
            stopTimer();
          }
        };
      },

      flush,

      destroy: () => {
        stopTimer();
        subscribers.clear();
        buffer.length = 0;
      },

      getStats: () => ({
        streamId,
        bufferSize: buffer.length,
        subscriberCount: subscribers.size,
        isActive: timer !== null
      })
    };
  },

  /**
   * 创建心跳监控
   */
  createHeartbeat: (interval: number = 30000, timeout: number = 5000) => {
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let timeoutTimer: NodeJS.Timeout | null = null;
    let isAlive = true;
    let lastHeartbeat = Date.now();
    const observers: Set<(isAlive: boolean) => void> = new Set();

    const sendHeartbeat = () => {
      const heartbeatId = `heartbeat_${Date.now()}`;
      
      // 发送心跳消息
      sendMessage('HEARTBEAT', { id: heartbeatId, timestamp: Date.now() });

      // 设置超时检测
      timeoutTimer = setTimeout(() => {
        if (isAlive) {
          isAlive = false;
          observers.forEach(observer => observer(false));
          console.warn('[RealtimeUtils] Heartbeat timeout detected');
        }
      }, timeout);
    };

    const handleHeartbeatResponse = () => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }

      if (!isAlive) {
        isAlive = true;
        observers.forEach(observer => observer(true));
        console.log('[RealtimeUtils] Heartbeat restored');
      }

      lastHeartbeat = Date.now();
    };

    // 监听心跳响应
    const unsubscribe = registerMessageProcessor('HEARTBEAT_RESPONSE', () => {
      handleHeartbeatResponse();
    });

    return {
      start: () => {
        if (heartbeatTimer) return;
        
        heartbeatTimer = setInterval(sendHeartbeat, interval);
        sendHeartbeat(); // 立即发送一次
      },

      stop: () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
      },

      subscribe: (observer: (isAlive: boolean) => void) => {
        observers.add(observer);
        return () => observers.delete(observer);
      },

      getStatus: () => ({
        isAlive,
        lastHeartbeat: new Date(lastHeartbeat).toISOString(),
        timeSinceLastHeartbeat: Date.now() - lastHeartbeat
      }),

      destroy: () => {
        unsubscribe();
        observers.clear();
      }
    };
  }
};