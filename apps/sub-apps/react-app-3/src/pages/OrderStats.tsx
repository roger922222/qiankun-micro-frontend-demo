/**
 * 订单统计页面
 */

import React from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  ShoppingCartOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  TruckOutlined,
  SmileOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useOrderContext } from '../context/OrderContext';

const { Title } = Typography;

const OrderStats: React.FC = () => {
  const { actions } = useOrderContext();
  const stats = actions.getOrderStats();

  const statCards = [
    {
      title: '总订单数',
      value: stats.total,
      icon: <ShoppingCartOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff'
    },
    {
      title: '待确认',
      value: stats.pending,
      icon: <SyncOutlined style={{ color: '#faad14' }} />,
      color: '#faad14'
    },
    {
      title: '已确认',
      value: stats.confirmed,
      icon: <CheckCircleOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff'
    },
    {
      title: '处理中',
      value: stats.processing,
      icon: <SyncOutlined style={{ color: '#722ed1' }} />,
      color: '#722ed1'
    },
    {
      title: '已发货',
      value: stats.shipped,
      icon: <TruckOutlined style={{ color: '#13c2c2' }} />,
      color: '#13c2c2'
    },
    {
      title: '已送达',
      value: stats.delivered,
      icon: <SmileOutlined style={{ color: '#52c41a' }} />,
      color: '#52c41a'
    },
    {
      title: '已取消',
      value: stats.cancelled,
      icon: <CloseCircleOutlined style={{ color: '#f5222d' }} />,
      color: '#f5222d'
    }
  ];

  return (
    <div>
      <Title level={2}>订单统计</Title>
      
      <Row gutter={[16, 16]}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={12} md={8} lg={6} xl={6} key={index}>
            <Card>
              <Statistic
                title={card.title}
                value={card.value}
                prefix={card.icon}
                valueStyle={{ color: card.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="订单状态分布">
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <p>订单状态统计图表区域</p>
              <p style={{ color: '#666', fontSize: '12px' }}>
                此处可以集成图表库（如 ECharts、Chart.js 等）来显示更详细的统计图表
              </p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderStats;