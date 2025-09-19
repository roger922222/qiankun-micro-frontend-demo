/**
 * 全局状态管理Hook
 * 提供React组件访问全局状态的接口
 */

import { useState, useEffect, useCallback } from 'react';
import { globalStateManager } from '@shared/communication/global-state';
import { GlobalState, StateAction } from '@shared/types/store';

/**
 * 全局状态Hook
 */
export function useGlobalState() {
  const [state, setState] = useState<GlobalState>(globalStateManager.getState());

  useEffect(() => {
    // 订阅状态变化
    const unsubscribe = globalStateManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const dispatch = useCallback((action: StateAction) => {
    globalStateManager.dispatch(action);
  }, []);

  return {
    state,
    dispatch
  };
}

/**
 * 用户状态Hook
 */
export function useUserState() {
  const { state, dispatch } = useGlobalState();

  const setUser = useCallback((user: any) => {
    dispatch({
      type: 'SET_USER',
      payload: { currentUser: user, isAuthenticated: !!user }
    });
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch({
      type: 'SET_USER',
      payload: { currentUser: null, isAuthenticated: false }
    });
    
    // 清除本地存储
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }, [dispatch]);

  const setPermissions = useCallback((permissions: string[]) => {
    dispatch({
      type: 'SET_USER',
      payload: { permissions }
    });
  }, [dispatch]);

  return {
    user: state.user,
    setUser,
    logout,
    setPermissions
  };
}

/**
 * 主题状态Hook
 */
export function useThemeState() {
  const { state, dispatch } = useGlobalState();

  const setTheme = useCallback((theme: 'light' | 'dark') => {
    dispatch({
      type: 'SET_THEME',
      payload: { current: theme }
    });
    
    // 更新DOM属性
    document.documentElement.setAttribute('data-theme', theme);
  }, [dispatch]);

  const toggleTheme = useCallback(() => {
    const newTheme = state.theme.current === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [state.theme.current, setTheme]);

  return {
    theme: state.theme,
    setTheme,
    toggleTheme
  };
}

/**
 * 应用状态Hook
 */
export function useAppState() {
  const { state, dispatch } = useGlobalState();

  const setLoading = useCallback((loading: boolean) => {
    dispatch({
      type: 'SET_APP',
      payload: { loading }
    });
  }, [dispatch]);

  const setError = useCallback((error: string | null) => {
    dispatch({
      type: 'SET_APP',
      payload: { error }
    });
  }, [dispatch]);

  const setActiveMicroApp = useCallback((appName: string | null) => {
    dispatch({
      type: 'SET_APP',
      payload: { activeMicroApp: appName }
    });
  }, [dispatch]);

  return {
    app: state.app,
    setLoading,
    setError,
    setActiveMicroApp
  };
}