/**
 * 冲突解决器 - 微前端数据冲突检测和解决
 * 提供数据冲突检测、解决策略、冲突历史管理等功能
 */

import { BaseEvent } from '../../types/events';
import { globalErrorManager } from '../error/error-manager';
import { globalNotificationService } from '../realtime/notification-service';

// ==================== 类型定义 ====================

export interface ConflictData {
  id: string;
  path: string;
  localValue: any;
  remoteValue: any;
  localVersion: number;
  remoteVersion: number;
  localTimestamp: string;
  remoteTimestamp: string;
  localSource: string;
  remoteSource: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  metadata?: Record<string, any>;
}

export interface ConflictResolutionRule {
  id: string;
  name: string;
  description: string;
  condition: ConflictCondition;
  strategy: ResolutionStrategy;
  priority: number;
  enabled: boolean;
  autoApply: boolean;
}

export interface ConflictResolutionResult {
  conflictId: string;
  strategy: ResolutionStrategy;
  resolvedValue: any;
  confidence: number;
  appliedRule?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ConflictHistory {
  id: string;
  conflictData: ConflictData;
  resolution: ConflictResolutionResult;
  resolvedBy: string;
  resolvedAt: string;
  manualIntervention: boolean;
}

export interface ConflictStats {
  totalConflicts: number;
  resolvedConflicts: number;
  pendingConflicts: number;
  autoResolvedConflicts: number;
  manualResolvedConflicts: number;
  conflictsByType: Record<ConflictType, number>;
  conflictsBySeverity: Record<ConflictSeverity, number>;
  averageResolutionTime: number;
  resolutionSuccessRate: number;
}

export type ConflictType = 
  | 'version-mismatch'
  | 'timestamp-conflict'
  | 'content-divergence'
  | 'structure-change'
  | 'type-mismatch'
  | 'concurrent-modification'
  | 'dependency-conflict';

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ResolutionStrategy = 
  | 'local-wins'
  | 'remote-wins'
  | 'newest-wins'
  | 'oldest-wins'
  | 'merge-deep'
  | 'merge-shallow'
  | 'user-choice'
  | 'custom-resolver'
  | 'fallback-default';

export type ConflictCondition = (conflict: ConflictData) => boolean;
export type CustomResolver = (conflict: ConflictData) => Promise<any>;

// ==================== 冲突解决器实现 ====================

export class ConflictResolver {
  private rules: Map<string, ConflictResolutionRule> = new Map();
  private customResolvers: Map<string, CustomResolver> = new Map();
  private conflictHistory: ConflictHistory[] = [];
  private pendingConflicts: Map<string, ConflictData> = new Map();
  private resolutionTimes: number[] = [];
  private stats: ConflictStats = {
    totalConflicts: 0,
    resolvedConflicts: 0,
    pendingConflicts: 0,
    autoResolvedConflicts: 0,
    manualResolvedConflicts: 0,
    conflictsByType: {} as Record<ConflictType, number>,
    conflictsBySeverity: {} as Record<ConflictSeverity, number>,
    averageResolutionTime: 0,
    resolutionSuccessRate: 0
  };
  private observers: Set<(conflict: ConflictData) => void> = new Set();
  private enabled: boolean = true;

  constructor() {
    this.initializeDefaultRules();
    this.initializeStats();
  }

  /**
   * 检测数据冲突
   */
  detectConflict(
    path: string,
    localValue: any,
    remoteValue: any,
    options: {
      localVersion?: number;
      remoteVersion?: number;
      localTimestamp?: string;
      remoteTimestamp?: string;
      localSource?: string;
      remoteSource?: string;
      metadata?: Record<string, any>;
    } = {}
  ): ConflictData | null {
    if (!this.enabled) {
      return null;
    }

    // 基本相等检查
    if (this.isEqual(localValue, remoteValue)) {
      return null;
    }

    const conflictType = this.determineConflictType(localValue, remoteValue, options);
    const severity = this.determineSeverity(conflictType, localValue, remoteValue);

    const conflict: ConflictData = {
      id: this.generateId(),
      path,
      localValue,
      remoteValue,
      localVersion: options.localVersion || 0,
      remoteVersion: options.remoteVersion || 0,
      localTimestamp: options.localTimestamp || new Date().toISOString(),
      remoteTimestamp: options.remoteTimestamp || new Date().toISOString(),
      localSource: options.localSource || 'unknown',
      remoteSource: options.remoteSource || 'unknown',
      conflictType,
      severity,
      metadata: options.metadata
    };

    this.pendingConflicts.set(conflict.id, conflict);
    this.stats.totalConflicts++;
    this.stats.pendingConflicts++;
    this.updateConflictStats(conflict);

    // 通知观察者
    this.notifyObservers(conflict);

    // 发送冲突通知
    this.sendConflictNotification(conflict);

    return conflict;
  }

