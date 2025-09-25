/**
 * 通信工具集统一导出
 * 提供性能优化、数据同步、冲突解决、通信工具的统一接口
 */

// 性能优化工具
export {
  PerformanceOptimizer,
  BatchProcessor,
  MemoryMonitor,
  globalPerformanceOptimizer,
  debounce,
  throttle,
  createDebouncedEventHandler,
  createThrottledEventHandler,
  createStateUpdateBatcher,
  withPerformanceMonitoring,
  withMemoryProtection
} from './performance-utils';

export type {
  DebounceOptions,
  ThrottleOptions,
  BatchProcessingOptions,
  MemoryMonitorOptions,
  MemoryUsage,
  PerformanceMetrics
} from './performance-utils';

// 数据同步工具
export {
  DataSynchronizer,
  globalDataSynchronizer,
  addDataSync,
  syncDataPath,
  createRealTimeSync,
  createScheduledSync,
  getDataSyncStatus
} from './data-sync';

export type {
  SyncConfig,
  SyncData,
  SyncOperation,
  ConflictInfo,
  SyncStats,
  SyncMode,
  SyncOperationType,
  SyncStatus,
  ConflictType,
  ConflictResolutionStrategy,
  ConflictResolution
} from './data-sync';

// 冲突解决器
export {
  ConflictResolver,
  globalConflictResolver,
  detectAndResolveConflict,
  createConflictRule,
  getConflictStatus
} from './conflict-resolver';

export type {
  ConflictData,
  ConflictResolutionRule,
  ConflictResolutionResult,
  ConflictHistory,
  ConflictStats,
  ConflictSeverity,
  ResolutionStrategy,
  ConflictCondition,
  CustomResolver
} from './conflict-resolver';

// 通信工具函数
export {
  sendEvent,
  listenToEvent,
  requestResponse,
  updateState,
  watchState,
  createStateBatcher,
  notify,
  subscribeToNotifications,
  sendQueueMessage,
  registerMessageHandler,
  createWebSocketConnection,
  sendWebSocketMessage,
  syncDataToApps,
  PubSub,
  Command,
  CommandBus,
  globalPubSub,
  globalCommandBus,
  checkCommunicationHealth
} from './communication-utils';

export type {
  CommunicationOptions,
  EventOptions,
  StateOptions,
  MessageOptions,
  CommunicationResult,
  CommunicationHealth
} from './communication-utils';

