/**
 * React用户管理子应用主组件
 * 提供用户管理功能的路由和布局
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout, Breadcrumb } from 'antd';
import { Helmet } from 'react-helmet-async';
import { useDispatch } from 'react-redux';

// 导入页面组件
import UserList from './pages/UserList';
import UserDetail from './pages/UserDetail';
import UserCreate from './pages/UserCreate';
import UserEdit from './pages/UserEdit';
import RoleManagement from './pages/RoleManagement';
import PermissionManagement from './pages/PermissionManagement';

// 导入组件
import AppHeader from './components/Layout/AppHeader';
import AppSidebar from './components/Layout/AppSidebar';
import NotFound from './components/NotFound';

// 导入Redux actions
import { setCurrentRoute } from './store/slices/appSlice';

// 导入样式
import './styles/App.css';

const { Content } = Layout;

/**
 * 用户管理应用组件
 */
const App: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  // 监听路由变化
  useEffect(() => {
    dispatch(setCurrentRoute({
      path: location.pathname,
      search: location.search,
      hash: location.hash
    }));
  }, [location, dispatch]);

  // 生成面包屑
  const generateBreadcrumbs = (pathname: string) => {
    const pathMap: Record<string, string> = {
      '/': '用户管理',
      '/users': '用户列表',
      '/users/create': '创建用户',
      '/users/edit': '编辑用户',
      '/roles': '角色管理',
      '/permissions': '权限管理'
    };

    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ title: '用户管理', path: '/' }];

    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const title = pathMap[currentPath] || segment;
      breadcrumbs.push({ title, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs(location.pathname);

  return (
    <>
      <Helmet>
        <title>用户管理系统 - Qiankun微前端示例</title>
        <meta name="description" content="基于React和Redux Toolkit的用户管理系统" />
      </Helmet>

      <Layout className="user-management-app">
        {/* 顶部导航 */}
        <AppHeader />

        <Layout>
          {/* 侧边栏 */}
          <AppSidebar selectedKeys={[location.pathname]} />

          {/* 主内容区 */}
          <Layout className="content-layout">
            <Content className="main-content">
              {/* 面包屑导航 */}
              <div className="breadcrumb-container">
                <Breadcrumb
                  items={breadcrumbs.map(item => ({
                    title: item.title,
                    href: item.path === location.pathname ? undefined : item.path
                  }))}
                />
              </div>

              {/* 路由内容 */}
              <div className="page-content">
                <Routes>
                  {/* 默认重定向 */}
                  <Route path="/" element={<Navigate to="/users" replace />} />
                  
                  {/* 用户管理路由 */}
                  <Route path="/users" element={<UserList />} />
                  <Route path="/users/create" element={<UserCreate />} />
                  <Route path="/users/:id" element={<UserDetail />} />
                  <Route path="/users/:id/edit" element={<UserEdit />} />
                  
                  {/* 角色管理路由 */}
                  <Route path="/roles" element={<RoleManagement />} />
                  
                  {/* 权限管理路由 */}
                  <Route path="/permissions" element={<PermissionManagement />} />
                  
                  {/* 404页面 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </>
  );
};

export default App;