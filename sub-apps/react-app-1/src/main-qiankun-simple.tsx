import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'antd/dist/reset.css';

let root: ReactDOM.Root | null = null;

// 微前端生命周期函数
export async function bootstrap() {
  console.log('[react-user-management] react app bootstraped');
}

export async function mount(props: any) {
  console.log('[react-user-management] props from main framework', props);
  
  const { container } = props;
  const mountElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  // 动态计算 basename
  const currentPath = window.location.pathname;
  const basename = currentPath.startsWith('/user-management') ? '/user-management' : '/';
  
  console.log('[react-user-management] 当前路径:', currentPath, 'basename:', basename);
  
  root = ReactDOM.createRoot(mountElement!);
  root.render(
    <React.StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

export async function unmount(props: any) {
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