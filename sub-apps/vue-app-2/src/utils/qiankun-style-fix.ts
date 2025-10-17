/**
 * qiankun 微前端样式修复工具 - 文件管理应用
 * 解决样式沙箱与 Vue scoped 样式的冲突问题
 */

// DOM 就绪状态检查
export function isDOMReady(): boolean {
  return document.readyState === 'complete' || document.readyState === 'interactive';
}

// 等待 DOM 就绪
export function waitForDOMReady(timeout = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isDOMReady()) {
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

// 检查 qiankun 沙箱是否就绪
export function isQiankunSandboxReady(): boolean {
  if (!window.__POWERED_BY_QIANKUN__) return true;
  
  try {
    // 检查样式沙箱相关的 DOM 操作是否正常
    const testElement = document.createElement('div');
    document.head.appendChild(testElement);
    const isReady = document.head.contains(testElement);
    document.head.removeChild(testElement);
    return isReady;
  } catch {
    return false;
  }
}

// 等待 qiankun 沙箱就绪
export function waitForQiankunSandbox(timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isQiankunSandboxReady()) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isQiankunSandboxReady()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 50);
  });
}

// 增强的样式注入防护函数
export async function safeStyleInject(callback: () => void, options: {
  delay?: number;
  maxRetries?: number;
  retryDelay?: number;
} = {}): Promise<boolean> {
  const { delay = 0, maxRetries = 3, retryDelay = 100 } = options;
  
  if (window.__POWERED_BY_QIANKUN__) {
    // 等待 DOM 和沙箱就绪
    const [domReady, sandboxReady] = await Promise.all([
      waitForDOMReady(),
      waitForQiankunSandbox()
    ]);

    if (!domReady || !sandboxReady) {
      console.warn('DOM 或沙箱未就绪，样式注入可能失败');
    }

    // 添加延迟确保环境稳定
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 重试机制
    for (let i = 0; i < maxRetries; i++) {
      try {
        callback();
        return true;
      } catch (error) {
        console.warn(`样式注入失败 (尝试 ${i + 1}/${maxRetries}):`, error);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    return false;
  } else {
    // 独立运行模式直接执行
    try {
      callback();
      return true;
    } catch (error) {
      console.error('样式注入失败:', error);
      return false;
    }
  }
}

// 增强的 DOM 操作防护函数
export function safeDOMOperation<T>(operation: () => T, fallback?: T): T | undefined {
  try {
    return operation();
  } catch (error) {
    if (error instanceof TypeError && 
        (error.message.includes('contains') || 
         error.message.includes('appendChild') ||
         error.message.includes('insertBefore'))) {
      console.warn('DOM 操作失败，可能是 qiankun 样式沙箱问题:', error);
      return fallback;
    } else {
      console.error('DOM 操作发生未知错误:', error);
      throw error;
    }
  }
}

// 样式容器检查和修复函数
export function ensureStyleContainer(selector: string = 'head'): Element | null {
  try {
    // 增强的 null 检查
    if (!document || !document.querySelector) {
      console.warn('Document 对象不可用，跳过样式容器检查');
      return null;
    }

    let container = safeDOMOperation(() => document.querySelector(selector));
    
    if (!container) {
      // 尝试创建容器
      if (selector === 'head') {
        container = safeDOMOperation(() => 
          document.head || document.getElementsByTagName('head')[0]
        );
      }
      
      if (!container) {
        console.warn(`无法找到或创建样式容器: ${selector}，跳过样式注入`);
        return null;
      }
    }

    // 验证容器是否有效
    if (!isStyleContainerValid(container)) {
      console.warn('样式容器无效，跳过样式注入');
      return null;
    }

    return container;
  } catch (error) {
    console.error('样式容器检查失败:', error);
    return null;
  }
}

// 样式容器检查函数
export function isStyleContainerValid(container: Element | null): boolean {
  if (!container) return false;
  
  try {
    // 检查容器是否仍在文档中
    return document.contains(container);
  } catch {
    return false;
  }
}

// 样式注入恢复机制
export function recoverStyleInjection(styleContent: string, targetSelector: string = 'head'): boolean {
  try {
    const container = ensureStyleContainer(targetSelector);
    if (!container) {
      console.warn('样式容器不可用，跳过样式恢复');
      return false;
    }

    const styleElement = safeDOMOperation(() => document.createElement('style'));
    if (!styleElement) {
      console.warn('无法创建样式元素，跳过样式恢复');
      return false;
    }

    styleElement.textContent = styleContent;
    styleElement.setAttribute('data-qiankun-recovery', 'true');
    
    return safeDOMOperation(() => {
      container.appendChild(styleElement);
      return true;
    }, false) || false;
  } catch (error) {
    console.error('样式注入恢复失败:', error);
    return false;
  }
}

// 微前端样式隔离配置
export const qiankunStyleConfig = {
  // 实验性样式隔离
  experimentalStyleIsolation: true,
  // 不使用严格样式隔离（Shadow DOM）
  strictStyleIsolation: false,
  // 样式前缀
  cssPrefix: '.vue-file-management',
  // 样式注入配置
  styleInjection: {
    maxRetries: 3,
    retryDelay: 100,
    timeout: 3000
  }
};

// 全局样式错误处理
export function setupGlobalStyleErrorHandler(): void {
  if (typeof window !== 'undefined' && window.__POWERED_BY_QIANKUN__) {
    // 监听未捕获的样式相关错误
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('appendChild') ||
           event.error.message.includes('contains') ||
           event.error.message.includes('insertBefore'))) {
        console.warn('捕获到 qiankun 样式沙箱错误，已忽略:', event.error);
        event.preventDefault();
        
        // 尝试记录错误到监控系统
        if (window.__STYLE_ERROR_MONITOR__) {
          window.__STYLE_ERROR_MONITOR__.recordError({
            type: 'dom_operation_failed',
            error: event.error,
            timestamp: Date.now(),
            context: {
              qiankunEnv: true,
              domReady: isDOMReady(),
              sandboxReady: isQiankunSandboxReady()
            }
          });
        }
      }
    });

    // 监听 Promise 拒绝中的样式错误
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && typeof event.reason === 'object' && 
          event.reason.message && 
          (event.reason.message.includes('appendChild') ||
           event.reason.message.includes('contains'))) {
        console.warn('捕获到 Promise 中的样式错误:', event.reason);
        event.preventDefault();
      }
    });
  }
}

// 声明全局类型
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
    __STYLE_ERROR_MONITOR__?: {
      recordError: (error: any) => void;
    };
  }
}