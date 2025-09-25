/**
 * 订单管理应用底部组件
 */

import React from 'react';
import { Layout, Typography } from 'antd';

const { Footer } = Layout;
const { Text } = Typography;

const AppFooter: React.FC = () => {
  return (
    <Footer style={{ textAlign: 'center', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
      <Text type="secondary">
        订单管理系统 ©2024 - 基于 React + Context API 构建
      </Text>
    </Footer>
  );
};

export default AppFooter;