// 工具集合
export const CommunicationUtils = {
  /**
   * 初始化通信工具集
   */
  initialize: (options?: {
    enablePerformanceOptimization?: boolean;
    enableDataSync?: boolean;
    enableConflictResolution?: boolean;
    performanceConfig?: {
      memoryThreshold?: number;
      checkInterval?: number;
    };
    syncConfig?: {
      defaultSyncMode?: 'manual' | 'automatic' | 'real-time';
      conflictResolution?: 'local-wins' | 'remote-wins' | 'timestamp-based';
    };
  }) => {
    const {
      enablePerformanceOptimization = true,
      enableDataSync = true,
      enableConflictResolution = true,
      performanceConfig = {},
      syncConfig = {}
    } = options || {};

    console.log('[CommunicationUtils] Initializing communication utilities...');

    // 初始化性能优化
    if (enablePerformanceOptimization) {
      const { memoryThreshold = 100, checkInterval = 10000 } = performanceConfig;
      
      // 注册内存清理任务
      globalPerformanceOptimizer.registerMemoryCleanup(() => {
        console.log('[CommunicationUtils] Performing memory cleanup');
      });

      console.log('[CommunicationUtils] Performance optimization enabled');
    }

    // 初始化数据同步
    if (enableDataSync) {
      globalDataSynchronizer.setEnabled(true);
      console.log('[CommunicationUtils] Data synchronization enabled');
    }

    // 初始化冲突解决
    if (enableConflictResolution) {
      globalConflictResolver.setEnabled(true);
      console.log('[CommunicationUtils] Conflict resolution enabled');
    }

    console.log('[CommunicationUtils] Communication utilities initialized');
  },

  /**
   * 获取工具集统计信息
   */
  getStats: () => {
    return {
      performance: globalPerformanceOptimizer.getMetrics(),
      dataSync: globalDataSynchronizer.getStats(),
      conflicts: globalConflictResolver.getStats(),
      timestamp: new Date().toISOString()
    };
  },

  /**
   * 创建性能监控装饰器
   */
  createPerformanceDecorator: <T extends (...args: any[]) => any>(
    category: 'event' | 'state' | 'other' = 'other'
  ) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = function (...args: any[]) {
        const monitoredMethod = globalPerformanceOptimizer.monitorFunction(
          originalMethod.bind(this),
          category
        );
        return monitoredMethod(...args);
      };
      
      return descriptor;
    };
  },

  /**
   * 创建自动同步装饰器
   */
  createAutoSyncDecorator: (
    dataPath: string,
    syncMode: 'real-time' | 'automatic' = 'real-time'
  ) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const result = await originalMethod.apply(this, args);
        
        // 触发数据同步
        try {
          await syncDataPath(dataPath, 'push');
        } catch (error) {
          console.warn(`[CommunicationUtils] Auto-sync failed for ${dataPath}:`, error);
        }
        
        return result;
      };
      
      return descriptor;
    };
  },

  /**
   * 创建冲突检测装饰器
   */
  createConflictDetectionDecorator: (
    dataPath: string,
    autoResolve: boolean = true
  ) => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const [newValue] = args;
        
        // 获取当前值
        const currentValue = globalDataSynchronizer.getState?.()?.[dataPath];
        
        if (currentValue !== undefined) {
          // 检测冲突
          const { conflict, resolution } = await detectAndResolveConflict(
            dataPath,
            currentValue,
            newValue,
            { autoResolve }
          );
          
          if (conflict && !resolution) {
            console.warn(`[CommunicationUtils] Conflict detected for ${dataPath}:`, conflict);
          }
        }
        
        return originalMethod.apply(this, args);
      };
      
      return descriptor;
    };
  },

  /**
   * 创建批处理工具
   */
  createBatchProcessor: <T>(
    id: string,
    processor: (items: T[]) => Promise<void> | void,
    options?: {
      batchSize?: number;
      flushInterval?: number;
      maxWaitTime?: number;
    }
  ) => {
    const { batchSize = 10, flushInterval = 100, maxWaitTime = 1000 } = options || {};
    
    return globalPerformanceOptimizer.createBatchProcessor<T>(id, {
      batchSize,
      flushInterval,
      maxWaitTime,
      processor
    });
  },

  /**
   * 创建防抖函数
   */
  createDebounced: <T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    options?: Partial<DebounceOptions>
  ) => {
    return globalPerformanceOptimizer.createDebouncedFunction(func, delay, options);
  },

  /**
   * 创建节流函数
   */
  createThrottled: <T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    options?: Partial<ThrottleOptions>
  ) => {
    return globalPerformanceOptimizer.createThrottledFunction(func, delay, options);
  },

  /**
   * 清理资源
   */
  cleanup: () => {
    console.log('[CommunicationUtils] Cleaning up resources...');
    
    // 触发性能优化器清理
    globalPerformanceOptimizer.cleanup();
    
    // 清理数据同步历史
    globalDataSynchronizer.cleanup(24); // 清理24小时前的数据
    
    // 清理冲突解决历史
    globalConflictResolver.clearHistory(24); // 清理24小时前的数据
    
    console.log('[CommunicationUtils] Resource cleanup completed');
  },

  /**
   * 销毁工具集
   */
  destroy: () => {
    console.log('[CommunicationUtils] Destroying communication utilities...');
    
    globalPerformanceOptimizer.destroy();
    globalDataSynchronizer.destroy();
    globalConflictResolver.destroy();
    
    console.log('[CommunicationUtils] Communication utilities destroyed');
  },

  /**
   * 健康检查
   */
  healthCheck: async () => {
    try {
      const health = await checkCommunicationHealth();
      const stats = CommunicationUtils.getStats();
      
      return {
        health,
        stats,
        status: health.overall ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        health: null,
        stats: null,
        status: 'error',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
};