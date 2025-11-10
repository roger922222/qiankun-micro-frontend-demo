import { CachedData, CacheConfig } from '../types/common';

// 存储工具类
export class StorageUtil {
  private static prefix = 'react-app-4:';

  // 设置本地存储
  static setItem<T>(key: string, value: T): void {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(this.prefix + key, serializedValue);
    } catch (error) {
      console.error('Failed to set localStorage item:', error);
    }
  }

  // 获取本地存储
  static getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error('Failed to get localStorage item:', error);
      return defaultValue || null;
    }
  }

  // 删除本地存储
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Failed to remove localStorage item:', error);
    }
  }

  // 清空所有存储
  static clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  // 获取存储大小
  static getStorageSize(): number {
    try {
      let size = 0;
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          size += localStorage.getItem(key)?.length || 0;
        }
      });
      return size;
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
      return 0;
    }
  }

  // Session Storage 相关方法
  static setSessionItem<T>(key: string, value: T): void {
    try {
      const serializedValue = JSON.stringify(value);
      sessionStorage.setItem(this.prefix + key, serializedValue);
    } catch (error) {
      console.error('Failed to set sessionStorage item:', error);
    }
  }

  static getSessionItem<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      if (item === null) {
        return defaultValue || null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.error('Failed to get sessionStorage item:', error);
      return defaultValue || null;
    }
  }

  static removeSessionItem(key: string): void {
    try {
      sessionStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Failed to remove sessionStorage item:', error);
    }
  }

  // 检查存储是否可用
  static isStorageAvailable(type: 'localStorage' | 'sessionStorage' = 'localStorage'): boolean {
    try {
      const storage = type === 'localStorage' ? localStorage : sessionStorage;
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

// 持久化状态管理
export class PersistenceManager {
  private static readonly PERSISTENCE_KEY = 'store-persistence';
  private static readonly VERSION = '1.0.0';

  // 保存状态到本地存储
  static saveState<T>(key: string, state: T, options?: { ttl?: number }): void {
    const data = {
      version: this.VERSION,
      timestamp: Date.now(),
      ttl: options?.ttl,
      data: state,
    };
    StorageUtil.setItem(key, data);
  }

  // 从本地存储恢复状态
  static loadState<T>(key: string): T | null {
    const stored = StorageUtil.getItem<{
      version: string;
      timestamp: number;
      ttl?: number;
      data: T;
    }>(key);

    if (!stored) {
      return null;
    }

    // 检查版本兼容性
    if (stored.version !== this.VERSION) {
      console.warn(`State version mismatch for key ${key}, clearing stored data`);
      StorageUtil.removeItem(key);
      return null;
    }

    // 检查 TTL
    if (stored.ttl && Date.now() - stored.timestamp > stored.ttl) {
      console.info(`Stored data for key ${key} has expired, clearing`);
      StorageUtil.removeItem(key);
      return null;
    }

    return stored.data;
  }

  // 清理过期数据
  static cleanupExpiredData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(StorageUtil['prefix'])) {
          const stored = StorageUtil.getItem<{
            timestamp: number;
            ttl?: number;
          }>(key.replace(StorageUtil['prefix'], ''));
          
          if (stored?.ttl && Date.now() - stored.timestamp > stored.ttl) {
            StorageUtil.removeItem(key.replace(StorageUtil['prefix'], ''));
          }
        }
      });
    } catch (error) {
      console.error('Failed to cleanup expired data:', error);
    }
  }

  // 获取所有持久化的键
  static getPersistedKeys(): string[] {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(StorageUtil['prefix']))
        .map(key => key.replace(StorageUtil['prefix'], ''));
    } catch (error) {
      console.error('Failed to get persisted keys:', error);
      return [];
    }
  }
}

// 状态迁移工具
export class StateMigration {
  private static migrations: Record<string, (oldState: any) => any> = {};

  // 注册迁移函数
  static registerMigration(fromVersion: string, toVersion: string, migrationFn: (oldState: any) => any): void {
    const key = `${fromVersion}->${toVersion}`;
    this.migrations[key] = migrationFn;
  }

  // 执行状态迁移
  static migrate(oldState: any, fromVersion: string, toVersion: string): any {
    const key = `${fromVersion}->${toVersion}`;
    const migrationFn = this.migrations[key];
    
    if (!migrationFn) {
      console.warn(`No migration found for ${key}`);
      return oldState;
    }

    try {
      return migrationFn(oldState);
    } catch (error) {
      console.error(`Migration failed for ${key}:`, error);
      return oldState;
    }
  }
}

// 默认迁移函数注册
StateMigration.registerMigration('0.9.0', '1.0.0', (oldState) => {
  // 示例：从旧版本迁移到新版本
  return {
    ...oldState,
    version: '1.0.0',
    // 添加新字段或转换旧字段
  };
});