  /**
   * 解决冲突
   */
  async resolveConflict(
    conflictId: string,
    strategy?: ResolutionStrategy,
    customValue?: any
  ): Promise<ConflictResolutionResult> {
    const conflict = this.pendingConflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    const startTime = performance.now();

    try {
      let resolutionResult: ConflictResolutionResult;

      if (strategy) {
        // 使用指定策略
        resolutionResult = await this.applyStrategy(conflict, strategy, customValue);
      } else {
        // 使用规则引擎自动解决
        resolutionResult = await this.autoResolveConflict(conflict);
      }

      // 记录解决时间
      const resolutionTime = performance.now() - startTime;
      this.recordResolutionTime(resolutionTime);

      // 添加到历史记录
      this.addToHistory(conflict, resolutionResult, strategy ? 'manual' : 'auto');

      // 从待处理列表中移除
      this.pendingConflicts.delete(conflictId);
      this.stats.pendingConflicts--;
      this.stats.resolvedConflicts++;

      if (strategy) {
        this.stats.manualResolvedConflicts++;
      } else {
        this.stats.autoResolvedConflicts++;
      }

      return resolutionResult;

    } catch (error) {
      globalErrorManager.handleCustomError(
        `Failed to resolve conflict: ${(error as Error).message}`,
        'state-error',
        'medium',
        { conflictId, strategy }
      );
      throw error;
    }
  }

  /**
   * 批量解决冲突
   */
  async resolveMultipleConflicts(
    conflictIds: string[],
    strategy: ResolutionStrategy
  ): Promise<ConflictResolutionResult[]> {
    const results: ConflictResolutionResult[] = [];

    for (const conflictId of conflictIds) {
      try {
        const result = await this.resolveConflict(conflictId, strategy);
        results.push(result);
      } catch (error) {
        console.error(`[ConflictResolver] Failed to resolve conflict ${conflictId}:`, error);
      }
    }

    return results;
  }

  /**
   * 添加解决规则
   */
  addRule(rule: ConflictResolutionRule): void {
    this.rules.set(rule.id, rule);
    console.log(`[ConflictResolver] Added rule: ${rule.name}`);
  }

  /**
   * 移除解决规则
   */
  removeRule(ruleId: string): boolean {
    const success = this.rules.delete(ruleId);
    if (success) {
      console.log(`[ConflictResolver] Removed rule: ${ruleId}`);
    }
    return success;
  }

  /**
   * 注册自定义解决器
   */
  registerCustomResolver(name: string, resolver: CustomResolver): void {
    this.customResolvers.set(name, resolver);
    console.log(`[ConflictResolver] Registered custom resolver: ${name}`);
  }

