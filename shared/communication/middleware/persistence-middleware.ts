/**
 * 状态持久化中间件 - 自动保存和恢复状态
 * 提供状态的持久化存储和恢复机制
 */

import { GlobalState, StateAction } from '../../types/store';
import { StateMiddleware } from './state-middleware';

// ==================== 持久化存储接口 ====================

export interface PersistenceStorage {
  /**
   * 保存数据
   */
  setItem(key: string, value: string): Promise<void> | void;

  /**
   * 获取数据
   */
  getItem(key: string): Promise<string | null> | string | null;

  /**
   * 删除数据
   */
  removeItem(key: string): Promise<void> | void;

  /**
   * 清除所有数据
   */
  clear(): Promise<void> | void;

  /**
   * 获取所有键
   */
  getAllKeys?(): Promise<string[]> | string[];
}

// ==================== 内置存储实现 ====================

/**
 * LocalStorage 存储实现
 */
export class LocalStoragePersistence implements PersistenceStorage {
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('[LocalStoragePersistence] Failed to save to localStorage:', error);
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[LocalStoragePersistence] Failed to read from localStorage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[LocalStoragePersistence] Failed to remove from localStorage:', error);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('[LocalStoragePersistence] Failed to clear localStorage:', error);
    }
  }

  getAllKeys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('[LocalStoragePersistence] Failed to get keys from localStorage:', error);
      return [];
    }
  }
}

/**
 * SessionStorage 存储实现
 */
export class SessionStoragePersistence implements PersistenceStorage {
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.error('[SessionStoragePersistence] Failed to save to sessionStorage:', error);
    }
  }

  getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('[SessionStoragePersistence] Failed to read from sessionStorage:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('[SessionStoragePersistence] Failed to remove from sessionStorage:', error);
    }
  }

  clear(): void {
    try {
      sessionStorage.clear();
    } catch (error) {
      console.error('[SessionStoragePersistence] Failed to clear sessionStorage:', error);
    }
  }

  getAllKeys(): string[] {
    try {
      return Object.keys(sessionStorage);
    } catch (error) {
      console.error('[SessionStoragePersistence] Failed to get keys from sessionStorage:', error);
      return [];
    }
  }
}

/**
 * 内存存储实现（用于测试或不支持持久化的环境）
 */
export class MemoryPersistence implements PersistenceStorage {
  private storage: Map<string, string> = new Map();

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.storage.keys());
  }
}

// ==================== 持久化配置 ====================

export interface PersistenceConfig {
  /**
   * 存储键前缀
   */
  keyPrefix: string;

  /**
   * 需要持久化的状态路径
   */
  persistPaths: string[];

  /**
   * 需要排除的状态路径
   */
  excludePaths?: string[];

  /**
   * 序列化函数
   */
  serialize?: (state: any) => string;

  /**
   * 反序列化函数
   */
  deserialize?: (data: string) => any;

  /**
   * 持久化触发条件
   */
  trigger?: 'action' | 'state-change' | 'manual';

  /**
   * 防抖延迟（毫秒）
   */
  debounceMs?: number;

  /**
   * 版本号（用于数据迁移）
   */
  version?: string;

  /**
   * 数据迁移函数
   */
  migrate?: (persistedState: any, version: string) => any;
}

// ==================== 状态路径工具 ====================

class StatePathUtils {
  /**
   * 根据路径获取状态值
   */
  static getValueByPath(state: any, path: string): any {
    const keys = path.split('.');
    let current = state;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * 根据路径设置状态值
   */
  static setValueByPath(state: any, path: string, value: any): any {
    const keys = path.split('.');
    const result = { ...state };
    let current = result;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      } else {
        current[key] = { ...current[key] };
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return result;
  }

  /**
   * 检查路径是否匹配
   */
  static isPathMatched(path: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      if (pattern === '*') return true;
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        return path.startsWith(prefix);
      }
      return path === pattern;
    });
  }

  /**
   * 提取需要持久化的状态
   */
  static extractPersistentState(
    state: GlobalState,
    persistPaths: string[],
    excludePaths: string[] = []
  ): Partial<GlobalState> {
    const result: any = {};
    
    for (const path of persistPaths) {
      if (this.isPathMatched(path, excludePaths)) {
        continue;
      }
      
      const value = this.getValueByPath(state, path);
      if (value !== undefined) {
        this.setValueByPath(result, path, value);
      }
    }
    
    return result;
  }
}

// ==================== 持久化中间件 ====================

export interface PersistenceMiddlewareOptions {
  storage?: PersistenceStorage;
  config?: PersistenceConfig;
  debug?: boolean;
  onPersistError?: (error: Error, action: StateAction) => void;
  onRestoreError?: (error: Error, key: string) => void;
}

export class PersistenceMiddleware implements StateMiddleware {
  public readonly name = 'persistence';
  public readonly priority = 90; // 较低优先级，在其他中间件之后执行

  private storage: PersistenceStorage;
  private config: PersistenceConfig;
  private debug: boolean;
  private onPersistError?: (error: Error, action: StateAction) => void;
  private onRestoreError?: (error: Error, key: string) => void;
  private debounceTimer?: any;

  constructor(options: PersistenceMiddlewareOptions = {}) {
    this.storage = options.storage || new LocalStoragePersistence();
    this.config = {
      keyPrefix: 'qiankun-state',
      persistPaths: ['user', 'auth', 'theme'],
      trigger: 'action',
      debounceMs: 300,
      version: '1.0.0',
      serialize: JSON.stringify,
      deserialize: JSON.parse,
      ...options.config
    };
    this.debug = options.debug || false;
    this.onPersistError = options.onPersistError;
    this.onRestoreError = options.onRestoreError;
  }

