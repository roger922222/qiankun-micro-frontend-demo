import { useEffect, useState } from 'react';
import { AuthBridge } from '../communication/auth-bridge';

export interface UseAuthReturn {
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
}

/**
 * React认证Hook - 用于管理微前端应用中的认证状态
 * 支持跨应用登录态同步和自动状态管理
 * 
 * @param appId - 应用标识，用于区分不同的子应用
 * @returns 认证状态和操作方法
 * 
 * @example
 * ```tsx
 * import { useAuth } from '@shared/hooks';
 * 
 * function MyComponent() {
 *   const { token, isAuthenticated, login, logout } = useAuth('react-app-1');
 *   
 *   if (!isAuthenticated) {
 *     return <LoginForm onLogin={login} />;
 *   }
 *   
 *   return <Dashboard onLogout={logout} />;
 * }
 * ```
 */
export function useAuth(appId: string): UseAuthReturn {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const authBridge = AuthBridge.getInstance();

  useEffect(() => {
    // 订阅Token变化
    const unsubscribe = authBridge.subscribe(appId, (newToken) => {
      setToken(newToken);
      setLoading(false);
    });

    // 初始化认证桥接
    authBridge.initialize();

    return () => {
      unsubscribe();
    };
  }, [appId]);

  const login = (token: string, refreshToken: string) => {
    // 触发登录事件，由主应用处理
    window.dispatchEvent(new CustomEvent('auth:login', {
      detail: { token, refreshToken }
    }));
  };

  const logout = () => {
    // 触发登出事件
    window.dispatchEvent(new CustomEvent('auth:logout'));
  };

  return {
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout
  };
}