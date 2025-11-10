import { EventBus } from '../communication/event-bus';

export class AuthMonitor {
  private static instance: AuthMonitor;
  private metrics = {
    loginAttempts: 0,
    loginFailures: 0,
    tokenRefreshes: 0,
    authErrors: 0
  };

  static getInstance(): AuthMonitor {
    if (!this.instance) {
      this.instance = new AuthMonitor();
    }
    return this.instance;
  }

  initialize(): void {
    // 监听认证相关事件
    EventBus.on('auth:login', this.trackLogin.bind(this));
    EventBus.on('auth:login-failed', this.trackLoginFailure.bind(this));
    EventBus.on('auth:token-refreshed', this.trackTokenRefresh.bind(this));
    EventBus.on('auth:error', this.trackAuthError.bind(this));
  }

  private trackLogin(): void {
    this.metrics.loginAttempts++;
    this.sendMetrics();
  }

  private trackLoginFailure(): void {
    this.metrics.loginFailures++;
    this.sendMetrics();
  }

  private trackTokenRefresh(): void {
    this.metrics.tokenRefreshes++;
    this.sendMetrics();
  }

  private trackAuthError(): void {
    this.metrics.authErrors++;
    this.sendMetrics();
  }

  private sendMetrics(): void {
    // 发送监控数据到监控服务
    if (window.navigator.sendBeacon) {
      const data = JSON.stringify({
        type: 'auth_metrics',
        metrics: this.metrics,
        timestamp: Date.now()
      });
      
      window.navigator.sendBeacon('/api/monitoring/auth', data);
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }
}