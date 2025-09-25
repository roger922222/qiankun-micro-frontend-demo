/**
 * 订单管理应用头部组件
 */

import React from 'react';
import { Layout, Typography, Space, Tag } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  return (
    <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <ShoppingCartOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            订单管理系统
          </Title>
          <Tag color="blue">Context API</Tag>
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader;