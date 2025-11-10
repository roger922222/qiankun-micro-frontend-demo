/**
 * 错误恢复服务 - 微前端错误自动恢复机制
 * 提供事件重试、状态回滚、降级处理等错误恢复策略
 */

import { BaseEvent } from '../../types/events';
import { GlobalState } from '../../types/store';
import { ErrorInfo, ErrorType, globalErrorManager } from './error-manager';

// ==================== 恢复策略类型定义 ====================

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  errorTypes: ErrorType[];
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  enabled: boolean;
  priority: number;
}

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
  onSuccess?: (result: any, attempt: number) => void;
  onFailure?: (error: Error, attempts: number) => void;
}

export interface RollbackPoint {
  id: string;
  timestamp: string;
  state: Partial<GlobalState>;
  description: string;
  metadata?: Record<string, any>;
}

export interface FallbackConfig {
  id: string;
  errorTypes: ErrorType[];
  fallbackAction: () => Promise<any> | any;
  description: string;
  enabled: boolean;
}

export interface RecoveryResult {
  success: boolean;
  strategy: string;
  attempts: number;
  duration: number;
  error?: Error;
  result?: any;
  metadata?: Record<string, any>;
}

export interface RecoveryServiceOptions {
  enabled?: boolean;
  maxRollbackPoints?: number;
  autoRollbackEnabled?: boolean;
  retryStrategies?: Partial<RecoveryStrategy>[];
  fallbackConfigs?: FallbackConfig[];
}

// ==================== 恢复服务实现 ====================

export class RecoveryService {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private rollbackPoints: RollbackPoint[] = [];
  private fallbacks: Map<string, FallbackConfig> = new Map();
  private activeRetries: Map<string, { attempts: number; lastAttempt: number }> = new Map();
  private enabled: boolean = true;
  private maxRollbackPoints: number = 50;
  private autoRollbackEnabled: boolean = true;
  private observers: Set<(result: RecoveryResult) => void> = new Set();

  constructor(options: RecoveryServiceOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.maxRollbackPoints = options.maxRollbackPoints ?? 50;
    this.autoRollbackEnabled = options.autoRollbackEnabled ?? true;

    // 初始化默认策略
    this.initializeDefaultStrategies();

    // 注册自定义策略
    if (options.retryStrategies) {
      options.retryStrategies.forEach(strategy => {
        this.addStrategy(strategy);
      });
    }

    // 注册降级配置
    if (options.fallbackConfigs) {
      options.fallbackConfigs.forEach(config => {
        this.addFallback(config);
      });
    }

    // 监听错误事件
    if (this.enabled) {
      this.setupErrorListeners();
    }
  }

  /**
   * 事件重试机制
   */
  async retryEvent<T extends BaseEvent>(
    eventHandler: (event: T) => Promise<any>,
    event: T,
    options: RetryOptions = {}
  ): Promise<RecoveryResult> {
    const startTime = performance.now();
    const strategy = this.getStrategyForErrorType('event-error');
    
    const maxRetries = options.maxRetries ?? strategy?.maxRetries ?? 3;
    const retryDelay = options.retryDelay ?? strategy?.retryDelay ?? 1000;
    const backoffMultiplier = options.backoffMultiplier ?? strategy?.backoffMultiplier ?? 2;
    const maxDelay = options.maxDelay ?? strategy?.maxDelay ?? 10000;

    let lastError: Error | null = null;
    let attempts = 0;

    for (attempts = 1; attempts <= maxRetries + 1; attempts++) {
      try {
        const result = await eventHandler(event);
        
        const duration = performance.now() - startTime;
        const recoveryResult: RecoveryResult = {
          success: true,
          strategy: strategy?.name || 'default-retry',
          attempts,
          duration,
          result,
          metadata: {
            eventType: event.type,
            eventId: event.id
          }
        };

        if (options.onSuccess) {
          options.onSuccess(result, attempts);
        }

        this.notifyObservers(recoveryResult);
        return recoveryResult;

      } catch (error) {
        lastError = error as Error;
        
        // 检查是否应该重试
        if (attempts > maxRetries) {
          break;
        }

        if (options.retryCondition && !options.retryCondition(lastError, attempts)) {
          break;
        }

        // 记录重试
        if (options.onRetry) {
          options.onRetry(lastError, attempts);
        }

        // 等待重试延迟
        const delay = Math.min(retryDelay * Math.pow(backoffMultiplier, attempts - 1), maxDelay);
        await this.sleep(delay);

        console.warn(`[RecoveryService] Retrying event ${event.type}, attempt ${attempts}/${maxRetries}`);
      }
    }

    // 所有重试都失败了
    const duration = performance.now() - startTime;
    const recoveryResult: RecoveryResult = {
      success: false,
      strategy: strategy?.name || 'default-retry',
      attempts,
      duration,
      error: lastError!,
      metadata: {
        eventType: event.type,
        eventId: event.id
      }
    };

    if (options.onFailure) {
      options.onFailure(lastError!, attempts);
    }

    // 记录错误
    globalErrorManager.handleEventError(lastError!, event, {
      component: 'recovery-service'
    });

    this.notifyObservers(recoveryResult);
    return recoveryResult;
  }

