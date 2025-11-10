/**
 * 微应用导航集成
 * 为子应用提供导航系统集成功能
 */

import { globalEventBus } from '../event-bus';
import { globalNavigationService } from './navigation-service';
import { globalRouteManager } from './route-manager';
import { globalHistoryService } from './history-service';
import type { 
  NavigationEvent, 
  RouteChangeEvent, 
  ParameterEvent,
  RouteInfo,
  NavigationContext 
} from './index';

// ==================== 类型定义 ====================

export interface MicroAppNavigationConfig {
  appName: string;
  basename?: string;
  debug?: boolean;
  enableParameterReceiving?: boolean;
  enableCrossAppNavigation?: boolean;
  onNavigationReceived?: (event: NavigationEvent) => void;
  onParameterReceived?: (event: ParameterEvent) => void;
  onRouteChange?: (event: RouteChangeEvent) => void;
}

export interface MicroAppNavigationAPI {
  // 导航方法
  navigateTo: (target: string, params?: any, context?: NavigationContext) => Promise<boolean>;
  navigateToApp: (appName: string, path: string, params?: any) => Promise<boolean>;
  goBack: () => Promise<boolean>;
  goBackToApp: (appName: string) => Promise<boolean>;
  
  // 状态获取
  getCurrentRoute: () => RouteInfo | null;
  getNavigationHistory: () => any[];
  
  // 参数处理
  getReceivedParameters: () => any;
  clearReceivedParameters: () => void;
  
  // 事件监听
  onParameterReceived: (callback: (params: any, context: NavigationContext) => void) => () => void;
  onNavigationEvent: (callback: (event: NavigationEvent) => void) => () => void;
  
  // 销毁方法
  destroy: () => void;
}

// ==================== 微应用导航集成类 ====================

export class MicroAppNavigationIntegration {
  private config: MicroAppNavigationConfig;
  private receivedParameters: any = null;
  private parameterCallbacks: Set<(params: any, context: NavigationContext) => void> = new Set();
  private navigationCallbacks: Set<(event: NavigationEvent) => void> = new Set();
  private isInitialized: boolean = false;
  private cleanupFunctions: (() => void)[] = [];

  constructor(config: MicroAppNavigationConfig) {
    this.config = config;
    this.initialize();
  }

  /**
   * 初始化导航集成
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      // 监听导航事件
      if (this.config.enableCrossAppNavigation) {
        const navigationUnsubscribe = globalEventBus.on('NAVIGATION', this.handleNavigationEvent.bind(this));
        this.cleanupFunctions.push(() => navigationUnsubscribe.unsubscribe());
      }

      // 监听参数传递事件
      if (this.config.enableParameterReceiving) {
        const parameterUnsubscribe = globalEventBus.on('PARAMETER_TRANSFER', this.handleParameterEvent.bind(this));
        this.cleanupFunctions.push(() => parameterUnsubscribe.unsubscribe());
      }

      // 监听路由变化事件
      const routeChangeUnsubscribe = globalEventBus.on('ROUTE_CHANGE', this.handleRouteChangeEvent.bind(this));
      this.cleanupFunctions.push(() => routeChangeUnsubscribe.unsubscribe());

      // 注册应用到导航系统
      this.registerApp();

      this.isInitialized = true;

      if (this.config.debug) {
        console.log(`[MicroAppNavigation] Initialized for app: ${this.config.appName}`);
      }
    } catch (error) {
      console.error(`[MicroAppNavigation] Failed to initialize for app: ${this.config.appName}`, error);
    }
  }

  /**
   * 创建导航API
   */
  createNavigationAPI(): MicroAppNavigationAPI {
    return {
      // 导航方法
      navigateTo: this.navigateTo.bind(this),
      navigateToApp: this.navigateToApp.bind(this),
      goBack: this.goBack.bind(this),
      goBackToApp: this.goBackToApp.bind(this),
      
      // 状态获取
      getCurrentRoute: this.getCurrentRoute.bind(this),
      getNavigationHistory: this.getNavigationHistory.bind(this),
      
      // 参数处理
      getReceivedParameters: this.getReceivedParameters.bind(this),
      clearReceivedParameters: this.clearReceivedParameters.bind(this),
      
      // 事件监听
      onParameterReceived: this.onParameterReceived.bind(this),
      onNavigationEvent: this.onNavigationEvent.bind(this),
      
      // 销毁方法
      destroy: this.destroy.bind(this)
    };
  }

  // ==================== 导航方法 ====================

  /**
   * 导航到目标
   */
  private async navigateTo(target: string, params?: any, context?: NavigationContext): Promise<boolean> {
    const navigationContext: NavigationContext = {
      source: this.config.appName,
      metadata: {
        timestamp: new Date().toISOString(),
        basename: this.config.basename
      },
      ...context
    };

    return globalNavigationService.smartNavigate(target, params, navigationContext);
  }

  /**
   * 导航到指定应用
   */
  private async navigateToApp(appName: string, path: string, params?: any): Promise<boolean> {
    return globalRouteManager.navigateToApp(appName, path, {
      params,
      state: {
        sourceApp: this.config.appName,
        timestamp: Date.now()
      }
    });
  }

  /**
   * 返回上一页
   */
  private async goBack(): Promise<boolean> {
    return globalHistoryService.smartGoBack();
  }

  /**
   * 返回到指定应用
   */
  private async goBackToApp(appName: string): Promise<boolean> {
    return globalHistoryService.goBackToApp(appName);
  }

