/**
 * React商品管理子应用入口文件
 * 支持qiankun微前端框架和独立运行
 */

import React from 'react';
import * as ReactDOM from 'react-dom/client';
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

// 导入qiankun插件辅助函数
import { createLifecyle, getMicroApp } from 'vite-plugin-legacy-qiankun';

// 导入导航集成
import { createMicroAppNavigation } from '@shared/communication/navigation/micro-app-integration';

// 全局变量保存 React root 实例，避免重复创建
let reactRoot: any = null;

// 创建导航API实例
const navigationAPI = createMicroAppNavigation({
  appName: 'react-app-2',
  basename: window.__POWERED_BY_QIANKUN__ ? '/product-management' : '/',
  debug: process.env.NODE_ENV === 'development',
  enableParameterReceiving: true,
  enableCrossAppNavigation: true,
  onNavigationReceived: (event) => {
    console.log('[ReactApp2] Navigation event received:', event);
  },
  onParameterReceived: (event) => {
    console.log('[ReactApp2] Parameters received:', event);
  },
  onRouteChange: (event) => {
    console.log('[ReactApp2] Route changed:', event);
  }
});

// 将导航API挂载到全局，供组件使用
(window as any).__MICRO_APP_NAVIGATION__ = navigationAPI;

/**
 * 渲染应用
 */
function render(props?: any) {
  const { container, routerBase } = props || {};
  
  // 在qiankun环境中，直接使用传入的容器，避免错误的querySelector
  let domElement: HTMLElement | null;
  if (window.__POWERED_BY_QIANKUN__) {
    domElement = container;
  } else {
    domElement = document.getElementById('root');
  }
  
  if (!domElement) {
    globalLogger.error('Root element not found', new Error('Root element not found'), { container, hasQiankun: !!window.__POWERED_BY_QIANKUN__ });
    return;
  }

  // 只在第一次或 root 不存在时创建，避免重复创建
  if (!reactRoot) {
    reactRoot = ReactDOM.createRoot(domElement);
  }

  reactRoot.render(
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
                colorPrimary: '#52c41a',
                borderRadius: 4,
                fontSize: 14
              }
            }}
          >
            <BrowserRouter basename={routerBase || (window.__POWERED_BY_QIANKUN__ ? '/product-management' : '/')}>
              <App />
            </BrowserRouter>
          </ConfigProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  return reactRoot;
}

// 使用插件提供的辅助函数
const microApp = getMicroApp('react-product-management');

// 判断是否在qiankun环境下运行
if (microApp.__POWERED_BY_QIANKUN__) {
  // 使用createLifecyle导出生命周期函数
  createLifecyle('react-product-management', {
    bootstrap() {
      globalLogger.info('React Product Management app bootstrapped');
    },
    mount(props: any) {
      globalLogger.info('React Product Management app mounting', props);
      
      // 验证挂载参数
      if (!props || !props.container) {
        const error = new Error('Invalid mount props: container is required');
        globalLogger.error('Mount failed', error, { props });
        throw error;
      }
      
      render(props);
    },
    unmount() {
      globalLogger.info('React Product Management app unmounting');
      
      // 使用保存的 root 实例进行卸载
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
    },
  });
} else {
  // 独立运行模式
  render();
}

// 开发模式下的热更新支持
if ((import.meta as any).hot) {
  (import.meta as any).hot.accept();
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
  // Vite不需要设置__webpack_public_path__
  // 这是webpack特有的配置
}