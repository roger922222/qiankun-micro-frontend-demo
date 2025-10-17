/**
 * Vue系统监控子应用入口文件
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

// 导入样式 - 全局导入所有样式避免 qiankun 样式沙箱冲突
import './styles/index.css';

// 导入共享库
import { globalLogger } from '@shared/utils/logger';

// 导入qiankun插件辅助函数
import { createLifecyle, getMicroApp } from 'vite-plugin-legacy-qiankun';

// 导入样式修复工具
import { setupGlobalStyleErrorHandler } from './utils/qiankun-style-fix';

let app: VueApp<Element> | null = null;
let router: any = null;

/**
 * 渲染函数
 */
function render(props: any = {}) {
  const { container, routerBase } = props;
  
  // 创建路由实例
  router = createRouter({
    history: createWebHistory(routerBase || (window.__POWERED_BY_QIANKUN__ ? '/system-monitor' : '/')),
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
  app.use(router);
  app.use(Antd);
  
  // 挂载应用
  const mountElement = container ? container.querySelector('#vue-system-monitor') || container : '#vue-system-monitor';
  app.mount(mountElement);
  
  globalLogger.info('Vue System Monitor app rendered', {
    container: mountElement,
    routerBase,
    isPoweredByQiankun: window.__POWERED_BY_QIANKUN__
  });
}

// 使用插件提供的辅助函数
const microApp = getMicroApp('vue-system-monitor');

// 设置全局样式错误处理
setupGlobalStyleErrorHandler();

// 判断是否在qiankun环境下运行
if (microApp.__POWERED_BY_QIANKUN__) {
  // 使用createLifecyle导出生命周期函数
  createLifecyle('vue-system-monitor', {
    bootstrap() {
      console.log('[DEBUG] Vue System Monitor bootstrap');
      globalLogger.info('Vue System Monitor app bootstrapped');
    },
    async mount(props: any) {
      console.log('[DEBUG] Vue System Monitor mount with props:', props);
      globalLogger.info('Vue System Monitor app mounting', props);
      
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
        console.log('[SUCCESS] Vue System Monitor mounted successfully');
      } catch (error) {
        console.error('[ERROR] Vue System Monitor mount failed:', error);
        throw error;
      }
    },
    unmount(props?: any) {
      console.log('[DEBUG] Vue System Monitor unmount');
      globalLogger.info('Vue System Monitor app unmounting');
      
      try {
        if (app) {
          app.unmount();
          app = null;
          router = null;
        }
        
        console.log('[SUCCESS] Vue System Monitor unmounted successfully');
      } catch (error) {
        console.error('[ERROR] Vue System Monitor unmount failed:', error);
      }
    }
  });
} else {
  // 独立运行模式
  globalLogger.info('Vue System Monitor running in standalone mode');
  render();
}

// 设置全局变量供qiankun使用
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}