  /**
   * 状态回滚机制
   */
  async rollbackState(
    rollbackPointId?: string,
    reason?: string
  ): Promise<RecoveryResult> {
    const startTime = performance.now();

    try {
      let targetRollbackPoint: RollbackPoint | undefined;

      if (rollbackPointId) {
        targetRollbackPoint = this.rollbackPoints.find(point => point.id === rollbackPointId);
      } else {
        // 使用最新的回滚点
        targetRollbackPoint = this.rollbackPoints[this.rollbackPoints.length - 1];
      }

      if (!targetRollbackPoint) {
        throw new Error('No rollback point available');
      }

      // 执行状态回滚
      await this.executeStateRollback(targetRollbackPoint);

      const duration = performance.now() - startTime;
      const recoveryResult: RecoveryResult = {
        success: true,
        strategy: 'state-rollback',
        attempts: 1,
        duration,
        metadata: {
          rollbackPointId: targetRollbackPoint.id,
          rollbackTimestamp: targetRollbackPoint.timestamp,
          reason
        }
      };

      console.log(`[RecoveryService] State rolled back to ${targetRollbackPoint.timestamp}`);
      this.notifyObservers(recoveryResult);
      return recoveryResult;

    } catch (error) {
      const duration = performance.now() - startTime;
      const recoveryResult: RecoveryResult = {
        success: false,
        strategy: 'state-rollback',
        attempts: 1,
        duration,
        error: error as Error,
        metadata: { reason }
      };

      globalErrorManager.handleCustomError(
        `State rollback failed: ${(error as Error).message}`,
        'state-error',
        'high',
        { component: 'recovery-service' }
      );

      this.notifyObservers(recoveryResult);
      return recoveryResult;
    }
  }

  /**
   * 降级处理机制
   */
  async executeFallback(errorType: ErrorType, context?: any): Promise<RecoveryResult> {
    const startTime = performance.now();

    try {
      const fallback = this.getFallbackForErrorType(errorType);
      
      if (!fallback || !fallback.enabled) {
        throw new Error(`No fallback available for error type: ${errorType}`);
      }

      const result = await fallback.fallbackAction();

      const duration = performance.now() - startTime;
      const recoveryResult: RecoveryResult = {
        success: true,
        strategy: 'fallback',
        attempts: 1,
        duration,
        result,
        metadata: {
          fallbackId: fallback.id,
          errorType,
          context
        }
      };

      console.log(`[RecoveryService] Fallback executed for ${errorType}:`, fallback.description);
      this.notifyObservers(recoveryResult);
      return recoveryResult;

    } catch (error) {
      const duration = performance.now() - startTime;
      const recoveryResult: RecoveryResult = {
        success: false,
        strategy: 'fallback',
        attempts: 1,
        duration,
        error: error as Error,
        metadata: { errorType, context }
      };

      globalErrorManager.handleCustomError(
        `Fallback execution failed: ${(error as Error).message}`,
        errorType,
        'high',
        { component: 'recovery-service' }
      );

      this.notifyObservers(recoveryResult);
      return recoveryResult;
    }
  }

  /**
   * 创建状态回滚点
   */
  createRollbackPoint(state: Partial<GlobalState>, description: string): string {
    const rollbackPoint: RollbackPoint = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      state: this.deepClone(state),
      description,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    };

    this.rollbackPoints.push(rollbackPoint);

    // 限制回滚点数量
    if (this.rollbackPoints.length > this.maxRollbackPoints) {
      this.rollbackPoints = this.rollbackPoints.slice(-this.maxRollbackPoints);
    }

