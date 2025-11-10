import { EventBus } from '../communication/event-bus';
import { AuthBridge } from '../communication/auth-bridge';
import { TokenRefresher } from '../utils/token-refresh';

export class AuthErrorHandler {
  private authBridge: AuthBridge;

  constructor() {
    this.authBridge = AuthBridge.getInstance();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    // 全局错误处理
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    
    // 认证相关错误处理
    EventBus.on('auth:error', this.handleAuthError.bind(this));
    EventBus.on('auth:token-expired', this.handleTokenExpired.bind(this));
  }

  private handlePromiseRejection(event: PromiseRejectionEvent): void {
    if (event.reason?.message?.includes('401')) {
      this.handleUnauthorized();
    }
  }

  private handleAuthError(error: any): void {
    console.error('Authentication error:', error);
    
    if (error.code === 'TOKEN_EXPIRED') {
      this.handleTokenExpired();
    } else if (error.code === 'INVALID_TOKEN') {
      this.handleInvalidToken();
    }
  }

  private handleTokenExpired(): void {
    // 尝试刷新Token
    this.refreshToken().catch(() => {
      // 刷新失败，跳转到登录页
      this.redirectToLogin();
    });
  }

  private handleInvalidToken(): void {
    // 清除无效Token
    this.authBridge.clearToken();
    this.redirectToLogin();
  }

  private handleUnauthorized(): void {
    const token = this.authBridge.getToken();
    
    if (!token) {
      this.redirectToLogin();
      return;
    }

    // 检查Token是否过期
    if (this.isTokenExpired(token)) {
      this.handleTokenExpired();
    } else {
      // Token有效但权限不足
      EventBus.emit('auth:insufficient-permission');
    }
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { token, refreshToken: newRefreshToken } = await response.json();
    
    // 更新Token
    window.dispatchEvent(new CustomEvent('auth:login', {
      detail: { token, refreshToken: newRefreshToken }
    }));
  }

  private redirectToLogin(): void {
    EventBus.emit('auth:require-login', {
      redirectUrl: window.location.href
    });
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(window.atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }
}