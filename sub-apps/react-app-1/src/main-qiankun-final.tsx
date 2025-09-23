import React from 'react';
import ReactDOM from 'react-dom/client';
import 'antd/dist/reset.css';

let root: ReactDOM.Root | null = null;

// 简单的内存路由实现
const MemoryRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = React.useState('/users');
  
  React.useEffect(() => {
    // 监听 URL 变化
    const handleLocationChange = () => {
      const path = window.location.pathname;
      console.log('MemoryRouter: 路径变化', path);
      
      // 移除 /user-management 前缀
      const cleanPath = path.replace(/^\/user-management/, '') || '/';
      console.log('MemoryRouter: 清理后的路径', cleanPath);
      
      setCurrentPath(cleanPath);
    };
    
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);
  
  return <>{children}</>;
};

// 简单的 App 组件
const App: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: '#f0f0f0' }}>
      <h1>React 用户管理系统</h1>
      <p>✅ 子应用已成功挂载到 qiankun 微前端框架！</p>
      <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '5px' }}>
        <h3>系统功能</h3>
        <ul>
          <li>✅ 用户管理（CRUD 操作）</li>
          <li>✅ 角色权限管理</li>
          <li>✅ 操作日志追踪</li>
          <li>✅ Excel 导入导出</li>
          <li>✅ 微前端集成</li>
        </ul>
      </div>
      <div style={{ marginTop: '20px', padding: '15px', background: '#e6f7ff', borderRadius: '5px' }}>
        <h3>技术栈</h3>
        <p>React 18 + TypeScript + Ant Design + Redux Toolkit + Node.js + Express</p>
      </div>
    </div>
  );
};

// 微前端生命周期函数
export async function bootstrap() {
  console.log('[react-user-management] bootstrap - 应用初始化');
}

export async function mount(props: any) {
  console.log('[react-user-management] mount - 应用挂载', props);
  
  const { container } = props;
  const mountElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  if (!mountElement) {
    console.error('[react-user-management] 找不到挂载元素');
    return;
  }
  
  root = ReactDOM.createRoot(mountElement);
  root.render(
    <React.StrictMode>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </React.StrictMode>
  );
  
  console.log('[react-user-management] 应用已成功挂载');
}

export async function unmount(props: any) {
  console.log('[react-user-management] unmount - 应用卸载', props);
  
  if (root) {
    root.unmount();
    root = null;
    console.log('[react-user-management] 应用已卸载');
  }
}

// 导出生命周期函数到全局，供 qiankun 调用
(function() {
  const appName = 'react-user-management';
  
  // 确保全局对象存在
  (window as any).legacyQiankun = (window as any).legacyQiankun || {};
  (window as any).legacyQiankun[appName] = (window as any).legacyQiankun[appName] || {};
  
  // 创建 lifecycle 对象（注意拼写：lifecyle 不是 lifecycle）
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
  
  console.log('[react-user-management] ✅ 生命周期函数已注册:', {
    appName: appName,
    lifecycle: window[appName]
  });
})();

// 如果不是作为微前端运行，则直接渲染（用于开发测试）
if (!(window as any).__POWERED_BY_QIANKUN__) {
  console.log('[react-user-management] 独立运行模式');
  mount({ container: document.body });
}