  /**
   * 获取待处理冲突
   */
  getPendingConflicts(): ConflictData[] {
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * 获取冲突历史
   */
  getConflictHistory(limit?: number): ConflictHistory[] {
    const history = [...this.conflictHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 获取统计信息
   */
  getStats(): ConflictStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 订阅冲突检测
   */
  subscribe(observer: (conflict: ConflictData) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 清除历史记录
   */
  clearHistory(olderThanHours?: number): void {
    if (olderThanHours) {
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      this.conflictHistory = this.conflictHistory.filter(
        history => new Date(history.resolvedAt).getTime() > cutoffTime
      );
    } else {
      this.conflictHistory = [];
    }
  }

  /**
   * 启用/禁用冲突解决器
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 销毁解决器
   */
  destroy(): void {
    this.enabled = false;
    this.rules.clear();
    this.customResolvers.clear();
    this.conflictHistory = [];
    this.pendingConflicts.clear();
    this.observers.clear();
  }

  // ==================== 私有方法 ====================

  private initializeDefaultRules(): void {
    // 版本冲突规则
    this.addRule({
      id: 'version-newer-wins',
      name: 'Version Newer Wins',
      description: 'Resolve version conflicts by choosing the higher version',
      condition: (conflict) => conflict.conflictType === 'version-mismatch',
      strategy: 'newest-wins',
      priority: 1,
      enabled: true,
      autoApply: true
    });

    // 时间戳冲突规则
    this.addRule({
      id: 'timestamp-newer-wins',
      name: 'Timestamp Newer Wins',
      description: 'Resolve timestamp conflicts by choosing the newer timestamp',
      condition: (conflict) => conflict.conflictType === 'timestamp-conflict',
      strategy: 'newest-wins',
      priority: 2,
      enabled: true,
      autoApply: true
    });

    // 内容分歧规则
    this.addRule({
      id: 'content-merge-objects',
      name: 'Content Merge Objects',
      description: 'Merge object content when possible',
      condition: (conflict) => 
        conflict.conflictType === 'content-divergence' &&
        typeof conflict.localValue === 'object' &&
        typeof conflict.remoteValue === 'object',
      strategy: 'merge-deep',
      priority: 3,
      enabled: true,
      autoApply: false
    });

    // 严重冲突规则
    this.addRule({
      id: 'critical-manual-resolution',
      name: 'Critical Manual Resolution',
      description: 'Critical conflicts require manual resolution',
      condition: (conflict) => conflict.severity === 'critical',
      strategy: 'user-choice',
      priority: 0,
      enabled: true,
      autoApply: false
    });
  }

  private initializeStats(): void {
    const types: ConflictType[] = [
      'version-mismatch', 'timestamp-conflict', 'content-divergence',
      'structure-change', 'type-mismatch', 'concurrent-modification', 'dependency-conflict'
    ];
    
    const severities: ConflictSeverity[] = ['low', 'medium', 'high', 'critical'];

    types.forEach(type => {
      this.stats.conflictsByType[type] = 0;
    });

    severities.forEach(severity => {
      this.stats.conflictsBySeverity[severity] = 0;
    });
  }

  private determineConflictType(
    localValue: any,
    remoteValue: any,
    options: any
  ): ConflictType {
    // 版本冲突
    if (options.localVersion !== undefined && 
        options.remoteVersion !== undefined && 
        options.localVersion !== options.remoteVersion) {
      return 'version-mismatch';
    }

    // 时间戳冲突
    if (options.localTimestamp && options.remoteTimestamp &&
        options.localTimestamp !== options.remoteTimestamp) {
      return 'timestamp-conflict';
    }

    // 类型冲突
    if (typeof localValue !== typeof remoteValue) {
      return 'type-mismatch';
    }

    // 结构变化
    if (this.isStructureChanged(localValue, remoteValue)) {
      return 'structure-change';
    }

    // 默认为内容分歧
    return 'content-divergence';
  }

  private determineSeverity(
    conflictType: ConflictType,
    localValue: any,
    remoteValue: any
  ): ConflictSeverity {
    switch (conflictType) {
      case 'type-mismatch':
      case 'structure-change':
        return 'critical';
      case 'version-mismatch':
      case 'dependency-conflict':
        return 'high';
      case 'timestamp-conflict':
      case 'concurrent-modification':
        return 'medium';
      case 'content-divergence':
      default:
        return 'low';
    }
  }

  private async autoResolveConflict(conflict: ConflictData): Promise<ConflictResolutionResult> {
    // 按优先级排序规则
    const applicableRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled && rule.condition(conflict))
      .sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      if (rule.autoApply || conflict.severity === 'low') {
        return this.applyStrategy(conflict, rule.strategy, undefined, rule.id);
      }
    }

    // 如果没有适用的自动规则，使用默认策略
    return this.applyStrategy(conflict, 'newest-wins');
  }

  private async applyStrategy(
    conflict: ConflictData,
    strategy: ResolutionStrategy,
    customValue?: any,
    ruleId?: string
  ): Promise<ConflictResolutionResult> {
    let resolvedValue: any;
    let confidence = 1.0;

    switch (strategy) {
      case 'local-wins':
        resolvedValue = conflict.localValue;
        break;

      case 'remote-wins':
        resolvedValue = conflict.remoteValue;
        break;

      case 'newest-wins':
        resolvedValue = this.chooseNewest(conflict);
        break;

      case 'oldest-wins':
        resolvedValue = this.chooseOldest(conflict);
        break;

      case 'merge-deep':
        resolvedValue = this.performDeepMerge(conflict.localValue, conflict.remoteValue);
        confidence = 0.8;
        break;

      case 'merge-shallow':
        resolvedValue = this.performShallowMerge(conflict.localValue, conflict.remoteValue);
        confidence = 0.7;
        break;

      case 'user-choice':
        if (customValue !== undefined) {
          resolvedValue = customValue;
        } else {
          throw new Error('User choice strategy requires custom value');
        }
        break;

      case 'custom-resolver':
        const resolver = this.customResolvers.get(conflict.path);
        if (resolver) {
          resolvedValue = await resolver(conflict);
          confidence = 0.9;
        } else {
          throw new Error(`No custom resolver found for path: ${conflict.path}`);
        }
        break;

      case 'fallback-default':
        resolvedValue = this.getFallbackValue(conflict);
        confidence = 0.5;
        break;

      default:
        throw new Error(`Unknown resolution strategy: ${strategy}`);
    }

    return {
      conflictId: conflict.id,
      strategy,
      resolvedValue,
      confidence,
      appliedRule: ruleId,
      timestamp: new Date().toISOString(),
      metadata: {
        conflictType: conflict.conflictType,
        severity: conflict.severity
      }
    };
  }

  private chooseNewest(conflict: ConflictData): any {
    const localTime = new Date(conflict.localTimestamp).getTime();
    const remoteTime = new Date(conflict.remoteTimestamp).getTime();
    
    if (localTime > remoteTime) {
      return conflict.localValue;
    } else if (remoteTime > localTime) {
      return conflict.remoteValue;
    } else {
      // 时间戳相同，比较版本
      return conflict.localVersion >= conflict.remoteVersion 
        ? conflict.localValue 
        : conflict.remoteValue;
    }
  }

  private chooseOldest(conflict: ConflictData): any {
    const localTime = new Date(conflict.localTimestamp).getTime();
    const remoteTime = new Date(conflict.remoteTimestamp).getTime();
    
    if (localTime < remoteTime) {
      return conflict.localValue;
    } else if (remoteTime < localTime) {
      return conflict.remoteValue;
    } else {
      // 时间戳相同，比较版本
      return conflict.localVersion <= conflict.remoteVersion 
        ? conflict.localValue 
        : conflict.remoteValue;
    }
  }

  private performDeepMerge(localValue: any, remoteValue: any): any {
    if (typeof localValue !== 'object' || typeof remoteValue !== 'object') {
      return remoteValue;
    }

    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      // 数组合并：去重
      return [...new Set([...localValue, ...remoteValue])];
    }

    // 对象深度合并
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

  private performShallowMerge(localValue: any, remoteValue: any): any {
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return { ...localValue, ...remoteValue };
    }
    return remoteValue;
  }

  private getFallbackValue(conflict: ConflictData): any {
    // 根据数据类型返回合理的默认值
    const localType = typeof conflict.localValue;
    
    switch (localType) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'object':
        return Array.isArray(conflict.localValue) ? [] : {};
      default:
        return null;
    }
  }

