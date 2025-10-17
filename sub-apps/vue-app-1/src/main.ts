/**
 * Vue消息中心子应用入口文件
 * 支持qiankun微前端框架和独立运行
 * 使用vite-plugin-legacy-qiankun插件解决ES模块兼容性问题
 */

// 根据 qiankun 官方文档，为 Vite 应用配置 publicPath
if (window.__POWERED_BY_QIANKUN__) {
  // Vite 应用需要通过 import.meta.env.BASE_URL 来处理 publicPath
  // 这里设置全局变量供 Vite 使用
  (window as any).__VITE_PUBLIC_PATH__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__ || '/';
}

import { createApp, App as VueApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';

// 导入应用组件
import App from './App.vue';
import routes from './router';
import store from './store';

// 导入样式 - 全局导入所有样式避免 qiankun 样式沙箱冲突
// 导入基础样式
import './styles/index.css';
import './styles/qiankun-compatibility.css';

// 导入组件样式文件（避免重复导入）
import './styles/MessageCenter.css';
import './styles/MessagePush.css';
import './styles/Notifications.css';

// 强制加载样式到全局，确保在微前端环境下正确显示
const forceLoadStyles = () => {
  const messageCenterStyles = `
    .vue-message-center {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif !important;
      width: 100% !important;
      height: 100% !important;
      position: relative !important;
    }
    .vue-message-center .message-center-header {
      background: #f5f5f5 !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 16px !important;
      padding: 16px !important;
      border-radius: 6px !important;
    }
    .vue-message-center .message-center-header h2 {
      color: #1890ff !important;
      font-size: 20px !important;
      font-weight: 600 !important;
      margin: 0 !important;
    }
    .vue-message-center .ant-card {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    }
    .vue-message-center .ant-list-item:hover {
      background-color: #f5f5f5 !important;
    }
    .vue-message-center .message-unread {
      background-color: #e6f7ff !important;
      border-left: 4px solid #1890ff !important;
    }
  `;
  
  // 在页面加载时就注入样式，避免后续的 qiankun 劫持问题
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.id = 'vue-message-center-global-styles';
    style.type = 'text/css';
    style.textContent = messageCenterStyles;
    
    // 在 qiankun 初始化之前就添加到 head
    const head = document.head || document.getElementsByTagName('head')[0];
    if (head && !document.getElementById('vue-message-center-global-styles')) {
      head.appendChild(style);
    }
  }
};

// 立即执行样式加载
forceLoadStyles();

// 导入共享库
import { globalLogger } from '@shared/utils/logger';

// 导入qiankun插件辅助函数
import { createLifecyle, getMicroApp } from 'vite-plugin-legacy-qiankun';

// 导入导航集成
import { configureVueNavigation } from '@shared/communication/navigation/vue-integration-simple';

// 导入样式修复工具和错误监控
import { setupGlobalStyleErrorHandler } from './utils/qiankun-style-fix';
import { globalStyleErrorMonitor } from './utils/error-monitor';

let app: VueApp<Element> | null = null;
let router: any = null;
let navigationAPI: any = null;

/**
 * 渲染函数
 */
function render(props: any = {}) {
  const { container, routerBase } = props;
  
  // 创建路由实例
  router = createRouter({
    history: createWebHistory(routerBase || (window.__POWERED_BY_QIANKUN__ ? '/message-center' : '/')),
    routes,
    // 路由滚动行为优化
    scrollBehavior(to, from, savedPosition) {
      if (savedPosition) {
        return savedPosition;
      }
      // 在 qiankun 环境下禁用自动滚动到顶部
      if (window.__POWERED_BY_QIANKUN__) {
        return false;
      }
      return { top: 0 };
    }
  });
  
  // 导入并设置路由守卫
  import('./router/guards').then(({ setupRouterGuards }) => {
    setupRouterGuards(router);
  });
  
  // 创建Vue应用实例
  app = createApp(App);
  
  // 配置应用
  app.use(store);
  app.use(router);
  app.use(Antd);
  
  // 配置导航集成
  try {
    navigationAPI = configureVueNavigation(router, {
      appName: 'vue-message-center'
    });
    globalLogger.info('Vue导航集成配置成功');
  } catch (error) {
    globalLogger.warn('Vue导航集成配置失败，使用默认配置', error);
  }
  
  // 挂载应用
  const mountElement = container ? container.querySelector('#vue-message-center') || container : '#vue-message-center';
  app.mount(mountElement);
  
  globalLogger.info('Vue Message Center app rendered', {
    container: mountElement,
    routerBase,
    isPoweredByQiankun: window.__POWERED_BY_QIANKUN__
  });
}

// 使用插件提供的辅助函数
const microApp = getMicroApp('vue-message-center');

// 设置全局样式错误处理和监控
setupGlobalStyleErrorHandler();

// 初始化错误监控（在开发环境启用详细日志）
if (process.env.NODE_ENV === 'development') {
  globalLogger.info('样式错误监控已启动', globalStyleErrorMonitor.getStats());
}

// 判断是否在qiankun环境下运行
if (microApp.__POWERED_BY_QIANKUN__) {
  // 使用createLifecyle导出生命周期函数
  createLifecyle('vue-message-center', {
    bootstrap() {
      console.log('[DEBUG] Vue Message Center bootstrap');
      globalLogger.info('Vue Message Center app bootstrapped');
    },
    async mount(props: any) {
      console.log('[DEBUG] Vue Message Center mount with props:', props);
      globalLogger.info('Vue Message Center app mounting', props);
      
      // 验证挂载参数
      if (!props || !props.container) {
        const error = new Error('Invalid mount props: container is required');
        globalLogger.error('Mount failed', error, { props });
        throw error;
      }
      
      try {
        // 在微前端环境下添加延迟，确保样式沙箱初始化完成
        await new Promise(resolve => setTimeout(resolve, 50));
        render(props);
        console.log('[SUCCESS] Vue Message Center mounted successfully');
      } catch (error) {
        console.error('[ERROR] Vue Message Center mount failed:', error);
        throw error;
      }
    },
    unmount(props?: any) {
      console.log('[DEBUG] Vue Message Center unmount');
      globalLogger.info('Vue Message Center app unmounting');
      
      try {
        if (app) {
          app.unmount();
          app = null;
          router = null;
        }
        
        if (navigationAPI) {
          navigationAPI.destroy();
          navigationAPI = null;
        }

        // 清理错误监控
        globalStyleErrorMonitor.destroy();
        
        console.log('[SUCCESS] Vue Message Center unmounted successfully');
      } catch (error) {
        console.error('[ERROR] Vue Message Center unmount failed:', error);
      }
    }
  });
} else {
  // 独立运行模式
  globalLogger.info('Vue Message Center running in standalone mode');
  render();
}

// 设置全局变量供qiankun使用
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}