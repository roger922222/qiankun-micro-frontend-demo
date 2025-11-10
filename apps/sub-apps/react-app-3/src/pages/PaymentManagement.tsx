/**
 * 支付管理页面
 */

import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Select, Input, DatePicker, Row, Col, Statistic, message } from 'antd';
import { EyeOutlined, DollarOutlined, CreditCardOutlined, BankOutlined, AlipayOutlined, WechatOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useOrderContext } from '../context/OrderContext';
import type { Order } from '../context/OrderContext';

const { Title } = Typography;
const { RangePicker } = DatePicker;

// 支付记录接口
interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: Order['paymentMethod'];
  status: 'pending' | 'success' | 'failed' | 'refunded';
  transactionId?: string;
  paidAt?: string;
  refundedAt?: string;
  notes?: string;
}

const PaymentManagement: React.FC = () => {
  const navigate = useNavigate();
  const { state, actions } = useOrderContext();
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'view' | 'refund'>('view');
  const [form] = Form.useForm();

  // 生成支付记录
  const generatePaymentRecords = (): PaymentRecord[] => {
    return state.orders.map(order => {
      const baseRecord: PaymentRecord = {
        id: `payment_${order.id}`,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        status: order.paymentStatus === 'paid' ? 'success' : 
                order.paymentStatus === 'refunded' ? 'refunded' : 'pending'
      };

      if (order.paymentStatus === 'paid') {
        baseRecord.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        baseRecord.paidAt = new Date(new Date(order.createdAt).getTime() + 10 * 60 * 1000).toISOString();
      }

      if (order.paymentStatus === 'refunded') {
        baseRecord.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        baseRecord.paidAt = new Date(new Date(order.createdAt).getTime() + 10 * 60 * 1000).toISOString();
        baseRecord.refundedAt = new Date(new Date(order.createdAt).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
      }

      return baseRecord;
    });
  };

  const paymentRecords = generatePaymentRecords();

  // 获取支付统计
  const getPaymentStats = () => {
    const totalAmount = paymentRecords.reduce((sum, record) => sum + record.amount, 0);
    const successAmount = paymentRecords
      .filter(record => record.status === 'success')
      .reduce((sum, record) => sum + record.amount, 0);
    const refundedAmount = paymentRecords
      .filter(record => record.status === 'refunded')
      .reduce((sum, record) => sum + record.amount, 0);
    const pendingAmount = paymentRecords
      .filter(record => record.status === 'pending')
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      total: totalAmount,
      success: successAmount,
      refunded: refundedAmount,
      pending: pendingAmount,
      successCount: paymentRecords.filter(r => r.status === 'success').length,
      refundedCount: paymentRecords.filter(r => r.status === 'refunded').length,
      pendingCount: paymentRecords.filter(r => r.status === 'pending').length
    };
  };

  const stats = getPaymentStats();

  const getPaymentMethodIcon = (method: Order['paymentMethod']) => {
    const icons = {
      credit_card: <CreditCardOutlined />,
      alipay: <AlipayOutlined />,
      wechat: <WechatOutlined />,
      bank_transfer: <BankOutlined />
    };
    return icons[method];
  };

  const getPaymentMethodName = (method: Order['paymentMethod']) => {
    const names = {
      credit_card: '信用卡',
      alipay: '支付宝',
      wechat: '微信支付',
      bank_transfer: '银行转账'
    };
    return names[method];
  };

  const getStatusColor = (status: PaymentRecord['status']) => {
    const colors = {
      pending: 'orange',
      success: 'green',
      failed: 'red',
      refunded: 'purple'
    };
    return colors[status];
  };

  const getStatusText = (status: PaymentRecord['status']) => {
    const texts = {
      pending: '待支付',
      success: '支付成功',
      failed: '支付失败',
      refunded: '已退款'
    };
    return texts[status];
  };

  const handleViewPayment = (record: PaymentRecord) => {
    setSelectedRecord(record);
    setModalType('view');
    setIsModalVisible(true);
  };

  const handleRefund = (record: PaymentRecord) => {
    if (record.status !== 'success') {
      message.warning('只有支付成功的订单才能退款');
      return;
    }
    setSelectedRecord(record);
    setModalType('refund');
    form.setFieldsValue({
      refundAmount: record.amount,
      refundReason: ''
    });
    setIsModalVisible(true);
  };

  const handleRefundSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 更新订单支付状态
      actions.updateOrder(selectedRecord!.orderId, {
        paymentStatus: 'refunded'
      });

      message.success('退款申请已提交');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Refund failed:', error);
    }
  };

  const columns = [
    {
      title: '订单号',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 150,
    },
    {
      title: '支付金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '支付方式',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: Order['paymentMethod']) => (
        <Space>
          {getPaymentMethodIcon(method)}
          {getPaymentMethodName(method)}
        </Space>
      ),
    },
    {
      title: '支付状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: PaymentRecord['status']) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '交易号',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 180,
      render: (transactionId: string) => transactionId || '-',
    },
    {
      title: '支付时间',
      dataIndex: 'paidAt',
      key: 'paidAt',
      width: 150,
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (record: PaymentRecord) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewPayment(record)}
          >
            查看
          </Button>
          {record.status === 'success' && (
            <Button
              type="text"
              onClick={() => handleRefund(record)}
            >
              退款
            </Button>
          )}
          <Button
            type="text"
            onClick={() => navigate(`/orders/${record.orderId}`)}
          >
            订单详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>支付管理</Title>

      {/* 支付统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总交易金额"
              value={stats.total}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成功交易"
              value={stats.success}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              {stats.successCount} 笔
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待支付"
              value={stats.pending}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#faad14' }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              {stats.pendingCount} 笔
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="退款金额"
              value={stats.refunded}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
              {stats.refundedCount} 笔
            </div>
          </Card>
        </Col>
      </Row>

      {/* 支付记录表格 */}
      <Card>
        <Table
          columns={columns}
          dataSource={paymentRecords}
          rowKey="id"
          pagination={{
            current: state.pagination.current,
            pageSize: state.pagination.pageSize,
            total: paymentRecords.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          loading={state.loading}
        />
      </Card>

      {/* 支付详情/退款模态框 */}
      <Modal
        title={modalType === 'view' ? '支付详情' : '申请退款'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={
          modalType === 'view' ? (
            <Button onClick={() => setIsModalVisible(false)}>关闭</Button>
          ) : (
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
              <Button type="primary" onClick={handleRefundSubmit}>
                提交退款
              </Button>
            </Space>
          )
        }
        width={600}
      >
        {modalType === 'view' && selectedRecord && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div><strong>订单号：</strong>{selectedRecord.orderNumber}</div>
              </Col>
              <Col span={12}>
                <div><strong>支付金额：</strong>¥{selectedRecord.amount.toFixed(2)}</div>
              </Col>
              <Col span={12}>
                <div>
                  <strong>支付方式：</strong>
                  <Space>
                    {getPaymentMethodIcon(selectedRecord.paymentMethod)}
                    {getPaymentMethodName(selectedRecord.paymentMethod)}
                  </Space>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <strong>支付状态：</strong>
                  <Tag color={getStatusColor(selectedRecord.status)}>
                    {getStatusText(selectedRecord.status)}
                  </Tag>
                </div>
              </Col>
              {selectedRecord.transactionId && (
                <Col span={24}>
                  <div><strong>交易号：</strong>{selectedRecord.transactionId}</div>
                </Col>
              )}
              {selectedRecord.paidAt && (
                <Col span={12}>
                  <div><strong>支付时间：</strong>{new Date(selectedRecord.paidAt).toLocaleString()}</div>
                </Col>
              )}
              {selectedRecord.refundedAt && (
                <Col span={12}>
                  <div><strong>退款时间：</strong>{new Date(selectedRecord.refundedAt).toLocaleString()}</div>
                </Col>
              )}
            </Row>
          </div>
        )}

        {modalType === 'refund' && selectedRecord && (
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              refundAmount: selectedRecord.amount,
              refundReason: ''
            }}
          >
            <Form.Item label="订单信息">
              <div>
                <div><strong>订单号：</strong>{selectedRecord.orderNumber}</div>
                <div><strong>支付金额：</strong>¥{selectedRecord.amount.toFixed(2)}</div>
              </div>
            </Form.Item>
            
            <Form.Item
              name="refundAmount"
              label="退款金额"
              rules={[
                { required: true, message: '请输入退款金额' },
                { type: 'number', min: 0.01, max: selectedRecord.amount, message: '退款金额不能超过支付金额' }
              ]}
            >
              <Input
                type="number"
                prefix="¥"
                placeholder="请输入退款金额"
                max={selectedRecord.amount}
              />
            </Form.Item>

            <Form.Item
              name="refundReason"
              label="退款原因"
              rules={[{ required: true, message: '请输入退款原因' }]}
            >
              <Select placeholder="请选择退款原因">
                <Select.Option value="customer_request">客户申请退款</Select.Option>
                <Select.Option value="quality_issue">商品质量问题</Select.Option>
                <Select.Option value="shipping_delay">发货延迟</Select.Option>
                <Select.Option value="out_of_stock">商品缺货</Select.Option>
                <Select.Option value="other">其他原因</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="refundNotes"
              label="备注说明"
            >
              <Input.TextArea
                rows={3}
                placeholder="请输入详细的退款说明（可选）"
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default PaymentManagement;