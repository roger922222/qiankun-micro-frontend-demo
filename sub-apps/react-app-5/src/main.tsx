/**
 * React设置中心子应用入口文件
 * 支持qiankun微前端框架和独立运行
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary } from 'react-error-boundary';

// 导入样式
import 'antd/dist/reset.css';
import './styles/index.css';

// 导入应用组件
import App from './App';
import ErrorFallback from './components/ErrorFallback';

// 导入共享库
import { globalLogger } from '@shared/utils/logger';

/**
 * 渲染应用
 */
function render(props?: any) {
  const { container, routerBase } = props || {};
  const domElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  if (!domElement) {
    globalLogger.error('Root element not found');
    return;
  }

  const root = ReactDOM.createRoot(domElement);

  root.render(
    <React.StrictMode>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error, errorInfo) => {
          globalLogger.error('React Error Boundary caught an error', error, {
            componentStack: errorInfo.componentStack
          });
        }}
      >
        <HelmetProvider>
          <ConfigProvider
            locale={zhCN}
            theme={{
              token: {
                colorPrimary: '#fa8c16',
                borderRadius: 4,
                fontSize: 14
              }
            }}
          >
            <BrowserRouter basename={routerBase || '/settings'}>
              <App />
            </BrowserRouter>
          </ConfigProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  return root;
}

/**
 * qiankun生命周期 - 启动
 */
export async function bootstrap() {
  globalLogger.info('React Settings app bootstrapped');
}

/**
 * qiankun生命周期 - 挂载
 */
export async function mount(props: any) {
  globalLogger.info('React Settings app mounting', props);
  render(props);
}

/**
 * qiankun生命周期 - 卸载
 */
export async function unmount(props: any) {
  globalLogger.info('React Settings app unmounting');
  const { container } = props;
  const domElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  if (domElement) {
    const root = ReactDOM.createRoot(domElement);
    root.unmount();
  }
}

/**
 * 独立运行模式
 */
if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

// 开发模式下的热更新支持
if (import.meta.hot) {
  import.meta.hot.accept();
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