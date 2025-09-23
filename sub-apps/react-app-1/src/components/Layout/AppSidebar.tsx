/**
 * 商品管理应用侧边栏组件
 */

import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppstoreOutlined, 
  TagsOutlined, 
  BarChartOutlined,
  UnorderedListOutlined 
} from '@ant-design/icons';

const { Sider } = Layout;

const AppSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/products',
      icon: <UnorderedListOutlined />,
      label: '商品列表'
    },
    {
      key: '/categories',
      icon: <TagsOutlined />,
      label: '分类管理'
    },
    {
      key: '/stats',
      icon: <BarChartOutlined />,
      label: '统计报表'
    }
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider width={200} style={{ background: '#fff' }}>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  );
};

export default AppSidebar;