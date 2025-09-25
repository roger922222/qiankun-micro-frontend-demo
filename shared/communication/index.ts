/**
 * 微前端通信系统统一导出
 * 提供完整的通信、监控、错误处理、实时通信、工具集功能
 */

// 基础通信系统
export * from './event-bus';
export * from './global-state';

// 中间件系统
export * from './middleware';

// 导航系统
export * from './navigation';

// 监控系统
export * from './monitoring';

// 错误处理系统
export * from './error';

// 实时通信系统
export * from './realtime';

// 通信工具集
export * from './utils';

// 组件
export * from '../components/PerformanceMonitor';
export * from '../components/ErrorBoundary';
export * from '../components/CommunicationDebugger';

// 增强设置
export * from './enhanced-setup';

// 重新导出主要实例
export { globalEventBus } from './event-bus';
export { globalStateManager } from './global-state';

// 初始化函数
export async function initializeCommunicationSystem(options?: {
  enableMonitoring?: boolean;
  enableErrorHandling?: boolean;
  enableRecovery?: boolean;
  enableRealtime?: boolean;
  enableUtils?: boolean;
  enableDebugger?: boolean;
  environment?: 'development' | 'production';
  performanceOptions?: any;
  errorOptions?: any;
  realtimeOptions?: any;
  utilsOptions?: any;
}) {
  const {
    enableMonitoring = true,
    enableErrorHandling = true,
    enableRecovery = true,
    enableRealtime = true,
    enableUtils = true,
    enableDebugger = false,
    environment = 'development',
    performanceOptions = {},
    errorOptions = {},
    realtimeOptions = {},
    utilsOptions = {}
  } = options || {};

  console.log('[CommunicationSystem] Initializing micro-frontend communication system...');

  // 初始化监控系统
  if (enableMonitoring) {
    try {
      const monitoring = await import('./monitoring');
      if (monitoring.MonitoringUtils) {
        monitoring.MonitoringUtils.initialize({ performanceOptions });
      }
    } catch (error) {
      console.warn('[CommunicationSystem] Failed to initialize monitoring:', error);
    }
  }

  // 初始化错误处理系统
  if (enableErrorHandling) {
    try {
      const errorHandling = await import('./error');
      if (errorHandling.ErrorHandlingUtils) {
        errorHandling.ErrorHandlingUtils.initialize({ errorOptions });
      }
    } catch (error) {
      console.warn('[CommunicationSystem] Failed to initialize error handling:', error);
    }
  }

  // 启用恢复服务
  if (enableRecovery) {
    try {
      const errorHandling = await import('./error');
      if (errorHandling.globalRecoveryService) {
        errorHandling.globalRecoveryService.setEnabled(true);
      }
    } catch (error) {
      console.warn('[CommunicationSystem] Failed to enable recovery service:', error);
    }
  }

  // 初始化实时通信系统
  if (enableRealtime) {
    try {
      const realtime = await import('./realtime');
      if (realtime.RealtimeUtils) {
        realtime.RealtimeUtils.initialize(realtimeOptions);
      }
    } catch (error) {
      console.warn('[CommunicationSystem] Failed to initialize realtime:', error);
    }
  }

  // 初始化通信工具集
  if (enableUtils) {
    try {
      const utils = await import('./utils');
      if (utils.CommunicationUtils) {
        utils.CommunicationUtils.initialize(utilsOptions);
      }
    } catch (error) {
      console.warn('[CommunicationSystem] Failed to initialize utils:', error);
    }
  }

  // 在开发环境中启用调试器
  if (enableDebugger && environment === 'development') {
    console.log('[CommunicationSystem] Communication debugger enabled');
  }

  console.log('[CommunicationSystem] Communication system initialized successfully');

  return {
    environment,
    features: {
      monitoring: enableMonitoring,
      errorHandling: enableErrorHandling,
      recovery: enableRecovery,
      realtime: enableRealtime,
      utils: enableUtils,
      debugger: enableDebugger
    }
  };
}