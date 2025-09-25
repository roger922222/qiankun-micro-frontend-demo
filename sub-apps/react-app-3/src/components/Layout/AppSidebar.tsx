/**
 * 订单管理应用侧边栏组件
 */

import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UnorderedListOutlined,
  EyeOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Sider } = Layout;

const AppSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/orders',
      icon: <UnorderedListOutlined />,
      label: '订单列表',
      onClick: () => navigate('/orders'),
    },
    {
      key: '/stats',
      icon: <BarChartOutlined />,
      label: '订单统计',
      onClick: () => navigate('/stats'),
    }
  ];

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key || '/orders';

  return (
    <Sider width={200} style={{ background: '#fff' }}>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  );
};

export default AppSidebar;