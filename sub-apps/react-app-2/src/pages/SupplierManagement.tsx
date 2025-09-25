/**
 * 供应商管理页面
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Card,
  Row,
  Col,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Rate,
  Tooltip,
  Badge,
  Popconfirm,
  Avatar,
  Statistic
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useSupplierStore, supplierSelectors, Supplier } from '../store/supplierStore';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const SupplierManagement: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const suppliers = useSupplierStore(supplierSelectors.suppliers);
  const loading = useSupplierStore(supplierSelectors.loading);
  const isModalVisible = useSupplierStore(supplierSelectors.isModalVisible);
  const modalMode = useSupplierStore(supplierSelectors.modalMode);
  const formData = useSupplierStore(supplierSelectors.formData);
  const supplierStats = useSupplierStore(supplierSelectors.supplierStats);
  
  const {
    showModal,
    hideModal,
    setFormData,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierStats
  } = useSupplierStore();

  const [form] = Form.useForm();

  useEffect(() => {
    // 初始化示例数据
    if (suppliers.length === 0) {
      initializeSampleData();
    }
  }, []);

  const initializeSampleData = () => {
    const sampleSuppliers = [
      {
        name: '苹果公司',
        code: 'APPLE001',
        contactPerson: '张经理',
        phone: '400-666-8800',
        email: 'zhang@apple.com',
        address: '美国加利福尼亚州库比蒂诺市',
        description: '全球知名科技公司，主要提供电子产品',
        status: 'active' as const,
        category: '电子产品',
        paymentTerms: '30天',
        creditLimit: 10000000,
        rating: 5,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: '华为技术有限公司',
        code: 'HUAWEI001',
        contactPerson: '李经理',
        phone: '400-822-9999',
        email: 'li@huawei.com',
        address: '广东省深圳市龙岗区坂田华为基地',
        description: '全球领先的ICT基础设施和智能终端提供商',
        status: 'active' as const,
        category: '电子产品',
        paymentTerms: '45天',
        creditLimit: 8000000,
        rating: 4.5,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: '小米科技有限责任公司',
        code: 'XIAOMI001',
        contactPerson: '王经理',
        phone: '400-100-5678',
        email: 'wang@xiaomi.com',
        address: '北京市海淀区清河中街68号华润五彩城',
        description: '以手机、智能硬件和IoT平台为核心的互联网公司',
        status: 'active' as const,
        category: '电子产品',
        paymentTerms: '30天',
        creditLimit: 5000000,
        rating: 4,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: '优衣库（中国）商贸有限公司',
        code: 'UNIQLO001',
        contactPerson: '田中先生',
        phone: '400-188-3555',
        email: 'tanaka@uniqlo.com',
        address: '上海市长宁区金钟路968号15楼',
        description: '日本休闲服饰品牌，以高品质基本款服装著称',
        status: 'active' as const,
        category: '服装',
        paymentTerms: '60天',
        creditLimit: 3000000,
        rating: 4.2,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: '宜家家居用品有限公司',
        code: 'IKEA001',
        contactPerson: 'Anna经理',
        phone: '400-800-2345',
        email: 'anna@ikea.com',
        address: '上海市徐汇区临江大道388号',
        description: '瑞典家具零售企业，以自行组装家具闻名',
        status: 'inactive' as const,
        category: '家居用品',
        paymentTerms: '45天',
        creditLimit: 2000000,
        rating: 3.8,
        createdBy: 'system',
        updatedBy: 'system'
      }
    ];

    sampleSuppliers.forEach(supplier => {
      useSupplierStore.getState().addSupplier(supplier);
    });
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalMode === 'create') {
        addSupplier({
          ...values,
          createdBy: 'current_user',
          updatedBy: 'current_user'
        });
        message.success('供应商创建成功');
      } else if (modalMode === 'edit' && formData.id) {
        updateSupplier(formData.id, values);
        message.success('供应商更新成功');
      }
      
      hideModal();
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理删除
  const handleDelete = (id: string) => {
    deleteSupplier(id);
    message.success('供应商删除成功');
  };

  // 表格列定义
  const columns = [
    {
      title: '供应商信息',
      key: 'info',
      width: 250,
      render: (_: any, record: Supplier) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar size={40} icon={<UserOutlined />} style={{ marginRight: 12 }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <div style={{ color: '#666', fontSize: '12px' }}>编码: {record.code}</div>
          </div>
        </div>
      ),
    },
    {
      title: '联系信息',
      key: 'contact',
      width: 200,
      render: (_: any, record: Supplier) => (
        <div>
          <div style={{ marginBottom: 4 }}>
            <UserOutlined style={{ marginRight: 4, color: '#666' }} />
            {record.contactPerson}
          </div>
          <div style={{ marginBottom: 4 }}>
            <PhoneOutlined style={{ marginRight: 4, color: '#666' }} />
            {record.phone}
          </div>
          <div>
            <MailOutlined style={{ marginRight: 4, color: '#666' }} />
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => <Tag color="blue">{category}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          active: { color: 'green', text: '正常' },
          inactive: { color: 'orange', text: '停用' },
          suspended: { color: 'red', text: '暂停' }
        };
        const config = statusMap[status as keyof typeof statusMap];
        return <Badge status={config.color as any} text={config.text} />;
      },
    },
    {
      title: '评级',
      dataIndex: 'rating',
      key: 'rating',
      width: 120,
      render: (rating: number) => (
        <Rate disabled defaultValue={rating} style={{ fontSize: 14 }} />
      ),
    },
    {
      title: '信用额度',
      dataIndex: 'creditLimit',
      key: 'creditLimit',
      width: 120,
      render: (amount: number) => `¥${(amount / 10000).toFixed(0)}万`,
    },
    {
      title: '账期',
      dataIndex: 'paymentTerms',
      key: 'paymentTerms',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Supplier) => (
        <Space size="small">
          <Tooltip title="查看">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => showModal('view', record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => showModal('edit', record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个供应商吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 过滤供应商数据
  const filteredSuppliers = suppliers.filter(supplier =>
    !searchKeyword || 
    supplier.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    supplier.contactPerson.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // 设置表单初始值
  useEffect(() => {
    if (isModalVisible && modalMode !== 'create') {
      form.setFieldsValue(formData);
    } else {
      form.resetFields();
    }
  }, [isModalVisible, modalMode, formData, form]);

  const stats = getSupplierStats();

  return (
    <div>
      {/* 页面标题和操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>供应商管理</Title>
        </Col>
        <Col>
          <Space>
            <Search
              placeholder="搜索供应商名称、编码或联系人"
              allowClear
              style={{ width: 300 }}
              onSearch={setSearchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal('create')}
            >
              添加供应商
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="供应商总数"
              value={stats.total}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正常供应商"
              value={stats.active}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="停用供应商"
              value={stats.inactive}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均评级"
              value={stats.avgRating}
              precision={1}
              suffix="星"
            />
          </Card>
        </Col>
      </Row>

      {/* 供应商列表 */}
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Select
                placeholder="选择状态"
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="active">正常</Option>
                <Option value="inactive">停用</Option>
                <Option value="suspended">暂停</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="选择分类"
                allowClear
                style={{ width: '100%' }}
              >
                <Option value="电子产品">电子产品</Option>
                <Option value="服装">服装</Option>
                <Option value="家居用品">家居用品</Option>
                <Option value="食品">食品</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Select
                placeholder="选择评级"
                allowClear
                style={{ width: '100%' }}
              >
                <Option value={5}>5星</Option>
                <Option value={4}>4星以上</Option>
                <Option value={3}>3星以上</Option>
                <Option value={2}>2星以上</Option>
              </Select>
            </Col>
            <Col span={6}>
              <Button icon={<ReloadOutlined />} />
            </Col>
          </Row>
        </div>
        
        <Table
          columns={columns}
          dataSource={filteredSuppliers}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 供应商编辑模态框 */}
      <Modal
        title={
          modalMode === 'create' ? '添加供应商' :
          modalMode === 'edit' ? '编辑供应商' : '查看供应商'
        }
        open={isModalVisible}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        onCancel={hideModal}
        width={800}
        footer={modalMode === 'view' ? [
          <Button key="close" onClick={hideModal}>关闭</Button>
        ] : undefined}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={modalMode === 'view'}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="供应商名称"
                name="name"
                rules={[
                  { required: true, message: '请输入供应商名称' },
                  { min: 2, max: 100, message: '名称长度应在2-100个字符之间' }
                ]}
              >
                <Input placeholder="请输入供应商名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="供应商编码"
                name="code"
                rules={[
                  { required: true, message: '请输入供应商编码' },
                  { pattern: /^[A-Z0-9]+$/, message: '编码只能包含大写字母和数字' }
                ]}
              >
                <Input placeholder="请输入供应商编码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="联系人"
                name="contactPerson"
                rules={[{ required: true, message: '请输入联系人' }]}
              >
                <Input placeholder="请输入联系人姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="联系电话"
                name="phone"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { pattern: /^[0-9-+()（）\s]+$/, message: '请输入有效的电话号码' }
                ]}
              >
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="邮箱地址"
                name="email"
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
                label="供应商分类"
                name="category"
                rules={[{ required: true, message: '请选择供应商分类' }]}
              >
                <Select placeholder="请选择供应商分类">
                  <Option value="电子产品">电子产品</Option>
                  <Option value="服装">服装</Option>
                  <Option value="家居用品">家居用品</Option>
                  <Option value="食品">食品</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="地址"
            name="address"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="请输入详细地址"
            />
          </Form.Item>

          <Form.Item
            label="供应商描述"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入供应商描述"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue="active"
              >
                <Select placeholder="请选择状态">
                  <Option value="active">正常</Option>
                  <Option value="inactive">停用</Option>
                  <Option value="suspended">暂停</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="账期"
                name="paymentTerms"
                rules={[{ required: true, message: '请输入账期' }]}
              >
                <Input placeholder="如：30天" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="信用额度"
                name="creditLimit"
                rules={[{ required: true, message: '请输入信用额度' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="信用额度（元）"
                  formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value!.replace(/¥\s?|(,*)/g, '') as any}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="供应商评级"
            name="rating"
            rules={[{ required: true, message: '请选择评级' }]}
            initialValue={3}
          >
            <Rate />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SupplierManagement;