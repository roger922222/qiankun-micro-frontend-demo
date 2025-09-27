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

// 模拟共享库 - 在实际项目中这会从@shared导入
const globalLogger = {
  info: (message: string, ...args: any[]) => console.log('[INFO]', message, ...args),
  error: (message: string, ...args: any[]) => console.error('[ERROR]', message, ...args),
  warn: (message: string, ...args: any[]) => console.warn('[WARN]', message, ...args)
};

// 导入qiankun插件辅助函数
import { createLifecyle, getMicroApp } from 'vite-plugin-legacy-qiankun';

// 全局变量保存 React root 实例，避免重复创建
let reactRoot: any = null;

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
                colorPrimary: '#fa8c16',
                borderRadius: 4,
                fontSize: 14
              }
            }}
          >
            <BrowserRouter basename={routerBase || (window.__POWERED_BY_QIANKUN__ ? '/settings' : '/')}>
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
const microApp = getMicroApp('react-settings');

// 判断是否在qiankun环境下运行
if (microApp.__POWERED_BY_QIANKUN__) {
  // 使用createLifecyle导出生命周期函数
  createLifecyle('react-settings', {
    bootstrap() {
      globalLogger.info('React Settings app bootstrapped');
    },
    mount(props: any) {
      globalLogger.info('React Settings app mounting', props);
      
      // 验证挂载参数
      if (!props || !props.container) {
        const error = new Error('Invalid mount props: container is required');
        globalLogger.error('Mount failed', error, { props });
        throw error;
      }
      
      render(props);
    },
    unmount() {
      globalLogger.info('React Settings app unmounting');
      
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
  // Vite不需要设置__webpack_public_path__
  // 这是webpack特有的配置
}