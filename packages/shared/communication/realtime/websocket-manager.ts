/**
 * WebSocket通信管理器 - 微前端实时通信核心
 * 提供WebSocket连接管理、自动重连、心跳检测、连接池管理等功能
 */

import { BaseEvent } from '../../types/events';
import { globalErrorManager } from '../error/error-manager';

// ==================== 类型定义 ====================

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  connectionTimeout?: number;
  enableAutoReconnect?: boolean;
  enableHeartbeat?: boolean;
  enableConnectionPool?: boolean;
  maxConnections?: number;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  source?: string;
  target?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface ConnectionInfo {
  id: string;
  url: string;
  state: WebSocket['readyState'];
  connectTime: string;
  lastHeartbeat?: string;
  reconnectCount: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  reconnectAttempts: number;
  errors: number;
  uptime: number;
}

export type WebSocketEventType = 
  | 'open' | 'close' | 'error' | 'message' 
  | 'reconnect' | 'heartbeat' | 'timeout';

export type WebSocketEventHandler = (event: any, connection?: ConnectionInfo) => void;

// ==================== WebSocket连接管理器 ====================

export class WebSocketConnection {
  private socket: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private connectionTimeoutTimer: NodeJS.Timeout | null = null;
  private reconnectCount: number = 0;
  private isReconnecting: boolean = false;
  private isDestroyed: boolean = false;
  private lastHeartbeat: number = 0;
  private messageQueue: WebSocketMessage[] = [];
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private stats: {
    connectTime: number;
    messageCount: number;
    errorCount: number;
    lastMessageTime: number;
    latencyHistory: number[];
  } = {
    connectTime: 0,
    messageCount: 0,
    errorCount: 0,
    lastMessageTime: 0,
    latencyHistory: []
  };

  public readonly id: string;
  public readonly url: string;

  constructor(config: WebSocketConfig) {
    this.id = this.generateId();
    this.url = config.url;
    this.config = {
      url: config.url,
      protocols: config.protocols || [],
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      heartbeatTimeout: config.heartbeatTimeout || 5000,
      connectionTimeout: config.connectionTimeout || 10000,
      enableAutoReconnect: config.enableAutoReconnect ?? true,
      enableHeartbeat: config.enableHeartbeat ?? true,
      enableConnectionPool: config.enableConnectionPool ?? false,
      maxConnections: config.maxConnections || 5
    };

    this.initializeEventHandlers();
  }

