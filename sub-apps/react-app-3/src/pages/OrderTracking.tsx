/**
 * 订单状态跟踪页面
 */

import React from 'react';
import { Card, Steps, Timeline, Tag, Button, Typography, Row, Col, Descriptions, Space } from 'antd';
import { ArrowLeftOutlined, TruckOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrderContext } from '../context/OrderContext';

const { Title, Text } = Typography;

// 订单跟踪记录接口
interface TrackingRecord {
  id: string;
  timestamp: string;
  status: string;
  description: string;
  location?: string;
  operator?: string;
}

const OrderTracking: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { state } = useOrderContext();

  const order = state.orders.find(o => o.id === id);

  if (!order) {
    return (
      <div>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/orders')}
          style={{ marginBottom: 16 }}
        >
          返回订单列表
        </Button>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Title level={3}>订单不存在</Title>
          </div>
        </Card>
      </div>
    );
  }

  // 模拟订单跟踪记录
  const generateTrackingRecords = (): TrackingRecord[] => {
    const baseTime = new Date(order.createdAt);
    const records: TrackingRecord[] = [
      {
        id: 'track_1',
        timestamp: baseTime.toISOString(),
        status: 'created',
        description: '订单创建成功',
        operator: '系统'
      }
    ];

    if (order.status !== 'pending') {
      records.push({
        id: 'track_2',
        timestamp: new Date(baseTime.getTime() + 30 * 60 * 1000).toISOString(),
        status: 'confirmed',
        description: '订单已确认，准备处理',
        operator: '客服小王'
      });
    }

    if (['processing', 'shipped', 'delivered'].includes(order.status)) {
      records.push({
        id: 'track_3',
        timestamp: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        status: 'processing',
        description: '订单处理中，正在备货',
        location: '北京仓库',
        operator: '仓库管理员'
      });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      records.push({
        id: 'track_4',
        timestamp: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'shipped',
        description: '商品已发货',
        location: '北京分拣中心',
        operator: '快递员张师傅'
      });

      records.push({
        id: 'track_5',
        timestamp: new Date(baseTime.getTime() + 36 * 60 * 60 * 1000).toISOString(),
        status: 'in_transit',
        description: '商品运输中',
        location: '上海中转站',
        operator: '物流系统'
      });
    }

    if (order.status === 'delivered') {
      records.push({
        id: 'track_6',
        timestamp: new Date(baseTime.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        status: 'delivered',
        description: '商品已送达，签收人：本人',
        location: order.shippingAddress.street,
        operator: '快递员李师傅'
      });
    }

    if (order.status === 'cancelled') {
      records.push({
        id: 'track_cancel',
        timestamp: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
        status: 'cancelled',
        description: '订单已取消',
        operator: '客服小李'
      });
    }

    return records;
  };

  const trackingRecords = generateTrackingRecords();

  // 获取当前步骤
  const getCurrentStep = () => {
    const statusMap = {
      'pending': 0,
      'confirmed': 1,
      'processing': 2,
      'shipped': 3,
      'delivered': 4,
      'cancelled': -1
    };
    return statusMap[order.status] || 0;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'orange',
      confirmed: 'blue',
      processing: 'purple',
      shipped: 'cyan',
      delivered: 'green',
      cancelled: 'red'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getTimelineIcon = (status: string) => {
    const icons = {
      created: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
      confirmed: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      processing: <ClockCircleOutlined style={{ color: '#722ed1' }} />,
      shipped: <TruckOutlined style={{ color: '#13c2c2' }} />,
      in_transit: <TruckOutlined style={{ color: '#faad14' }} />,
      delivered: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      cancelled: <ClockCircleOutlined style={{ color: '#f5222d' }} />
    };
    return icons[status as keyof typeof icons] || <ClockCircleOutlined />;
  };

  return (
    <div>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/orders')}
        style={{ marginBottom: 16 }}
      >
        返回订单列表
      </Button>

      <Title level={2}>订单跟踪</Title>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="订单基本信息">
            <Descriptions column={4}>
              <Descriptions.Item label="订单号">{order.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="客户姓名">{order.customerName}</Descriptions.Item>
              <Descriptions.Item label="订单金额">¥{order.totalAmount.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={getStatusColor(order.status)}>
                  {order.status === 'pending' && '待确认'}
                  {order.status === 'confirmed' && '已确认'}
                  {order.status === 'processing' && '处理中'}
                  {order.status === 'shipped' && '已发货'}
                  {order.status === 'delivered' && '已送达'}
                  {order.status === 'cancelled' && '已取消'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {(order.status as string) !== 'cancelled' && (
          <Col span={24}>
            <Card title="订单进度">
              <Steps
                current={getCurrentStep()}
                status={order.status === 'cancelled' ? 'error' : 'process'}
                items={[
                  {
                    title: '订单确认',
                    description: '订单已创建，等待确认'
                  },
                  {
                    title: '订单处理',
                    description: '订单已确认，正在处理'
                  },
                  {
                    title: '商品发货',
                    description: '商品已发货，正在配送'
                  },
                  {
                    title: '订单完成',
                    description: '商品已送达，订单完成'
                  }
                ]}
              />
            </Card>
          </Col>
        )}

        <Col span={24}>
          <Card title="物流跟踪">
            <Timeline
              items={trackingRecords.map(record => ({
                dot: getTimelineIcon(record.status),
                children: (
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      <Text strong>{record.description}</Text>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                    {record.location && (
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 2 }}>
                        位置：{record.location}
                      </div>
                    )}
                    {record.operator && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        操作人：{record.operator}
                      </div>
                    )}
                  </div>
                )
              }))}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="收货信息">
            <Descriptions column={2}>
              <Descriptions.Item label="收货人">{order.shippingAddress.name}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{order.shippingAddress.phone}</Descriptions.Item>
              <Descriptions.Item label="收货地址" span={2}>
                {order.shippingAddress.province} {order.shippingAddress.city} {order.shippingAddress.district} {order.shippingAddress.street}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={24}>
          <Space>
            <Button onClick={() => navigate(`/orders/${order.id}`)}>
              查看订单详情
            </Button>
            <Button onClick={() => navigate('/orders')}>
              返回订单列表
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default OrderTracking;