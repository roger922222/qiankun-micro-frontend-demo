import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Switch, Space, Badge, Alert } from 'antd';
import { LineChart, AreaChart } from '../components/charts';
import { WifiOutlined, ApiOutlined, UserOutlined, ShoppingOutlined, ReloadOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { dashboardStore } from '../store/DashboardStore';

const { Title, Text } = Typography;

const RealTimeData: React.FC = observer(() => {
  useEffect(() => {
    // 连接实时数据
    dashboardStore.connectRealTime();
    
    return () => {
      // 组件卸载时断开连接
      dashboardStore.disconnectRealTime();
    };
  }, []);

  const handleConnectionToggle = (checked: boolean) => {
    if (checked) {
      dashboardStore.connectRealTime();
    } else {
      dashboardStore.disconnectRealTime();
    }
  };

  const handleReconnect = () => {
    dashboardStore.disconnectRealTime();
    setTimeout(() => {
      dashboardStore.connectRealTime();
    }, 1000);
  };

  // 从Store获取实时数据
  const { 
    realTimeData, 
    isRealTimeConnected, 
    wsReconnectAttempts,
    realTimeChartData,
    loading 
  } = dashboardStore;

  // 格式化图表数据
  const formatChartData = (data: any[]) => {
    return data.map((item, index) => ({
      name: new Date(Date.now() - (data.length - index - 1) * 3000).toLocaleTimeString(),
      value: item.value || 0,
      timestamp: new Date(Date.now() - (data.length - index - 1) * 3000).toISOString()
    }));
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>实时数据监控</Title>
        </Col>
        <Col>
          <Space>
            <Badge status={isRealTimeConnected ? 'processing' : 'error'} />
            <Text>{isRealTimeConnected ? '已连接' : '已断开'}</Text>
            <Switch
              checked={isRealTimeConnected}
              onChange={handleConnectionToggle}
              checkedChildren="开启"
              unCheckedChildren="关闭"
              loading={loading}
            />
            {wsReconnectAttempts > 0 && (
              <Badge count={wsReconnectAttempts} showZero>
                <ReloadOutlined 
                  onClick={handleReconnect}
                  style={{ cursor: 'pointer', color: '#1890ff' }}
                  title="重新连接"
                />
              </Badge>
            )}
          </Space>
        </Col>
      </Row>

      {/* 连接状态提示 */}
      {!isRealTimeConnected && (
        <Alert
          message="实时连接已断开"
          description={`重连尝试次数: ${wsReconnectAttempts}/5。点击重连按钮手动重连。`}
          type="warning"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
          action={
            <Space>
              <ReloadOutlined onClick={handleReconnect} />
              重连
            </Space>
          }
        />
      )}

      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="在线用户"
              value={realTimeData.activeUsers}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="实时订单"
              value={realTimeData.orders}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="实时收入"
              value={realTimeData.revenue}
              precision={2}
              valueStyle={{ color: '#722ed1' }}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="页面访问"
              value={realTimeData.pageViews}
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
                <Badge 
                  status={isRealTimeConnected ? 'processing' : 'default'} 
                  text={isRealTimeConnected ? '实时更新' : '暂停更新'}
                />
              </Space>
            } 
            bordered={false}
            loading={loading}
          >
            <LineChart 
              data={formatChartData(realTimeChartData.traffic || [])}
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
                <Badge 
                  status={isRealTimeConnected ? 'processing' : 'default'} 
                  text={isRealTimeConnected ? '实时更新' : '暂停更新'}
                />
              </Space>
            } 
            bordered={false}
            loading={loading}
          >
            <AreaChart 
              data={formatChartData(realTimeChartData.performance || [])}
              height={300}
              color="#fa541c"
              smooth={true}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
});

export default RealTimeData;