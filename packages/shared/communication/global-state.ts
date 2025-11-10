/**
 * 全局状态管理 - 微前端应用间共享状态
 * 提供跨应用的状态同步机制，支持中间件和状态历史管理
 */

import { globalEventBus } from './event-bus';
import { GlobalState, StateListener, StateAction } from '../types/store';
import { EVENT_TYPES } from '../types/events';
import { StateMiddlewareManager, StateMiddleware } from './middleware/state-middleware';

// React import (only available in React environments)
let React: any;
try {
  if (typeof window !== 'undefined' && (window as any).React) {
    React = (window as any).React;
  }
} catch {
  // React not available, hooks will not work
}

// 类型声明
declare const process: any;

// ==================== 状态历史管理 ====================

export interface StateSnapshot {
  id: string;
  timestamp: string;
  state: GlobalState;
  action?: StateAction;
  description?: string;
}

export interface StateHistoryOptions {
  maxSnapshots?: number;
  enableTimeTravel?: boolean;
  autoSnapshot?: boolean;
  snapshotInterval?: number;
}

export class StateHistoryManager {
  private snapshots: StateSnapshot[] = [];
  private currentIndex: number = -1;
  private maxSnapshots: number;
  private enableTimeTravel: boolean;
  private autoSnapshot: boolean;
  private snapshotInterval: number;
  private lastSnapshotTime: number = 0;

  constructor(options: StateHistoryOptions = {}) {
    this.maxSnapshots = options.maxSnapshots || 50;
    this.enableTimeTravel = options.enableTimeTravel !== false;
    this.autoSnapshot = options.autoSnapshot !== false;
    this.snapshotInterval = options.snapshotInterval || 1000; // 1秒
  }

  /**
   * 创建状态快照
   */
  createSnapshot(state: GlobalState, action?: StateAction, description?: string): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)), // 深拷贝
      action,
      description
    };

    // 如果启用时间旅行，移除当前位置之后的快照
    if (this.enableTimeTravel && this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }

    this.snapshots.push(snapshot);
    this.currentIndex = this.snapshots.length - 1;

    // 保持快照数量在限制内
    if (this.snapshots.length > this.maxSnapshots) {
      const removeCount = this.snapshots.length - this.maxSnapshots;
      this.snapshots.splice(0, removeCount);
      this.currentIndex -= removeCount;
    }

    this.lastSnapshotTime = Date.now();
    return snapshot;
  }

  /**
   * 检查是否应该创建自动快照
   */
  shouldCreateAutoSnapshot(): boolean {
    if (!this.autoSnapshot) return false;
    return Date.now() - this.lastSnapshotTime >= this.snapshotInterval;
  }

  /**
   * 撤销到上一个状态
   */
  undo(): StateSnapshot | null {
    if (!this.enableTimeTravel || this.currentIndex <= 0) {
      return null;
    }

    this.currentIndex--;
    return this.snapshots[this.currentIndex];
  }

  /**
   * 重做到下一个状态
   */
  redo(): StateSnapshot | null {
    if (!this.enableTimeTravel || this.currentIndex >= this.snapshots.length - 1) {
      return null;
    }

    this.currentIndex++;
    return this.snapshots[this.currentIndex];
  }

  /**
   * 跳转到指定快照
   */
  jumpTo(snapshotId: string): StateSnapshot | null {
    if (!this.enableTimeTravel) return null;

    const index = this.snapshots.findIndex(s => s.id === snapshotId);
    if (index === -1) return null;

    this.currentIndex = index;
    return this.snapshots[index];
  }

  /**
   * 获取所有快照
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 获取当前快照
   */
  getCurrentSnapshot(): StateSnapshot | null {
    return this.currentIndex >= 0 ? this.snapshots[this.currentIndex] : null;
  }

  /**
   * 清除所有快照
   */
  clear(): void {
    this.snapshots = [];
    this.currentIndex = -1;
  }

  /**
   * 获取历史统计信息
   */
  getStats(): {
    totalSnapshots: number;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    memoryUsage: number;
  } {
    const memoryUsage = JSON.stringify(this.snapshots).length;
    
    return {
      totalSnapshots: this.snapshots.length,
      currentIndex: this.currentIndex,
      canUndo: this.currentIndex > 0,
      canRedo: this.currentIndex < this.snapshots.length - 1,
      memoryUsage
    };
  }
}

