import React from 'react';
import { ConfigProvider, Layout, Menu, theme, Button, Dropdown, Space } from 'antd';
import { Routes, Route, useLocation, Location, useNavigate } from 'react-router-dom';
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
  AppstoreOutlined,
  DownOutlined,
  ApiOutlined,
} from '@ant-design/icons';

// 导入导航Hook和通信演示组件
import { useCrossAppNavigation, useNavigationParameters } from './hooks/useNavigation';
import CommunicationDemo from './components/CommunicationDemo';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  // 添加安全检查和错误处理
  let location: Location | { pathname: string };
  let navigate: any;
  try {
    location = useLocation();
    navigate = useNavigate();
  } catch (error) {
    console.warn('useLocation hook not available, using fallback');
    location = { pathname: '/users' };
    navigate = () => {};
  }
  
  const [collapsed, setCollapsed] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);

  // 使用跨应用导航
  const {
    goToProductManagement,
    goToOrderManagement,
    goToDashboard,
    goToSettings,
    goToMessageCenter,
    goToFileManagement,
    goToSystemMonitor,
    goToMainApp
  } = useCrossAppNavigation();

  // 自定义导航处理函数，确保URL更新
  const handleInternalNavigation = React.useCallback((path: string) => {
    console.log('[App] Navigating to:', path);
    navigate(path);
    
    // 在微前端环境中，手动更新浏览器地址栏
    if (window.__POWERED_BY_QIANKUN__) {
      const fullPath = `/user-management${path}`;
      console.log('[App] Updating browser URL to:', fullPath);
      window.history.pushState(null, '', fullPath);
    }
  }, [navigate]);

  // 使用导航参数
  const { currentParameters, clearReceivedParameters } = useNavigationParameters();

  // 跨应用导航菜单
  const crossAppMenuItems = [
    {
      key: 'main',
      label: '主应用',
      onClick: () => goToMainApp()
    },
    {
      key: 'products',
      label: '商品管理',
      onClick: () => goToProductManagement()
    },
    {
      key: 'orders',
      label: '订单管理',
      onClick: () => goToOrderManagement()
    },
    {
      key: 'dashboard',
      label: '数据看板',
      onClick: () => goToDashboard()
    },
    {
      key: 'settings',
      label: '设置中心',
      onClick: () => goToSettings()
    },
    {
      key: 'messages',
      label: '消息中心',
      onClick: () => goToMessageCenter()
    },
    {
      key: 'files',
      label: '文件管理',
      onClick: () => goToFileManagement()
    },
    {
      key: 'monitor',
      label: '系统监控',
      onClick: () => goToSystemMonitor()
    }
  ];

  const menuItems = [
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
      onClick: () => handleInternalNavigation('/users'),
    },
    {
      key: '/roles',
      icon: <TeamOutlined />,
      label: '角色管理',
      onClick: () => handleInternalNavigation('/roles'),
    },
    {
      key: '/permissions',
      icon: <SafetyOutlined />,
      label: '权限管理',
      onClick: () => handleInternalNavigation('/permissions'),
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: '操作日志',
      onClick: () => handleInternalNavigation('/logs'),
    },
    {
      key: '/communication-demo',
      icon: <ApiOutlined />,
      label: '通信演示',
      onClick: () => handleInternalNavigation('/communication-demo'),
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
              style={{
                backgroundColor: '#001529',
                borderRight: 'none'
              }}
              className="custom-dark-menu"
            />
          </Sider>
          <Layout>
            <Header style={{ padding: 0, background: '#fff' }}>
              <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>用户管理系统</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* 显示接收到的参数 */}
                  {currentParameters && (
                    <div style={{ 
                      padding: '4px 8px', 
                      background: '#f0f0f0', 
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      <span>接收参数: {JSON.stringify(currentParameters)}</span>
                      <Button 
                        size="small" 
                        type="text" 
                        onClick={clearReceivedParameters}
                        style={{ marginLeft: '8px' }}
                      >
                        清除
                      </Button>
                    </div>
                  )}
                  
                  {/* 跨应用导航下拉菜单 */}
                  <Dropdown 
                    menu={{ items: crossAppMenuItems }}
                    trigger={['click']}
                  >
                    <Button type="text">
                      <Space>
                        <AppstoreOutlined />
                        跨应用导航
                        <DownOutlined />
                      </Space>
                    </Button>
                  </Dropdown>
                  
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
                <Route path="/communication-demo" element={<CommunicationDemo />} />
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