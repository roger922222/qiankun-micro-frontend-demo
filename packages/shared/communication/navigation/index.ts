/**
 * 导航模块统一导出
 * 提供完整的跨应用导航解决方案
 */

// 路由管理器
export {
  RouteManager,
  globalRouteManager,
  type RouteParams,
  type NavigationOptions,
  type RouteGuard,
  type RouteInfo,
  type RouteHistoryEntry,
  type RouteMiddleware,
  type NavigationEvent,
  type RouteChangeEvent
} from './route-manager';

// 导航服务
export {
  NavigationService,
  globalNavigationService,
  type NavigationState,
  type PendingNavigation,
  type NavigationError,
  type NavigationContext,
  type ParameterTransformer,
  type NavigationStateEvent,
  type ParameterEvent
} from './navigation-service';

// 历史服务
export {
  HistoryService,
  globalHistoryService,
  type HistorySnapshot,
  type HistoryFilter,
  type HistoryStats,
  type NavigationPattern,
  type HistoryExportOptions,
  type HistoryChangeEvent,
  type HistorySnapshotEvent
} from './history-service';

// 微应用集成
export {
  MicroAppNavigationIntegration,
  createMicroAppNavigation,
  useMicroAppNavigation,
  type MicroAppNavigationConfig,
  type MicroAppNavigationAPI
} from './micro-app-integration';

// Vue集成
export {
  MicroAppNavigationMixin,
  configureVueNavigation,
  createVueNavigation
} from './vue-integration-simple';

// ==================== 便捷导航函数 ====================

import { globalNavigationService } from './navigation-service';
import { globalRouteManager } from './route-manager';
import { globalHistoryService } from './history-service';

/**
 * 快速导航到指定应用
 */
export const navigateTo = (target: string, params?: any, context?: any) => {
  return globalNavigationService.smartNavigate(target, params, context);
};

/**
 * 安全导航（带回退）
 */
export const safeNavigateTo = (target: string, fallback?: string, params?: any) => {
  return globalNavigationService.safeNavigate(target, fallback, params);
};

/**
 * 智能返回
 */
export const goBack = () => {
  return globalHistoryService.smartGoBack();
};

/**
 * 返回到指定应用
 */
export const goBackToApp = (appName: string) => {
  return globalHistoryService.goBackToApp(appName);
};

/**
 * 获取当前路由信息
 */
export const getCurrentRoute = () => {
  return globalRouteManager.getCurrentRoute();
};

/**
 * 获取导航历史
 */
export const getNavigationHistory = () => {
  return globalHistoryService.getHistory();
};

/**
 * 获取导航统计
 */
export const getNavigationStats = () => {
  return globalHistoryService.getHistoryStats();
};

// ==================== 导航配置 ====================

/**
 * 配置导航系统
 */
export interface NavigationConfig {
  debug?: boolean;
  maxHistorySize?: number;
  navigationTimeout?: number;
  autoSnapshot?: boolean;
  snapshotInterval?: number;
}

/**
 * 初始化导航系统
 */
export const initializeNavigation = (config: NavigationConfig = {}) => {
  // 这里可以添加全局配置逻辑
  if (config.debug) {
    console.log('[Navigation] Initialized with config:', config);
  }
  
  return {
    routeManager: globalRouteManager,
    navigationService: globalNavigationService,
    historyService: globalHistoryService
  };
};

// ==================== 导航工具函数 ====================

/**
 * 解析导航目标
 */
export const parseNavigationTarget = (target: string) => {
  let appName: string;
  let path: string;
  
  if (target.includes(':')) {
    [appName, path] = target.split(':', 2);
  } else if (target.startsWith('/')) {
    const segments = target.slice(1).split('/');
    appName = segments[0];
    path = '/' + segments.slice(1).join('/');
  } else {
    const segments = target.split('/');
    appName = segments[0];
    path = '/' + segments.slice(1).join('/');
  }
  
  return { appName, path: path || '/' };
};

/**
 * 构建导航URL
 */
export const buildNavigationUrl = (appName: string, path: string, query?: Record<string, string>) => {
  let url = appName === 'main' ? path : `/${appName}${path}`;
  
  if (query && Object.keys(query).length > 0) {
    const searchParams = new URLSearchParams(query);
    url += `?${searchParams.toString()}`;
  }
  
  return url;
};

/**
 * 检查是否是有效的导航目标
 */
export const isValidNavigationTarget = (target: string): boolean => {
  try {
    const { appName, path } = parseNavigationTarget(target);
    return Boolean(appName && path);
  } catch {
    return false;
  }
};

// ==================== 导航钩子（React专用） ====================

// React hooks (仅在React环境中可用)
let React: any;
try {
  if (typeof window !== 'undefined' && (window as any).React) {
    React = (window as any).React;
  }
} catch {
  // React not available
}

/**
 * 使用导航状态的Hook
 */
export const useNavigationState = () => {
  if (!React) {
    throw new Error('useNavigationState requires React to be available');
  }
  
  const [state, setState] = React.useState(globalNavigationService.getNavigationState());
  
  React.useEffect(() => {
    const handleStateChange = (event: any) => {
      setState(event.data);
    };
    
    globalNavigationService.getNavigationState();
    // 这里需要监听状态变化事件
    
    return () => {
      // 清理监听器
    };
  }, []);
  
  return state;
};

/**
 * 使用当前路由的Hook
 */
export const useCurrentRoute = () => {
  if (!React) {
    throw new Error('useCurrentRoute requires React to be available');
  }
  
  const [route, setRoute] = React.useState(globalRouteManager.getCurrentRoute());
  
  React.useEffect(() => {
    const handleRouteChange = (event: any) => {
      setRoute(event.data.to);
    };
    
    // 监听路由变化
    return () => {
      // 清理监听器
    };
  }, []);
  
  return route;
};

/**
 * 使用导航历史的Hook
 */
export const useNavigationHistory = () => {
  if (!React) {
    throw new Error('useNavigationHistory requires React to be available');
  }
  
  const [history, setHistory] = React.useState(globalHistoryService.getHistory());
  
  React.useEffect(() => {
    const handleHistoryChange = (event: any) => {
      setHistory(globalHistoryService.getHistory());
    };
    
    // 监听历史变化
    return () => {
      // 清理监听器
    };
  }, []);
  
  return history;
};