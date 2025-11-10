import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import 'antd/dist/reset.css';

let root: ReactDOM.Root | null = null;

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('路由错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>路由错误</h2>
          <p>{this.state.error?.message || '应用出现错误，请刷新页面重试'}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// 微前端生命周期函数
export async function bootstrap() {
  console.log('[react-user-management] react app bootstraped');
}

export async function mount(props: any) {
  console.log('[react-user-management] props from main framework', props);
  
  const { container } = props;
  const mountElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  // 在 qiankun 环境下，使用内存路由而不是 BrowserRouter
  if ((window as any).__POWERED_BY_QIANKUN__) {
    console.log('[react-user-management] 使用内存路由模式');
    
    root = ReactDOM.createRoot(mountElement!);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <MemoryRouter initialEntries={['/users']} initialIndex={0}>
            <App />
          </MemoryRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } else {
    // 独立运行时，使用正常的 BrowserRouter
    console.log('[react-user-management] 使用 BrowserRouter 模式');
    
    root = ReactDOM.createRoot(mountElement!);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
  }
}

export async function unmount(_props: any) {
  console.log('[react-user-management] unmount');
  
  if (root) {
    root.unmount();
    root = null;
  }
}

// 修复 qiankun 生命周期集成
(function() {
  const appName = 'react-user-management';
  
  // 确保全局对象存在
  (window as any).legacyQiankun = (window as any).legacyQiankun || {};
  (window as any).legacyQiankun[appName] = (window as any).legacyQiankun[appName] || {};
  
  // 创建 lifecycle 对象（修复拼写错误）
  (window as any).legacyQiankun[appName].lifecyle = {
    bootstrap,
    mount,
    unmount
  };
  
  // 同时导出到 window 对象，确保 qiankun 能找到
  (window as any)[appName] = {
    bootstrap,
    mount,
    unmount
  };
  
  console.log('[react-user-management] 生命周期函数已注册:', {
    legacyQiankun: (window as any).legacyQiankun[appName],
    windowExport: (window as any)[appName]
  });
})();

// 如果不是作为微前端运行，则直接渲染
if (!(window as any).__POWERED_BY_QIANKUN__) {
  mount({});
}