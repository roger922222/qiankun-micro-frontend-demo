import React from 'react';
import { Layout, Typography, Space, Divider } from 'antd';
import { observer } from 'mobx-react-lite';
import { dashboardStore } from '../../store/DashboardStore';

const { Footer } = Layout;
const { Text } = Typography;

const AppFooter: React.FC = observer(() => {
  const formatLastUpdate = (timestamp: number) => {
    if (!timestamp) return '未知';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Footer 
      style={{ 
        textAlign: 'center', 
        background: '#f0f2f5',
        padding: '12px 24px',
        borderTop: '1px solid #d9d9d9'
      }}
    >
      <Space split={<Divider type="vertical" />}>
        <Text type="secondary">
          React Dashboard ©2024 Created with React + MobX + Ant Design
        </Text>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          数据更新时间: {formatLastUpdate(dashboardStore.lastUpdateTime)}
        </Text>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          连接状态: {dashboardStore.isRealTimeConnected ? '已连接' : '已断开'}
        </Text>
      </Space>
    </Footer>
  );
});

export default AppFooter;