  process(
    action: StateAction,
    currentState: GlobalState,
    next: (action: StateAction) => void
  ): void {
    // 执行下一个中间件
    next(action);

    // 根据触发条件决定是否持久化
    if (this.config.trigger === 'action' || this.config.trigger === 'state-change') {
      this.debouncedPersist(currentState, action);
    }
  }

  /**
   * 防抖持久化
   */
  private debouncedPersist(state: GlobalState, action: StateAction): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.persistState(state, action);
    }, this.config.debounceMs);
  }

  /**
   * 持久化状态
   */
  async persistState(state: GlobalState, action?: StateAction): Promise<void> {
    try {
      if (this.debug) {
        console.log('[PersistenceMiddleware] Persisting state...', action?.type);
      }

      // 提取需要持久化的状态
      const persistentState = StatePathUtils.extractPersistentState(
        state,
        this.config.persistPaths,
        this.config.excludePaths
      );

      // 添加版本信息
      const dataToSave = {
        version: this.config.version,
        timestamp: new Date().toISOString(),
        state: persistentState
      };

      // 序列化数据
      const serializedData = this.config.serialize!(dataToSave);

      // 保存到存储
      const key = `${this.config.keyPrefix}-state`;
      await this.storage.setItem(key, serializedData);

      if (this.debug) {
        console.log('[PersistenceMiddleware] State persisted successfully');
      }

    } catch (error) {
      console.error('[PersistenceMiddleware] Failed to persist state:', error);
      
      if (this.onPersistError && action) {
        this.onPersistError(error as Error, action);
      }
    }
  }

  /**
   * 恢复状态
   */
  async restoreState(): Promise<Partial<GlobalState> | null> {
    try {
      const key = `${this.config.keyPrefix}-state`;
      const serializedData = await this.storage.getItem(key);

      if (!serializedData) {
        if (this.debug) {
          console.log('[PersistenceMiddleware] No persisted state found');
        }
        return null;
      }

      // 反序列化数据
      const data = this.config.deserialize!(serializedData);

      // 检查版本并执行迁移
      if (data.version !== this.config.version && this.config.migrate) {
        if (this.debug) {
          console.log(`[PersistenceMiddleware] Migrating state from version ${data.version} to ${this.config.version}`);
        }
        data.state = this.config.migrate(data.state, data.version);
      }

      if (this.debug) {
        console.log('[PersistenceMiddleware] State restored successfully');
      }

      return data.state;

    } catch (error) {
      console.error('[PersistenceMiddleware] Failed to restore state:', error);
      
      if (this.onRestoreError) {
        this.onRestoreError(error as Error, `${this.config.keyPrefix}-state`);
      }
      
      return null;
    }
  }

  /**
   * 清除持久化数据
   */
  async clearPersistedState(): Promise<void> {
    try {
      const key = `${this.config.keyPrefix}-state`;
      await this.storage.removeItem(key);
      
      if (this.debug) {
        console.log('[PersistenceMiddleware] Persisted state cleared');
      }
    } catch (error) {
      console.error('[PersistenceMiddleware] Failed to clear persisted state:', error);
    }
  }

  /**
   * 手动触发持久化
   */
  async manualPersist(state: GlobalState): Promise<void> {
    await this.persistState(state);
  }

  /**
   * 获取持久化信息
   */
  async getPersistenceInfo(): Promise<{
    hasPersistedData: boolean;
    timestamp?: string;
    version?: string;
    size?: number;
  }> {
    try {
      const key = `${this.config.keyPrefix}-state`;
      const serializedData = await this.storage.getItem(key);

      if (!serializedData) {
        return { hasPersistedData: false };
      }

      const data = this.config.deserialize!(serializedData);
      
      return {
        hasPersistedData: true,
        timestamp: data.timestamp,
        version: data.version,
        size: serializedData.length
      };
    } catch (error) {
      console.error('[PersistenceMiddleware] Failed to get persistence info:', error);
      return { hasPersistedData: false };
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<PersistenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 设置存储
   */
  setStorage(storage: PersistenceStorage): void {
    this.storage = storage;
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建持久化中间件
 */
export function createPersistenceMiddleware(options: PersistenceMiddlewareOptions = {}): PersistenceMiddleware {
  return new PersistenceMiddleware(options);
}

/**
 * 创建基础持久化配置
 */
export function createBasicPersistenceConfig(): PersistenceConfig {
  return {
    keyPrefix: 'qiankun-state',
    persistPaths: [
      'user.currentUser',
      'user.preferences',
      'user.isAuthenticated',
      'auth.accessToken',
      'auth.refreshToken',
      'auth.isLoggedIn',
      'theme.current',
      'theme.config'
    ],
    excludePaths: [
      'user.loginTime',
      'user.lastActivity',
      'auth.loginLoading'
    ],
    trigger: 'action',
    debounceMs: 500,
    version: '1.0.0'
  };
}

/**
 * 创建开发环境持久化中间件
 */
export function createDevPersistenceMiddleware(): PersistenceMiddleware {
  return new PersistenceMiddleware({
    storage: new SessionStoragePersistence(), // 开发环境使用 sessionStorage
    config: {
      ...createBasicPersistenceConfig(),
      debounceMs: 100, // 更快的响应
      keyPrefix: 'qiankun-dev-state'
    },
    debug: true
  });
}

/**
 * 创建生产环境持久化中间件
 */
export function createProdPersistenceMiddleware(): PersistenceMiddleware {
  return new PersistenceMiddleware({
    storage: new LocalStoragePersistence(),
    config: createBasicPersistenceConfig(),
    debug: false
  });
}

// ==================== 导出 ====================
// 所有导出已在上面通过 export 关键字直接声明，无需重复导出