    console.log(`[RecoveryService] Rollback point created: ${rollbackPoint.id}`);
    return rollbackPoint.id;
  }

  /**
   * 添加恢复策略
   */
  addStrategy(strategy: Partial<RecoveryStrategy>): void {
    const fullStrategy: RecoveryStrategy = {
      id: strategy.id || this.generateId(),
      name: strategy.name || 'Custom Strategy',
      description: strategy.description || '',
      errorTypes: strategy.errorTypes || [],
      maxRetries: strategy.maxRetries || 3,
      retryDelay: strategy.retryDelay || 1000,
      backoffMultiplier: strategy.backoffMultiplier || 2,
      maxDelay: strategy.maxDelay || 10000,
      enabled: strategy.enabled ?? true,
      priority: strategy.priority || 0
    };

    this.strategies.set(fullStrategy.id, fullStrategy);
  }

  /**
   * 添加降级配置
   */
  addFallback(config: FallbackConfig): void {
    this.fallbacks.set(config.id, config);
  }

  /**
   * 获取回滚点列表
   */
  getRollbackPoints(): RollbackPoint[] {
    return [...this.rollbackPoints];
  }

  /**
   * 获取恢复策略列表
   */
  getStrategies(): RecoveryStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * 获取降级配置列表
   */
  getFallbacks(): FallbackConfig[] {
    return Array.from(this.fallbacks.values());
  }

  /**
   * 订阅恢复结果
   */
  subscribe(observer: (result: RecoveryResult) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 启用/禁用恢复服务
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 清除所有回滚点
   */
  clearRollbackPoints(): void {
    this.rollbackPoints = [];
  }

  /**
   * 销毁恢复服务
   */
  destroy(): void {
    this.enabled = false;
    this.strategies.clear();
    this.rollbackPoints = [];
    this.fallbacks.clear();
    this.activeRetries.clear();
    this.observers.clear();
  }

  // ==================== 私有方法 ====================

  private initializeDefaultStrategies(): void {
    // 事件错误恢复策略
    this.addStrategy({
      id: 'event-error-retry',
      name: 'Event Error Retry',
      description: 'Retry failed events with exponential backoff',
      errorTypes: ['event-error'],
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 8000,
      enabled: true,
      priority: 1
    });

    // 状态错误恢复策略
    this.addStrategy({
      id: 'state-error-retry',
      name: 'State Error Retry',
      description: 'Retry failed state updates',
      errorTypes: ['state-error'],
      maxRetries: 2,
      retryDelay: 500,
      backoffMultiplier: 1.5,
      maxDelay: 2000,
      enabled: true,
      priority: 1
    });

    // 网络错误恢复策略
    this.addStrategy({
      id: 'network-error-retry',
      name: 'Network Error Retry',
      description: 'Retry failed network requests',
      errorTypes: ['network-error'],
      maxRetries: 5,
      retryDelay: 2000,
      backoffMultiplier: 2,
      maxDelay: 30000,
      enabled: true,
      priority: 2
    });

    // 导航错误恢复策略
    this.addStrategy({
      id: 'navigation-error-retry',
      name: 'Navigation Error Retry',
      description: 'Retry failed navigation attempts',
      errorTypes: ['navigation-error'],
      maxRetries: 2,
      retryDelay: 1000,
      backoffMultiplier: 1,
      maxDelay: 1000,
      enabled: true,
      priority: 1
    });
  }

  private setupErrorListeners(): void {
    globalErrorManager.onError('all', async (error: ErrorInfo) => {
      if (!this.enabled || !this.autoRollbackEnabled) {
        return;
      }

      // 对于严重错误，自动执行降级处理
      if (error.level === 'critical' || error.level === 'high') {
        try {
          await this.executeFallback(error.type, error.context);
        } catch (fallbackError) {
          console.error('[RecoveryService] Auto fallback failed:', fallbackError);
        }
      }
    });
  }

  private getStrategyForErrorType(errorType: ErrorType): RecoveryStrategy | undefined {
    const strategies = Array.from(this.strategies.values())
      .filter(strategy => strategy.enabled && strategy.errorTypes.includes(errorType))
      .sort((a, b) => b.priority - a.priority);

    return strategies[0];
  }

  private getFallbackForErrorType(errorType: ErrorType): FallbackConfig | undefined {
    return Array.from(this.fallbacks.values())
      .find(fallback => fallback.enabled && fallback.errorTypes.includes(errorType));
  }

  private async executeStateRollback(rollbackPoint: RollbackPoint): Promise<void> {
    // 这里需要与全局状态管理器集成
    // 实际实现中需要调用状态管理器的回滚方法
    
    // 模拟状态回滚
    if (typeof window !== 'undefined' && (window as any).globalStateManager) {
      const stateManager = (window as any).globalStateManager;
      if (stateManager.rollbackToSnapshot) {
        await stateManager.rollbackToSnapshot(rollbackPoint.id);
      }
    }

    // 发送状态回滚事件
    if (typeof window !== 'undefined' && (window as any).globalEventBus) {
      const eventBus = (window as any).globalEventBus;
      eventBus.emit({
        type: 'STATE_ROLLBACK',
        source: 'recovery-service',
        timestamp: new Date().toISOString(),
        id: this.generateId(),
        data: {
          rollbackPointId: rollbackPoint.id,
          rollbackTimestamp: rollbackPoint.timestamp
        }
      });
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as any;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item)) as any;
    }

    if (typeof obj === 'object') {
      const clonedObj = {} as any;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }

    return obj;
  }

  private generateId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private notifyObservers(result: RecoveryResult): void {
    this.observers.forEach(observer => {
      try {
        observer(result);
      } catch (error) {
        console.error('[RecoveryService] Error notifying observer:', error);
      }
    });
  }
}

