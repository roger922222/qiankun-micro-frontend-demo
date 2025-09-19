/**
 * 全局状态管理 - 微前端应用间共享状态
 * 提供跨应用的状态同步机制
 */

import { globalEventBus } from './event-bus';
import { GlobalState, StateListener, StateAction } from '../types/store';
import { EVENT_TYPES } from '../types/events';

/**
 * 全局状态管理器
 */
export class GlobalStateManager {
  private state: GlobalState;
  private listeners: Set<StateListener> = new Set();
  private middleware: Array<(action: StateAction, state: GlobalState, next: Function) => void> = [];
  private debug: boolean = false;

  constructor(initialState?: Partial<GlobalState>) {
    this.state = this.createInitialState(initialState);
    this.debug = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
  }

  /**
   * 创建初始状态
   */
  private createInitialState(initialState?: Partial<GlobalState>): GlobalState {
    const defaultState: GlobalState = {
      user: {
        currentUser: null,
        preferences: {
          language: 'zh-CN',
          timezone: 'Asia/Shanghai',
          notifications: {
            email: true,
            push: true,
            sound: true
          },
          ui: {
            sidebarCollapsed: false,
            tablePageSize: 20,
            dateFormat: 'YYYY-MM-DD',
            timeFormat: 'HH:mm:ss'
          }
        },
        isAuthenticated: false,
        permissions: [],
        roles: [],
        loginTime: null,
        lastActivity: null
      },
      app: {
        name: 'Qiankun Micro Frontend Demo',
        version: '1.0.0',
        loading: false,
        error: null,
        microApps: [],
        activeMicroApp: null,
        config: {
          title: 'Qiankun Micro Frontend Demo',
          logo: '/logo.png',
          description: '微前端架构示例项目',
          version: '1.0.0',
          apiBaseUrl: typeof process !== 'undefined' && process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
          enableDevTools: typeof process !== 'undefined' &&  process.env.NODE_ENV === 'development',
          enableMock: false,
          features: {}
        },
        menus: [],
        breadcrumbs: []
      },
      theme: {
        current: 'light',
        config: {
          name: 'default',
          colors: {
            primary: '#1890ff',
            secondary: '#722ed1',
            success: '#52c41a',
            warning: '#faad14',
            error: '#f5222d',
            info: '#13c2c2',
            background: '#ffffff',
            surface: '#fafafa',
            text: '#000000d9',
            border: '#d9d9d9'
          },
          fonts: {
            primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            secondary: 'Georgia, serif',
            monospace: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'
          },
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px'
          },
          borderRadius: {
            sm: '2px',
            md: '4px',
            lg: '8px',
            full: '50%'
          },
          shadows: {
            sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }
        },
        customThemes: {},
        animating: false,
        systemPreference: 'light'
      },
      auth: {
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        isLoggedIn: false,
        loginLoading: false,
        permissions: [],
        roles: [],
        session: null
      },
      router: {
        currentRoute: {
          path: '/',
          params: {},
          query: {},
          hash: '',
          fullPath: '/',
          matched: [],
          meta: {},
          timestamp: new Date().toISOString()
        },
        history: [],
        loading: false,
        error: null,
        cache: {},
        guards: {
          beforeEach: false,
          afterEach: false
        }
      },
      notification: {
        notifications: [],
        unreadCount: 0,
        settings: {
          enabled: true,
          sound: true,
          desktop: true,
          email: true,
          categories: [],
          doNotDisturb: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00'
          }
        },
        loading: false,
        error: null
      },
      system: {
        info: {
          name: 'Qiankun Micro Frontend Demo',
          version: '1.0.0',
          buildTime: new Date().toISOString(),
          environment: (typeof process !== 'undefined' && process.env.NODE_ENV as any) || 'development',
          nodeVersion: typeof process !== 'undefined' && process.version || 'unknown',
          platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
          uptime: 0
        },
        performance: {
          memory: {
            used: 0,
            total: 0,
            percentage: 0
          },
          cpu: {
            usage: 0,
            cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1
          },
          network: {
            latency: 0,
            bandwidth: 0
          },
          responseTime: {
            average: 0,
            p95: 0,
            p99: 0
          }
        },
        errors: [],
        config: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
          sessionTimeout: 30 * 60 * 1000, // 30分钟
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSymbols: false
          },
          rateLimiting: {
            enabled: true,
            maxRequests: 100,
            windowMs: 60 * 1000 // 1分钟
          }
        },
        features: {},
        maintenance: {
          enabled: false
        }
      }
    };

    return { ...defaultState, ...initialState };
  }

  /**
   * 获取当前状态
   */
  getState(): GlobalState {
    return { ...this.state };
  }

  /**
   * 设置状态
   */
  setState(newState: Partial<GlobalState>): void {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };

    if (this.debug) {
      console.log('[GlobalState] State updated:', { prevState, newState: this.state });
    }

    // 通知所有监听器
    this.listeners.forEach(listener => {
      try {
        listener(this.state, prevState);
      } catch (error) {
        console.error('[GlobalState] Error in state listener:', error);
      }
    });

    // 发射状态更新事件
    globalEventBus.emit({
      type: EVENT_TYPES.DATA_UPDATE,
      source: 'global-state',
      timestamp: new Date().toISOString(),
      id: `state-update-${Date.now()}`,
      data: {
        entity: 'global-state',
        action: 'update',
        data: newState
      }
    });
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);

    if (this.debug) {
      console.log('[GlobalState] Added state listener');
    }

    return () => {
      this.listeners.delete(listener);
      if (this.debug) {
        console.log('[GlobalState] Removed state listener');
      }
    };
  }

  /**
   * 派发动作
   */
  dispatch(action: StateAction): void {
    if (this.debug) {
      console.log('[GlobalState] Dispatching action:', action);
    }

    // 执行中间件
    let index = 0;
    const next = () => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        middleware(action, this.state, next);
      } else {
        this.executeAction(action);
      }
    };

    next();
  }

  /**
   * 执行动作
   */
  private executeAction(action: StateAction): void {
    const { type, payload } = action;

    switch (type) {
      case 'SET_USER':
        this.setState({
          user: { ...this.state.user, ...payload }
        });
        break;

      case 'SET_THEME':
        this.setState({
          theme: { ...this.state.theme, ...payload }
        });
        break;

      case 'SET_AUTH':
        this.setState({
          auth: { ...this.state.auth, ...payload }
        });
        break;

      case 'SET_ROUTER':
        this.setState({
          router: { ...this.state.router, ...payload }
        });
        break;

      case 'SET_NOTIFICATION':
        this.setState({
          notification: { ...this.state.notification, ...payload }
        });
        break;

      case 'SET_SYSTEM':
        this.setState({
          system: { ...this.state.system, ...payload }
        });
        break;

      case 'SET_APP':
        this.setState({
          app: { ...this.state.app, ...payload }
        });
        break;

      default:
        console.warn(`[GlobalState] Unknown action type: ${type}`);
    }
  }

  /**
   * 添加中间件
   */
  use(middleware: (action: StateAction, state: GlobalState, next: Function) => void): void {
    this.middleware.push(middleware);
  }

  /**
   * 清除所有监听器
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.state = this.createInitialState();
    this.listeners.forEach(listener => {
      try {
        listener(this.state, {} as GlobalState);
      } catch (error) {
        console.error('[GlobalState] Error in state listener during reset:', error);
      }
    });
  }
}

/**
 * 全局状态管理器实例
 */
