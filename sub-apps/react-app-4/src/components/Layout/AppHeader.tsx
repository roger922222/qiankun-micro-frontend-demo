import React from 'react';
import { Layout, Typography, Space, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

const AppHeader: React.FC = () => {
  return (
    <Header style={{ 
      background: '#fff', 
      padding: '0 24px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <Title level={4} style={{ margin: 0, color: '#722ed1' }}>
        数据看板系统
      </Title>
      
      <Space>
        <Avatar icon={<UserOutlined />} />
        <span>管理员</span>
      </Space>
    </Header>
  );
};

export default AppHeader;