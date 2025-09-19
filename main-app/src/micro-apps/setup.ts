/**
 * 微前端应用配置和注册
 * 负责注册和管理所有子应用
 */

import { registerMicroApps, start, addGlobalUncaughtErrorHandler } from 'qiankun';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

import { globalLogger } from '@shared/utils/logger';
import { globalEventBus } from '@shared/communication/event-bus';
import { globalStateManager } from '@shared/communication/global-state';
import { EVENT_TYPES } from '@shared/types/events';
import { MicroAppConfig } from '@shared/types';

/**
 * 微应用配置列表
 */
export const microAppConfigs: MicroAppConfig[] = [
  // React子应用
  {
    name: 'react-user-management',
    entry: '//localhost:3001',
    container: '#micro-app-react-user-management',
    activeRule: '/user-management',
    props: {
      routerBase: '/user-management',
      getGlobalState: () => globalStateManager.getState(),
      setGlobalState: (state: any) => globalStateManager.setState(state),
      eventBus: globalEventBus,
      container: '#micro-app-react-user-management'
    }
  },
  {
    name: 'react-product-management',
    entry: '//localhost:3002',
    container: '#micro-app-react-product-management',
    activeRule: '/product-management',
    props: {
      routerBase: '/product-management',
      getGlobalState: () => globalStateManager.getState(),
      setGlobalState: (state: any) => globalStateManager.setState(state),
      eventBus: globalEventBus
    }
  },
  {
    name: 'react-order-management',
    entry: '//localhost:3003',
    container: '#micro-app-react-order-management',
    activeRule: '/order-management',
    props: {
      routerBase: '/order-management',
      getGlobalState: () => globalStateManager.getState(),
      setGlobalState: (state: any) => globalStateManager.setState(state),
      eventBus: globalEventBus
    }
  },
  {
    name: 'react-dashboard',
    entry: '//localhost:3004',
    container: '#micro-app-react-dashboard',
    activeRule: '/data-dashboard',
    props: {
      routerBase: '/data-dashboard',
      getGlobalState: () => globalStateManager.getState(),
      setGlobalState: (state: any) => globalStateManager.setState(state),
      eventBus: globalEventBus
    }
  },
  {
    name: 'react-settings',
    entry: '//localhost:3005',
    container: '#micro-app-react-settings',
    activeRule: '/settings',
    props: {
      routerBase: '/settings',
      getGlobalState: () => globalStateManager.getState(),
      setGlobalState: (state: any) => globalStateManager.setState(state),
      eventBus: globalEventBus
    }
  },

  // Vue子应用
  {
    name: 'vue-message-center',
    entry: '//localhost:3006',
    container: '#micro-app-vue-message-center',
    activeRule: '/message-center',
    props: {
      routerBase: '/message-center',
      getGlobalState: () => globalStateManager.getState(),
      setGlobalState: (state: any) => globalStateManager.setState(state),
      eventBus: globalEventBus
    }
  },
  {
    name: 'vue-file-management',
    entry: '//localhost:3007',
    container: '#micro-app-vue-file-management',
    activeRule: '/file-management',
    props: {
      routerBase: '/file-management',
      getGlobalState: () => globalStateManager.getState(),
      setGlobalState: (state: any) => globalStateManager.setState(state),
      eventBus: globalEventBus
    }
  },
  {
    name: 'vue-system-monitor',
    entry: '//localhost:3008',
    container: '#micro-app-vue-system-monitor',
    activeRule: '/system-monitor',
    props: {
      routerBase: '/system-monitor',
      getGlobalState: () => globalStateManager.getState(),
      setGlobalState: (state: any) => globalStateManager.setState(state),
      eventBus: globalEventBus
    }
  }
];

/**
 * 应用加载状态管理
 */
const appLoadingStates = new Map<string, boolean>();

/**
 * 设置加载进度条
 */