  private isEqual(value1: any, value2: any): boolean {
    if (value1 === value2) {
      return true;
    }

    if (typeof value1 !== typeof value2) {
      return false;
    }

    if (typeof value1 === 'object' && value1 !== null && value2 !== null) {
      const keys1 = Object.keys(value1);
      const keys2 = Object.keys(value2);

      if (keys1.length !== keys2.length) {
        return false;
      }

      for (const key of keys1) {
        if (!keys2.includes(key) || !this.isEqual(value1[key], value2[key])) {
          return false;
        }
      }

      return true;
    }

    return false;
  }

  private isStructureChanged(value1: any, value2: any): boolean {
    if (typeof value1 !== 'object' || typeof value2 !== 'object') {
      return false;
    }

    const keys1 = Object.keys(value1 || {});
    const keys2 = Object.keys(value2 || {});

    // 检查键的差异
    const keysDiff = keys1.length !== keys2.length ||
                    keys1.some(key => !keys2.includes(key)) ||
                    keys2.some(key => !keys1.includes(key));

    return keysDiff;
  }

  private addToHistory(
    conflict: ConflictData,
    resolution: ConflictResolutionResult,
    resolvedBy: string
  ): void {
    const history: ConflictHistory = {
      id: this.generateId(),
      conflictData: conflict,
      resolution,
      resolvedBy,
      resolvedAt: new Date().toISOString(),
      manualIntervention: resolvedBy === 'manual'
    };

    this.conflictHistory.push(history);

    // 限制历史记录大小
    if (this.conflictHistory.length > 1000) {
      this.conflictHistory = this.conflictHistory.slice(-1000);
    }
  }

