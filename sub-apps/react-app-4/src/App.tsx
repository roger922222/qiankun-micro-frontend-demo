/**
 * React数据看板子应用主组件
 * 使用MobX进行状态管理
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, message } from 'antd';
import { Helmet } from 'react-helmet-async';
import { observer } from 'mobx-react-lite';

// 导入页面组件 - 使用懒加载
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Reports = lazy(() => import('./pages/Reports'));
const RealTimeData = lazy(() => import('./pages/RealTimeData'));
const Visualization = lazy(() => import('./pages/Visualization'));

// 导入布局组件
import AppHeader from './components/Layout/AppHeader';
import AppSidebar from './components/Layout/AppSidebar';
import AppFooter from './components/Layout/AppFooter';
import LoadingBoundary from './components/LoadingBoundary';

// 导入样式
import './styles/App.css';

// 导入共享库
import { globalEventBus } from '@shared/communication/event-bus';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';

// 导入MobX Store
import { dashboardStore } from './store/DashboardStore';

const { Content } = Layout;

/**
 * 主应用组件
 */
const App: React.FC = observer(() => {
  useEffect(() => {
    globalLogger.info('Dashboard App mounted');

    // 监听全局事件
    const handleGlobalEvent = (event: any) => {
      globalLogger.info('Received global event', event);
      
      switch (event.type) {
    case EVENT_TYPES.THEME_CHANGE:
      document.documentElement.setAttribute('data-theme', event.data.theme);
      break;
      
    case EVENT_TYPES.USER_LOGOUT:
      dashboardStore.reset();
      message.info('用户已登出，数据已清理');
      break;
      
    case EVENT_TYPES.LANGUAGE_CHANGE:
      message.info(`语言已切换为: ${event.data.language}`);
      break;;
          
        default:
          break;
      }
    };

    // 注册事件监听器
    globalEventBus.on(EVENT_TYPES.THEME_CHANGE, handleGlobalEvent);
    globalEventBus.on(EVENT_TYPES.USER_LOGOUT, handleGlobalEvent);
    globalEventBus.on(EVENT_TYPES.LANGUAGE_CHANGE, handleGlobalEvent);

    // 发送应用就绪事件
    globalEventBus.emit({
      type: 'APP_READY',
      source: 'react-dashboard',
      timestamp: new Date().toISOString(),
      id: `app-ready-${Date.now()}`,
      data: {
        appName: 'react-dashboard',
        version: '1.0.0',
        features: ['data-visualization', 'analytics', 'reporting']
      }
    });

    // 初始化示例数据
    initializeSampleData();

    return () => {
      globalEventBus.off(EVENT_TYPES.THEME_CHANGE, handleGlobalEvent);
      globalEventBus.off(EVENT_TYPES.USER_LOGOUT, handleGlobalEvent);
      globalEventBus.off(EVENT_TYPES.LANGUAGE_CHANGE, handleGlobalEvent);
      
      globalLogger.info('Dashboard App unmounted');
    };
  }, []);

  /**
   * 初始化示例数据
   */
  const initializeSampleData = () => {
    // 初始化仪表盘数据
    dashboardStore.initializeSampleData();
    globalLogger.info('Dashboard sample data initialized');
  };

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <>
      <Helmet>
        <title>数据看板 - React + MobX</title>
        <meta name="description" content="基于React和MobX的数据看板系统" />
      </Helmet>

      <Layout className="dashboard-app-layout" style={{ minHeight: '100vh' }}>
        <AppHeader 
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
        
        <Layout>
          <AppSidebar collapsed={sidebarCollapsed} />
          
          <Layout className="dashboard-app-content">
            <Content className="dashboard-app-main" style={{ padding: '24px', minHeight: 'calc(100vh - 112px)' }}>
              <div className="dashboard-app-container">
                <LoadingBoundary 
                  onError={(error, errorInfo) => {
                    globalLogger.error('Page loading error:', error, errorInfo);
                  }}
                >
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/realtime" element={<RealTimeData />} />
                    <Route path="/visualization" element={<Visualization />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </LoadingBoundary>
              </div>
            </Content>
            
            <AppFooter />
          </Layout>
        </Layout>
      </Layout>
    </>
  );
});

export default App;