function setupProgressBar() {
  NProgress.configure({
    showSpinner: false,
    speed: 200,
    minimum: 0.1
  });
}

/**
 * 应用生命周期钩子
 */
const lifecycleHooks = {
  /**
   * 应用加载前
   */
  beforeLoad: (app: any) => {
    globalLogger.info(`Loading micro app: ${app.name}`);

    // 检查容器是否存在
    const containerElement = document.querySelector(app.container);
    if (!containerElement) {
      globalLogger.error(`Container not found for app ${app.name}: ${app.container}`);
      return Promise.reject(new Error(`Container ${app.container} not found for ${app.name}`))
    }
    
    // 显示加载进度
    NProgress.start();
    appLoadingStates.set(app.name, true);
    
    // 发射应用加载事件
    globalEventBus.emit({
      type: EVENT_TYPES.APP_MOUNT,
      source: 'main-app',
      timestamp: new Date().toISOString(),
      id: `app-loading-${app.name}-${Date.now()}`,
      data: {
        appName: app.name,
        props: app.props
      }
    });

    return Promise.resolve();
  },

  /**
   * 应用挂载后
   */
  afterMount: (app: any) => {
    globalLogger.info(`Micro app mounted: ${app.name}`);
    
    // 隐藏加载进度
    NProgress.done();
    appLoadingStates.set(app.name, false);
    
    // 更新全局状态
    globalStateManager.dispatch({
      type: 'SET_APP',
      payload: {
        activeMicroApp: app.name,
        microApps: globalStateManager.getState().app.microApps.map(microApp =>
          microApp.name === app.name
            ? { ...microApp, status: 'mounted', mountTime: new Date().toISOString() }
            : microApp
        )
      }
    });

    // 发射应用挂载完成事件
    globalEventBus.emit({
      type: EVENT_TYPES.APP_MOUNT,
      source: app.name,
      timestamp: new Date().toISOString(),
      id: `app-mounted-${app.name}-${Date.now()}`,
      data: {
        appName: app.name,
        props: app.props
      }
    });

    return Promise.resolve();
  },

  /**
   * 应用卸载后
   */
  afterUnmount: (app: any) => {
    globalLogger.info(`Micro app unmounted: ${app.name}`);
    
    // 更新全局状态
    globalStateManager.dispatch({
      type: 'SET_APP',
      payload: {
        activeMicroApp: null,
        microApps: globalStateManager.getState().app.microApps.map(microApp =>
          microApp.name === app.name
            ? { ...microApp, status: 'unmounted', unmountTime: new Date().toISOString() }
            : microApp
        )
      }
    });

    // 发射应用卸载事件
    globalEventBus.emit({
      type: EVENT_TYPES.APP_UNMOUNT,
      source: app.name,
      timestamp: new Date().toISOString(),
      id: `app-unmounted-${app.name}-${Date.now()}`,
      data: {
        appName: app.name
      }
    });

    return Promise.resolve();
  }
};

/**
 * 全局错误处理
 */
function setupGlobalErrorHandler() {
  addGlobalUncaughtErrorHandler((error: any) => {
    globalLogger.error('Micro app global error', error);
    
    // 发射错误事件
    globalEventBus.emit({
      type: EVENT_TYPES.APP_ERROR,
      source: 'qiankun',
      timestamp: new Date().toISOString(),
      id: `global-error-${Date.now()}`,
      data: {
        appName: 'unknown',
        error,
        errorInfo: {}
      }
    });
    
    // 隐藏加载进度
    NProgress.done();
  });
}

/**
 * 获取应用入口地址
 */
