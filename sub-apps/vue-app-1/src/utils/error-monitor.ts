/**
 * 样式错误监控模块
 * 提供样式错误的捕获、记录、上报和自动恢复功能
 */

// 错误类型定义
export interface StyleError {
  id: string;
  timestamp: number;
  type: 'dom_null_reference' | 'style_injection_failed' | 'hmr_conflict' | 'sandbox_not_ready' | 'unknown';
  component: string;
  message: string;
  stack?: string;
  context: {
    qiankunEnv: boolean;
    domReady: boolean;
    sandboxReady: boolean;
    url: string;
    userAgent: string;
  };
  recovery: {
    attempted: boolean;
    success: boolean;
    method?: string;
    retryCount?: number;
  };
}

// 监控配置
export interface MonitorConfig {
  maxErrors: number;
  reportInterval: number;
  enableAutoRecovery: boolean;
  enableConsoleLog: boolean;
  enableLocalStorage: boolean;
}

// 默认配置
const DEFAULT_CONFIG: MonitorConfig = {
  maxErrors: 100,
  reportInterval: 30000, // 30秒
  enableAutoRecovery: true,
  enableConsoleLog: true,
  enableLocalStorage: true
};

// 错误监控类
export class StyleErrorMonitor {
  private errors: StyleError[] = [];
  private config: MonitorConfig;
  private reportTimer: NodeJS.Timeout | null = null;
  private errorCount = 0;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.init();
  }

  private init(): void {
    // 设置全局错误监控
    if (typeof window !== 'undefined') {
      window.__STYLE_ERROR_MONITOR__ = {
        recordError: this.recordError.bind(this)
      };
    }

    // 启动定期报告
    if (this.config.reportInterval > 0) {
      this.startPeriodicReport();
    }

    // 页面卸载时保存错误日志
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveErrorsToStorage();
      });
    }
  }

  // 记录错误
  public recordError(errorData: Partial<StyleError>): string {
    const errorId = this.generateErrorId();
    const error: StyleError = {
      id: errorId,
      timestamp: Date.now(),
      type: errorData.type || 'unknown',
      component: errorData.component || 'unknown',
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      context: {
        qiankunEnv: window.__POWERED_BY_QIANKUN__ || false,
        domReady: document.readyState === 'complete',
        sandboxReady: this.checkSandboxReady(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...errorData.context
      },
      recovery: {
        attempted: false,
        success: false,
        ...errorData.recovery
      }
    };

    // 添加到错误列表
    this.errors.push(error);
    this.errorCount++;

    // 限制错误数量
    if (this.errors.length > this.config.maxErrors) {
      this.errors.shift();
    }

    // 控制台输出
    if (this.config.enableConsoleLog) {
      console.warn(`[StyleErrorMonitor] 记录样式错误:`, error);
    }

    // 尝试自动恢复
    if (this.config.enableAutoRecovery) {
      this.attemptAutoRecovery(error);
    }

    return errorId;
  }

  // 尝试自动恢复
  private async attemptAutoRecovery(error: StyleError): Promise<void> {
    try {
      let recoverySuccess = false;
      let recoveryMethod = '';

      switch (error.type) {
        case 'dom_null_reference':
          recoverySuccess = await this.recoverDOMReference();
          recoveryMethod = 'dom_recreation';
          break;
        
        case 'style_injection_failed':
          recoverySuccess = await this.recoverStyleInjection();
          recoveryMethod = 'style_reinjection';
          break;
        
        case 'hmr_conflict':
          recoverySuccess = await this.recoverHMRConflict();
          recoveryMethod = 'hmr_reset';
          break;
        
        case 'sandbox_not_ready':
          recoverySuccess = await this.recoverSandboxNotReady();
          recoveryMethod = 'sandbox_wait';
          break;
        
        default:
          recoverySuccess = await this.genericRecovery();
          recoveryMethod = 'generic';
      }

      // 更新恢复状态
      error.recovery.attempted = true;
      error.recovery.success = recoverySuccess;
      error.recovery.method = recoveryMethod;

      if (this.config.enableConsoleLog) {
        console.log(`[StyleErrorMonitor] 自动恢复${recoverySuccess ? '成功' : '失败'}: ${recoveryMethod}`);
      }
    } catch (recoveryError) {
      console.error('[StyleErrorMonitor] 自动恢复过程中发生错误:', recoveryError);
      error.recovery.attempted = true;
      error.recovery.success = false;
    }
  }

  // DOM 引用恢复
  private async recoverDOMReference(): Promise<boolean> {
    try {
      // 等待 DOM 就绪
      await this.waitForDOMReady();
      
      // 检查关键 DOM 元素
      const head = document.head;
      const body = document.body;
      
      if (!head || !body) {
        return false;
      }

      // 验证 DOM 操作
      const testElement = document.createElement('div');
      head.appendChild(testElement);
      const success = head.contains(testElement);
      head.removeChild(testElement);
      
      return success;
    } catch {
      return false;
    }
  }

  // 样式注入恢复
  private async recoverStyleInjection(): Promise<boolean> {
    try {
      // 清理可能损坏的样式元素
      const brokenStyles = document.querySelectorAll('style[data-broken="true"]');
      brokenStyles.forEach(style => style.remove());

      // 重新注入关键样式
      const criticalStyles = `
        .vue-message-center { 
          position: relative; 
          z-index: 1; 
        }
      `;
      
      const styleElement = document.createElement('style');
      styleElement.textContent = criticalStyles;
      styleElement.setAttribute('data-recovery', 'true');
      
      document.head.appendChild(styleElement);
      return true;
    } catch {
      return false;
    }
  }

  // HMR 冲突恢复
  private async recoverHMRConflict(): Promise<boolean> {
    try {
      // 清理 HMR 相关的样式元素
      const hmrStyles = document.querySelectorAll('style[data-vite-dev-id]');
      const conflictedStyles = Array.from(hmrStyles).filter(style => 
        style.textContent?.includes('.vue-message-center')
      );
      
      // 移除冲突的样式
      conflictedStyles.forEach(style => {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      });

      // 等待一帧后重新应用
      await new Promise(resolve => requestAnimationFrame(resolve));
      return true;
    } catch {
      return false;
    }
  }

  // 沙箱未就绪恢复
  private async recoverSandboxNotReady(): Promise<boolean> {
    try {
      // 等待沙箱就绪
      const maxWait = 5000;
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWait) {
        if (this.checkSandboxReady()) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return false;
    } catch {
      return false;
    }
  }

  // 通用恢复策略
  private async genericRecovery(): Promise<boolean> {
    try {
      // 等待环境稳定
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 触发重新渲染
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new Event('resize'));
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // 检查沙箱是否就绪
  private checkSandboxReady(): boolean {
    if (!window.__POWERED_BY_QIANKUN__) return true;
    
    try {
      const testElement = document.createElement('div');
      document.head.appendChild(testElement);
      const isReady = document.head.contains(testElement);
      document.head.removeChild(testElement);
      return isReady;
    } catch {
      return false;
    }
  }

  // 等待 DOM 就绪
  private waitForDOMReady(timeout = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve(true);
        return;
      }

      const timer = setTimeout(() => {
        resolve(false);
        document.removeEventListener('DOMContentLoaded', onReady);
      }, timeout);

      const onReady = () => {
        clearTimeout(timer);
        resolve(true);
        document.removeEventListener('DOMContentLoaded', onReady);
      };

      document.addEventListener('DOMContentLoaded', onReady);
    });
  }

  // 生成错误 ID
  private generateErrorId(): string {
    return `style_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 启动定期报告
  private startPeriodicReport(): void {
    this.reportTimer = setInterval(() => {
      this.generateReport();
    }, this.config.reportInterval);
  }

  // 生成错误报告
  public generateReport(): {
    summary: {
      totalErrors: number;
      errorTypes: Record<string, number>;
      recoveryRate: number;
    };
    recentErrors: StyleError[];
  } {
    const errorTypes: Record<string, number> = {};
    let recoveredCount = 0;

    this.errors.forEach(error => {
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
      if (error.recovery.success) {
        recoveredCount++;
      }
    });

    const report = {
      summary: {
        totalErrors: this.errorCount,
        errorTypes,
        recoveryRate: this.errors.length > 0 ? recoveredCount / this.errors.length : 0
      },
      recentErrors: this.errors.slice(-10) // 最近 10 个错误
    };

    if (this.config.enableConsoleLog) {
      console.log('[StyleErrorMonitor] 错误报告:', report);
    }

    return report;
  }

  // 保存错误到本地存储
  private saveErrorsToStorage(): void {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const data = {
        timestamp: Date.now(),
        errors: this.errors.slice(-20), // 保存最近 20 个错误
        summary: this.generateReport().summary
      };
      
      localStorage.setItem('vue_message_center_style_errors', JSON.stringify(data));
    } catch (error) {
      console.warn('[StyleErrorMonitor] 保存错误日志失败:', error);
    }
  }

  // 从本地存储加载错误
  public loadErrorsFromStorage(): StyleError[] {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const data = localStorage.getItem('vue_message_center_style_errors');
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.errors || [];
      }
    } catch (error) {
      console.warn('[StyleErrorMonitor] 加载错误日志失败:', error);
    }

    return [];
  }

  // 清理错误日志
  public clearErrors(): void {
    this.errors = [];
    this.errorCount = 0;
    
    if (this.config.enableLocalStorage && typeof localStorage !== 'undefined') {
      localStorage.removeItem('vue_message_center_style_errors');
    }
  }

  // 销毁监控器
  public destroy(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }

    this.saveErrorsToStorage();
    
    if (typeof window !== 'undefined') {
      delete window.__STYLE_ERROR_MONITOR__;
    }
  }

  // 获取错误统计
  public getStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recoveryRate: number;
    recentErrorsCount: number;
  } {
    const errorsByType: Record<string, number> = {};
    let recoveredCount = 0;

    this.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      if (error.recovery.success) {
        recoveredCount++;
      }
    });

    return {
      totalErrors: this.errorCount,
      errorsByType,
      recoveryRate: this.errors.length > 0 ? recoveredCount / this.errors.length : 0,
      recentErrorsCount: this.errors.length
    };
  }
}

// 创建全局监控实例
export const globalStyleErrorMonitor = new StyleErrorMonitor({
  enableConsoleLog: process.env.NODE_ENV === 'development',
  enableLocalStorage: true,
  enableAutoRecovery: true
});

// 便捷函数
export function recordStyleError(error: Partial<StyleError>): string {
  return globalStyleErrorMonitor.recordError(error);
}

export function getStyleErrorStats() {
  return globalStyleErrorMonitor.getStats();
}

export function generateStyleErrorReport() {
  return globalStyleErrorMonitor.generateReport();
}