  private updateConflictStats(conflict: ConflictData): void {
    this.stats.conflictsByType[conflict.conflictType]++;
    this.stats.conflictsBySeverity[conflict.severity]++;
  }

  private updateStats(): void {
    const totalResolved = this.stats.resolvedConflicts;
    const totalConflicts = this.stats.totalConflicts;
    
    this.stats.resolutionSuccessRate = totalConflicts > 0 
      ? totalResolved / totalConflicts 
      : 0;

    if (this.resolutionTimes.length > 0) {
      this.stats.averageResolutionTime = this.resolutionTimes.reduce((a, b) => a + b, 0) / this.resolutionTimes.length;
    }
  }

  private recordResolutionTime(time: number): void {
    this.resolutionTimes.push(time);
    
    // 保持最近100次的记录
    if (this.resolutionTimes.length > 100) {
      this.resolutionTimes = this.resolutionTimes.slice(-100);
    }
  }

  private notifyObservers(conflict: ConflictData): void {
    this.observers.forEach(observer => {
      try {
        observer(conflict);
      } catch (error) {
        console.error('[ConflictResolver] Observer error:', error);
      }
    });
  }

  private async sendConflictNotification(conflict: ConflictData): Promise<void> {
    const title = `Data Conflict Detected`;
    const message = `Conflict in ${conflict.path}: ${conflict.conflictType} (${conflict.severity} severity)`;
    
    await globalNotificationService.sendSystemNotification(
      title,
      message,
      conflict.severity === 'critical' ? 'urgent' : 'normal'
    );
  }

  private generateId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ==================== 单例实例 ====================

export const globalConflictResolver = new ConflictResolver();

// ==================== 工具函数 ====================

/**
 * 检测并解决数据冲突
 */
export async function detectAndResolveConflict(
  path: string,
  localValue: any,
  remoteValue: any,
  options?: {
    autoResolve?: boolean;
    strategy?: ResolutionStrategy;
    localVersion?: number;
    remoteVersion?: number;
    localTimestamp?: string;
    remoteTimestamp?: string;
    localSource?: string;
    remoteSource?: string;
  }
): Promise<{ conflict: ConflictData | null; resolution?: ConflictResolutionResult }> {
  const conflict = globalConflictResolver.detectConflict(path, localValue, remoteValue, options);
  
  if (!conflict) {
    return { conflict: null };
  }

  if (options?.autoResolve !== false && (conflict.severity === 'low' || conflict.severity === 'medium')) {
    try {
      const resolution = await globalConflictResolver.resolveConflict(
        conflict.id,
        options?.strategy
      );
      return { conflict, resolution };
    } catch (error) {
      console.error('[ConflictResolver] Auto-resolution failed:', error);
      return { conflict };
    }
  }

  return { conflict };
}

/**
 * 创建自定义冲突解决规则
 */
export function createConflictRule(
  name: string,
  condition: ConflictCondition,
  strategy: ResolutionStrategy,
  options?: {
    description?: string;
    priority?: number;
    autoApply?: boolean;
  }
): string {
  const rule: ConflictResolutionRule = {
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description: options?.description || '',
    condition,
    strategy,
    priority: options?.priority || 5,
    enabled: true,
    autoApply: options?.autoApply ?? false
  };

  globalConflictResolver.addRule(rule);
  return rule.id;
}

/**
 * 获取冲突解决状态
 */
export function getConflictStatus(): {
  stats: ConflictStats;
  pendingConflicts: ConflictData[];
  recentHistory: ConflictHistory[];
} {
  return {
    stats: globalConflictResolver.getStats(),
    pendingConflicts: globalConflictResolver.getPendingConflicts(),
    recentHistory: globalConflictResolver.getConflictHistory(10)
  };
}