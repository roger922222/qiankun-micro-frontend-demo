/**
 * 商品管理应用头部组件
 */

import React from 'react';
import { Layout, Typography, Space, Tag } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  return (
    <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <ShoppingOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
          <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
            商品管理系统
          </Title>
          <Tag color="green">Zustand</Tag>
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader;