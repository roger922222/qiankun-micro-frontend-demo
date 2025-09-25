import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import 'antd/dist/reset.css'

// 导入导航集成
import { createMicroAppNavigation } from '@shared/communication/navigation/micro-app-integration'

// 创建导航API实例
const navigationAPI = createMicroAppNavigation({
  appName: 'react-app-1',
  basename: window.__POWERED_BY_QIANKUN__ ? '/react-user-management' : '/',
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
  }
});

// 将导航API挂载到全局，供组件使用
(window as any).__MICRO_APP_NAVIGATION__ = navigationAPI;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={window.__POWERED_BY_QIANKUN__ ? '/react-user-management' : '/'}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)