function getAppEntry(name: string, defaultEntry: string): string {
  // 开发环境下使用本地地址
  if (import.meta.env.DEV) {
    return defaultEntry;
  }
  
  // 生产环境下可以从配置中获取
  const prodEntries: Record<string, string> = {
    'react-user-management': '/apps/user-management',
    'react-product-management': '/apps/product-management',
    'react-order-management': '/apps/order-management',
    'react-dashboard': '/apps/dashboard',
    'react-settings': '/apps/settings',
    'vue-message-center': '/apps/message-center',
    'vue-file-management': '/apps/file-management',
    'vue-system-monitor': '/apps/system-monitor'
  };
  
  return prodEntries[name] || defaultEntry;
}

/**
 * 注册微应用
 */
function registerApps() {
  const apps = microAppConfigs.map(config => ({
    ...config,
    entry: getAppEntry(config.name, config.entry),
    loader: (loading: boolean) => {
      if (loading) {
        NProgress.start();
      } else {
        NProgress.done();
      }
    },
    ...lifecycleHooks
  }));

  registerMicroApps(apps);
  
  // 初始化应用状态
  globalStateManager.dispatch({
    type: 'SET_APP',
    payload: {
      microApps: apps.map(app => ({
        name: app.name,
        status: 'unmounted',
        props: app.props || {},
        error: undefined,
        mountTime: undefined,
        unmountTime: undefined
      }))
    }
  });

  globalLogger.info('Micro apps registered', { apps: apps.map(app => app.name) });
}

/**
 * 启动qiankun
 */
function startQiankun() {
  start({
    // 预加载策略
    prefetch: 'all',
    
    // 沙箱配置
    sandbox: {
      strictStyleIsolation: false,
      experimentalStyleIsolation: true
    },
    
    // 单例模式
    singular: false,
    
    // 获取公共依赖
    getPublicPath: (entry: string) => {
      // 返回子应用的公共路径
      return `${entry}/`;
    },
    
    // 自定义fetch
    fetch: (url: string, options?: RequestInit) => {
      // 可以在这里添加认证头等
      const token = localStorage.getItem('access_token');
      if (token) {
        options = {
          ...options,
          headers: {
            ...options?.headers,
            Authorization: `Bearer ${token}`
          }
        };
      }
      return window.fetch(url, options);
    }
  });

  globalLogger.info('Qiankun started successfully');
}

/**
 * 设置微前端应用
 */
export async function setupMicroApps(): Promise<void> {
  try {
    globalLogger.info('Setting up micro apps...');
    
    // 设置进度条
    setupProgressBar();
    
    // 设置全局错误处理
    setupGlobalErrorHandler();
    
    // 注册微应用
    registerApps();
    
    // 启动qiankun
    startQiankun();
    
    globalLogger.info('Micro apps setup completed');
  } catch (error) {
    globalLogger.error('Failed to setup micro apps', error as Error);
    throw error;
  }
}

/**
 * 获取应用加载状态
 */
export function getAppLoadingState(appName: string): boolean {
  return appLoadingStates.get(appName) || false;
}

/**
 * 获取所有微应用配置
 */
export function getMicroAppConfigs(): MicroAppConfig[] {
  return microAppConfigs;
}

/**
 * 根据路由获取对应的微应用
 */
export function getMicroAppByRoute(pathname: string): MicroAppConfig | undefined {
  return microAppConfigs.find(app => 
    pathname.startsWith(app.activeRule as string)
  );
}

/**
 * 检查微应用是否可用
 */
export async function checkAppAvailability(appName: string): Promise<boolean> {
  const config = microAppConfigs.find(app => app.name === appName);
  if (!config) {
    return false;
  }

  try {
    const response = await fetch(config.entry, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 动态加载微应用
 */
export async function loadMicroApp(appName: string): Promise<void> {
  const config = microAppConfigs.find(app => app.name === appName);
  if (!config) {
    throw new Error(`Micro app ${appName} not found`);
  }

  // 检查应用是否可用
  const available = await checkAppAvailability(appName);
  if (!available) {
    throw new Error(`Micro app ${appName} is not available`);
  }

  globalLogger.info(`Loading micro app: ${appName}`);
  // 这里可以添加动态加载逻辑
}