/**
 * 订单详情页面
 */

import React from 'react';
import { Card, Descriptions, Tag, Button, Typography, Divider, Row, Col, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrderContext } from '../context/OrderContext';

const { Title } = Typography;

const OrderDetail: React.FC = () => {
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

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      unpaid: 'orange',
      paid: 'green',
      refunded: 'purple'
    };
    return colors[status as keyof typeof colors] || 'default';
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

      <Title level={2}>订单详情</Title>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="基本信息">
            <Descriptions column={2}>
              <Descriptions.Item label="订单号">{order.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(order.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={getStatusColor(order.status)}>
                  {order.status === 'pending' && '待确认'}
                  {order.status === 'confirmed' && '已确认'}
                  {order.status === 'processing' && '处理中'}
                  {order.status === 'shipped' && '已发货'}
                  {order.status === 'delivered' && '已送达'}
                  {order.status === 'cancelled' && '已取消'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="支付状态">
                <Tag color={getPaymentStatusColor(order.paymentStatus)}>
                  {order.paymentStatus === 'unpaid' && '未支付'}
                  {order.paymentStatus === 'paid' && '已支付'}
                  {order.paymentStatus === 'refunded' && '已退款'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {order.paymentMethod === 'credit_card' && '信用卡'}
                {order.paymentMethod === 'alipay' && '支付宝'}
                {order.paymentMethod === 'wechat' && '微信支付'}
                {order.paymentMethod === 'bank_transfer' && '银行转账'}
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                ¥{order.totalAmount.toFixed(2)}
              </Descriptions.Item>
              {order.notes && (
                <Descriptions.Item label="备注" span={2}>
                  {order.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="客户信息">
            <Descriptions column={1}>
              <Descriptions.Item label="姓名">{order.customerName}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{order.customerEmail}</Descriptions.Item>
              <Descriptions.Item label="电话">{order.customerPhone}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="收货地址">
            <Descriptions column={1}>
              <Descriptions.Item label="收货人">{order.shippingAddress.name}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{order.shippingAddress.phone}</Descriptions.Item>
              <Descriptions.Item label="详细地址">
                {order.shippingAddress.province} {order.shippingAddress.city} {order.shippingAddress.district} {order.shippingAddress.street}
              </Descriptions.Item>
              <Descriptions.Item label="邮政编码">{order.shippingAddress.zipCode}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="商品信息">
            {order.items.map((item, index) => (
              <div key={item.id}>
                <Row gutter={16} align="middle">
                  <Col span={4}>
                    <div 
                      style={{ 
                        width: 80, 
                        height: 80, 
                        background: '#f5f5f5', 
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#bfbfbf'
                      }}
                    >
                      图片
                    </div>
                  </Col>
                  <Col span={20}>
                    <Descriptions column={2}>
                      <Descriptions.Item label="商品名称">{item.productName}</Descriptions.Item>
                      <Descriptions.Item label="数量">{item.quantity}</Descriptions.Item>
                      <Descriptions.Item label="单价">¥{item.unitPrice.toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="小计">¥{item.totalPrice.toFixed(2)}</Descriptions.Item>
                      {item.specifications && (
                        <Descriptions.Item label="规格" span={2}>
                          {Object.entries(item.specifications).map(([key, value]) => (
                            <Tag key={key}>{key}: {value}</Tag>
                          ))}
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Col>
                </Row>
                {index < order.items.length - 1 && <Divider />}
              </div>
            ))}
          </Card>
        </Col>

        <Col span={24}>
          <Space>
            <Button onClick={() => navigate(`/orders/${order.id}/tracking`)}>
              查看物流跟踪
            </Button>
            <Button onClick={() => navigate('/payment')}>
              支付管理
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

export default OrderDetail;