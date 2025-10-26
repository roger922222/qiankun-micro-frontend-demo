import { AuthBridge } from '../communication/auth-bridge';

/**
 * 跨域认证管理器
 * 结合 BroadcastChannel 和 PostMessage 实现跨域 Token 共享
 */
export class CrossDomainAuthManager {
  private static instance: CrossDomainAuthManager;
  private authBridge: AuthBridge;
  private authProxy?: HTMLIFrameElement;
  private proxyReady = false;
  private messageQueue: Array<any> = [];
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  // 认证中心配置
  private readonly authCenterConfig = {
    url: 'https://auth.example.com/auth-bridge.html',
    localUrl: '/shared/cross-domain/auth-bridge.html',
    trustedOrigins: [
      'https://auth.example.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'http://localhost:3006',
      'http://localhost:3007',
      'http://localhost:3008'
    ]
  };

  static getInstance(): CrossDomainAuthManager {
    if (!this.instance) {
      this.instance = new CrossDomainAuthManager();
    }
    return this.instance;
  }

  constructor() {
    this.authBridge = AuthBridge.getInstance();
    this.initCrossDomainSupport();
  }

  /**
   * 初始化跨域支持
   */
  private initCrossDomainSupport(): void {
    // 创建隐藏的认证代理iframe
    this.createAuthProxy();
    
    // 监听来自认证中心的消息
    window.addEventListener('message', this.handleAuthCenterMessage.bind(this));
    
    // 监听同源BroadcastChannel消息
    this.setupBroadcastChannel();
  }

  /**
   * 创建认证代理iframe
   */
  private createAuthProxy(): void {
    this.authProxy = document.createElement('iframe');
    this.authProxy.src = this.isDevelopment() ? this.authCenterConfig.localUrl : this.authCenterConfig.url;
    this.authProxy.style.display = 'none';
    this.authProxy.style.width = '0';
    this.authProxy.style.height = '0';
    this.authProxy.style.border = 'none';
    
    // 等待iframe加载完成
    this.authProxy.onload = () => {
      this.proxyReady = true;
      this.processMessageQueue();
      console.log('[CrossDomainAuth] 认证代理已就绪');
    };
    
    this.authProxy.onerror = (error) => {
      console.error('[CrossDomainAuth] 认证代理加载失败:', error);
      this.handleProxyError(error);
    };
    
    document.body.appendChild(this.authProxy);
  }

  /**
   * 设置BroadcastChannel监听
   */
  private setupBroadcastChannel(): void {
    try {
      const channel = new BroadcastChannel('cross_domain_auth');
      channel.addEventListener('message', (event) => {
        this.handleBroadcastMessage(event.data);
      });
    } catch (error) {
      console.warn('[CrossDomainAuth] BroadcastChannel 不可用:', error);
    }
  }

  /**
   * 处理认证中心消息
   */
  private handleAuthCenterMessage(event: MessageEvent): void {
    // 验证来源
    if (!this.isTrustedOrigin(event.origin)) {
      console.warn('[CrossDomainAuth] 不可信的来源:', event.origin);
      return;
    }

    const { data } = event;
    
    switch (data.type) {
      case 'auth:token-response':
        this.handleTokenResponse(data);
        break;
        
      case 'auth:token-updated':
        this.handleTokenUpdated(data);
        break;
        
      case 'auth:token-cleared':
        this.handleTokenCleared();
        break;
        
      case 'auth:proxy-ready':
        this.handleProxyReady();
        break;
        
      default:
        console.log('[CrossDomainAuth] 收到未知消息类型:', data.type);
    }
  }

  /**
   * 处理BroadcastChannel消息
   */
  private handleBroadcastMessage(data: any): void {
    switch (data.type) {
      case 'auth:login':
        this.syncTokenToAuthCenter(data.token, data.refreshToken);
        break;
        
      case 'auth:logout':
        this.clearAuthCenterToken();
        break;
    }
  }

  /**
   * 跨域设置Token
   */
  public async setCrossDomainToken(token: string, refreshToken?: string): Promise<boolean> {
    return this.sendMessageToAuthCenter({
      type: 'auth:set-token',
      token,
      refreshToken
    });
  }

  /**
   * 跨域获取Token
   */
  public async getCrossDomainToken(): Promise<{ token: string | null; refreshToken: string | null }> {
    const response = await this.sendMessageToAuthCenter({
      type: 'auth:get-token'
    });
    
    return {
      token: response.token,
      refreshToken: response.refreshToken
    };
  }