// ==================== 单例实例 ====================

export const globalRecoveryService = new RecoveryService({
  enabled: true,
  maxRollbackPoints: 50,
  autoRollbackEnabled: true
});

// ==================== 工具函数 ====================

/**
 * 创建重试装饰器
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: any[]) => {
    const result = await globalRecoveryService.retryEvent(
      async () => fn(...args),
      {
        type: 'FUNCTION_CALL',
        source: 'retry-decorator',
        timestamp: new Date().toISOString(),
        id: globalRecoveryService['generateId']()
      } as any,
      options
    );

    if (result.success) {
      return result.result;
    } else {
      throw result.error;
    }
  }) as T;
}

/**
 * 创建状态保护装饰器
 */
export function withStateProtection<T extends (...args: any[]) => any>(
  fn: T,
  description: string = 'Function execution'
): T {
  return ((...args: any[]) => {
    // 在函数执行前创建回滚点
    if (typeof window !== 'undefined' && (window as any).globalStateManager) {
      const stateManager = (window as any).globalStateManager;
      const currentState = stateManager.getState();
      globalRecoveryService.createRollbackPoint(currentState, description);
    }

    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.catch(error => {
          // 异步函数出错时可以选择回滚
          console.warn('[RecoveryService] Async function failed, rollback available');
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      // 同步函数出错时可以选择回滚
      console.warn('[RecoveryService] Sync function failed, rollback available');
      throw error;
    }
  }) as T;
}

/**
 * 恢复服务Hook (仅在React环境中可用)
 */
export function useRecoveryService() {
  if (typeof window === 'undefined' || !(window as any).React) {
    return {
      rollbackPoints: [],
      strategies: [],
      fallbacks: [],
      createRollbackPoint: () => '',
      rollbackState: () => Promise.resolve({ success: false } as RecoveryResult),
      executeFallback: () => Promise.resolve({ success: false } as RecoveryResult)
    };
  }

  const React = (window as any).React;
  const [rollbackPoints, setRollbackPoints] = React.useState([] as RollbackPoint[]);
  const [strategies, setStrategies] = React.useState([] as RecoveryStrategy[]);
  const [fallbacks, setFallbacks] = React.useState([] as FallbackConfig[]);

  React.useEffect(() => {
    setRollbackPoints(globalRecoveryService.getRollbackPoints());
    setStrategies(globalRecoveryService.getStrategies());
    setFallbacks(globalRecoveryService.getFallbacks());
  }, []);

  const createRollbackPoint = React.useCallback((state: Partial<GlobalState>, description: string) => {
    const id = globalRecoveryService.createRollbackPoint(state, description);
    setRollbackPoints(globalRecoveryService.getRollbackPoints());
    return id;
  }, []);

  const rollbackState = React.useCallback((rollbackPointId?: string, reason?: string) => {
    return globalRecoveryService.rollbackState(rollbackPointId, reason);
  }, []);

  const executeFallback = React.useCallback((errorType: ErrorType, context?: any) => {
    return globalRecoveryService.executeFallback(errorType, context);
  }, []);

  return {
    rollbackPoints,
    strategies,
    fallbacks,
    createRollbackPoint,
    rollbackState,
    executeFallback
  };
}