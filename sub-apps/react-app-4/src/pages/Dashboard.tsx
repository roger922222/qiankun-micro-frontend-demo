import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, ShoppingCartOutlined, DollarOutlined, EyeOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { LineChart, PieChart } from '../components/charts';
import { dashboardStore } from '../store/DashboardStore';

const { Title } = Typography;

const Dashboard: React.FC = observer(() => {
  useEffect(() => {
    dashboardStore.initializeSampleData();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>数据看板</Title>
      
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={dashboardStore.metrics.totalUsers}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
              suffix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="订单数"
              value={dashboardStore.metrics.totalOrders}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ShoppingCartOutlined />}
              suffix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="收入"
              value={dashboardStore.metrics.totalRevenue}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix={<DollarOutlined />}
              suffix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="页面浏览量"
              value={dashboardStore.metrics.pageViews}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<EyeOutlined />}
            />
            <Progress percent={93} strokeColor="#722ed1" />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="销售趋势" bordered={false}>
            <LineChart 
              data={dashboardStore.salesTrend}
              loading={dashboardStore.loading}
              height={300}
              color="#1890ff"
              smooth={true}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="用户分析" bordered={false}>
            <PieChart 
              data={dashboardStore.userAnalytics}
              loading={dashboardStore.loading}
              height={300}
              color={['#5B8FF9', '#5AD8A6']}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
});

export default Dashboard;