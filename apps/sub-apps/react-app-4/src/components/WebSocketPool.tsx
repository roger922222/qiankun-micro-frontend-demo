import { EventEmitter } from 'events';

interface WebSocketConnection {
  ws: WebSocket;
  subscribers: Set<Function>;
  heartbeatTimer?: NodeJS.Timeout;
  reconnectAttempts: number;
  url: string;
}

interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
  timestamp?: number;
}

class WebSocketPool extends EventEmitter {
  private connections = new Map<string, WebSocketConnection>();
  private maxReconnectAttempts = 5;
  private heartbeatInterval = 30000; // 30秒
  private reconnectDelay = 1000; // 1秒基础延迟
  
  constructor() {
    super();
    this.setMaxListeners(100); // 增加最大监听器数量
  }
  
  // 获取或创建连接
  async getConnection(channelId: string, url: string): Promise<WebSocket> {
    const existingConnection = this.connections.get(channelId);
    
    if (existingConnection && existingConnection.ws.readyState === WebSocket.OPEN) {
      return existingConnection.ws;
    }
    
    return this.createConnection(channelId, url);
  }
  
  // 创建新连接
  private async createConnection(channelId: string, url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const connection: WebSocketConnection = {
        ws,
        subscribers: new Set(),
        reconnectAttempts: 0,
        url
      };
      
      ws.onopen = () => {
        console.log(`WebSocket connected: ${channelId}`);
        this.connections.set(channelId, connection);
        this.setupHeartbeat(channelId);
        connection.reconnectAttempts = 0;
        this.emit('connected', channelId);
        resolve(ws);
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // 处理心跳响应
          if (message.type === 'pong') {
            return;
          }
          
          // 分发消息给订阅者
          connection.subscribers.forEach(callback => {
            try {
              callback(message);
            } catch (error) {
              console.error('Error in WebSocket message handler:', error);
            }
          });
          
          // 发出全局事件
          this.emit('message', channelId, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket disconnected: ${channelId}`, event.code, event.reason);
        this.clearHeartbeat(channelId);
        this.connections.delete(channelId);
        this.emit('disconnected', channelId, event);
        
        // 自动重连
        if (connection.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(channelId, url);
        } else {
          this.emit('reconnectFailed', channelId);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`WebSocket error: ${channelId}`, error);
        this.emit('error', channelId, error);
        reject(error);
      };
      
      // 连接超时处理
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }
  
  // 订阅频道消息
  subscribe(channelId: string, callback: Function, url?: string): () => void {
    // 如果连接不存在且提供了URL，创建连接
    if (!this.connections.has(channelId) && url) {
      this.createConnection(channelId, url).catch(error => {
        console.error(`Failed to create connection for ${channelId}:`, error);
      });
    }
    
    const connection = this.connections.get(channelId);
    if (connection) {
      connection.subscribers.add(callback);
    } else {
      // 连接不存在时，先存储回调，待连接建立后再添加
      setTimeout(() => {
        const retryConnection = this.connections.get(channelId);
        if (retryConnection) {
          retryConnection.subscribers.add(callback);
        }
      }, 1000);
    }
    
    // 返回取消订阅函数
    return () => {
      const conn = this.connections.get(channelId);
      if (conn) {
        conn.subscribers.delete(callback);
        
        // 如果没有订阅者了，关闭连接
        if (conn.subscribers.size === 0) {
          this.closeConnection(channelId);
        }
      }
    };
  }
  
  // 发送消息
  send(channelId: string, message: WebSocketMessage): boolean {
    const connection = this.connections.get(channelId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        const messageWithTimestamp = {
          ...message,
          timestamp: Date.now()
        };
        connection.ws.send(JSON.stringify(messageWithTimestamp));
        return true;
      } catch (error) {
        console.error(`Failed to send message to ${channelId}:`, error);
        return false;
      }
    }
    return false;
  }
  
  // 广播消息到所有连接
  broadcast(message: WebSocketMessage): number {
    let sentCount = 0;
    this.connections.forEach((connection, channelId) => {
      if (this.send(channelId, message)) {
        sentCount++;
      }
    });
    return sentCount;
  }
  
  // 关闭特定连接
  closeConnection(channelId: string): void {
    const connection = this.connections.get(channelId);
    if (connection) {
      this.clearHeartbeat(channelId);
      connection.ws.close();
      this.connections.delete(channelId);
    }
  }
  
  // 关闭所有连接
  closeAllConnections(): void {
    this.connections.forEach((_, channelId) => {
      this.closeConnection(channelId);
    });
  }
  
  // 获取连接状态
  getConnectionStatus(channelId: string): {
    connected: boolean;
    readyState?: number;
    reconnectAttempts?: number;
    subscriberCount?: number;
  } {
    const connection = this.connections.get(channelId);
    if (!connection) {
      return { connected: false };
    }
    
    return {
      connected: connection.ws.readyState === WebSocket.OPEN,
      readyState: connection.ws.readyState,
      reconnectAttempts: connection.reconnectAttempts,
      subscriberCount: connection.subscribers.size
    };
  }
  
  // 获取所有连接状态
  getAllConnectionStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    this.connections.forEach((connection, channelId) => {
      status[channelId] = this.getConnectionStatus(channelId);
    });
    return status;
  }
  
  // 心跳检测
  private setupHeartbeat(channelId: string): void {
    this.clearHeartbeat(channelId);
    const connection = this.connections.get(channelId);
    if (!connection) return;
    
    connection.heartbeatTimer = setInterval(() => {
      if (!this.send(channelId, { type: 'ping' })) {
        this.clearHeartbeat(channelId);
      }
    }, this.heartbeatInterval);
  }
  
  private clearHeartbeat(channelId: string): void {
    const connection = this.connections.get(channelId);
    if (connection && connection.heartbeatTimer) {
      clearInterval(connection.heartbeatTimer);
      connection.heartbeatTimer = undefined;
    }
  }
  
  // 智能重连
  private scheduleReconnect(channelId: string, url: string): void {
    const connection = this.connections.get(channelId);
    if (!connection) return;
    
    connection.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect for ${channelId} in ${delay}ms (attempt ${connection.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.createConnection(channelId, url).catch(error => {
        console.error(`Reconnection failed for ${channelId}:`, error);
      });
    }, delay);
  }
  
  // 健康检查
  healthCheck(): {
    totalConnections: number;
    activeConnections: number;
    failedConnections: number;
    details: Record<string, any>;
  } {
    const details = this.getAllConnectionStatus();
    const totalConnections = Object.keys(details).length;
    const activeConnections = Object.values(details).filter(status => status.connected).length;
    const failedConnections = totalConnections - activeConnections;
    
    return {
      totalConnections,
      activeConnections,
      failedConnections,
      details
    };
  }
}

// 全局连接池实例
export const wsPool = new WebSocketPool();

// 导出类型
export type { WebSocketMessage, WebSocketConnection };
export default WebSocketPool;