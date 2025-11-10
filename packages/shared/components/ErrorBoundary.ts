/**
 * 错误边界 - 全局错误处理和用户友好的错误提示
 * 提供JavaScript错误捕获和恢复功能，可以被任何框架使用
 */

import { globalErrorManager } from '../communication/error/error-manager';
import { globalRecoveryService, RecoveryResult } from '../communication/error/recovery-service';

// ==================== 类型定义 ====================

export interface ErrorBoundaryOptions {
  container?: HTMLElement;
  enableRecovery?: boolean;
  enableReporting?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, context?: any) => void;
}

export interface ErrorDisplayData {
  error: Error;
  retryCount: number;
  maxRetries: number;
  isRecovering: boolean;
  recoveryResult: RecoveryResult | null;
  canRetry: boolean;
  timestamp: string;
}

// ==================== 错误边界类 ====================

export class ErrorBoundaryHandler {
  private options: ErrorBoundaryOptions;
  private container?: HTMLElement;
  private currentError: Error | null = null;
  private retryCount: number = 0;
  private isRecovering: boolean = false;
  private recoveryResult: RecoveryResult | null = null;
  private retryTimeoutId: any = null;
  private observers: Set<(data: ErrorDisplayData | null) => void> = new Set();

  constructor(options: ErrorBoundaryOptions = {}) {
    this.options = {
      enableRecovery: true,
      enableReporting: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };

    this.container = options.container;
    this.setupGlobalErrorHandlers();
  }

  /**
   * 处理错误
   */
  handleError(error: Error, context?: any): void {
    this.currentError = error;
    this.isRecovering = false;
    this.recoveryResult = null;

    // 报告错误到错误管理器
    if (this.options.enableReporting) {
      globalErrorManager.handleRuntimeError(error, {
        component: 'error-boundary',
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...context
      });
    }

    // 调用自定义错误处理器
    if (this.options.onError) {
      this.options.onError(error, context);
    }

    this.updateDisplay();
    console.error('[ErrorBoundary] Error caught:', error);
  }

  /**
   * 重试操作
   */
  async retry(): Promise<void> {
    const { maxRetries = 3, retryDelay = 1000, enableRecovery = true } = this.options;

    if (this.retryCount >= maxRetries || !this.currentError) {
      return;
    }

    this.isRecovering = true;
    this.recoveryResult = null;
    this.updateDisplay();

    try {
      // 如果启用了恢复功能，尝试自动恢复
      if (enableRecovery) {
        const recoveryResult = await globalRecoveryService.executeFallback('runtime-error', {
          component: 'error-boundary',
          error: this.currentError.message
        });

        this.recoveryResult = recoveryResult;
        this.updateDisplay();

        if (recoveryResult.success) {
          // 恢复成功，延迟后清除错误
          this.retryTimeoutId = setTimeout(() => {
            this.clearError();
            this.retryCount++;
          }, 1000);
          return;
        }
      }

      // 直接重试
      this.retryTimeoutId = setTimeout(() => {
        this.clearError();
        this.retryCount++;
      }, retryDelay);

    } catch (recoveryError) {
      console.error('[ErrorBoundary] Recovery failed:', recoveryError);
      
      this.recoveryResult = {
        success: false,
        strategy: 'error-boundary-recovery',
        attempts: 1,
        duration: 0,
        error: recoveryError as Error
      };
      
      this.isRecovering = false;
      this.updateDisplay();
    }
  }

