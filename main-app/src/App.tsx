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
import MicroAppContainer from './components/MicroApp/MicroAppContainer';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

// 导入hooks和工具
import { useGlobalState } from './hooks/useGlobalState';
import { useMicroApps } from './hooks/useMicroApps';
import { globalLogger } from '@shared/utils/logger';

// 导入微前端配置
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
  // const { microApps, loading: microAppsLoading } = useMicroApps();
  const [qiankunInitialized, setQiankunInitialized] = useState(false);
  const [microApps, setMicroApps] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState(false);

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

  // 初始化qiankun - 确保在组件渲染完成后
  useEffect(() => {
    const initializeQiankun = async () => {
      if (!qiankunInitialized) {
        try {
          globalLogger.info(`Initializing qiankun after App component mounted`)
          // await setupMicroApps()

          // 获取微应用列表
          const configs = await import('./micro-apps/setup').then(module => module.getMicroAppConfigs());
          setMicroApps(configs)
          // setQiankunInitialized(true)

          // 预创建所有微应用容器
          configs.forEach(config => {
            const containerId = config.container.replace('#', '');
            let container = document.getElementById(containerId);
            if (!container) {
              container = document.createElement('div');
              container.id = containerId;
              container.style.display = 'none'; // 隐藏
              document.body.appendChild(container);
              globalLogger.info(`Pre-created container: ${containerId}`)
            }
          })

          // 延迟初始化qiankun,确保容器创建成功
          setTimeout(async () => {
            await setupMicroApps()
            setQiankunInitialized(true);
            globalLogger.info(`Qiankun initialized successfully`);
          }, 200)

        } catch (err) {
          globalLogger.error(`Failed to initialize qiankun`, err as Error)
        }
      }
    }
    // 延迟执行, 确保DOM完全渲染
    const timer = setTimeout(initializeQiankun, 100)
    return () => clearInterval(timer)
  }, [qiankunInitialized])

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
    if (!qiankunInitialized) {
      return (
        <div className="loading-container">
          <Spin size="large" tip="正在初始化微前端框架..." />
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
              <MicroAppContainer
                appName={app.name}
                entry={app.entry}
                container={`#micro-app-${app.name}`}
                activeRule={app.activeRule as string}
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