  /**
   * 建立WebSocket连接
   */
  async connect(): Promise<boolean> {
    if (this.isDestroyed) {
      throw new Error('Connection has been destroyed');
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return true;
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.config.url, this.config.protocols);
        this.stats.connectTime = Date.now();

        // 设置连接超时
        this.connectionTimeoutTimer = setTimeout(() => {
          if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
            this.socket.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.connectionTimeout);

        this.socket.onopen = (event) => {
          this.clearConnectionTimeout();
          this.reconnectCount = 0;
          this.isReconnecting = false;
          
          this.emit('open', event);
          
          // 启动心跳
          if (this.config.enableHeartbeat) {
            this.startHeartbeat();
          }

          // 发送队列中的消息
          this.flushMessageQueue();

          resolve(true);
        };

        this.socket.onclose = (event) => {
          this.clearTimers();
          this.emit('close', event);
          
          if (!this.isDestroyed && this.config.enableAutoReconnect && !event.wasClean) {
            this.scheduleReconnect();
          }
        };

        this.socket.onerror = (event) => {
          this.stats.errorCount++;
          this.emit('error', event);
          
          globalErrorManager.handleNetworkError(
            new Error('WebSocket connection error'),
            this.config.url,
            'WebSocket',
            { connectionId: this.id }
          );

          reject(event);
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

      } catch (error) {
        globalErrorManager.handleNetworkError(
          error as Error,
          this.config.url,
          'WebSocket',
          { connectionId: this.id }
        );
        reject(error);
      }
    });
  }

  /**
   * 发送消息
   */
  send(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean {
    const fullMessage: WebSocketMessage = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...message
    };

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // 连接未就绪，加入队列
      this.messageQueue.push(fullMessage);
      return false;
    }

    try {
      this.socket.send(JSON.stringify(fullMessage));
      this.stats.messageCount++;
      this.stats.lastMessageTime = Date.now();
      return true;
    } catch (error) {
      globalErrorManager.handleNetworkError(
        error as Error,
        this.config.url,
        'WebSocket-Send',
        { connectionId: this.id, messageId: fullMessage.id }
      );
      return false;
    }
  }

  /**
   * 关闭连接
   */
  close(code?: number, reason?: string): void {
    this.isDestroyed = true;
    this.clearTimers();
    
    if (this.socket) {
      this.socket.close(code, reason);
      this.socket = null;
    }
    
    this.messageQueue = [];
  }

  /**
   * 获取连接信息
   */
  getConnectionInfo(): ConnectionInfo {
    return {
      id: this.id,
      url: this.config.url,
      state: this.socket?.readyState ?? WebSocket.CLOSED,
      connectTime: new Date(this.stats.connectTime).toISOString(),
      lastHeartbeat: this.lastHeartbeat ? new Date(this.lastHeartbeat).toISOString() : undefined,
      reconnectCount: this.reconnectCount,
      isActive: this.socket?.readyState === WebSocket.OPEN,
      metadata: {
        messageCount: this.stats.messageCount,
        errorCount: this.stats.errorCount,
        queueSize: this.messageQueue.length
      }
    };
  }

  /**
   * 注册事件处理器
   */
  on(eventType: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);
    
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * 获取连接统计
   */
  getStats(): Partial<WebSocketStats> {
    const uptime = this.stats.connectTime ? Date.now() - this.stats.connectTime : 0;
    const averageLatency = this.stats.latencyHistory.length > 0 
      ? this.stats.latencyHistory.reduce((a, b) => a + b, 0) / this.stats.latencyHistory.length
      : 0;

    return {
      totalMessages: this.stats.messageCount,
      averageLatency,
      reconnectAttempts: this.reconnectCount,
      errors: this.stats.errorCount,
      uptime
    };
  }

  // ==================== 私有方法 ====================

  private initializeEventHandlers(): void {
    const eventTypes: WebSocketEventType[] = ['open', 'close', 'error', 'message', 'reconnect', 'heartbeat', 'timeout'];
    eventTypes.forEach(type => {
      this.eventHandlers.set(type, new Set());
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // 处理心跳响应
      if (message.type === 'pong') {
        this.handleHeartbeatResponse(message);
        return;
      }

      this.emit('message', { ...event, parsedData: message });
      
    } catch (error) {
      globalErrorManager.handleNetworkError(
        error as Error,
        this.config.url,
        'WebSocket-Parse',
        { connectionId: this.id, rawData: event.data }
      );
    }
  }

  private startHeartbeat(): void {
    if (!this.config.enableHeartbeat) return;

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  private sendHeartbeat(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const heartbeatMessage: WebSocketMessage = {
      id: this.generateId(),
      type: 'ping',
      data: { timestamp: Date.now() },
      timestamp: new Date().toISOString(),
      source: 'websocket-manager'
    };

    try {
      this.socket.send(JSON.stringify(heartbeatMessage));
      this.lastHeartbeat = Date.now();
      
      // 设置心跳超时
      this.heartbeatTimeoutTimer = setTimeout(() => {
        this.emit('timeout', { type: 'heartbeat' });
        if (this.config.enableAutoReconnect) {
          this.scheduleReconnect();
        }
      }, this.config.heartbeatTimeout);
      
    } catch (error) {
      globalErrorManager.handleNetworkError(
        error as Error,
        this.config.url,
        'WebSocket-Heartbeat',
        { connectionId: this.id }
      );
    }
  }

  private handleHeartbeatResponse(message: WebSocketMessage): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }

    // 计算延迟
    if (message.data?.timestamp) {
      const latency = Date.now() - message.data.timestamp;
      this.stats.latencyHistory.push(latency);
      
      // 保持最近100次的延迟记录
      if (this.stats.latencyHistory.length > 100) {
        this.stats.latencyHistory = this.stats.latencyHistory.slice(-100);
      }
    }

    this.emit('heartbeat', message);
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting || this.isDestroyed) {
      return;
    }

    if (this.reconnectCount >= this.config.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnect attempts reached'));
      return;
    }

    this.isReconnecting = true;
    this.reconnectCount++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectCount - 1),
      30000 // 最大30秒
    );

    this.reconnectTimer = setTimeout(async () => {
      try {
        this.emit('reconnect', { attempt: this.reconnectCount });
        await this.connect();
      } catch (error) {
        // 重连失败，继续尝试
        this.isReconnecting = false;
        this.scheduleReconnect();
      }
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      try {
        this.socket.send(JSON.stringify(message));
        this.stats.messageCount++;
      } catch (error) {
        // 发送失败，重新加入队列
        this.messageQueue.unshift(message);
        break;
      }
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
    
    this.clearConnectionTimeout();
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer);
      this.connectionTimeoutTimer = null;
    }
  }

  private emit(eventType: WebSocketEventType, data: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data, this.getConnectionInfo());
        } catch (error) {
          console.error(`[WebSocketConnection] Error in ${eventType} handler:`, error);
        }
      });
    }
  }

  private generateId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== WebSocket管理器 ====================

