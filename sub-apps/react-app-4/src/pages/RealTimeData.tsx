import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Typography, Switch, Space, Badge } from 'antd';
import { LineChart, AreaChart } from '../components/charts';
import { WifiOutlined, ApiOutlined, UserOutlined, ShoppingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface RealTimeMetrics {
  activeUsers: number;
  orders: number;
  revenue: number;
  pageViews: number;
}

interface RealTimeDataPoint {
  name: string;
  value: number;
  timestamp: string;
}

const RealTimeData: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    activeUsers: 1245,
    orders: 23,
    revenue: 15678.90,
    pageViews: 3456,
  });
  
  const [realtimeChart, setRealtimeChart] = useState<RealTimeDataPoint[]>([]);
  const [performanceChart, setPerformanceChart] = useState<RealTimeDataPoint[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟实时数据更新
  const generateRealTimeData = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    // 更新指标数据
    setMetrics(prev => ({
      activeUsers: prev.activeUsers + Math.floor(Math.random() * 20 - 10),
      orders: prev.orders + Math.floor(Math.random() * 5),
      revenue: prev.revenue + Math.random() * 500,
      pageViews: prev.pageViews + Math.floor(Math.random() * 50),
    }));

    // 更新图表数据
    setRealtimeChart(prev => {
      const newData = [...prev];
      newData.push({
        name: timeStr,
        value: Math.floor(Math.random() * 100) + 50,
        timestamp: now.toISOString(),
      });
      
      // 保持最近20个数据点
      if (newData.length > 20) {
        newData.shift();
      }
      return newData;
    });

    setPerformanceChart(prev => {
      const newData = [...prev];
      newData.push({
        name: timeStr,
        value: Math.floor(Math.random() * 200) + 100,
        timestamp: now.toISOString(),
      });
      
      // 保持最近20个数据点
      if (newData.length > 20) {
        newData.shift();
      }
      return newData;
    });
  };

  useEffect(() => {
    // 初始化数据
    const initialData = [];
    const initialPerformance = [];
    for (let i = 19; i >= 0; i--) {
      const time = new Date(Date.now() - i * 3000);
      const timeStr = time.toLocaleTimeString();
      
      initialData.push({
        name: timeStr,
        value: Math.floor(Math.random() * 100) + 50,
        timestamp: time.toISOString(),
      });
      
      initialPerformance.push({
        name: timeStr,
        value: Math.floor(Math.random() * 200) + 100,
        timestamp: time.toISOString(),
      });
    }
    
    setRealtimeChart(initialData);
    setPerformanceChart(initialPerformance);
  }, []);

  useEffect(() => {
    if (isConnected) {
      intervalRef.current = setInterval(generateRealTimeData, 3000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected]);

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>实时数据监控</Title>
        </Col>
        <Col>
          <Space>
            <Badge status={isConnected ? 'processing' : 'error'} />
            <Text>{isConnected ? '已连接' : '已断开'}</Text>
            <Switch
              checked={isConnected}
              onChange={setIsConnected}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </Space>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="在线用户"
              value={metrics.activeUsers}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="实时订单"
              value={metrics.orders}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="实时收入"
              value={metrics.revenue}
              precision={2}
              valueStyle={{ color: '#722ed1' }}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="页面访问"
              value={metrics.pageViews}
              precision={0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ApiOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card 
            title={
              <Space>
                <WifiOutlined />
                <span>实时流量监控</span>
              </Space>
            } 
            bordered={false}
          >
            <LineChart 
              data={realtimeChart}
              height={300}
              color="#52c41a"
              smooth={true}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card 
            title={
              <Space>
                <ApiOutlined />
                <span>系统性能监控</span>
              </Space>
            } 
            bordered={false}
          >
            <AreaChart 
              data={performanceChart}
              height={300}
              color="#fa541c"
              smooth={true}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default RealTimeData;