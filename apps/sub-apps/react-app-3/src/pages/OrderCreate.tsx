/**
 * 订单创建页面
 */

import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Space, Typography, Row, Col, InputNumber, message, Table, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useOrderContext } from '../context/OrderContext';
import type { Order, OrderItem, Address } from '../context/OrderContext';

const { Title } = Typography;
const { TextArea } = Input;

const OrderCreate: React.FC = () => {
  const navigate = useNavigate();
  const { actions } = useOrderContext();
  const [form] = Form.useForm();
  const [items, setItems] = useState<Partial<OrderItem>[]>([]);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const [addressForm] = Form.useForm();
  const [addresses, setAddresses] = useState<Address[]>([]);

  // 模拟商品数据
  const products = [
    { id: 'prod_1', name: 'iPhone 15 Pro', price: 7999, image: '/images/iphone15pro.jpg' },
    { id: 'prod_2', name: 'MacBook Pro 14"', price: 14999, image: '/images/macbook-pro.jpg' },
    { id: 'prod_3', name: 'iPad Air', price: 4399, image: '/images/ipad-air.jpg' },
    { id: 'prod_4', name: 'AirPods Pro', price: 1899, image: '/images/airpods-pro.jpg' },
    { id: 'prod_5', name: 'Apple Watch', price: 2999, image: '/images/apple-watch.jpg' }
  ];

  // 添加商品到订单
  const addItem = () => {
    const newItem: Partial<OrderItem> = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: '',
      productName: '',
      productImage: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    };
    setItems([...items, newItem]);
  };

  // 删除商品
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // 更新商品信息
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        item.productId = product.id;
        item.productName = product.name;
        item.productImage = product.image;
        item.unitPrice = product.price;
        item.totalPrice = product.price * (item.quantity || 1);
      }
    } else if (field === 'quantity') {
      item.quantity = value;
      item.totalPrice = (item.unitPrice || 0) * value;
    } else {
      (item as any)[field] = value;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  // 计算总金额
  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  // 添加地址
  const handleAddAddress = async () => {
    try {
      const values = await addressForm.validateFields();
      const newAddress: Address = {
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...values,
        isDefault: addresses.length === 0
      };
      setAddresses([...addresses, newAddress]);
      addressForm.resetFields();
      setIsAddressModalVisible(false);
      message.success('地址添加成功');
    } catch (error) {
      console.error('Add address failed:', error);
    }
  };

  // 提交订单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (items.length === 0) {
        message.error('请至少添加一个商品');
        return;
      }

      const invalidItems = items.filter(item => !item.productId || !item.quantity);
      if (invalidItems.length > 0) {
        message.error('请完善商品信息');
        return;
      }

      const selectedAddress = addresses.find(addr => addr.id === values.shippingAddressId);
      if (!selectedAddress) {
        message.error('请选择收货地址');
        return;
      }

      const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'> = {
        orderNumber: `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        customerId: `cust_${Date.now()}`,
        customerName: values.customerName,
        customerEmail: values.customerEmail,
        customerPhone: values.customerPhone,
        items: items as OrderItem[],
        totalAmount: getTotalAmount(),
        status: 'pending',
        paymentStatus: 'unpaid',
        paymentMethod: values.paymentMethod,
        shippingAddress: selectedAddress,
        billingAddress: selectedAddress,
        notes: values.notes
      };

      actions.addOrder(orderData);
      message.success('订单创建成功');
      navigate('/orders');
    } catch (error) {
      console.error('Create order failed:', error);
      message.error('订单创建失败');
    }
  };

  const itemColumns = [
    {
      title: '商品',
      key: 'product',
      render: (_: any, record: Partial<OrderItem>, index: number) => (
        <Select
          style={{ width: '100%' }}
          placeholder="选择商品"
          value={record.productId}
          onChange={(value) => updateItem(index, 'productId', value)}
        >
          {products.map(product => (
            <Select.Option key={product.id} value={product.id}>
              {product.name} - ¥{product.price}
            </Select.Option>
          ))}
        </Select>
      )
    },
    {
      title: '数量',
      key: 'quantity',
      width: 120,
      render: (_: any, record: Partial<OrderItem>, index: number) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => updateItem(index, 'quantity', value || 1)}
        />
      )
    },
    {
      title: '单价',
      key: 'unitPrice',
      width: 100,
      render: (_: any, record: Partial<OrderItem>) => (
        <span>¥{(record.unitPrice || 0).toFixed(2)}</span>
      )
    },
    {
      title: '小计',
      key: 'totalPrice',
      width: 100,
      render: (_: any, record: Partial<OrderItem>) => (
        <span>¥{(record.totalPrice || 0).toFixed(2)}</span>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: any, record: Partial<OrderItem>, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(index)}
        />
      )
    }
  ];

  return (
    <div>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/orders')}
        style={{ marginBottom: 16 }}
      >
        返回订单列表
      </Button>

      <Title level={2}>创建订单</Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="客户信息">
              <Form.Item
                name="customerName"
                label="客户姓名"
                rules={[{ required: true, message: '请输入客户姓名' }]}
              >
                <Input placeholder="请输入客户姓名" />
              </Form.Item>

              <Form.Item
                name="customerPhone"
                label="联系电话"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                ]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>

              <Form.Item
                name="customerEmail"
                label="邮箱地址"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱地址" />
              </Form.Item>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="支付信息">
              <Form.Item
                name="paymentMethod"
                label="支付方式"
                rules={[{ required: true, message: '请选择支付方式' }]}
              >
                <Select placeholder="请选择支付方式">
                  <Select.Option value="alipay">支付宝</Select.Option>
                  <Select.Option value="wechat">微信支付</Select.Option>
                  <Select.Option value="credit_card">信用卡</Select.Option>
                  <Select.Option value="bank_transfer">银行转账</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="shippingAddressId"
                label="收货地址"
                rules={[{ required: true, message: '请选择收货地址' }]}
              >
                <Select
                  placeholder="请选择收货地址"
                  dropdownRender={menu => (
                    <div>
                      {menu}
                      <div style={{ padding: 8 }}>
                        <Button
                          type="text"
                          icon={<PlusOutlined />}
                          onClick={() => setIsAddressModalVisible(true)}
                          style={{ width: '100%' }}
                        >
                          添加新地址
                        </Button>
                      </div>
                    </div>
                  )}
                >
                  {addresses.map(address => (
                    <Select.Option key={address.id} value={address.id}>
                      {address.name} - {address.phone} - {address.province} {address.city} {address.district} {address.street}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="notes"
                label="订单备注"
              >
                <TextArea rows={3} placeholder="请输入订单备注（可选）" />
              </Form.Item>
            </Card>
          </Col>

          <Col span={24}>
            <Card
              title="商品信息"
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={addItem}
                >
                  添加商品
                </Button>
              }
            >
              <Table
                columns={itemColumns}
                dataSource={items}
                rowKey="id"
                pagination={false}
                locale={{ emptyText: '暂无商品，请点击"添加商品"按钮' }}
              />
              
              {items.length > 0 && (
                <div style={{ textAlign: 'right', marginTop: 16, fontSize: 16, fontWeight: 'bold' }}>
                  总金额: ¥{getTotalAmount().toFixed(2)}
                </div>
              )}
            </Card>
          </Col>

          <Col span={24}>
            <Space>
              <Button type="primary" htmlType="submit" size="large">
                创建订单
              </Button>
              <Button size="large" onClick={() => navigate('/orders')}>
                取消
              </Button>
            </Space>
          </Col>
        </Row>
      </Form>

      {/* 添加地址模态框 */}
      <Modal
        title="添加收货地址"
        open={isAddressModalVisible}
        onOk={handleAddAddress}
        onCancel={() => {
          setIsAddressModalVisible(false);
          addressForm.resetFields();
        }}
        width={600}
      >
        <Form
          form={addressForm}
          layout="vertical"
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="收货人姓名"
                rules={[{ required: true, message: '请输入收货人姓名' }]}
              >
                <Input placeholder="请输入收货人姓名" />
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
            <Col span={8}>
              <Form.Item
                name="province"
                label="省份"
                rules={[{ required: true, message: '请输入省份' }]}
              >
                <Input placeholder="请输入省份" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="city"
                label="城市"
                rules={[{ required: true, message: '请输入城市' }]}
              >
                <Input placeholder="请输入城市" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="district"
                label="区县"
                rules={[{ required: true, message: '请输入区县' }]}
              >
                <Input placeholder="请输入区县" />
              </Form.Item>
            </Col>
            <Col span={18}>
              <Form.Item
                name="street"
                label="详细地址"
                rules={[{ required: true, message: '请输入详细地址' }]}
              >
                <Input placeholder="请输入详细地址" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="zipCode"
                label="邮政编码"
                rules={[{ required: true, message: '请输入邮政编码' }]}
              >
                <Input placeholder="请输入邮政编码" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default OrderCreate;