export const globalStateManager = new GlobalStateManager();

/**
 * 状态选择器工具函数
 */
export function createSelector<T>(selector: (state: GlobalState) => T) {
  return (state: GlobalState) => selector(state);
}

/**
 * 常用状态选择器
 */
export const selectors = {
  // 用户相关
  getCurrentUser: createSelector(state => state.user.currentUser),
  getIsAuthenticated: createSelector(state => state.user.isAuthenticated),
  getUserPermissions: createSelector(state => state.user.permissions),
  getUserRoles: createSelector(state => state.user.roles),

  // 主题相关
  getCurrentTheme: createSelector(state => state.theme.current),
  getThemeConfig: createSelector(state => state.theme.config),

  // 应用相关
  getAppConfig: createSelector(state => state.app.config),
  getMicroApps: createSelector(state => state.app.microApps),
  getActiveMicroApp: createSelector(state => state.app.activeMicroApp),
  getMenus: createSelector(state => state.app.menus),

  // 路由相关
  getCurrentRoute: createSelector(state => state.router.currentRoute),
  getRouterHistory: createSelector(state => state.router.history),

  // 通知相关
  getNotifications: createSelector(state => state.notification.notifications),
  getUnreadCount: createSelector(state => state.notification.unreadCount),

  // 系统相关
  getSystemInfo: createSelector(state => state.system.info),
  getSystemPerformance: createSelector(state => state.system.performance)
};