  // ==================== 状态获取方法 ====================

  /**
   * 获取当前路由
   */
  private getCurrentRoute(): RouteInfo | null {
    return globalRouteManager.getCurrentRoute();
  }

  /**
   * 获取导航历史
   */
  private getNavigationHistory(): any[] {
    return globalHistoryService.getHistory();
  }

  // ==================== 参数处理方法 ====================

  /**
   * 获取接收到的参数
   */
  private getReceivedParameters(): any {
    return this.receivedParameters;
  }

  /**
   * 清空接收到的参数
   */
  private clearReceivedParameters(): void {
    this.receivedParameters = null;
  }

  /**
   * 监听参数接收
   */
  private onParameterReceived(callback: (params: any, context: NavigationContext) => void): () => void {
    this.parameterCallbacks.add(callback);
    
    return () => {
      this.parameterCallbacks.delete(callback);
    };
  }

  /**
   * 监听导航事件
   */
  private onNavigationEvent(callback: (event: NavigationEvent) => void): () => void {
    this.navigationCallbacks.add(callback);
    
    return () => {
      this.navigationCallbacks.delete(callback);
    };
  }

  // ==================== 事件处理方法 ====================

  /**
   * 处理导航事件
   */
  private handleNavigationEvent(event: NavigationEvent): void {
    // 只处理目标为当前应用的导航事件
    if (event.data.targetApp !== this.config.appName) {
      return;
    }

    if (this.config.debug) {
      console.log(`[MicroAppNavigation] Received navigation event for ${this.config.appName}:`, event);
    }

    // 调用配置的回调
    if (this.config.onNavigationReceived) {
      this.config.onNavigationReceived(event);
    }

    // 调用注册的回调
    this.navigationCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[MicroAppNavigation] Error in navigation callback:', error);
      }
    });
  }

  /**
   * 处理参数传递事件
   */
  private handleParameterEvent(event: ParameterEvent): void {
    // 只处理目标为当前应用的参数事件
    if (event.data.targetApp !== this.config.appName) {
      return;
    }

    if (this.config.debug) {
      console.log(`[MicroAppNavigation] Received parameters for ${this.config.appName}:`, event);
    }

    // 保存接收到的参数
    this.receivedParameters = event.data.parameters;

    // 调用配置的回调
    if (this.config.onParameterReceived) {
      this.config.onParameterReceived(event);
    }

    // 调用注册的回调
    this.parameterCallbacks.forEach(callback => {
      try {
        callback(event.data.parameters, event.data.context);
      } catch (error) {
        console.error('[MicroAppNavigation] Error in parameter callback:', error);
      }
    });
  }

  /**
   * 处理路由变化事件
   */
  private handleRouteChangeEvent(event: RouteChangeEvent): void {
    // 只处理与当前应用相关的路由变化
    if (event.data.to.appName !== this.config.appName && event.data.from.appName !== this.config.appName) {
      return;
    }

    if (this.config.debug) {
      console.log(`[MicroAppNavigation] Route changed for ${this.config.appName}:`, event);
    }

    // 调用配置的回调
    if (this.config.onRouteChange) {
      this.config.onRouteChange(event);
    }
  }

  /**
   * 注册应用到导航系统
   */
  private registerApp(): void {
    // 这里可以添加应用注册逻辑
    // 比如向主应用报告当前应用的路由信息
    
    const registrationEvent = {
      type: 'APP_REGISTRATION' as const,
      source: this.config.appName,
      timestamp: new Date().toISOString(),
      id: `app-reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        appName: this.config.appName,
        basename: this.config.basename,
        capabilities: {
          crossAppNavigation: this.config.enableCrossAppNavigation,
          parameterReceiving: this.config.enableParameterReceiving
        }
      }
    };

    globalEventBus.emit(registrationEvent);
  }

  /**
   * 销毁导航集成
   */
  destroy(): void {
    // 清理事件监听器
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions = [];

    // 清空回调
    this.parameterCallbacks.clear();
    this.navigationCallbacks.clear();

    // 重置状态
    this.receivedParameters = null;
    this.isInitialized = false;

    if (this.config.debug) {
      console.log(`[MicroAppNavigation] Destroyed for app: ${this.config.appName}`);
    }
  }
}

// ==================== 便捷函数 ====================

/**
 * 为微应用创建导航集成
 */
export function createMicroAppNavigation(config: MicroAppNavigationConfig): MicroAppNavigationAPI {
  const integration = new MicroAppNavigationIntegration(config);
  return integration.createNavigationAPI();
}

/**
 * React Hook 用于微应用导航（仅在React环境中可用）
 */
export function useMicroAppNavigation(config: MicroAppNavigationConfig): MicroAppNavigationAPI {
  // 检查React是否可用
  let React: any;
  try {
    if (typeof window !== 'undefined' && (window as any).React) {
      React = (window as any).React;
    }
  } catch {
    throw new Error('useMicroAppNavigation requires React to be available');
  }

  if (!React) {
    throw new Error('useMicroAppNavigation requires React to be available');
  }

  const [navigationAPI] = React.useState(() => createMicroAppNavigation(config));

  React.useEffect(() => {
    return () => {
      navigationAPI.destroy();
    };
  }, [navigationAPI]);

  return navigationAPI;
}

// ==================== 导出类型 ====================

export type {
  MicroAppNavigationConfig,
  MicroAppNavigationAPI
};