/**
 * 增强全局状态管理器
 */
export class GlobalStateManager {
  private state: GlobalState;
  private listeners: Set<StateListener> = new Set();
  private middleware: Array<(action: StateAction, state: GlobalState, next: Function) => void> = [];
  private middlewareManager: StateMiddlewareManager;
  private historyManager: StateHistoryManager;
  private debug: boolean = false;

  constructor(
    initialState?: Partial<GlobalState>,
    options?: {
      historyOptions?: StateHistoryOptions;
      debug?: boolean;
    }
  ) {
    this.state = this.createInitialState(initialState);
    this.debug = options?.debug ?? (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');
    
    // 初始化中间件管理器
    this.middlewareManager = new StateMiddlewareManager({
      debug: this.debug,
      performanceTracking: true
    });

    // 初始化状态历史管理器
    this.historyManager = new StateHistoryManager(options?.historyOptions);

    // 创建初始快照
    this.historyManager.createSnapshot(this.state, undefined, 'Initial state');
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
          apiBaseUrl: (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) || 'http://localhost:3001',
          enableDevTools: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
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
          environment: (typeof process !== 'undefined' && process.env?.NODE_ENV as any) || 'development',
          nodeVersion: (typeof process !== 'undefined' && process.version) || 'unknown',
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

    // 创建状态快照（如果需要）
    if (this.historyManager.shouldCreateAutoSnapshot()) {
      this.historyManager.createSnapshot(this.state, undefined, 'Auto snapshot');
    }

    // 通知所有监听器
    this.listeners.forEach(listener => {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error('[GlobalState] Error in state listener:', err);
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
   * 派发动作 - 增强版本，支持状态中间件
   */
  async dispatch(action: StateAction): Promise<void> {
    if (this.debug) {
      console.log('[GlobalState] Dispatching action:', action);
    }

    // 创建动作快照
    const prevState = { ...this.state };

    try {
      // 通过状态中间件处理动作
      await this.middlewareManager.processAction(action, this.state, (processedAction) => {
        this.executeAction(processedAction);
      });

      // 如果状态发生变化，创建快照
      if (JSON.stringify(prevState) !== JSON.stringify(this.state)) {
        this.historyManager.createSnapshot(this.state, action, `Action: ${action.type}`);
      }

    } catch (err) {
      console.error('[GlobalState] Error processing action:', err);
      // 可以选择是否回滚状态
      if (this.shouldRollbackOnError(err)) {
        this.state = prevState;
      }
      throw err;
    }

    // 执行传统中间件（向后兼容）
    let index = 0;
    const next = () => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        middleware(action, this.state, next);
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
    const prevState = { ...this.state };
    this.state = this.createInitialState();
    
    // 创建重置快照
    this.historyManager.createSnapshot(this.state, undefined, 'State reset');
    
    this.listeners.forEach(listener => {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error('[GlobalState] Error in state listener during reset:', err);
      }
    });
  }

  /**
   * 判断是否在错误时回滚状态
   */
  private shouldRollbackOnError(_err: any): boolean {
    // 可以根据错误类型决定是否回滚
    return false; // 默认不回滚
  }

  // ==================== 状态中间件管理 ====================

  /**
   * 添加状态中间件
   */
  useStateMiddleware(middleware: StateMiddleware): void {
    this.middlewareManager.use(middleware);
  }

  /**
   * 移除状态中间件
   */
  removeStateMiddleware(middlewareName: string): boolean {
    return this.middlewareManager.remove(middlewareName);
  }

  /**
   * 获取状态中间件列表
   */
  getStateMiddleware(): StateMiddleware[] {
    return this.middlewareManager.getMiddleware();
  }

  /**
   * 启用/禁用状态中间件
   */
  toggleStateMiddleware(middlewareName: string, enabled: boolean): boolean {
    return this.middlewareManager.toggle(middlewareName, enabled);
  }

  /**
   * 获取状态中间件统计信息
   */
  getStateMiddlewareStats() {
    return this.middlewareManager.getStats();
  }

  /**
   * 清除所有状态中间件
   */
  clearStateMiddleware(): void {
    this.middlewareManager.clear();
  }

  // ==================== 状态历史管理 ====================

  /**
   * 创建状态快照
   */
  createSnapshot(description?: string): StateSnapshot {
    return this.historyManager.createSnapshot(this.state, undefined, description);
  }

  /**
   * 撤销到上一个状态
   */
  undo(): boolean {
    const snapshot = this.historyManager.undo();
    if (snapshot) {
      const prevState = { ...this.state };
      this.state = snapshot.state;
      
      // 通知监听器
      this.listeners.forEach(listener => {
        try {
          listener(this.state, prevState);
        } catch (err) {
          console.error('[GlobalState] Error in state listener during undo:', err);
        }
      });

      if (this.debug) {
        console.log('[GlobalState] State undone to snapshot:', snapshot.id);
      }
      
      return true;
    }
    return false;
  }

  /**
   * 重做到下一个状态
   */
  redo(): boolean {
    const snapshot = this.historyManager.redo();
    if (snapshot) {
      const prevState = { ...this.state };
      this.state = snapshot.state;
      
      // 通知监听器
      this.listeners.forEach(listener => {
        try {
          listener(this.state, prevState);
        } catch (err) {
          console.error('[GlobalState] Error in state listener during redo:', err);
        }
      });

      if (this.debug) {
        console.log('[GlobalState] State redone to snapshot:', snapshot.id);
      }
      
      return true;
    }
    return false;
  }

  /**
   * 跳转到指定快照
   */
  jumpToSnapshot(snapshotId: string): boolean {
    const snapshot = this.historyManager.jumpTo(snapshotId);
    if (snapshot) {
      const prevState = { ...this.state };
      this.state = snapshot.state;
      
      // 通知监听器
      this.listeners.forEach(listener => {
        try {
          listener(this.state, prevState);
        } catch (err) {
          console.error('[GlobalState] Error in state listener during jump:', err);
        }
      });

      if (this.debug) {
        console.log('[GlobalState] State jumped to snapshot:', snapshot.id);
      }
      
      return true;
    }
    return false;
  }

  /**
   * 获取所有状态快照
   */
  getSnapshots(): StateSnapshot[] {
    return this.historyManager.getSnapshots();
  }

  /**
   * 获取当前快照
   */
  getCurrentSnapshot(): StateSnapshot | null {
    return this.historyManager.getCurrentSnapshot();
  }

  /**
   * 清除状态历史
   */
  clearHistory(): void {
    this.historyManager.clear();
    // 创建当前状态的快照
    this.historyManager.createSnapshot(this.state, undefined, 'History cleared');
  }

  /**
   * 获取状态历史统计信息
   */
  getHistoryStats() {
    return this.historyManager.getStats();
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.historyManager.getStats().canUndo;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.historyManager.getStats().canRedo;
  }
}

/**
 * 全局状态管理器实例
 */
export const globalStateManager = new GlobalStateManager(undefined, {
  debug: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
  historyOptions: {
    maxSnapshots: 50,
    enableTimeTravel: true,
    autoSnapshot: true,
    snapshotInterval: 2000 // 2秒
  }
});

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
  if (!React) {
    throw new Error('React is not available. Make sure you are using this hook in a React environment.');
  }

  const [state, setState] = React.useState(globalStateManager.getState());

  React.useEffect(() => {
    const unsubscribe = globalStateManager.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const dispatch = React.useCallback(async (action: StateAction) => {
    await globalStateManager.dispatch(action);
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
    } catch (err) {
      console.error('[StatePersistence] Failed to save state:', err);
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
    } catch (err) {
      console.error('[StatePersistence] Failed to load state:', err);
    }
    return null;
  }

  /**
   * 清除存储的状态
   */
  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch (err) {
      console.error('[StatePersistence] Failed to clear state:', err);
    }
  }
}

// 创建持久化实例
export const statePersistence = new StatePersistence();

// 自动保存状态变化
globalStateManager.subscribe((state) => {
  statePersistence.save(state);
});