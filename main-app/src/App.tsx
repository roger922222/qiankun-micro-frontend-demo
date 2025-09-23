/**
 * 主应用根组件
 * 提供应用布局和路由配置
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
import NotFound from './pages/NotFound';

// 导入hooks和工具
import { useGlobalState } from './hooks/useGlobalState';
import { useMicroApps } from './hooks/useMicroApps';
import { globalLogger } from '@shared/utils/logger';
import { setupMicroApps } from './micro-apps/setup';

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

  // 初始化微前端应用（延迟执行，确保容器元素已渲染）
  useEffect(() => {
    const initializeQiankun = async () => {
      try {
        globalLogger.info('Initializing qiankun micro apps...');
        
        // 等待更长时间确保所有React组件都已渲染
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await setupMicroApps();
        setQiankunInitialized(true);
        globalLogger.info('Qiankun micro apps initialized successfully');
      } catch (error) {
        globalLogger.error('Failed to initialize qiankun micro apps', error as Error);
      }
    };

    // 延迟初始化，确保DOM已渲染
    const timer = setTimeout(initializeQiankun, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // 监听路由变化
  useEffect(() => {
    globalLogger.info('Route changed', { path: location.pathname });
    
    // 更新当前路由信息
    dispatch({
      type: 'SET_ROUTER',
      payload: {
        currentRoute: {
          path: location.pathname,
          params: {},
          query: {},
          hash: location.hash,
          fullPath: location.pathname + location.search + location.hash,
          matched: [],
          meta: {},
          timestamp: new Date().toISOString()
        }
      }
    });
  }, [location, dispatch]);

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