/**
 * Vue系统监控子应用入口文件
 * 支持qiankun微前端框架和独立运行
 */

import { createApp, App as VueApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';

// 导入应用组件
import App from './App.vue';
import routes from './router';

// 导入样式
import './styles/index.css';

// 导入共享库
import { globalLogger } from '@shared/utils/logger';

let app: VueApp<Element> | null = null;
let router: any = null;

/**
 * 渲染应用
 */
function render(props: any = {}) {
  const { container, routerBase } = props;
  
  // 创建路由
  router = createRouter({
    history: createWebHistory(routerBase || '/system-monitor'),
    routes
  });

  // 创建应用实例
  app = createApp(App);
  
  // 使用插件
  app.use(router);
  app.use(Antd);
  
  // 挂载应用
  const domElement = container ? container.querySelector('#app') : '#app';
  app.mount(domElement);
  
  return app;
}

/**
 * qiankun生命周期 - 启动
 */
export async function bootstrap() {
  globalLogger.info('Vue System Monitor app bootstrapped');
}

/**
 * qiankun生命周期 - 挂载
 */
export async function mount(props: any) {
  globalLogger.info('Vue System Monitor app mounting', props);
  render(props);
}

/**
 * qiankun生命周期 - 卸载
 */
export async function unmount(props: any) {
  globalLogger.info('Vue System Monitor app unmounting');
  if (app) {
    app.unmount();
    app = null;
    router = null;
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