export class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private connectionPool: WebSocketConnection[] = [];
  private defaultConfig: Partial<WebSocketConfig> = {};
  private globalStats: WebSocketStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    reconnectAttempts: 0,
    errors: 0,
    uptime: 0
  };
  private startTime: number = Date.now();
  private observers: Set<(stats: WebSocketStats) => void> = new Set();
  private statsTimer: NodeJS.Timeout | null = null;

  constructor(defaultConfig?: Partial<WebSocketConfig>) {
    this.defaultConfig = defaultConfig || {};
    this.startStatsCollection();
  }

  /**
   * 创建WebSocket连接
   */
  async createConnection(config: WebSocketConfig): Promise<string> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const connection = new WebSocketConnection(fullConfig);

    this.connections.set(connection.id, connection);
    this.globalStats.totalConnections++;

    // 注册连接事件监听
    this.setupConnectionListeners(connection);

    try {
      await connection.connect();
      this.globalStats.activeConnections++;
      return connection.id;
    } catch (error) {
      this.connections.delete(connection.id);
      this.globalStats.totalConnections--;
      throw error;
    }
  }

  /**
   * 获取连接
   */
  getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * 发送消息到指定连接
   */
  sendMessage(connectionId: string, message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    const success = connection.send(message);
    if (success) {
      this.globalStats.totalMessages++;
    }
    return success;
  }

  /**
   * 广播消息到所有活跃连接
   */
  broadcast(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): number {
    let successCount = 0;
    
    this.connections.forEach(connection => {
      const info = connection.getConnectionInfo();
      if (info.isActive) {
        if (connection.send(message)) {
          successCount++;
          this.globalStats.totalMessages++;
        }
      }
    });

    return successCount;
  }

  /**
   * 关闭指定连接
   */
  closeConnection(connectionId: string, code?: number, reason?: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.close(code, reason);
    this.connections.delete(connectionId);
    this.updateActiveConnections();
    return true;
  }

  /**
   * 关闭所有连接
   */
  closeAllConnections(): void {
    this.connections.forEach(connection => {
      connection.close();
    });
    this.connections.clear();
    this.globalStats.activeConnections = 0;
  }

  /**
   * 获取所有连接信息
   */
  getAllConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values()).map(conn => conn.getConnectionInfo());
  }

  /**
   * 获取活跃连接
   */
  getActiveConnections(): ConnectionInfo[] {
    return this.getAllConnections().filter(info => info.isActive);
  }

  /**
   * 获取全局统计
   */
  getStats(): WebSocketStats {
    this.updateStats();
    return { ...this.globalStats };
  }

  /**
   * 订阅统计更新
   */
  subscribe(observer: (stats: WebSocketStats) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.closeAllConnections();
    
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
    
    this.observers.clear();
  }

  // ==================== 私有方法 ====================

  private setupConnectionListeners(connection: WebSocketConnection): void {
    connection.on('close', () => {
      this.updateActiveConnections();
    });

    connection.on('error', () => {
      this.globalStats.errors++;
    });

    connection.on('reconnect', () => {
      this.globalStats.reconnectAttempts++;
    });
  }

  private updateActiveConnections(): void {
    this.globalStats.activeConnections = this.getAllConnections()
      .filter(info => info.isActive).length;
  }

  private updateStats(): void {
    this.updateActiveConnections();
    this.globalStats.uptime = Date.now() - this.startTime;

    // 计算平均延迟
    const allConnections = Array.from(this.connections.values());
    const latencies: number[] = [];
    
    allConnections.forEach(connection => {
      const stats = connection.getStats();
      if (stats.averageLatency) {
        latencies.push(stats.averageLatency);
      }
    });

    this.globalStats.averageLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
  }

  private startStatsCollection(): void {
    this.statsTimer = setInterval(() => {
      this.updateStats();
      this.notifyObservers();
    }, 5000); // 每5秒更新一次统计
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => {
      try {
        observer(this.getStats());
      } catch (error) {
        console.error('[WebSocketManager] Error notifying observer:', error);
      }
    });
  }
}

// ==================== 单例实例 ====================

export const globalWebSocketManager = new WebSocketManager({
  enableAutoReconnect: true,
  enableHeartbeat: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000
});

// ==================== 工具函数 ====================

/**
 * 创建WebSocket连接的便捷函数
 */
export async function createWebSocketConnection(url: string, options?: Partial<WebSocketConfig>): Promise<string> {
  return globalWebSocketManager.createConnection({
    url,
    ...options
  });
}

/**
 * 发送WebSocket消息的便捷函数
 */
export function sendWebSocketMessage(
  connectionId: string, 
  type: string, 
  data: any, 
  options?: Partial<WebSocketMessage>
): boolean {
  return globalWebSocketManager.sendMessage(connectionId, {
    type,
    data,
    ...options
  });
}

/**
 * 广播WebSocket消息的便捷函数
 */
export function broadcastWebSocketMessage(
  type: string, 
  data: any, 
  options?: Partial<WebSocketMessage>
): number {
  return globalWebSocketManager.broadcast({
    type,
    data,
    ...options
  });
}