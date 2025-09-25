/**
 * Vue消息中心子应用入口文件
 * 支持qiankun微前端框架和独立运行
 */

import { createApp, App as VueApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createStore } from 'vuex';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';

// 导入应用组件
import App from './App.vue';
import routes from './router';
import store from './store';

// 导入样式
import './styles/index.css';

// 导入共享库
import { globalLogger } from '@shared/utils/logger';

// 导入导航集成
import { configureVueNavigation } from '@shared/communication/navigation/vue-integration-simple';

let app: VueApp<Element> | null = null;
let router: any = null;
let navigationAPI: any = null;

/**
 * 渲染应用
 */
function render(props: any = {}) {
  const { container, routerBase } = props;
  
  // 创建路由
  router = createRouter({
    history: createWebHistory(routerBase || '/message-center'),
    routes
  });

  // 创建应用实例
  app = createApp(App);
  
  // 使用插件
  app.use(router);
  app.use(store);
  app.use(Antd);
  
  // 配置导航系统
  navigationAPI = configureVueNavigation(app, {
    appName: 'vue-app-1',
    basename: routerBase || '/message-center',
    debug: process.env.NODE_ENV === 'development',
    enableParameterReceiving: true,
    enableCrossAppNavigation: true,
    onNavigationReceived: (event) => {
      console.log('[VueApp1] Navigation event received:', event);
    },
    onParameterReceived: (event) => {
      console.log('[VueApp1] Parameters received:', event);
    },
    onRouteChange: (event) => {
      console.log('[VueApp1] Route changed:', event);
    }
  });
  
  // 挂载应用
  const domElement = container ? container.querySelector('#app') : '#app';
  app.mount(domElement);
  
  return app;
}

/**
 * qiankun生命周期 - 启动
 */
export async function bootstrap() {
  globalLogger.info('Vue Message Center app bootstrapped');
}

/**
 * qiankun生命周期 - 挂载
 */
export async function mount(props: any) {
  globalLogger.info('Vue Message Center app mounting', props);
  render(props);
}

/**
 * qiankun生命周期 - 卸载
 */
export async function unmount(props: any) {
  globalLogger.info('Vue Message Center app unmounting');
  if (app) {
    app.unmount();
    app = null;
    router = null;
  }
  
  if (navigationAPI) {
    navigationAPI.destroy();
    navigationAPI = null;
  }
}

/**
 * 独立运行模式
 */
if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

// 设置全局变量供qiankun使用
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}

// 动态设置publicPath
if (window.__POWERED_BY_QIANKUN__) {
  // eslint-disable-next-line no-undef
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
}