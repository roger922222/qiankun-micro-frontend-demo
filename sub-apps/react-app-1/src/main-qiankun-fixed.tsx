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
  
  // 保存 props 到全局，供后续使用
  (window as any).qiankunProps = props;
  
  const { container } = props;
  const mountElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  // 获取正确的 basename
  const basename = getBasename();
  console.log('[react-user-management] 使用 basename:', basename);
  
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
  const { container } = props;
  const mountElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  if (root) {
    root.unmount();
    root = null;
  }
}

// 修复 qiankun 生命周期集成 - 手动创建 lifecycle 对象
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

// 动态获取 basename，支持 qiankun 和独立运行
function getBasename() {
  // 如果在 qiankun 环境下运行
  if ((window as any).__POWERED_BY_QIANKUN__) {
    // 从 qiankun 的 props 中获取路由基础路径
    const qiankunProps = (window as any).qiankunProps || {};
    return qiankunProps.routerBase || '/user-management';
  }
  // 独立运行时
  return '/';
}

// 如果不是作为微前端运行，则直接渲染
if (!(window as any).__POWERED_BY_QIANKUN__) {
  mount({});
}