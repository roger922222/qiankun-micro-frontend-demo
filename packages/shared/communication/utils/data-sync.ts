/**
 * 数据同步工具 - 微前端跨应用数据同步
 * 提供跨应用数据同步、版本控制、冲突检测等功能
 */

import { BaseEvent } from '../../types/events';
import { GlobalState } from '../../types/store';
import { globalEventBus } from '../event-bus';
import { globalStateManager } from '../global-state';
import { globalErrorManager } from '../error/error-manager';

// ==================== 类型定义 ====================

export interface SyncConfig {
  id: string;
  name: string;
  dataPath: string;
  syncMode: SyncMode;
  conflictResolution: ConflictResolutionStrategy;
  syncInterval?: number;
  enableVersioning: boolean;
  enableConflictDetection: boolean;
  syncTargets: string[];
  metadata?: Record<string, any>;
}

export interface SyncData {
  id: string;
  path: string;
  value: any;
  version: number;
  timestamp: string;
  source: string;
  checksum: string;
  metadata?: Record<string, any>;
}

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  configId: string;
  data: SyncData;
  status: SyncStatus;
  startTime: string;
  endTime?: string;
  error?: string;
  retryCount: number;
}

export interface ConflictInfo {
  id: string;
  path: string;
  localData: SyncData;
  remoteData: SyncData;
  conflictType: ConflictType;
  timestamp: string;
  resolved: boolean;
  resolution?: ConflictResolution;
}

export interface SyncStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  conflictsDetected: number;
  conflictsResolved: number;
  averageSyncTime: number;
  lastSyncTime?: string;
  dataSize: number;
}

export type SyncMode = 'manual' | 'automatic' | 'real-time' | 'scheduled';
export type SyncOperationType = 'push' | 'pull' | 'merge' | 'resolve-conflict';
export type SyncStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
export type ConflictType = 'version' | 'timestamp' | 'content' | 'structure';
export type ConflictResolutionStrategy = 'local-wins' | 'remote-wins' | 'merge' | 'manual' | 'timestamp-based';

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy;
  resolvedValue: any;
  resolvedBy: string;
  timestamp: string;
}

// ==================== 数据同步器实现 ====================

