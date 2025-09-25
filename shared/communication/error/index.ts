/**
 * 错误处理系统统一导出
 * 提供错误管理和恢复服务的统一接口
 */

// 错误管理器
export {
  ErrorManager,
  globalErrorManager,
  withErrorHandling,
  useErrorHandler
} from './error-manager';

export type {
  ErrorInfo,
  ErrorType,
  ErrorLevel,
  ErrorSource,
  ErrorContext,
  ErrorReport,
  ErrorHandlerOptions,
  ErrorHandler,
  ErrorFilter,
  ErrorTransformer
} from './error-manager';

// 恢复服务
export {
  RecoveryService,
  globalRecoveryService,
  withRetry,
  withStateProtection,
  useRecoveryService
} from './recovery-service';

export type {
  RecoveryStrategy,
  RetryOptions,
  RollbackPoint,
  FallbackConfig,
  RecoveryResult,
  RecoveryServiceOptions
} from './recovery-service';

// 工具函数
export const ErrorHandlingUtils = {
  /**
   * 初始化错误处理系统
   */
  initialize: (options?: {
    errorOptions?: any;
    recoveryOptions?: any;
  }) => {
    const { } = options || {};
    
    // 启用错误管理
    const { globalErrorManager } = require('./error-manager');
    globalErrorManager.setEnabled(true);
    
    // 启用恢复服务
    const { globalRecoveryService } = require('./recovery-service');
    globalRecoveryService.setEnabled(true);
    
    // 设置全局错误处理器
    globalErrorManager.onError('all', (error: any) => {
      console.log(`[ErrorHandling] ${error.level.toUpperCase()} ${error.type}:`, error.message);
    });
    
    console.log('[ErrorHandlingSystem] Error handling system initialized');
  },

  /**
   * 获取错误统计
   */
  getErrorStats: () => {
    const { globalErrorManager } = require('./error-manager');
    const { globalRecoveryService } = require('./recovery-service');
    const report = globalErrorManager.getErrorReport();
    const strategies = globalRecoveryService.getStrategies();
    const rollbackPoints = globalRecoveryService.getRollbackPoints();
    
    return {
      errorReport: report,
      recoveryStrategies: strategies.length,
      rollbackPoints: rollbackPoints.length,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * 清除所有错误数据
   */
  clearAll: () => {
    const { globalErrorManager } = require('./error-manager');
    const { globalRecoveryService } = require('./recovery-service');
    globalErrorManager.clearErrors();
    globalRecoveryService.clearRollbackPoints();
  },

  /**
   * 创建快速恢复点
   */
  createQuickRecovery: (description: string = 'Quick recovery point') => {
    if (typeof window !== 'undefined' && (window as any).globalStateManager) {
      const stateManager = (window as any).globalStateManager;
      const currentState = stateManager.getState();
      const { globalRecoveryService } = require('./recovery-service');
      return globalRecoveryService.createRollbackPoint(currentState, description);
    }
    return null;
  }
};