import React from 'react';
import { Layout, Typography } from 'antd';

const { Footer } = Layout;
const { Text } = Typography;

const AppFooter: React.FC = () => {
  return (
    <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
      <Text type="secondary">
        React Dashboard ©2024 Created with React + MobX + Ant Design
      </Text>
    </Footer>
  );
};

export default AppFooter;