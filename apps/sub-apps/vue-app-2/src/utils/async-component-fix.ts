/**
 * 异步组件加载修复工具
 * 解决 qiankun 微前端环境下的异步组件渲染错误
 */

import { defineAsyncComponent, AsyncComponentLoader, Component } from 'vue';
import { globalLogger } from '@shared/utils/logger';

/**
 * 异步组件加载状态
 */
interface AsyncComponentState {
  loading: boolean;
  error: Error | null;
  component: Component | null;
  retryCount: number;
}

/**
 * 异步组件缓存
 */
const componentCache = new Map<string, AsyncComponentState>();

/**
 * 创建安全的异步组件加载器
 * @param loader 组件加载函数
 * @param name 组件名称
 * @param options 配置选项
 */
export function createSafeAsyncComponent(
  loader: AsyncComponentLoader,
  name: string,
  options: {
    delay?: number;
    timeout?: number;
    maxRetries?: number;
    loadingComponent?: Component;
    errorComponent?: Component;
  } = {}
) {
  const {
    delay = 200,
    timeout = 10000,
    maxRetries = 3,
    loadingComponent,
    errorComponent
  } = options;

  return defineAsyncComponent({
    loader: async () => {
      const startTime = performance.now();
      
      try {
        // 检查缓存
        const cached = componentCache.get(name);
        if (cached?.component && !cached.error) {
          globalLogger.debug(`使用缓存组件: ${name}`);
          return cached.component;
        }

        // 更新加载状态
        componentCache.set(name, {
          loading: true,
          error: null,
          component: null,
          retryCount: cached?.retryCount || 0
        });

        // 在微前端环境下添加延迟，确保环境准备就绪
        if (window.__POWERED_BY_QIANKUN__) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 加载组件
        const component = await loader();
        
        // 验证组件
        if (!component || typeof component !== 'object') {
          throw new Error(`组件 ${name} 加载失败: 无效的组件对象`);
        }

        // 确保组件有正确的导出
        const actualComponent = component.default || component;
        if (!actualComponent) {
          throw new Error(`组件 ${name} 加载失败: 缺少 default 导出`);
        }

        const loadTime = performance.now() - startTime;
        globalLogger.info(`异步组件 ${name} 加载成功`, {
          loadTime: `${loadTime.toFixed(2)}ms`,
          hasDefault: !!component.default,
          componentType: typeof actualComponent
        });

        // 更新缓存
        componentCache.set(name, {
          loading: false,
          error: null,
          component: actualComponent,
          retryCount: 0
        });

        return actualComponent;
      } catch (error) {
        const loadTime = performance.now() - startTime;
        const currentState = componentCache.get(name);
        const retryCount = (currentState?.retryCount || 0) + 1;

        globalLogger.error(`异步组件 ${name} 加载失败`, error as Error, {
          loadTime: `${loadTime.toFixed(2)}ms`,
          retryCount,
          maxRetries
        });

        // 更新错误状态
        componentCache.set(name, {
          loading: false,
          error: error as Error,
          component: null,
          retryCount
        });

        // 如果还有重试次数，则抛出错误让 Vue 重试
        if (retryCount < maxRetries) {
          throw error;
        }

        // 达到最大重试次数，返回错误组件
        if (errorComponent) {
          return errorComponent;
        }

        // 返回默认错误组件
        return {
          template: `
            <div class="async-component-error">
              <h3>组件加载失败</h3>
              <p>组件 "${name}" 无法正常加载</p>
              <p>错误信息: ${(error as Error).message}</p>
              <button @click="$emit('retry')">重试</button>
            </div>
          `,
          style: `
            .async-component-error {
              text-align: center;
              padding: 20px;
              border: 1px solid #ff4d4f;
              border-radius: 4px;
              background: #fff2f0;
              color: #ff4d4f;
            }
          `
        };
      }
    },
    delay,
    timeout,
    loadingComponent: loadingComponent || (() => import('../components/LoadingIndicator.vue').catch(() => ({
      template: `
        <div class="async-component-loading">
          <div class="loading-spinner"></div>
          <p>正在加载组件...</p>
        </div>
      `,
      style: `
        .async-component-loading {
          text-align: center;
          padding: 20px;
        }
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #1890ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
    })))
  });
}

/**
 * 预加载异步组件
 * @param loader 组件加载函数
 * @param name 组件名称
 */
export async function preloadAsyncComponent(
  loader: AsyncComponentLoader,
  name: string
): Promise<boolean> {
  try {
    // 检查是否已经加载
    const cached = componentCache.get(name);
    if (cached?.component) {
      return true;
    }

    globalLogger.debug(`预加载异步组件: ${name}`);
    
    const component = await loader();
    const actualComponent = component.default || component;
    
    if (actualComponent) {
      componentCache.set(name, {
        loading: false,
        error: null,
        component: actualComponent,
        retryCount: 0
      });
      
      globalLogger.info(`异步组件 ${name} 预加载成功`);
      return true;
    }
    
    return false;
  } catch (error) {
    globalLogger.warn(`异步组件 ${name} 预加载失败`, error as Error);
    return false;
  }
}

/**
 * 清理异步组件缓存
 * @param name 组件名称，不传则清理所有
 */
export function clearAsyncComponentCache(name?: string) {
  if (name) {
    componentCache.delete(name);
    globalLogger.debug(`清理异步组件缓存: ${name}`);
  } else {
    componentCache.clear();
    globalLogger.debug('清理所有异步组件缓存');
  }
}

/**
 * 获取异步组件加载状态
 * @param name 组件名称
 */
export function getAsyncComponentState(name: string): AsyncComponentState | null {
  return componentCache.get(name) || null;
}

/**
 * 全局异步组件错误处理器
 */
export function setupAsyncComponentErrorHandler() {
  // 监听未捕获的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('locateNonHydratedAsyncRoot')) {
      globalLogger.error('检测到异步组件渲染错误', event.reason);
      
      // 尝试恢复
      setTimeout(() => {
        // 清理缓存并重新渲染
        clearAsyncComponentCache();
        
        // 通知应用重新渲染
        if (window.__POWERED_BY_QIANKUN__ && window.parent !== window) {
          window.parent.postMessage({
            type: 'async-component-error',
            source: 'vue-file-management',
            data: {
              error: event.reason?.message,
              timestamp: Date.now()
            }
          }, '*');
        }
      }, 100);
      
      // 阻止错误传播
      event.preventDefault();
    }
  });

  globalLogger.info('异步组件错误处理器已设置');
}

// 声明全局类型
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
  }
}