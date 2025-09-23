/**
 * 主应用入口文件
 * 初始化React应用和qiankun微前端框架
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
import '@shared/styles/index.css';
import './styles/index.css';

// 导入应用组件
import App from './App';
import ErrorFallback from './components/ErrorFallback';

// 导入微前端配置
import { setupMicroApps } from './micro-apps/setup';

// 导入共享库
import { globalLogger, setupGlobalErrorHandling } from '@shared/utils/logger';
import { globalEventBus } from '@shared/communication/event-bus';
import { globalStateManager } from '@shared/communication/global-state';

/**
 * 应用初始化
 */
async function initializeApp() {
  try {
    globalLogger.info('Starting main application initialization');

    // 设置全局错误处理
    setupGlobalErrorHandling();

    // 初始化全局状态
    const savedState = localStorage.getItem('qiankun-global-state');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        globalStateManager.setState(parsedState);
        globalLogger.info('Global state restored from localStorage');
      } catch (error) {
        globalLogger.warn('Failed to restore global state from localStorage', error as Error);
      }
    }

    // 注意：微前端应用设置延迟到App组件挂载后执行
    // 这样可以确保容器元素已经渲染完成

    // 发射应用启动事件
    globalEventBus.emit({
      type: 'APP_MOUNT',
      source: 'main-app',
      timestamp: new Date().toISOString(),
      id: `main-app-mount-${Date.now()}`,
      data: {
        appName: 'main-app',
        props: {}
      }
    });

    globalLogger.info('Main application initialized successfully');
    return true;
  } catch (error) {
    globalLogger.error('Failed to initialize main application', error as Error);
    return false;
  }
}

/**
 * 渲染应用
 */
async function renderApp() {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );

  // 初始化应用
  const initialized = await initializeApp();

  if (!initialized) {
    // 如果初始化失败，显示错误页面
    root.render(
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h1>应用初始化失败</h1>
        <p>请刷新页面重试</p>
        <button onClick={() => window.location.reload()}>刷新页面</button>
      </div>
    );
    return;
  }

  // 渲染主应用
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
                colorPrimary: '#1890ff',
                borderRadius: 4,
                fontSize: 14
              }
            }}
          >
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ConfigProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // 隐藏初始加载动画
  if (window.hideInitialLoading) {
    window.hideInitialLoading();
  }
}

// 启动应用
renderApp().catch((error) => {
  globalLogger.fatal('Failed to render main application', error);
  console.error('Failed to render main application:', error);
});

// 开发模式下的热更新支持
if (import.meta.hot) {
  import.meta.hot.accept();
}

// 导出全局对象供子应用使用
declare global {
  interface Window {
    __QIANKUN_DEVELOPMENT__?: boolean;
    __POWERED_BY_QIANKUN__?: boolean;
    hideInitialLoading?: () => void;
    // 全局共享对象
    QIANKUN_GLOBAL: {
      eventBus: typeof globalEventBus;
      stateManager: typeof globalStateManager;
      logger: typeof globalLogger;
    };
  }
}

// 设置全局共享对象
window.QIANKUN_GLOBAL = {
  eventBus: globalEventBus,
  stateManager: globalStateManager,
  logger: globalLogger
};

// 开发模式标识
if (import.meta.env.DEV) {
  window.__QIANKUN_DEVELOPMENT__ = true;
}