/**
 * 主应用根组件
 * 提供应用布局和路由配置，集成跨应用导航系统
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout, Spin } from 'antd';
import { Helmet } from 'react-helmet-async';

// 导入组件
import AppHeader from './components/Layout/AppHeader';
import AppSidebar from './components/Layout/AppSidebar';
import AppFooter from './components/Layout/AppFooter';
import SimpleMicroAppContainer from './components/MicroApp/SimpleMicroAppContainer';
import Dashboard from './pages/Dashboard';
import CommunicationDemo from './pages/CommunicationDemo';
import NotFound from './pages/NotFound';

// 导入hooks和工具
import { useGlobalState } from './hooks/useGlobalState';
import { useMicroApps } from './hooks/useMicroApps';
import { globalLogger } from '@shared/utils/logger';
import { setupMicroApps } from './micro-apps/setup';

// 导入导航系统
import { 
  globalRouteManager, 
  globalNavigationService, 
  globalHistoryService,
  initializeNavigation,
  type RouteChangeEvent,
  type NavigationEvent
} from '@shared/communication/navigation';
import { globalEventBus } from '@shared/communication/event-bus';

// 导入样式
import './styles/index.css';

const { Content } = Layout;

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const location = useLocation();
  const { state, dispatch } = useGlobalState();
  const { microApps, loading: microAppsLoading } = useMicroApps();
  const [collapsed, setCollapsed] = useState(false);
  const [qiankunInitialized, setQiankunInitialized] = useState(false);

  // 初始化导航系统和微前端应用
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. 初始化导航系统
        globalLogger.info('Initializing navigation system...');
        initializeNavigation({
          debug: process.env.NODE_ENV === 'development',
          maxHistorySize: 100,
          navigationTimeout: 5000,
          autoSnapshot: true,
          snapshotInterval: 300000 // 5分钟
        });

        // 2. 设置导航事件监听
        globalEventBus.on('ROUTE_CHANGE', handleRouteChange);
        globalEventBus.on('NAVIGATION', handleNavigationEvent);

        // 3. 初始化微前端应用
        globalLogger.info('Initializing qiankun micro apps...');
        
        // 等待更长时间确保所有React组件都已渲染
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await setupMicroApps();
        setQiankunInitialized(true);
        globalLogger.info('Qiankun micro apps initialized successfully');
      } catch (error) {
        globalLogger.error('Failed to initialize app', error as Error);
      }
    };

    // 延迟初始化，确保DOM已渲染
    const timer = setTimeout(initializeApp, 500);
    
    return () => {
      clearTimeout(timer);
      // 清理事件监听器
      globalEventBus.off('ROUTE_CHANGE', handleRouteChange);
      globalEventBus.off('NAVIGATION', handleNavigationEvent);
    };
  }, []);

  // 导航事件处理函数
  const handleRouteChange = (event: RouteChangeEvent) => {
    globalLogger.info('Route changed via navigation system', event.data);
    
    // 更新全局状态中的路由信息
    dispatch({
      type: 'SET_ROUTER',
      payload: {
        currentRoute: {
          path: event.data.to.path,
          params: event.data.to.params,
          query: event.data.to.query,
          hash: event.data.to.hash,
          fullPath: event.data.to.fullPath,
          matched: [],
          meta: {
            appName: event.data.to.appName,
            timestamp: event.data.to.timestamp,
            action: event.data.action
          },
          timestamp: new Date().toISOString()
        }
      }
    });
  };

  const handleNavigationEvent = (event: NavigationEvent) => {
    globalLogger.info('Navigation event received', event.data);
    
    // 这里可以添加导航事件的额外处理逻辑
    // 比如显示加载状态、记录用户行为等
  };

  // 监听浏览器路由变化（兼容传统路由）
  useEffect(() => {
    globalLogger.info('Browser route changed', { path: location.pathname });
    
    // 同步更新路由管理器的当前路由信息
    // 这确保了浏览器直接导航和程序导航的一致性
  }, [location]);

  // 获取当前激活的微应用
  const getActiveMicroApp = (pathname: string) => {
    return microApps.find(app => pathname.startsWith(app.activeRule as string));
  };

  const activeMicroApp = getActiveMicroApp(location.pathname);

  // 判断是否为微应用路由
  const isMicroAppRoute = (pathname: string) => {
    return microApps.some(app => pathname.startsWith(app.activeRule as string));
  };

  // 渲染页面内容
  const renderContent = () => {
    if (microAppsLoading || !qiankunInitialized) {
      return (
        <div className="loading-container">
          <Spin size="large" tip="正在加载微应用..." />
        </div>
      );
    }

    return (
      <Routes>
        {/* 主应用路由 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/communication-demo" element={<CommunicationDemo />} />
        
        {/* 微应用路由 */}
        {microApps.map(app => (
          <Route
            key={app.name}
            path={`${app.activeRule}/*`}
            element={
              <SimpleMicroAppContainer
                appName={app.name}
                container={`#micro-app-${app.name}`}
              />
            }
          />
        ))}
        
        {/* 404页面 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  };

  return (
    <>
      <Helmet>
        <title>
          {activeMicroApp 
            ? `${activeMicroApp.name} - Qiankun微前端示例`
            : 'Qiankun微前端示例'
          }
        </title>
        <meta name="description" content="基于qiankun的微前端架构示例项目" />
      </Helmet>

      <Layout className="app-layout">
        {/* 顶部导航 */}
        <AppHeader 
          collapsed={collapsed}
          onCollapse={setCollapsed}
          currentUser={state.user.currentUser}
          onLogout={() => {
            dispatch({
              type: 'SET_USER',
              payload: {
                currentUser: null,
                isAuthenticated: false
              }
            });
          }}
        />

        <Layout>
          {/* 侧边栏 */}
          <AppSidebar
            collapsed={collapsed}
            selectedKeys={[location.pathname]}
            microApps={microApps}
          />

          {/* 主内容区 */}
          <Layout className="app-content-layout">
            <Content className="app-content">
              {renderContent()}
            </Content>

            {/* 底部 */}
            <AppFooter />
          </Layout>
        </Layout>
      </Layout>
    </>
  );
};

export default App;