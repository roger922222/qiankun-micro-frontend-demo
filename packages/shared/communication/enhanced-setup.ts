/**
 * 增强通信系统设置示例
 * 展示如何配置和使用新的中间件系统
 */

import { globalEventBus, globalStateManager } from './index';
import {
  createDevMiddlewareConfig,
  createProdMiddlewareConfig,
  setupEventBusMiddleware,
  setupStateMiddleware
} from './middleware';

/**
 * 初始化增强通信系统
 */
export function initializeEnhancedCommunication(environment: 'development' | 'production' = 'development') {
  console.log(`[EnhancedCommunication] Initializing for ${environment} environment...`);

  // 根据环境创建中间件配置
  const middlewareConfig = environment === 'development' 
    ? createDevMiddlewareConfig()
    : createProdMiddlewareConfig();

  // 设置事件总线中间件
  setupEventBusMiddleware(globalEventBus, middlewareConfig);

  // 设置状态管理中间件
  setupStateMiddleware(globalStateManager, middlewareConfig);

  // 如果是生产环境，尝试恢复持久化状态
  if (environment === 'production') {
    restorePersistedState();
  }

  console.log('[EnhancedCommunication] Initialization complete');

  return {
    eventBus: globalEventBus,
    stateManager: globalStateManager,
    middlewareConfig
  };
}

/**
 * 恢复持久化状态
 */
async function restorePersistedState() {
  try {
    const persistenceMiddleware = globalStateManager.getStateMiddleware()
      .find(m => m.name === 'persistence') as any;

    if (persistenceMiddleware && persistenceMiddleware.restoreState) {
      const restoredState = await persistenceMiddleware.restoreState();
      if (restoredState) {
        globalStateManager.setState(restoredState);
        console.log('[EnhancedCommunication] State restored from persistence');
      }
    }
  } catch (error) {
    console.warn('[EnhancedCommunication] Failed to restore persisted state:', error);
  }
}

/**
 * 获取通信系统统计信息
 */
export function getCommunicationStats() {
  return {
    eventBus: {
      stats: globalEventBus.getStats(),
      middleware: globalEventBus.getMiddlewareStats()
    },
    stateManager: {
      middleware: globalStateManager.getStateMiddlewareStats(),
      history: globalStateManager.getHistoryStats()
    }
  };
}

/**
 * 创建调试助手
 */
export function createDebugHelper() {
  return {
    // 事件总线调试
    eventBus: {
      emit: globalEventBus.emit.bind(globalEventBus),
      getStats: globalEventBus.getStats.bind(globalEventBus),
      getMiddleware: globalEventBus.getMiddleware.bind(globalEventBus),
      toggleMiddleware: globalEventBus.toggleMiddleware.bind(globalEventBus)
    },

    // 状态管理调试
    stateManager: {
      getState: globalStateManager.getState.bind(globalStateManager),
      setState: globalStateManager.setState.bind(globalStateManager),
      dispatch: globalStateManager.dispatch.bind(globalStateManager),
      undo: globalStateManager.undo.bind(globalStateManager),
      redo: globalStateManager.redo.bind(globalStateManager),
      getSnapshots: globalStateManager.getSnapshots.bind(globalStateManager),
      createSnapshot: globalStateManager.createSnapshot.bind(globalStateManager)
    },

    // 统计信息
    getStats: getCommunicationStats
  };
}

/**
 * 导出给开发者使用的调试工具
 */
if (typeof window !== 'undefined') {
  (window as any).__QIANKUN_DEBUG__ = createDebugHelper();
}