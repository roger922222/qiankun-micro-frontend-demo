import React from 'react';
import { ConfigProvider, Layout, Menu, theme, Button } from 'antd';
import { Routes, Route, Link, useLocation, Location } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import UserRoutes from './pages/users';
import RoleRoutes from './pages/roles';
import PermissionRoutes from './pages/permissions';
import LogRoutes from './pages/logs';
import {
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  // 添加安全检查和错误处理
  let location: Location | { pathname: string };
  try {
    location = useLocation();
  } catch (error) {
    console.warn('useLocation hook not available, using fallback');
    location = { pathname: '/users' };
  }
  
  const [collapsed, setCollapsed] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);

  const menuItems = [
    {
      key: '/users',
      icon: <UserOutlined />,
      label: <Link to="/users">用户管理</Link>,
    },
    {
      key: '/roles',
      icon: <TeamOutlined />,
      label: <Link to="/roles">角色管理</Link>,
    },
    {
      key: '/permissions',
      icon: <SafetyOutlined />,
      label: <Link to="/permissions">权限管理</Link>,
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: <Link to="/logs">操作日志</Link>,
    },
  ];

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key || '/users';

  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <Layout style={{ minHeight: '100vh' }}>
          <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
            <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
            <Menu
              theme="dark"
              selectedKeys={[selectedKey]}
              mode="inline"
              items={menuItems}
            />
          </Sider>
          <Layout>
            <Header style={{ padding: 0, background: '#fff' }}>
              <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>用户管理系统</h2>
                <div>
                  <span style={{ marginRight: 16 }}>欢迎，管理员</span>
                  <Button onClick={() => setDarkMode(!darkMode)}>
                    {darkMode ? '浅色' : '深色'}
                  </Button>
                </div>
              </div>
            </Header>
            <Content style={{ margin: '16px' }}>
              <Routes>
                <Route path="/users/*" element={<UserRoutes />} />
                <Route path="/roles/*" element={<RoleRoutes />} />
                <Route path="/permissions/*" element={<PermissionRoutes />} />
                <Route path="/logs/*" element={<LogRoutes />} />
                <Route path="/" element={<UserRoutes />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </ConfigProvider>
    </Provider>
  );
};

export default App;