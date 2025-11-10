export class TokenRefresher {
  private static instance: TokenRefresher;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private readonly refreshThreshold = 5 * 60 * 1000; // 提前5分钟刷新

  static getInstance(): TokenRefresher {
    if (!this.instance) {
      this.instance = new TokenRefresher();
    }
    return this.instance;
  }

  // 启动Token刷新定时器
  startTokenRefresh(token: string): void {
    const expiresIn = this.getTokenExpiresIn(token);
    
    if (expiresIn <= 0) {
      // Token已过期
      this.handleTokenExpired();
      return;
    }

    // 计算刷新时间
    const refreshTime = Math.max(0, expiresIn - this.refreshThreshold);
    
    this.refreshTimeout = setTimeout(() => {
      this.refreshToken();
    }, refreshTime);
  }

  // 停止Token刷新
  stopTokenRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  private getTokenExpiresIn(token: string): number {
    try {
      const payload = JSON.parse(window.atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return Math.max(0, (payload.exp - currentTime) * 1000);
    } catch {
      return 0;
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
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
      
      // 重新启动刷新定时器
      this.startTokenRefresh(token);
      
    } catch (error) {
      console.error('Token refresh error:', error);
      // 刷新失败，跳转到登录页
      window.dispatchEvent(new CustomEvent('auth:require-login'));
    }
  }

  private handleTokenExpired(): void {
    window.dispatchEvent(new CustomEvent('auth:token-expired'));
  }
}