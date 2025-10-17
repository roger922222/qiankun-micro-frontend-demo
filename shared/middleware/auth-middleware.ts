import { AuthBridge } from '../communication/auth-bridge';
import { EventBus } from '../communication/event-bus';

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  permissions: string[];
  roles: string[];
}

export class AuthMiddleware { 
  private authBridge: AuthBridge;

  constructor() {
    this.authBridge = AuthBridge.getInstance();
  }

  // 验证权限
  async validatePermission(permission: string): Promise<boolean> {
    const token = this.authBridge.getToken();
    
    if (!token) {
      this.redirectToLogin();
      return false;
    }

    try {
      // 调用权限验证API
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Permission validation failed');
      }

      const result = await response.json();
      return result.permissions.includes(permission);
    } catch (error) {
      console.error('Permission validation error:', error);
      this.redirectToLogin();
      return false;
    }
  }

  // 重定向到登录页
  private redirectToLogin(): void {
    EventBus.emit('auth:require-login', {
      redirectUrl: window.location.href
    });
  }

  // 获取用户信息
  async getUserInfo(): Promise<UserInfo | null> {
    const token = this.authBridge.getToken();
    
    if (!token) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get user info');
      }

      return await response.json();
    } catch (error) {
      console.error('Get user info error:', error);
      return null;
    }
  }
}