/**
 * 动作创建器
 */
export const actions = {
  // 用户动作
  setUser: (user: any) => ({ type: 'SET_USER', payload: { currentUser: user } }),
  setAuthenticated: (isAuthenticated: boolean) => ({ type: 'SET_USER', payload: { isAuthenticated } }),
  setPermissions: (permissions: string[]) => ({ type: 'SET_USER', payload: { permissions } }),
  setRoles: (roles: string[]) => ({ type: 'SET_USER', payload: { roles } }),

  // 主题动作
  setTheme: (theme: 'light' | 'dark') => ({ type: 'SET_THEME', payload: { current: theme } }),
  setThemeConfig: (config: any) => ({ type: 'SET_THEME', payload: { config } }),

  // 认证动作
  setTokens: (accessToken: string, refreshToken: string) => ({
    type: 'SET_AUTH',
    payload: { accessToken, refreshToken, isLoggedIn: true }
  }),
  clearTokens: () => ({
    type: 'SET_AUTH',
    payload: { accessToken: null, refreshToken: null, isLoggedIn: false }
  }),

  // 路由动作
  setCurrentRoute: (route: any) => ({ type: 'SET_ROUTER', payload: { currentRoute: route } }),
  addToHistory: (route: any) => ({
    type: 'SET_ROUTER',
    payload: { history: [...globalStateManager.getState().router.history, route] }
  }),

  // 通知动作
  addNotification: (notification: any) => ({
    type: 'SET_NOTIFICATION',
    payload: {
      notifications: [...globalStateManager.getState().notification.notifications, notification],
      unreadCount: globalStateManager.getState().notification.unreadCount + 1
    }
  }),
  markAsRead: (notificationId: string) => {
    const notifications = globalStateManager.getState().notification.notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    const unreadCount = notifications.filter(n => !n.read).length;
    return {
      type: 'SET_NOTIFICATION',
      payload: { notifications, unreadCount }
    };
  },

  // 应用动作
  setMicroApps: (microApps: any[]) => ({ type: 'SET_APP', payload: { microApps } }),
  setActiveMicroApp: (activeMicroApp: string) => ({ type: 'SET_APP', payload: { activeMicroApp } }),
  setMenus: (menus: any[]) => ({ type: 'SET_APP', payload: { menus } }),
  setBreadcrumbs: (breadcrumbs: any[]) => ({ type: 'SET_APP', payload: { breadcrumbs } })
};

/**
 * React Hook for global state
 */
export function useGlobalState() {
  const [state, setState] = React.useState(globalStateManager.getState());

  React.useEffect(() => {
    const unsubscribe = globalStateManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const dispatch = React.useCallback((action: StateAction) => {
    globalStateManager.dispatch(action);
  }, []);

  return {
    state,
    dispatch,
    actions,
    selectors: Object.keys(selectors).reduce((acc, key) => {
      acc[key] = selectors[key as keyof typeof selectors](state);
      return acc;
    }, {} as any)
  };
}

/**
 * 状态持久化
 */
export class StatePersistence {
  private key: string = 'qiankun-global-state';
  private storage: Storage;

  constructor(storage: Storage = localStorage, key?: string) {
    this.storage = storage;
    if (key) this.key = key;
  }

  /**
   * 保存状态到存储
   */
  save(state: GlobalState): void {
    try {
      const serializedState = JSON.stringify(state);
      this.storage.setItem(this.key, serializedState);
    } catch (error) {
      console.error('[StatePersistence] Failed to save state:', error);
    }
  }

  /**
   * 从存储加载状态
   */
  load(): Partial<GlobalState> | null {
    try {
      const serializedState = this.storage.getItem(this.key);
      if (serializedState) {
        return JSON.parse(serializedState);
      }
    } catch (error) {
      console.error('[StatePersistence] Failed to load state:', error);
    }
    return null;
  }

  /**
   * 清除存储的状态
   */
  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch (error) {
      console.error('[StatePersistence] Failed to clear state:', error);
    }
  }
}

// 创建持久化实例
export const statePersistence = new StatePersistence();

// 自动保存状态变化
globalStateManager.subscribe((state) => {
  statePersistence.save(state);
});