export class DataSynchronizer {
  private configs: Map<string, SyncConfig> = new Map();
  private operations: Map<string, SyncOperation> = new Map();
  private conflicts: Map<string, ConflictInfo> = new Map();
  private dataVersions: Map<string, number> = new Map();
  private syncTimers: Map<string, NodeJS.Timeout> = new Map();
  private stats: SyncStats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    conflictsDetected: 0,
    conflictsResolved: 0,
    averageSyncTime: 0,
    dataSize: 0
  };
  private syncTimes: number[] = [];
  private enabled: boolean = true;
  private observers: Set<(stats: SyncStats) => void> = new Set();

  constructor() {
    this.setupEventListeners();
  }

  /**
   * 添加同步配置
   */
  addSyncConfig(config: SyncConfig): void {
    this.configs.set(config.id, config);
    
    // 初始化数据版本
    this.dataVersions.set(config.dataPath, 0);
    
    // 如果是自动同步，启动定时器
    if (config.syncMode === 'automatic' && config.syncInterval) {
      this.startAutoSync(config);
    }
    
    console.log(`[DataSynchronizer] Added sync config: ${config.id}`);
  }

  /**
   * 移除同步配置
   */
  removeSyncConfig(configId: string): boolean {
    const config = this.configs.get(configId);
    if (!config) {
      return false;
    }

    // 停止自动同步
    this.stopAutoSync(configId);
    
    // 清理相关数据
    this.configs.delete(configId);
    this.dataVersions.delete(config.dataPath);
    
    console.log(`[DataSynchronizer] Removed sync config: ${configId}`);
    return true;
  }

  /**
   * 手动同步数据
   */
  async syncData(configId: string, operation: SyncOperationType = 'push'): Promise<string> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Sync config not found: ${configId}`);
    }

    const operationId = this.generateId();
    const syncOperation: SyncOperation = {
      id: operationId,
      type: operation,
      configId,
      data: await this.prepareDataForSync(config),
      status: 'pending',
      startTime: new Date().toISOString(),
      retryCount: 0
    };

    this.operations.set(operationId, syncOperation);
    this.stats.totalOperations++;

    try {
      await this.executeSyncOperation(syncOperation);
      return operationId;
    } catch (error) {
      this.handleSyncError(syncOperation, error as Error);
      throw error;
    }
  }

  /**
   * 推送数据到目标应用
   */
  async pushData(configId: string): Promise<string> {
    return this.syncData(configId, 'push');
  }

  /**
   * 从目标应用拉取数据
   */
  async pullData(configId: string): Promise<string> {
    return this.syncData(configId, 'pull');
  }

  /**
   * 合并数据
   */
  async mergeData(configId: string): Promise<string> {
    return this.syncData(configId, 'merge');
  }

  /**
   * 解决冲突
   */
  async resolveConflict(
    conflictId: string, 
    resolution: ConflictResolution
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    try {
      // 应用解决方案
      await this.applyConflictResolution(conflict, resolution);
      
      // 标记冲突已解决
      conflict.resolved = true;
      conflict.resolution = resolution;
      
      this.stats.conflictsResolved++;
      console.log(`[DataSynchronizer] Conflict resolved: ${conflictId}`);
      
    } catch (error) {
      globalErrorManager.handleCustomError(
        `Failed to resolve conflict: ${(error as Error).message}`,
        'state-error',
        'medium',
        { conflictId, resolution }
      );
      throw error;
    }
  }

  /**
   * 获取冲突列表
   */
  getConflicts(resolved?: boolean): ConflictInfo[] {
    return Array.from(this.conflicts.values()).filter(conflict => 
      resolved === undefined || conflict.resolved === resolved
    );
  }

  /**
   * 获取同步操作历史
   */
  getOperations(configId?: string): SyncOperation[] {
    let operations = Array.from(this.operations.values());
    
    if (configId) {
      operations = operations.filter(op => op.configId === configId);
    }
    
    return operations.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  /**
   * 获取同步统计
   */
  getStats(): SyncStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 订阅统计更新
   */
  subscribe(observer: (stats: SyncStats) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 启用/禁用同步
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      // 停止所有自动同步
      this.syncTimers.forEach((timer, configId) => {
        this.stopAutoSync(configId);
      });
    } else {
      // 重新启动自动同步
      this.configs.forEach(config => {
        if (config.syncMode === 'automatic' && config.syncInterval) {
          this.startAutoSync(config);
        }
      });
    }
  }

  /**
   * 清理历史数据
   */
  cleanup(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    // 清理操作历史
    Array.from(this.operations.entries()).forEach(([id, operation]) => {
      if (new Date(operation.startTime).getTime() < cutoffTime) {
        this.operations.delete(id);
      }
    });
    
    // 清理已解决的冲突
    Array.from(this.conflicts.entries()).forEach(([id, conflict]) => {
      if (conflict.resolved && new Date(conflict.timestamp).getTime() < cutoffTime) {
        this.conflicts.delete(id);
      }
    });
  }

  /**
   * 销毁同步器
   */
  destroy(): void {
    this.enabled = false;
    
    // 停止所有定时器
    this.syncTimers.forEach((timer, configId) => {
      this.stopAutoSync(configId);
    });
    
    // 清理数据
    this.configs.clear();
    this.operations.clear();
    this.conflicts.clear();
    this.dataVersions.clear();
    this.observers.clear();
  }

  // ==================== 私有方法 ====================

  private setupEventListeners(): void {
    // 监听数据变更事件
    globalEventBus.on('DATA_SYNC_REQUEST', async (event: BaseEvent) => {
      if (!this.enabled || !event.data) {
        return;
      }

      const { configId, operation } = event.data;
      if (configId && this.configs.has(configId)) {
        try {
          await this.syncData(configId, operation || 'push');
        } catch (error) {
          console.error('[DataSynchronizer] Sync request failed:', error);
        }
      }
    });

    // 监听状态变更
    globalStateManager.subscribe((state, action) => {
      this.handleStateChange(state, action);
    });
  }

  private async prepareDataForSync(config: SyncConfig): Promise<SyncData> {
    const currentState = globalStateManager.getState();
    const value = this.getValueByPath(currentState, config.dataPath);
    const version = this.dataVersions.get(config.dataPath) || 0;
    const checksum = this.calculateChecksum(value);

    return {
      id: this.generateId(),
      path: config.dataPath,
      value,
      version,
      timestamp: new Date().toISOString(),
      source: 'local',
      checksum,
      metadata: config.metadata
    };
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'in-progress';
    const startTime = performance.now();

    try {
      const config = this.configs.get(operation.configId)!;
      
      switch (operation.type) {
        case 'push':
          await this.executePushOperation(config, operation);
          break;
        case 'pull':
          await this.executePullOperation(config, operation);
          break;
        case 'merge':
          await this.executeMergeOperation(config, operation);
          break;
        case 'resolve-conflict':
          await this.executeConflictResolution(config, operation);
          break;
      }

      operation.status = 'completed';
      operation.endTime = new Date().toISOString();
      this.stats.successfulOperations++;
      
      const syncTime = performance.now() - startTime;
      this.recordSyncTime(syncTime);

    } catch (error) {
      operation.status = 'failed';
      operation.error = (error as Error).message;
      operation.endTime = new Date().toISOString();
      this.stats.failedOperations++;
      throw error;
    }
  }

  private async executePushOperation(config: SyncConfig, operation: SyncOperation): Promise<void> {
    // 发送数据到目标应用
    const event: BaseEvent = {
      type: 'DATA_SYNC_PUSH',
      source: 'data-synchronizer',
      timestamp: new Date().toISOString(),
      id: this.generateId(),
      data: {
        configId: config.id,
        syncData: operation.data,
        targets: config.syncTargets
      }
    };

    globalEventBus.emit(event);
    
    // 更新版本号
    this.incrementVersion(config.dataPath);
  }

  private async executePullOperation(config: SyncConfig, operation: SyncOperation): Promise<void> {
    // 请求数据从目标应用
    const event: BaseEvent = {
      type: 'DATA_SYNC_PULL_REQUEST',
      source: 'data-synchronizer',
      timestamp: new Date().toISOString(),
      id: this.generateId(),
      data: {
        configId: config.id,
        dataPath: config.dataPath,
        requestId: operation.id
      }
    };

    globalEventBus.emit(event);
  }

  private async executeMergeOperation(config: SyncConfig, operation: SyncOperation): Promise<void> {
    // 实现数据合并逻辑
    const localData = operation.data;
    
    // 这里应该从远程获取数据，简化实现
    const remoteData = await this.fetchRemoteData(config);
    
    if (remoteData) {
      const mergedData = await this.mergeDataValues(localData, remoteData, config);
      await this.applyMergedData(config, mergedData);
    }
  }

  private async executeConflictResolution(config: SyncConfig, operation: SyncOperation): Promise<void> {
    // 冲突解决逻辑在 resolveConflict 方法中实现
    throw new Error('Conflict resolution should be handled by resolveConflict method');
  }

  private async fetchRemoteData(config: SyncConfig): Promise<SyncData | null> {
    // 模拟从远程获取数据
    // 实际实现中应该通过WebSocket或HTTP请求获取
    return null;
  }

  private async mergeDataValues(
    localData: SyncData, 
    remoteData: SyncData, 
    config: SyncConfig
  ): Promise<any> {
    // 检测冲突
    if (this.detectConflict(localData, remoteData)) {
      const conflict = this.createConflictInfo(localData, remoteData);
      this.conflicts.set(conflict.id, conflict);
      this.stats.conflictsDetected++;
      
      // 根据配置的冲突解决策略处理
      return this.resolveConflictAutomatically(conflict, config.conflictResolution);
    }

    // 简单合并策略：使用时间戳较新的数据
    return new Date(localData.timestamp) > new Date(remoteData.timestamp) 
      ? localData.value 
      : remoteData.value;
  }

  private detectConflict(localData: SyncData, remoteData: SyncData): boolean {
    // 版本冲突
    if (localData.version !== remoteData.version) {
      return true;
    }

    // 内容冲突
    if (localData.checksum !== remoteData.checksum) {
      return true;
    }

    return false;
  }

  private createConflictInfo(localData: SyncData, remoteData: SyncData): ConflictInfo {
    let conflictType: ConflictType = 'content';
    
    if (localData.version !== remoteData.version) {
      conflictType = 'version';
    } else if (localData.timestamp !== remoteData.timestamp) {
      conflictType = 'timestamp';
    }

    return {
      id: this.generateId(),
      path: localData.path,
      localData,
      remoteData,
      conflictType,
      timestamp: new Date().toISOString(),
      resolved: false
    };
  }

  private async resolveConflictAutomatically(
    conflict: ConflictInfo, 
    strategy: ConflictResolutionStrategy
  ): Promise<any> {
    switch (strategy) {
      case 'local-wins':
        return conflict.localData.value;
      case 'remote-wins':
        return conflict.remoteData.value;
      case 'timestamp-based':
        return new Date(conflict.localData.timestamp) > new Date(conflict.remoteData.timestamp)
          ? conflict.localData.value
          : conflict.remoteData.value;
      case 'merge':
        return this.performDeepMerge(conflict.localData.value, conflict.remoteData.value);
      case 'manual':
        throw new Error('Manual conflict resolution required');
      default:
        return conflict.localData.value;
    }
  }

  private async applyConflictResolution(
    conflict: ConflictInfo, 
    resolution: ConflictResolution
  ): Promise<void> {
    const config = Array.from(this.configs.values())
      .find(c => c.dataPath === conflict.path);
    
    if (!config) {
      throw new Error(`No sync config found for path: ${conflict.path}`);
    }

    await this.applyMergedData(config, resolution.resolvedValue);
  }

  private async applyMergedData(config: SyncConfig, mergedValue: any): Promise<void> {
    // 更新全局状态
    const updatePath = config.dataPath.split('.');
    const updates: any = {};
    this.setValueByPath(updates, updatePath, mergedValue);
    
    globalStateManager.setState(updates);
    this.incrementVersion(config.dataPath);
  }

  private performDeepMerge(localValue: any, remoteValue: any): any {
    if (typeof localValue !== 'object' || typeof remoteValue !== 'object') {
      return remoteValue; // 非对象类型，使用远程值
    }

    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      // 数组合并：去重并合并
      return [...new Set([...localValue, ...remoteValue])];
    }

    // 对象合并
    const merged = { ...localValue };
    
    Object.keys(remoteValue).forEach(key => {
      if (key in merged) {
        merged[key] = this.performDeepMerge(merged[key], remoteValue[key]);
      } else {
        merged[key] = remoteValue[key];
      }
    });

    return merged;
  }

  private handleStateChange(state: GlobalState, action: any): void {
    if (!this.enabled) {
      return;
    }

    // 检查哪些同步配置受到影响
    this.configs.forEach(config => {
      if (config.syncMode === 'real-time' && this.isPathAffected(config.dataPath, action)) {
        // 触发实时同步
        this.syncData(config.id, 'push').catch(error => {
          console.error(`[DataSynchronizer] Real-time sync failed for ${config.id}:`, error);
        });
      }
    });
  }

  private isPathAffected(dataPath: string, action: any): boolean {
    // 简化实现：检查action是否影响指定路径
    if (!action || !action.type) {
      return false;
    }

    // 这里应该根据具体的action类型和payload来判断
    return true;
  }

  private startAutoSync(config: SyncConfig): void {
    if (!config.syncInterval || this.syncTimers.has(config.id)) {
      return;
    }

    const timer = setInterval(async () => {
      if (this.enabled) {
        try {
          await this.syncData(config.id, 'push');
        } catch (error) {
          console.error(`[DataSynchronizer] Auto sync failed for ${config.id}:`, error);
        }
      }
    }, config.syncInterval);

    this.syncTimers.set(config.id, timer);
  }

  private stopAutoSync(configId: string): void {
    const timer = this.syncTimers.get(configId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(configId);
    }
  }

  private handleSyncError(operation: SyncOperation, error: Error): void {
    globalErrorManager.handleCustomError(
      `Data sync operation failed: ${error.message}`,
      'state-error',
      'medium',
      { 
        operationId: operation.id, 
        configId: operation.configId,
        operationType: operation.type 
      }
    );
  }

  private incrementVersion(dataPath: string): void {
    const currentVersion = this.dataVersions.get(dataPath) || 0;
    this.dataVersions.set(dataPath, currentVersion + 1);
  }

  private recordSyncTime(time: number): void {
    this.syncTimes.push(time);
    
    // 保持最近100次的记录
    if (this.syncTimes.length > 100) {
      this.syncTimes = this.syncTimes.slice(-100);
    }
    
    this.stats.averageSyncTime = this.syncTimes.reduce((a, b) => a + b, 0) / this.syncTimes.length;
    this.stats.lastSyncTime = new Date().toISOString();
  }

  private updateStats(): void {
    // 计算数据大小
    let totalSize = 0;
    this.configs.forEach(config => {
      const state = globalStateManager.getState();
      const value = this.getValueByPath(state, config.dataPath);
      if (value) {
        totalSize += JSON.stringify(value).length;
      }
    });
    this.stats.dataSize = totalSize;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setValueByPath(obj: any, pathArray: string[], value: any): void {
    const lastKey = pathArray.pop()!;
    const target = pathArray.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private calculateChecksum(data: any): string {
    // 简单的校验和计算
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(36);
  }

  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 单例实例 ====================

export const globalDataSynchronizer = new DataSynchronizer();

// ==================== 工具函数 ====================

/**
 * 添加数据同步配置
 */
export function addDataSync(
  name: string,
  dataPath: string,
  options?: Partial<SyncConfig>
): string {
  const config: SyncConfig = {
    id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    dataPath,
    syncMode: 'manual',
    conflictResolution: 'timestamp-based',
    enableVersioning: true,
    enableConflictDetection: true,
    syncTargets: ['*'],
    ...options
  };

  globalDataSynchronizer.addSyncConfig(config);
  return config.id;
}

/**
 * 同步指定路径的数据
 */
export async function syncDataPath(
  dataPath: string,
  operation: SyncOperationType = 'push'
): Promise<string | null> {
  // 查找匹配的同步配置
  const configs = Array.from((globalDataSynchronizer as any).configs.values())
    .filter((config: SyncConfig) => config.dataPath === dataPath);

  if (configs.length === 0) {
    console.warn(`[DataSync] No sync config found for path: ${dataPath}`);
    return null;
  }

  const config = configs[0];
  return globalDataSynchronizer.syncData(config.id, operation);
}

/**
 * 创建实时同步配置
 */
export function createRealTimeSync(
  name: string,
  dataPath: string,
  targets: string[] = ['*']
): string {
  return addDataSync(name, dataPath, {
    syncMode: 'real-time',
    syncTargets: targets,
    conflictResolution: 'timestamp-based'
  });
}

/**
 * 创建定时同步配置
 */
export function createScheduledSync(
  name: string,
  dataPath: string,
  intervalMs: number,
  targets: string[] = ['*']
): string {
  return addDataSync(name, dataPath, {
    syncMode: 'automatic',
    syncInterval: intervalMs,
    syncTargets: targets,
    conflictResolution: 'timestamp-based'
  });
}

/**
 * 获取数据同步状态
 */
export function getDataSyncStatus(): {
  stats: SyncStats;
  conflicts: ConflictInfo[];
  recentOperations: SyncOperation[];
} {
  return {
    stats: globalDataSynchronizer.getStats(),
    conflicts: globalDataSynchronizer.getConflicts(false),
    recentOperations: globalDataSynchronizer.getOperations().slice(0, 10)
  };
}