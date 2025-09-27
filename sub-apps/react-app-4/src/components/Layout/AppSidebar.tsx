import React from 'react';
import { Layout, Menu, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  DashboardOutlined, 
  BarChartOutlined, 
  FileTextOutlined, 
  ApiOutlined, 
  PieChartOutlined 
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { dashboardStore } from '../../store/DashboardStore';

const { Sider } = Layout;

interface AppSidebarProps {
  collapsed?: boolean;
}

const AppSidebar: React.FC<AppSidebarProps> = observer(({ collapsed = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '数据看板',
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: (
        <span>
          报告中心
          {dashboardStore.pendingReports > 0 && (
            <Badge 
              count={dashboardStore.pendingReports} 
              size="small" 
              style={{ marginLeft: 8 }}
            />
          )}
        </span>
      ),
    },
    {
      key: '/realtime',
      icon: (
        <Badge 
          status={dashboardStore.isRealTimeConnected ? 'success' : 'error'} 
          dot
        >
          <ApiOutlined />
        </Badge>
      ),
      label: '实时数据',
    },
    {
      key: '/visualization',
      icon: <PieChartOutlined />,
      label: '图表可视化',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    
    // 预加载页面数据
    dashboardStore.preloadPageData(key.replace('/', ''));
  };

  return (
    <Sider
      width={200}
      style={{ 
        background: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.06)'
      }}
      breakpoint="lg"
      collapsed={collapsed}
      collapsible
      trigger={null}
      collapsedWidth={collapsed ? 80 : 0}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          height: '100%', 
          borderRight: 0,
          paddingTop: 16
        }}
        inlineCollapsed={collapsed}
      />
    </Sider>
  );
});

export default AppSidebar;