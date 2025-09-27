import React from 'react';
import { Card, Typography } from 'antd';
import PerformanceDashboard from '../components/monitoring/PerformanceDashboard';

const { Title } = Typography;

const PerformanceMonitor: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>性能监控</Title>
      <Card>
        <PerformanceDashboard />
      </Card>
    </div>
  );
};

export default PerformanceMonitor;