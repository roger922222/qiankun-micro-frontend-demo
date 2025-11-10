/**
 * 历史服务 - 导航历史记录管理
 * 提供完整的导航历史记录、返回功能和历史状态管理
 */

import { globalRouteManager, RouteInfo, RouteHistoryEntry } from './route-manager';
import { globalEventBus } from '../event-bus';
import { BaseEvent } from '../../types/events';

// ==================== 类型定义 ====================

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  entries: RouteHistoryEntry[];
  currentIndex: number;
  metadata?: Record<string, any>;
}

export interface HistoryFilter {
  appName?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  pathPattern?: RegExp;
  action?: 'push' | 'replace' | 'pop';
}

export interface HistoryStats {
  totalEntries: number;
  uniqueApps: string[];
  uniquePaths: string[];
  mostVisitedApp: string;
  mostVisitedPath: string;
  averageSessionTime: number;
  navigationPatterns: NavigationPattern[];
}

export interface NavigationPattern {
  pattern: string[];
  frequency: number;
  avgDuration: number;
}

export interface HistoryExportOptions {
  format: 'json' | 'csv' | 'xml';
  includeMetadata?: boolean;
  timeRange?: {
    start: number;
    end: number;
  };
  filter?: HistoryFilter;
}

// ==================== 事件类型 ====================

export interface HistoryChangeEvent extends BaseEvent {
  type: 'HISTORY_CHANGE';
  data: {
    action: 'add' | 'remove' | 'clear' | 'restore';
    entry?: RouteHistoryEntry;
    count: number;
  };
}

export interface HistorySnapshotEvent extends BaseEvent {
  type: 'HISTORY_SNAPSHOT';
  data: {
    snapshot: HistorySnapshot;
    reason: 'manual' | 'auto' | 'beforeNavigation';
  };
}

// ==================== 历史服务实现 ====================

export class HistoryService {
  private snapshots: HistorySnapshot[] = [];
  private maxSnapshots: number = 10;
  private autoSnapshotInterval: number = 300000; // 5分钟
  private autoSnapshotTimer: any = null;
  private debug: boolean = false;
  private sessionStartTime: number = Date.now();

  constructor(options?: {
    maxSnapshots?: number;
    autoSnapshotInterval?: number;
    debug?: boolean;
  }) {
    this.maxSnapshots = options?.maxSnapshots || 10;
    this.autoSnapshotInterval = options?.autoSnapshotInterval || 300000;
    this.debug = options?.debug || false;

    this.initializeHistoryService();
  }

  /**
   * 初始化历史服务
   */
  private initializeHistoryService(): void {
    // 监听路由变化
    globalEventBus.on('ROUTE_CHANGE', this.handleRouteChange.bind(this));
    
    // 监听导航事件
    globalEventBus.on('NAVIGATION', this.handleNavigationEvent.bind(this));
    
    // 启动自动快照
    this.startAutoSnapshot();
    
    // 页面卸载时保存快照
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }
    