  /**
   * 报告错误
   */
  reportError(): void {
    if (!this.currentError) return;

    const errorReport = {
      message: this.currentError.message,
      stack: this.currentError.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount
    };

    console.log('[ErrorBoundary] Error report:', errorReport);
    
    // 复制错误信息到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
        .then(() => {
          alert('Error details copied to clipboard');
        })
        .catch(() => {
          alert('Failed to copy error details');
        });
    }
  }

  /**
   * 回滚状态
   */
  async rollback(): Promise<void> {
    this.isRecovering = true;
    this.updateDisplay();

    try {
      const recoveryResult = await globalRecoveryService.rollbackState(
        undefined,
        'Error boundary rollback'
      );

      this.recoveryResult = recoveryResult;
      this.updateDisplay();

      if (recoveryResult.success) {
        // 回滚成功，清除错误状态
        setTimeout(() => {
          this.clearError();
        }, 1000);
      } else {
        this.isRecovering = false;
        this.updateDisplay();
      }

    } catch (rollbackError) {
      console.error('[ErrorBoundary] Rollback failed:', rollbackError);
      this.recoveryResult = {
        success: false,
        strategy: 'state-rollback',
        attempts: 1,
        duration: 0,
        error: rollbackError as Error
      };
      
      this.isRecovering = false;
      this.updateDisplay();
    }
  }

  /**
   * 清除错误
   */
  clearError(): void {
    this.currentError = null;
    this.isRecovering = false;
    this.recoveryResult = null;
    
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    
    this.updateDisplay();
  }

  /**
   * 重置重试计数
   */
  resetRetryCount(): void {
    this.retryCount = 0;
  }

  /**
   * 获取当前错误数据
   */
  getCurrentData(): ErrorDisplayData | null {
    if (!this.currentError) return null;

    return {
      error: this.currentError,
      retryCount: this.retryCount,
      maxRetries: this.options.maxRetries || 3,
      isRecovering: this.isRecovering,
      recoveryResult: this.recoveryResult,
      canRetry: this.retryCount < (this.options.maxRetries || 3),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 订阅错误状态更新
   */
  subscribe(observer: (data: ErrorDisplayData | null) => void): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  /**
   * 创建HTML错误显示界面
   */
  createHTMLDisplay(): string {
    const data = this.getCurrentData();
    if (!data) return '';

    const { error, retryCount, maxRetries, isRecovering, recoveryResult, canRetry } = data;

    const getRecoveryStatusStyle = () => {
      if (!recoveryResult) return 'background: #e6f7ff; border: 1px solid #91d5ff; color: #0958d9;';
      return recoveryResult.success 
        ? 'background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d;'
        : 'background: #fff2f0; border: 1px solid #ffccc7; color: #cf1322;';
    };

    const getRecoveryStatusText = () => {
      if (isRecovering) return '🔄 Attempting recovery...';
      if (!recoveryResult) return '';
      if (recoveryResult.success) {
        return `✅ Recovery successful using ${recoveryResult.strategy} (${recoveryResult.attempts} attempts, ${recoveryResult.duration.toFixed(0)}ms)`;
      } else {
        return `❌ Recovery failed: ${recoveryResult.error?.message}`;
      }
    };

    return `
      <div class="error-boundary" style="padding: 24px; margin: 16px; border-radius: 8px; border: 2px solid #ff4d4f; background: #fff2f0; font-family: Arial, sans-serif;">
        <div style="display: flex; align-items: center; margin-bottom: 16px; font-size: 18px; font-weight: bold; color: #cf1322;">
          <span style="margin-right: 8px; font-size: 24px;">⚠️</span>
          Something went wrong
        </div>

        <div style="font-size: 16px; color: #262626; margin-bottom: 12px; line-height: 1.5;">
          ${error.message || 'An unexpected error occurred'}
        </div>

        ${error.stack ? `
          <details>
            <summary style="cursor: pointer; margin-bottom: 8px; color: #1890ff;">View Error Details</summary>
            <div style="font-size: 14px; color: #8c8c8c; margin-bottom: 16px; font-family: monospace; background: #f5f5f5; padding: 12px; border-radius: 4px; max-height: 200px; overflow: auto; white-space: pre-wrap;">
              <strong>Error Stack:</strong>
              ${error.stack}
            </div>
          </details>
        ` : ''}

        ${(isRecovering || recoveryResult) ? `
          <div style="padding: 12px; border-radius: 4px; margin-top: 12px; font-size: 14px; ${getRecoveryStatusStyle()}">
            ${getRecoveryStatusText()}
          </div>
        ` : ''}

        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px;">
          ${canRetry ? `
            <button onclick="errorBoundary.retry()" ${isRecovering ? 'disabled' : ''} style="padding: 8px 16px; border: none; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; min-width: 80px; background: #1890ff; color: #fff;">
              ${isRecovering ? 'Retrying...' : 'Try Again'}
            </button>
          ` : ''}

          ${this.options.enableRecovery ? `
            <button onclick="errorBoundary.rollback()" ${isRecovering ? 'disabled' : ''} style="padding: 8px 16px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; min-width: 80px; background: #f0f0f0; color: #262626;">
              Rollback State
            </button>
          ` : ''}

          <button onclick="errorBoundary.reportError()" ${isRecovering ? 'disabled' : ''} style="padding: 8px 16px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; min-width: 80px; background: #f0f0f0; color: #262626;">
            Report Error
          </button>

          <button onclick="window.location.reload()" ${isRecovering ? 'disabled' : ''} style="padding: 8px 16px; border: none; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s; min-width: 80px; background: #ff4d4f; color: #fff;">
            Reload Page
          </button>
        </div>

        ${retryCount > 0 ? `
          <div style="font-size: 12px; color: #8c8c8c; margin-top: 8px;">
            Retry attempts: ${retryCount}/${maxRetries}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染到指定容器
   */
  renderToContainer(container: HTMLElement): void {
    this.container = container;
    this.updateDisplay();
  }

  /**
   * 销毁错误边界
   */
  destroy(): void {
    this.clearError();
    this.observers.clear();
    
    if (this.container) {
      this.container.innerHTML = '';
    }

    // 移除全局错误监听器
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  // ==================== 私有方法 ====================

  private updateDisplay(): void {
    const data = this.getCurrentData();

    // 通知观察者
    this.observers.forEach(observer => {
      try {
        observer(data);
      } catch (error) {
        console.error('[ErrorBoundary] Error notifying observer:', error);
      }
    });

    // 更新HTML容器
    if (this.container) {
      if (data) {
        this.container.innerHTML = this.createHTMLDisplay();
      } else {
        this.container.innerHTML = '';
      }
    }
  }

  private setupGlobalErrorHandlers(): void {
    // 全局错误处理
    window.addEventListener('error', this.handleGlobalError);

    // Promise rejection 处理
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleGlobalError = (event: ErrorEvent) => {
    this.handleError(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    this.handleError(error, {
      type: 'unhandled-promise-rejection'
    });
  };
}

// ==================== 全局实例 ====================

export const globalErrorBoundary = new ErrorBoundaryHandler();

// 将实例暴露到全局，方便在HTML中使用
if (typeof window !== 'undefined') {
  (window as any).errorBoundary = globalErrorBoundary;
}

// ==================== 工具函数 ====================

/**
 * 创建错误边界实例
 */
export function createErrorBoundary(options?: ErrorBoundaryOptions): ErrorBoundaryHandler {
  return new ErrorBoundaryHandler(options);
}

/**
 * 包装函数以提供错误处理
 */
export function withErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  errorHandler?: ErrorBoundaryHandler
): T {
  const handler = errorHandler || globalErrorBoundary;
  
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.catch(error => {
          handler.handleError(error);
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      handler.handleError(error as Error);
      throw error;
    }
  }) as T;
}

/**
 * 设置全局错误边界
 */
export function setupGlobalErrorBoundary(container?: HTMLElement): ErrorBoundaryHandler {
  const errorBoundary = new ErrorBoundaryHandler({ container });
  
  // 替换全局实例
  if (typeof window !== 'undefined') {
    (window as any).errorBoundary = errorBoundary;
  }
  
  return errorBoundary;
}