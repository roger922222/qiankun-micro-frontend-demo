/**
 * 客户管理页面
 */

import React, { useState } from 'react';
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, Row, Col, Statistic, message } from 'antd';
import { EyeOutlined, EditOutlined, PlusOutlined, UserOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useOrderContext } from '../context/OrderContext';

const { Title } = Typography;

// 客户接口
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalOrders: number;
  totalAmount: number;
  lastOrderDate?: string;
  registeredAt: string;
  status: 'active' | 'inactive';
  notes?: string;
}

const CustomerManagement: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useOrderContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view'>('create');
  const [form] = Form.useForm();

  // 从订单数据生成客户数据
  React.useEffect(() => {
    const customerMap = new Map<string, Customer>();
    
    state.orders.forEach(order => {
      const customerId = order.customerId;
      
      if (customerMap.has(customerId)) {
        const customer = customerMap.get(customerId)!;
        customer.totalOrders += 1;
        customer.totalAmount += order.totalAmount;
        if (!customer.lastOrderDate || order.createdAt > customer.lastOrderDate) {
          customer.lastOrderDate = order.createdAt;
        }
      } else {
        const customer: Customer = {
          id: customerId,
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          level: 'bronze',
          totalOrders: 1,
          totalAmount: order.totalAmount,
          lastOrderDate: order.createdAt,
          registeredAt: order.createdAt,
          status: 'active'
        };
        
        // 根据消费金额设置客户等级
        if (customer.totalAmount >= 50000) {
          customer.level = 'platinum';
        } else if (customer.totalAmount >= 20000) {
          customer.level = 'gold';
        } else if (customer.totalAmount >= 10000) {
          customer.level = 'silver';
        }
        
        customerMap.set(customerId, customer);
      }
    });
    
    // 更新客户等级
    customerMap.forEach(customer => {
      if (customer.totalAmount >= 50000) {
        customer.level = 'platinum';
      } else if (customer.totalAmount >= 20000) {
        customer.level = 'gold';
      } else if (customer.totalAmount >= 10000) {
        customer.level = 'silver';
      }
    });
    
    setCustomers(Array.from(customerMap.values()));
  }, [state.orders]);

  const getCustomerStats = () => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalAmount, 0);
    const avgOrderValue = totalRevenue / Math.max(customers.reduce((sum, c) => sum + c.totalOrders, 0), 1);
    
    return {
      total: totalCustomers,
      active: activeCustomers,
      revenue: totalRevenue,
      avgOrderValue: avgOrderValue
    };
  };

  const stats = getCustomerStats();

  const getLevelColor = (level: Customer['level']) => {
    const colors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2'
    };
    return colors[level];
  };

  const getLevelText = (level: Customer['level']) => {
    const texts = {
      bronze: '青铜会员',
      silver: '白银会员',
      gold: '黄金会员',
      platinum: '铂金会员'
    };
    return texts[level];
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalType('view');
    setIsModalVisible(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalType('edit');
    form.setFieldsValue(customer);
    setIsModalVisible(true);
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setModalType('create');
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalType === 'create') {
        const newCustomer: Customer = {
          id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...values,
          totalOrders: 0,
          totalAmount: 0,
          level: 'bronze',
          registeredAt: new Date().toISOString(),
          status: 'active'
        };
        setCustomers([...customers, newCustomer]);
        message.success('客户创建成功');
      } else if (modalType === 'edit' && selectedCustomer) {
        const updatedCustomers = customers.map(customer =>
          customer.id === selectedCustomer.id
            ? { ...customer, ...values }
            : customer
        );
        setCustomers(updatedCustomers);
        message.success('客户信息更新成功');
      }
      
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const viewCustomerOrders = (customerId: string) => {
    navigate(`/orders?customerId=${customerId}`);
  };

  const columns = [
    {
      title: '客户姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 200,
      render: (record: Customer) => (
        <div>
          <div><PhoneOutlined /> {record.phone}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            <MailOutlined /> {record.email}
          </div>
        </div>
      ),
    },
    {
      title: '客户等级',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: Customer['level']) => (
        <Tag color={getLevelColor(level)}>
          {getLevelText(level)}
        </Tag>
      ),
    },
    {
      title: '订单数量',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 100,
      sorter: (a: Customer, b: Customer) => a.totalOrders - b.totalOrders,
    },
    {
      title: '消费金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
      sorter: (a: Customer, b: Customer) => a.totalAmount - b.totalAmount,
    },
    {
      title: '最后下单',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      width: 120,
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: Customer['status']) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '活跃' : '非活跃'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (record: Customer) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewCustomer(record)}
          >
            查看
          </Button>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditCustomer(record)}
          >
            编辑
          </Button>
          <Button
            type="text"
            onClick={() => viewCustomerOrders(record.id)}
          >
            订单
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>客户管理</Title>

      {/* 客户统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总客户数"
              value={stats.total}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃客户"
              value={stats.active}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总收入"
              value={stats.revenue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均订单价值"
              value={stats.avgOrderValue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 客户列表 */}
      <Card
        title="客户列表"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateCustomer}
          >
            新增客户
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          pagination={{
            current: 1,
            pageSize: 10,
            total: customers.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 客户详情/编辑模态框 */}
      <Modal
        title={
          modalType === 'create' ? '新增客户' :
          modalType === 'edit' ? '编辑客户' : '客户详情'
        }
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
              <Button type="primary" onClick={handleSubmit}>
                {modalType === 'create' ? '创建' : '保存'}
              </Button>
            </Space>
          )
        }
        width={600}
      >
        {modalType === 'view' && selectedCustomer ? (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div><strong>客户姓名：</strong>{selectedCustomer.name}</div>
              </Col>
              <Col span={12}>
                <div><strong>联系电话：</strong>{selectedCustomer.phone}</div>
              </Col>
              <Col span={12}>
                <div><strong>邮箱地址：</strong>{selectedCustomer.email}</div>
              </Col>
              <Col span={12}>
                <div>
                  <strong>客户等级：</strong>
                  <Tag color={getLevelColor(selectedCustomer.level)}>
                    {getLevelText(selectedCustomer.level)}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <div><strong>订单数量：</strong>{selectedCustomer.totalOrders} 笔</div>
              </Col>
              <Col span={12}>
                <div><strong>消费金额：</strong>¥{selectedCustomer.totalAmount.toFixed(2)}</div>
              </Col>
              <Col span={12}>
                <div><strong>注册时间：</strong>{new Date(selectedCustomer.registeredAt).toLocaleString()}</div>
              </Col>
              <Col span={12}>
                <div><strong>最后下单：</strong>
                  {selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleString() : '无'}
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <strong>状态：</strong>
                  <Tag color={selectedCustomer.status === 'active' ? 'green' : 'red'}>
                    {selectedCustomer.status === 'active' ? '活跃' : '非活跃'}
                  </Tag>
                </div>
              </Col>
              {selectedCustomer.notes && (
                <Col span={24}>
                  <div><strong>备注：</strong>{selectedCustomer.notes}</div>
                </Col>
              )}
            </Row>
            <div style={{ marginTop: 16 }}>
              <Button
                type="primary"
                onClick={() => viewCustomerOrders(selectedCustomer.id)}
              >
                查看订单记录
              </Button>
            </div>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="客户姓名"
                  rules={[{ required: true, message: '请输入客户姓名' }]}
                >
                  <Input placeholder="请输入客户姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="联系电话"
                  rules={[
                    { required: true, message: '请输入联系电话' },
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                  ]}
                >
                  <Input placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="email"
                  label="邮箱地址"
                  rules={[
                    { required: true, message: '请输入邮箱地址' },
                    { type: 'email', message: '请输入有效的邮箱地址' }
                  ]}
                >
                  <Input placeholder="请输入邮箱地址" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="level"
                  label="客户等级"
                >
                  <Select placeholder="请选择客户等级">
                    <Select.Option value="bronze">青铜会员</Select.Option>
                    <Select.Option value="silver">白银会员</Select.Option>
                    <Select.Option value="gold">黄金会员</Select.Option>
                    <Select.Option value="platinum">铂金会员</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="状态"
                >
                  <Select placeholder="请选择状态">
                    <Select.Option value="active">活跃</Select.Option>
                    <Select.Option value="inactive">非活跃</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="notes"
                  label="备注"
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="请输入备注信息（可选）"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default CustomerManagement;