    if (this.debug) {
      console.log('[HistoryService] Initialized');
    }
  }

  /**
   * 获取完整历史记录
   */
  getHistory(filter?: HistoryFilter): RouteHistoryEntry[] {
    const history = globalRouteManager.getHistory();
    
    if (!filter) {
      return history;
    }
    
    return this.filterHistory(history, filter);
  }

  /**
   * 获取历史统计信息
   */
  getHistoryStats(): HistoryStats {
    const history = this.getHistory();
    
    if (history.length === 0) {
      return {
        totalEntries: 0,
        uniqueApps: [],
        uniquePaths: [],
        mostVisitedApp: '',
        mostVisitedPath: '',
        averageSessionTime: 0,
        navigationPatterns: []
      };
    }

    const appCounts = new Map<string, number>();
    const pathCounts = new Map<string, number>();
    const uniqueApps = new Set<string>();
    const uniquePaths = new Set<string>();

    // 统计访问次数
    history.forEach(entry => {
      const appName = entry.route.appName;
      const fullPath = entry.route.fullPath;
      
      uniqueApps.add(appName);
      uniquePaths.add(fullPath);
      
      appCounts.set(appName, (appCounts.get(appName) || 0) + 1);
      pathCounts.set(fullPath, (pathCounts.get(fullPath) || 0) + 1);
    });

    // 找出最常访问的应用和路径
    const mostVisitedApp = this.getMostFrequent(appCounts);
    const mostVisitedPath = this.getMostFrequent(pathCounts);

    // 计算平均会话时间
    const sessionDuration = Date.now() - this.sessionStartTime;
    const averageSessionTime = history.length > 0 ? sessionDuration / history.length : 0;

    // 分析导航模式
    const navigationPatterns = this.analyzeNavigationPatterns(history);

    return {
      totalEntries: history.length,
      uniqueApps: Array.from(uniqueApps),
      uniquePaths: Array.from(uniquePaths),
      mostVisitedApp,
      mostVisitedPath,
      averageSessionTime,
      navigationPatterns
    };
  }

  /**
   * 智能返回 - 根据历史记录智能选择返回目标
   */
  async smartGoBack(): Promise<boolean> {
    const history = this.getHistory();
    
    if (history.length <= 1) {
      if (this.debug) {
        console.warn('[HistoryService] No history to go back to');
      }
      return false;
    }

    // 获取当前路由
    const currentRoute = globalRouteManager.getCurrentRoute();
    if (!currentRoute) {
      return false;
    }

    // 找到上一个不同的路由
    const previousEntry = this.findPreviousDifferentRoute(history, currentRoute);
    
    if (!previousEntry) {
      return globalRouteManager.goBack();
    }

    // 使用路由管理器导航到上一个路由
    return globalRouteManager.navigateToApp(
      previousEntry.route.appName,
      previousEntry.route.path,
      {
        replace: true,
        state: previousEntry.route.state
      }
    );
  }

  /**
   * 返回到指定应用
   */
  async goBackToApp(appName: string): Promise<boolean> {
    const history = this.getHistory();
    const targetEntry = this.findLastEntryForApp(history, appName);
    
    if (!targetEntry) {
      if (this.debug) {
        console.warn(`[HistoryService] No history found for app: ${appName}`);
      }
      return false;
    }

    return globalRouteManager.navigateToApp(
      targetEntry.route.appName,
      targetEntry.route.path,
      {
        replace: true,
        state: targetEntry.route.state
      }
    );
  }

  /**
   * 返回到指定路径
   */
  async goBackToPath(path: string): Promise<boolean> {
    const history = this.getHistory();
    const targetEntry = this.findLastEntryForPath(history, path);
    
    if (!targetEntry) {
      if (this.debug) {
        console.warn(`[HistoryService] No history found for path: ${path}`);
      }
      return false;
    }

    return globalRouteManager.navigateToApp(
      targetEntry.route.appName,
      targetEntry.route.path,
      {
        replace: true,
        state: targetEntry.route.state
      }
    );
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    globalRouteManager.clearHistory();
    this.emitHistoryChangeEvent('clear');
    
    if (this.debug) {
      console.log('[HistoryService] History cleared');
    }
  }

  /**
   * 创建历史快照
   */
  createSnapshot(reason: 'manual' | 'auto' | 'beforeNavigation' = 'manual'): HistorySnapshot {
    const snapshot: HistorySnapshot = {
      id: this.generateId(),
      timestamp: Date.now(),
      entries: this.getHistory(),
      currentIndex: this.getCurrentHistoryIndex(),
      metadata: {
        reason,
        sessionStartTime: this.sessionStartTime,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : ''
      }
    };

    this.snapshots.push(snapshot);
    
    // 限制快照数量
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    this.emitSnapshotEvent(snapshot, reason);
    
    if (this.debug) {
      console.log('[HistoryService] Snapshot created:', snapshot.id);
    }

    return snapshot;
  }

  /**
   * 恢复历史快照
   */
  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    
    if (!snapshot) {
      console.error('[HistoryService] Snapshot not found:', snapshotId);
      return false;
    }

    try {
      // 这里需要实现更复杂的恢复逻辑
      // 目前只是记录日志，实际项目中可能需要重建整个历史状态
      if (this.debug) {
        console.log('[HistoryService] Restoring snapshot:', snapshot);
      }

      this.emitHistoryChangeEvent('restore');
      return true;
    } catch (error) {
      console.error('[HistoryService] Failed to restore snapshot:', error);
      return false;
    }
  }

  /**
   * 获取所有快照
   */
  getSnapshots(): HistorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 删除快照
   */
  deleteSnapshot(snapshotId: string): boolean {
    const index = this.snapshots.findIndex(s => s.id === snapshotId);
    
    if (index === -1) {
      return false;
    }

    this.snapshots.splice(index, 1);
    
    if (this.debug) {
      console.log('[HistoryService] Snapshot deleted:', snapshotId);
    }

    return true;
  }

  /**
   * 导出历史记录
   */
  exportHistory(options: HistoryExportOptions): string {
    const history = this.getHistory(options.filter);
    const filteredHistory = options.timeRange 
      ? this.filterByTimeRange(history, options.timeRange)
      : history;

    switch (options.format) {
      case 'json':
        return this.exportAsJSON(filteredHistory, options.includeMetadata);
      case 'csv':
        return this.exportAsCSV(filteredHistory);
      case 'xml':
        return this.exportAsXML(filteredHistory);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * 分析用户导航行为
   */
  analyzeUserBehavior(): {
    frequentPaths: Array<{ path: string; count: number }>;
    timeSpentPerApp: Array<{ app: string; time: number }>;
    navigationFlow: Array<{ from: string; to: string; count: number }>;
  } {
    const history = this.getHistory();
    const pathCounts = new Map<string, number>();
    const appTimes = new Map<string, number>();
    const flows = new Map<string, number>();

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const path = entry.route.fullPath;
      const app = entry.route.appName;

      // 统计路径访问次数
      pathCounts.set(path, (pathCounts.get(path) || 0) + 1);

      // 计算应用停留时间
      if (i < history.length - 1) {
        const nextEntry = history[i + 1];
        const timeSpent = nextEntry.timestamp - entry.timestamp;
        appTimes.set(app, (appTimes.get(app) || 0) + timeSpent);
      }

      // 统计导航流
      if (i > 0) {
        const prevEntry = history[i - 1];
        const flowKey = `${prevEntry.route.fullPath} -> ${path}`;
        flows.set(flowKey, (flows.get(flowKey) || 0) + 1);
      }
    }

    return {
      frequentPaths: Array.from(pathCounts.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count),
      
      timeSpentPerApp: Array.from(appTimes.entries())
        .map(([app, time]) => ({ app, time }))
        .sort((a, b) => b.time - a.time),
      
      navigationFlow: Array.from(flows.entries())
        .map(([flow, count]) => {
          const [from, to] = flow.split(' -> ');
          return { from, to, count };
        })
        .sort((a, b) => b.count - a.count)
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 处理路由变化
   */
  private handleRouteChange(event: any): void {
    this.emitHistoryChangeEvent('add', event.data.to);
    
    if (this.debug) {
      console.log('[HistoryService] Route changed, history updated');
    }
  }

  /**
   * 处理导航事件
   */
  private handleNavigationEvent(event: any): void {
    // 在重要导航前创建快照
    if (event.data.action === 'navigate') {
      this.createSnapshot('beforeNavigation');
    }
  }

  /**
   * 页面卸载前处理
   */
  private handleBeforeUnload(): void {
    this.createSnapshot('auto');
  }

  /**
   * 启动自动快照
   */
  private startAutoSnapshot(): void {
    if (this.autoSnapshotTimer) {
      clearInterval(this.autoSnapshotTimer);
    }

    this.autoSnapshotTimer = setInterval(() => {
      this.createSnapshot('auto');
    }, this.autoSnapshotInterval);
  }

  /**
   * 停止自动快照
   */
  private stopAutoSnapshot(): void {
    if (this.autoSnapshotTimer) {
      clearInterval(this.autoSnapshotTimer);
      this.autoSnapshotTimer = null;
    }
  }

  /**
   * 过滤历史记录
   */
  private filterHistory(history: RouteHistoryEntry[], filter: HistoryFilter): RouteHistoryEntry[] {
    return history.filter(entry => {
      if (filter.appName && entry.route.appName !== filter.appName) {
        return false;
      }
      
      if (filter.action && entry.action !== filter.action) {
        return false;
      }
      
      if (filter.pathPattern && !filter.pathPattern.test(entry.route.fullPath)) {
        return false;
      }
      
      if (filter.timeRange) {
        if (entry.timestamp < filter.timeRange.start || entry.timestamp > filter.timeRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * 按时间范围过滤
   */
  private filterByTimeRange(
    history: RouteHistoryEntry[], 
    timeRange: { start: number; end: number }
  ): RouteHistoryEntry[] {
    return history.filter(entry => 
      entry.timestamp >= timeRange.start && entry.timestamp <= timeRange.end
    );
  }

  /**
   * 找到上一个不同的路由
   */
  private findPreviousDifferentRoute(
    history: RouteHistoryEntry[], 
    currentRoute: RouteInfo
  ): RouteHistoryEntry | null {
    for (let i = history.length - 2; i >= 0; i--) {
      const entry = history[i];
      if (entry.route.fullPath !== currentRoute.fullPath) {
        return entry;
      }
    }
    return null;
  }

  /**
   * 找到指定应用的最后一个条目
   */
  private findLastEntryForApp(history: RouteHistoryEntry[], appName: string): RouteHistoryEntry | null {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].route.appName === appName) {
        return history[i];
      }
    }
    return null;
  }

  /**
   * 找到指定路径的最后一个条目
   */
  private findLastEntryForPath(history: RouteHistoryEntry[], path: string): RouteHistoryEntry | null {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].route.fullPath === path) {
        return history[i];
      }
    }
    return null;
  }

  /**
   * 获取当前历史索引
   */
  private getCurrentHistoryIndex(): number {
    // 这里需要根据实际的历史管理实现
    // 目前返回历史长度 - 1
    return this.getHistory().length - 1;
  }

  /**
   * 获取最频繁的项
   */
  private getMostFrequent(counts: Map<string, number>): string {
    let maxCount = 0;
    let mostFrequent = '';
    
    for (const [item, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = item;
      }
    }
    
    return mostFrequent;
  }

  /**
   * 分析导航模式
   */
  private analyzeNavigationPatterns(history: RouteHistoryEntry[]): NavigationPattern[] {
    const patterns = new Map<string, { count: number; durations: number[] }>();
    
    // 分析连续的导航序列
    for (let i = 0; i < history.length - 2; i++) {
      const sequence = [
        history[i].route.appName,
        history[i + 1].route.appName,
        history[i + 2].route.appName
      ];
      
      const patternKey = sequence.join(' -> ');
      const duration = history[i + 2].timestamp - history[i].timestamp;
      
      if (!patterns.has(patternKey)) {
        patterns.set(patternKey, { count: 0, durations: [] });
      }
      
      const pattern = patterns.get(patternKey)!;
      pattern.count++;
      pattern.durations.push(duration);
    }
    
    return Array.from(patterns.entries())
      .map(([pattern, data]) => ({
        pattern: pattern.split(' -> '),
        frequency: data.count,
        avgDuration: data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10); // 返回前10个模式
  }

  /**
   * 导出为JSON格式
   */
  private exportAsJSON(history: RouteHistoryEntry[], includeMetadata?: boolean): string {
    const data = includeMetadata ? {
      metadata: {
        exportTime: new Date().toISOString(),
        totalEntries: history.length,
        stats: this.getHistoryStats()
      },
      history
    } : history;
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导出为CSV格式
   */
  private exportAsCSV(history: RouteHistoryEntry[]): string {
    const headers = ['id', 'timestamp', 'appName', 'path', 'fullPath', 'action'];
    const rows = history.map(entry => [
      entry.id,
      new Date(entry.timestamp).toISOString(),
      entry.route.appName,
      entry.route.path,
      entry.route.fullPath,
      entry.action
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * 导出为XML格式
   */
  private exportAsXML(history: RouteHistoryEntry[]): string {
    const entries = history.map(entry => `
    <entry>
      <id>${entry.id}</id>
      <timestamp>${new Date(entry.timestamp).toISOString()}</timestamp>
      <appName>${entry.route.appName}</appName>
      <path>${entry.route.path}</path>
      <fullPath>${entry.route.fullPath}</fullPath>
      <action>${entry.action}</action>
    </entry>`).join('');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<history>
  <metadata>
    <exportTime>${new Date().toISOString()}</exportTime>
    <totalEntries>${history.length}</totalEntries>
  </metadata>
  <entries>${entries}
  </entries>
</history>`;
  }

  /**
   * 发送历史变化事件
   */
  private emitHistoryChangeEvent(action: 'add' | 'remove' | 'clear' | 'restore', entry?: RouteHistoryEntry): void {
    const event: HistoryChangeEvent = {
      type: 'HISTORY_CHANGE',
      source: 'history-service',
      timestamp: new Date().toISOString(),
      id: `history-change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        action,
        entry,
        count: this.getHistory().length
      }
    };
    
    globalEventBus.emit(event);
  }

  /**
   * 发送快照事件
   */
  private emitSnapshotEvent(snapshot: HistorySnapshot, reason: 'manual' | 'auto' | 'beforeNavigation'): void {
    const event: HistorySnapshotEvent = {
      type: 'HISTORY_SNAPSHOT',
      source: 'history-service',
      timestamp: new Date().toISOString(),
      id: `history-snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: {
        snapshot,
        reason
      }
    };
    
    globalEventBus.emit(event);
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopAutoSnapshot();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    }
    
    if (this.debug) {
      console.log('[HistoryService] Destroyed');
    }
  }
}

// ==================== 全局实例 ====================

export const globalHistoryService = new HistoryService({
  debug: typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development'
});

// ==================== 导出类型 ====================

export type {
  HistorySnapshot,
  HistoryFilter,
  HistoryStats,
  NavigationPattern,
  HistoryExportOptions,
  HistoryChangeEvent,
  HistorySnapshotEvent
};