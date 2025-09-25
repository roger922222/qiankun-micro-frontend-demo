/**
 * 导航Hook - 为React组件提供导航功能
 */

import { useCallback, useEffect, useState } from 'react';
import type { MicroAppNavigationAPI } from '@shared/communication/navigation/micro-app-integration';
import type { RouteInfo, NavigationContext } from '@shared/communication/navigation';

/**
 * 使用导航功能的Hook
 */
export function useNavigation() {
  const [navigationAPI] = useState<MicroAppNavigationAPI>(() => {
    // 从全局获取导航API实例
    return (window as any).__MICRO_APP_NAVIGATION__;
  });

  const [currentRoute, setCurrentRoute] = useState<RouteInfo | null>(null);
  const [receivedParameters, setReceivedParameters] = useState<any>(null);

  // 更新当前路由信息
  useEffect(() => {
    if (navigationAPI) {
      setCurrentRoute(navigationAPI.getCurrentRoute());
    }
  }, [navigationAPI]);

  // 监听参数接收
  useEffect(() => {
    if (!navigationAPI) return;

    const unsubscribe = navigationAPI.onParameterReceived((params, context) => {
      setReceivedParameters({ params, context });
    });

    return unsubscribe;
  }, [navigationAPI]);

  // 导航方法
  const navigateTo = useCallback(async (target: string, params?: any, context?: NavigationContext) => {
    if (!navigationAPI) {
      console.warn('[useNavigation] Navigation API not available');
      return false;
    }
    return navigationAPI.navigateTo(target, params, context);
  }, [navigationAPI]);

  const navigateToApp = useCallback(async (appName: string, path: string, params?: any) => {
    if (!navigationAPI) {
      console.warn('[useNavigation] Navigation API not available');
      return false;
    }
    return navigationAPI.navigateToApp(appName, path, params);
  }, [navigationAPI]);

  const goBack = useCallback(async () => {
    if (!navigationAPI) {
      console.warn('[useNavigation] Navigation API not available');
      return false;
    }
    return navigationAPI.goBack();
  }, [navigationAPI]);

  const goBackToApp = useCallback(async (appName: string) => {
    if (!navigationAPI) {
      console.warn('[useNavigation] Navigation API not available');
      return false;
    }
    return navigationAPI.goBackToApp(appName);
  }, [navigationAPI]);

  // 参数处理方法
  const clearReceivedParameters = useCallback(() => {
    if (navigationAPI) {
      navigationAPI.clearReceivedParameters();
      setReceivedParameters(null);
    }
  }, [navigationAPI]);

  return {
    // 导航方法
    navigateTo,
    navigateToApp,
    goBack,
    goBackToApp,
    
    // 状态信息
    currentRoute,
    receivedParameters,
    
    // 工具方法
    clearReceivedParameters,
    
    // 原始API（用于高级用法）
    navigationAPI
  };
}

/**
 * 使用跨应用导航的Hook
 */
export function useCrossAppNavigation() {
  const { navigateToApp, goBackToApp, currentRoute } = useNavigation();

  // 常用的跨应用导航方法
  const goToUserManagement = useCallback((params?: any) => {
    return navigateToApp('react-app-1', '/users', params);
  }, [navigateToApp]);

  const goToProductManagement = useCallback((params?: any) => {
    return navigateToApp('react-app-2', '/products', params);
  }, [navigateToApp]);

  const goToOrderManagement = useCallback((params?: any) => {
    return navigateToApp('react-app-3', '/orders', params);
  }, [navigateToApp]);

  const goToDashboard = useCallback((params?: any) => {
    return navigateToApp('react-app-4', '/dashboard', params);
  }, [navigateToApp]);

  const goToSettings = useCallback((params?: any) => {
    return navigateToApp('react-app-5', '/settings', params);
  }, [navigateToApp]);

  const goToMessageCenter = useCallback((params?: any) => {
    return navigateToApp('vue-app-1', '/messages', params);
  }, [navigateToApp]);

  const goToFileManagement = useCallback((params?: any) => {
    return navigateToApp('vue-app-2', '/files', params);
  }, [navigateToApp]);

  const goToSystemMonitor = useCallback((params?: any) => {
    return navigateToApp('vue-app-3', '/monitor', params);
  }, [navigateToApp]);

  const goToMainApp = useCallback(() => {
    return navigateToApp('main', '/dashboard');
  }, [navigateToApp]);

  return {
    // 导航到具体应用
    goToUserManagement,
    goToProductManagement,
    goToOrderManagement,
    goToDashboard,
    goToSettings,
    goToMessageCenter,
    goToFileManagement,
    goToSystemMonitor,
    goToMainApp,
    
    // 返回到具体应用
    goBackToApp,
    
    // 当前路由信息
    currentRoute,
    
    // 通用导航方法
    navigateToApp
  };
}

/**
 * 使用导航参数的Hook
 */
export function useNavigationParameters() {
  const { receivedParameters, clearReceivedParameters, navigationAPI } = useNavigation();
  const [parameterHistory, setParameterHistory] = useState<any[]>([]);

  // 记录参数历史
  useEffect(() => {
    if (receivedParameters) {
      setParameterHistory(prev => [...prev, {
        ...receivedParameters,
        timestamp: Date.now()
      }]);
    }
  }, [receivedParameters]);

  // 获取最新参数
  const getLatestParameters = useCallback(() => {
    return receivedParameters?.params || null;
  }, [receivedParameters]);

  // 获取参数上下文
  const getParameterContext = useCallback(() => {
    return receivedParameters?.context || null;
  }, [receivedParameters]);

  // 清空参数历史
  const clearParameterHistory = useCallback(() => {
    setParameterHistory([]);
    clearReceivedParameters();
  }, [clearReceivedParameters]);

  return {
    // 当前参数
    currentParameters: getLatestParameters(),
    parameterContext: getParameterContext(),
    
    // 参数历史
    parameterHistory,
    
    // 工具方法
    getLatestParameters,
    getParameterContext,
    clearReceivedParameters,
    clearParameterHistory
  };
}