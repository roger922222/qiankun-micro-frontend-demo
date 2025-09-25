import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'antd/dist/reset.css';
import './styles/index.css';

// 导入导航集成
import { createMicroAppNavigation } from '@shared/communication/navigation/micro-app-integration';

let root: ReactDOM.Root | null = null;
let navigationAPI: any = null;

// 微前端生命周期函数
export async function bootstrap() {
  console.log('[react-user-management] react app bootstraped');
}

export async function mount(props: any) {
  console.log('[react-user-management] props from main framework', props);
  
  const { container, routerBase } = props;
  const mountElement = container ? container.querySelector('#root') : document.getElementById('root');
  
  // 确定路由基础路径
  const basename = routerBase || '/user-management';
  console.log('[react-user-management] Using basename:', basename);
  
  // 创建导航API实例
  navigationAPI = createMicroAppNavigation({
    appName: 'react-user-management',
    basename: basename,
    debug: process.env.NODE_ENV === 'development',
    enableParameterReceiving: true,
    enableCrossAppNavigation: true,
    onNavigationReceived: (event) => {
      console.log('[ReactApp1] Navigation event received:', event);
    },
    onParameterReceived: (event) => {
      console.log('[ReactApp1] Parameters received:', event);
    },
    onRouteChange: (event) => {
      console.log('[ReactApp1] Route changed:', event);
      
      // 在微前端环境中，需要通知主应用路由变化
      if (window.__POWERED_BY_QIANKUN__) {
        const newUrl = `${basename}${event.data.to.path}`;
        console.log('[ReactApp1] Updating browser URL to:', newUrl);
        
        // 使用 history.pushState 更新浏览器地址栏，但不触发页面刷新
        window.history.pushState(null, '', newUrl);
        
        // 触发 popstate 事件，通知主应用路由变化
        const popStateEvent = new PopStateEvent('popstate', {
          state: {
            path: newUrl,
            appName: 'react-user-management',
            timestamp: Date.now()
          }
        });
        window.dispatchEvent(popStateEvent);
      }
    }
  });
  
  // 将导航API挂载到全局，供组件使用
  (window as any).__MICRO_APP_NAVIGATION__ = navigationAPI;
  
  root = ReactDOM.createRoot(mountElement!);
  root.render(
    <React.StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log('[react-user-management] App mounted with basename:', basename);
}

export async function unmount(_props: any) {
  console.log('[react-user-management] unmount');
  
  if (root) {
    root.unmount();
    root = null;
  }
  
  // 清理导航API
  if (navigationAPI) {
    navigationAPI.destroy?.();
    navigationAPI = null;
  }
  
  // 清理全局变量
  if ((window as any).__MICRO_APP_NAVIGATION__) {
    delete (window as any).__MICRO_APP_NAVIGATION__;
  }
}

// 如果不是作为微前端运行，则直接渲染
if (!window.__POWERED_BY_QIANKUN__) {
  mount({
    container: document.body,
    routerBase: '/'
  });
}