  /**
   * 跨域清除Token
   */
  public async clearCrossDomainToken(): Promise<boolean> {
    return this.sendMessageToAuthCenter({
      type: 'auth:clear-token'
    });
  }

  /**
   * 订阅跨域Token变化
   */
  public subscribeCrossDomainToken(callback: (token: string | null) => void): () => void {
    // 发送订阅请求
    this.sendMessageToAuthCenter({
      type: 'auth:subscribe'
    });
    
    // 创建监听器
    const listener = (event: MessageEvent) => {
      if (event.data?.type === 'auth:token-changed') {
        callback(event.data.token);
      }
    };
    
    window.addEventListener('message', listener);
    
    // 返回取消订阅函数
    return () => {
      window.removeEventListener('message', listener);
    };
  }

  /**
   * 发送消息到认证中心
   */
  private async sendMessageToAuthCenter(message: any): Promise<any> {
    if (!this.proxyReady) {
      // 如果代理未就绪，加入队列
      return new Promise((resolve, reject) => {
        this.messageQueue.push({ message, resolve, reject });
      });
    }

    if (!this.authProxy?.contentWindow) {
      throw new Error('认证代理不可用');
    }

    const messageId = this.generateMessageId();
    const messageWithId = { ...message, messageId };
    
    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error('认证中心响应超时'));
      }, 5000);
      
      // 存储待处理请求
      this.pendingRequests.set(messageId, { resolve, reject });
      
      // 发送消息
      const targetOrigin = this.isDevelopment() ? window.location.origin : this.authCenterConfig.trustedOrigins[0];
      this.authProxy.contentWindow.postMessage(messageWithId, targetOrigin);
    });
  }

  /**
   * 处理Token响应
   */
  private handleTokenResponse(data: any): void {
    const { messageId, token, refreshToken, success = true } = data;
    
    if (messageId && this.pendingRequests.has(messageId)) {
      const { resolve } = this.pendingRequests.get(messageId)!;
      this.pendingRequests.delete(messageId);
      resolve({ token, refreshToken, success });
    }
  }

  /**
   * 处理Token更新
   */
  private handleTokenUpdated(data: any): void {
    const { messageId, token, refreshToken } = data;
    
    // 更新本地AuthBridge
    if (token) {
      window.dispatchEvent(new CustomEvent('auth:login', {
        detail: { token, refreshToken }
      }));
    }
    
    if (messageId && this.pendingRequests.has(messageId)) {
      const { resolve } = this.pendingRequests.get(messageId)!;
      this.pendingRequests.delete(messageId);
      resolve({ success: true });
    }
  }

  /**
   * 处理Token清除
   */
  private handleTokenCleared(): void {
    // 触发本地登出事件
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  /**
   * 处理代理就绪
   */
  private handleProxyReady(): void {
    this.proxyReady = true;
    this.processMessageQueue();
  }

  /**
   * 处理代理错误
   */
  private handleProxyError(error: any): void {
    // 拒绝所有待处理请求
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('认证代理不可用'));
    });
    this.pendingRequests.clear();
  }

  /**
   * 处理消息队列
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const { message, resolve, reject } = this.messageQueue.shift()!;
      this.sendMessageToAuthCenter(message)
        .then(resolve)
        .catch(reject);
    }
  }

  /**
   * 同步Token到认证中心
   */
  private syncTokenToAuthCenter(token: string, refreshToken?: string): void {
    if (this.proxyReady) {
      this.setCrossDomainToken(token, refreshToken);
    }
  }

  /**
   * 清除认证中心Token
   */
  private clearAuthCenterToken(): void {
    if (this.proxyReady) {
      this.clearCrossDomainToken();
    }
  }

  /**
   * 验证可信来源
   */
  private isTrustedOrigin(origin: string): boolean {
    return this.authCenterConfig.trustedOrigins.includes(origin);
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 判断是否为开发环境
   */
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
  }

  /**
   * 销毁资源
   */
  public destroy(): void {
    if (this.authProxy) {
      document.body.removeChild(this.authProxy);
      this.authProxy = undefined;
    }
    
    window.removeEventListener('message', this.handleAuthCenterMessage);
    this.pendingRequests.clear();
    this.messageQueue = [];
  }
}