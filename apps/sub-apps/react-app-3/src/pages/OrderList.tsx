/**
 * 订单列表页面
 */

import React from 'react';
import { Card, Table, Tag, Button, Space, Typography, Input } from 'antd';
import { EyeOutlined, PlusOutlined, SearchOutlined, CarOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useOrderContext } from '../context/OrderContext';

const { Title } = Typography;

const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useOrderContext();

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

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 150,
    },
    {
      title: '客户信息',
      key: 'customer',
      width: 200,
      render: (record: any) => (
        <div>
          <div>{record.customerName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.customerPhone}</div>
        </div>
      ),
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'pending' && '待确认'}
          {status === 'confirmed' && '已确认'}
          {status === 'processing' && '处理中'}
          {status === 'shipped' && '已发货'}
          {status === 'delivered' && '已送达'}
          {status === 'cancelled' && '已取消'}
        </Tag>
      ),
    },
    {
      title: '支付状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 100,
      render: (status: string) => (
        <Tag color={getPaymentStatusColor(status)}>
          {status === 'unpaid' && '未支付'}
          {status === 'paid' && '已支付'}
          {status === 'refunded' && '已退款'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (record: any) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="text"
            icon={<CarOutlined />}
            onClick={() => navigate(`/orders/${record.id}/tracking`)}
          >
            跟踪
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>订单列表</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/create-order')}
        >
          创建订单
        </Button>
      </div>
      
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索订单号、客户姓名或手机号"
            style={{ width: 300 }}
            onSearch={(value) => {
              // TODO: 实现搜索功能
              console.log('搜索:', value);
            }}
          />
        </div>
        
        <Table
          columns={columns}
          dataSource={state.orders}
          rowKey="id"
          pagination={{
            current: state.pagination.current,
            pageSize: state.pagination.pageSize,
            total: state.pagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          loading={state.loading}
        />
      </Card>
    </div>
  );
};

export default OrderList;