/**
 * 价格策略管理页面
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
  DatePicker,
  Modal,
  Form,
  InputNumber,
  message,
  Tabs,
  Switch,
  Tooltip,
  Badge,
  Popconfirm,
  Timeline,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  HistoryOutlined,
  PercentageOutlined,
  DollarOutlined,
  TagsOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { usePricingStore, pricingSelectors, PricingStrategy, PromotionPrice, PricingRule } from '../store/pricingStore';
import { useProductStore, productSelectors } from '../store/productStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const PricingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('strategies');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const pricingStrategies = usePricingStore(pricingSelectors.pricingStrategies);
  const priceHistories = usePricingStore(pricingSelectors.priceHistories);
  const promotionPrices = usePricingStore(pricingSelectors.promotionPrices);
  const loading = usePricingStore(pricingSelectors.loading);
  const isModalVisible = usePricingStore(pricingSelectors.isModalVisible);
  const modalMode = usePricingStore(pricingSelectors.modalMode);
  const formData = usePricingStore(pricingSelectors.formData);
  
  const products = useProductStore(productSelectors.products);
  
  const {
    showModal,
    hideModal,
    setFormData,
    addPricingStrategy,
    updatePricingStrategy,
    deletePricingStrategy,
    addPromotionPrice,
    updatePromotionPrice,
    deletePromotionPrice,
    toggleStrategyStatus,
    getActivePromotions
  } = usePricingStore();

  const [form] = Form.useForm();
  const [rulesForm] = Form.useForm();

  useEffect(() => {
    // 初始化示例数据
    if (pricingStrategies.length === 0) {
      initializeSampleData();
    }
  }, []);

  const initializeSampleData = () => {
    // 添加示例价格策略
    const sampleStrategies = [
      {
        name: '批发折扣策略',
        description: '购买数量达到一定量时给予折扣',
        type: 'tiered' as const,
        isActive: true,
        priority: 1,
        rules: [
          {
            id: 'rule_1',
            type: 'discount' as const,
            value: 5,
            minQuantity: 10,
            maxQuantity: 49,
            condition: '购买10-49件'
          },
          {
            id: 'rule_2',
            type: 'discount' as const,
            value: 10,
            minQuantity: 50,
            condition: '购买50件以上'
          }
        ],
        conditions: {
          minQuantity: 10,
          startDate: dayjs().format('YYYY-MM-DD'),
          endDate: dayjs().add(1, 'year').format('YYYY-MM-DD')
        },
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: 'VIP客户专享',
        description: 'VIP客户享受特殊价格',
        type: 'percentage' as const,
        isActive: true,
        priority: 2,
        rules: [
          {
            id: 'rule_3',
            type: 'discount' as const,
            value: 15,
            condition: 'VIP客户专享'
          }
        ],
        conditions: {
          customerGroups: ['vip', 'premium']
        },
        createdBy: 'system',
        updatedBy: 'system'
      }
    ];

    sampleStrategies.forEach(strategy => {
      usePricingStore.getState().addPricingStrategy(strategy);
    });

    // 添加示例促销价格
    const samplePromotions = [
      {
        productId: 'prod_1',
        productName: 'iPhone 15 Pro',
        originalPrice: 7999,
        promotionPrice: 7199,
        discountType: 'fixed' as const,
        discountValue: 800,
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
        isActive: true,
        description: '新品上市特惠'
      },
      {
        productId: 'prod_2',
        productName: 'MacBook Pro 14"',
        originalPrice: 14999,
        promotionPrice: 13499,
        discountType: 'percentage' as const,
        discountValue: 10,
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().add(2, 'weeks').format('YYYY-MM-DD'),
        isActive: true,
        description: '限时9折优惠'
      }
    ];

    samplePromotions.forEach(promotion => {
      usePricingStore.getState().addPromotionPrice(promotion);
    });

    // 添加示例价格历史
    const sampleHistories = [
      {
        productId: 'prod_1',
        productName: 'iPhone 15 Pro',
        oldPrice: 8299,
        newPrice: 7999,
        changeType: 'manual' as const,
        reason: '市场竞争调价',
        operator: 'admin'
      },
      {
        productId: 'prod_2',
        productName: 'MacBook Pro 14"',
        oldPrice: 15999,
        newPrice: 14999,
        changeType: 'strategy' as const,
        reason: '应用新品促销策略',
        operator: 'system',
        strategyId: 'strategy_1',
        strategyName: '新品促销策略'
      }
    ];

    sampleHistories.forEach(history => {
      usePricingStore.getState().addPriceHistory(history);
    });
  };

  // 处理策略表单提交
  const handleStrategySubmit = async () => {
    try {
      const values = await form.validateFields();
      const rulesValues = await rulesForm.validateFields();
      
      const strategyData = {
        ...values,
        rules: rulesValues.rules || [],
        createdBy: 'current_user',
        updatedBy: 'current_user'
      };
      
      if (modalMode === 'create') {
        addPricingStrategy(strategyData);
        message.success('价格策略创建成功');
      } else if (modalMode === 'edit' && formData.id) {
        updatePricingStrategy(formData.id as string, strategyData);
        message.success('价格策略更新成功');
      }
      
      hideModal();
      form.resetFields();
      rulesForm.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理促销表单提交
  const handlePromotionSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (formData.id) {
        updatePromotionPrice(formData.id as string, values);
        message.success('促销价格更新成功');
      } else {
        addPromotionPrice(values);
        message.success('促销价格创建成功');
      }
      
      hideModal();
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 价格策略表格列定义
  const strategyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap = {
          fixed: { color: 'blue', text: '固定价格' },
          percentage: { color: 'green', text: '百分比' },
          tiered: { color: 'orange', text: '阶梯价格' },
          dynamic: { color: 'purple', text: '动态价格' }
        };
        const config = typeMap[type as keyof typeof typeMap];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      sorter: (a: PricingStrategy, b: PricingStrategy) => a.priority - b.priority,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: PricingStrategy) => (
        <Switch
          checked={isActive}
          onChange={() => toggleStrategyStatus(record.id)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '规则数量',
      key: 'rulesCount',
      width: 100,
      render: (_: any, record: PricingStrategy) => (
        <Badge count={record.rules.length} showZero />
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: PricingStrategy) => (
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
            title="确定要删除这个策略吗？"
            onConfirm={() => {
              deletePricingStrategy(record.id);
              message.success('策略删除成功');
            }}
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

  // 促销价格表格列定义
  const promotionColumns = [
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
      ellipsis: true,
    },
    {
      title: '原价',
      dataIndex: 'originalPrice',
      key: 'originalPrice',
      width: 100,
      render: (price: number) => `¥${price.toFixed(2)}`,
    },
    {
      title: '促销价',
      dataIndex: 'promotionPrice',
      key: 'promotionPrice',
      width: 100,
      render: (price: number) => (
        <Text type="danger" strong>¥{price.toFixed(2)}</Text>
      ),
    },
    {
      title: '折扣',
      key: 'discount',
      width: 100,
      render: (_: any, record: PromotionPrice) => {
        const discount = ((record.originalPrice - record.promotionPrice) / record.originalPrice * 100).toFixed(1);
        return <Text type="success">{discount}%</Text>;
      },
    },
    {
      title: '促销期间',
      key: 'period',
      width: 200,
      render: (_: any, record: PromotionPrice) => (
        <span>
          {dayjs(record.startDate).format('MM-DD')} ~ {dayjs(record.endDate).format('MM-DD')}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => {
        const now = new Date();
        const isInPeriod = true; // 简化处理
        return (
          <Badge
            status={isActive && isInPeriod ? 'success' : 'default'}
            text={isActive && isInPeriod ? '进行中' : '已结束'}
          />
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: PromotionPrice) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => showModal('promotion', record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            onClick={() => {
              deletePromotionPrice(record.id);
              message.success('促销删除成功');
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 价格历史表格列定义
  const historyColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
      ellipsis: true,
    },
    {
      title: '价格变化',
      key: 'priceChange',
      width: 150,
      render: (_: any, record: any) => (
        <span>
          ¥{record.oldPrice.toFixed(2)} → ¥{record.newPrice.toFixed(2)}
        </span>
      ),
    },
    {
      title: '变更类型',
      dataIndex: 'changeType',
      key: 'changeType',
      width: 100,
      render: (type: string) => {
        const typeMap = {
          manual: { color: 'blue', text: '手动调价' },
          strategy: { color: 'green', text: '策略调价' },
          promotion: { color: 'orange', text: '促销调价' },
          bulk: { color: 'purple', text: '批量调价' }
        };
        const config = typeMap[type as keyof typeof typeMap];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '变更原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 100,
    },
  ];

  // 设置表单初始值
  useEffect(() => {
    if (isModalVisible && modalMode !== 'create') {
      form.setFieldsValue(formData);
      if (modalMode === 'edit' && (formData as PricingStrategy).rules) {
        rulesForm.setFieldsValue({ rules: (formData as PricingStrategy).rules });
      }
    } else {
      form.resetFields();
      rulesForm.resetFields();
    }
  }, [isModalVisible, modalMode, formData, form, rulesForm]);

  return (
    <div>
      {/* 页面标题和操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>价格策略管理</Title>
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal('create')}
            >
              创建策略
            </Button>
            <Button
              icon={<TagsOutlined />}
              onClick={() => showModal('promotion')}
            >
              添加促销
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="价格策略" key="strategies">
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Search
                    placeholder="搜索策略名称"
                    allowClear
                    onSearch={setSearchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </Col>
                <Col span={6}>
                  <Select
                    placeholder="选择策略类型"
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="fixed">固定价格</Option>
                    <Option value="percentage">百分比</Option>
                    <Option value="tiered">阶梯价格</Option>
                    <Option value="dynamic">动态价格</Option>
                  </Select>
                </Col>
                <Col span={6}>
                  <Select
                    placeholder="选择状态"
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value={true}>启用</Option>
                    <Option value={false}>禁用</Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <Button icon={<ReloadOutlined />} />
                </Col>
              </Row>
            </div>
            
            <Table
              columns={strategyColumns}
              dataSource={pricingStrategies.filter(strategy =>
                !searchKeyword || strategy.name.toLowerCase().includes(searchKeyword.toLowerCase())
              )}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>

          <TabPane tab="促销价格" key="promotions">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal('promotion')}
              >
                添加促销
              </Button>
            </div>
            
            <Table
              columns={promotionColumns}
              dataSource={promotionPrices}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>

          <TabPane tab="价格历史" key="history">
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Search
                    placeholder="搜索商品名称"
                    allowClear
                  />
                </Col>
                <Col span={8}>
                  <RangePicker
                    placeholder={['开始日期', '结束日期']}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={6}>
                  <Select
                    placeholder="选择变更类型"
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="manual">手动调价</Option>
                    <Option value="strategy">策略调价</Option>
                    <Option value="promotion">促销调价</Option>
                    <Option value="bulk">批量调价</Option>
                  </Select>
                </Col>
                <Col span={2}>
                  <Button icon={<ReloadOutlined />} />
                </Col>
              </Row>
            </div>
            
            <Table
              columns={historyColumns}
              dataSource={priceHistories}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* 策略/促销编辑模态框 */}
      <Modal
        title={
          modalMode === 'create' ? '创建价格策略' :
          modalMode === 'edit' ? '编辑价格策略' :
          modalMode === 'view' ? '查看价格策略' : '促销价格设置'
        }
        open={isModalVisible}
        onOk={modalMode === 'promotion' ? handlePromotionSubmit : handleStrategySubmit}
        onCancel={hideModal}
        width={800}
        footer={modalMode === 'view' ? [
          <Button key="close" onClick={hideModal}>关闭</Button>
        ] : undefined}
      >
        {modalMode === 'promotion' ? (
          // 促销价格表单
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              label="商品"
              name="productId"
              rules={[{ required: true, message: '请选择商品' }]}
            >
              <Select
                placeholder="请选择商品"
                showSearch
                filterOption={(input, option) =>
                  option?.label?.toString().toLowerCase().includes(input.toLowerCase()) || false
                }
                options={products.map(product => ({
                  value: product.id,
                  label: `${product.name} (¥${product.price})`
                }))}
              />

            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="原价"
                  name="originalPrice"
                  rules={[{ required: true, message: '请输入原价' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="商品原价"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="促销价"
                  name="promotionPrice"
                  rules={[{ required: true, message: '请输入促销价' }]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder="促销价格"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="折扣类型"
                  name="discountType"
                  rules={[{ required: true, message: '请选择折扣类型' }]}
                >
                  <Select placeholder="请选择折扣类型">
                    <Option value="percentage">百分比折扣</Option>
                    <Option value="fixed">固定金额</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="折扣值"
                  name="discountValue"
                  rules={[{ required: true, message: '请输入折扣值' }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="折扣数值"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="开始时间"
                  name="startDate"
                  rules={[{ required: true, message: '请选择开始时间' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="结束时间"
                  name="endDate"
                  rules={[{ required: true, message: '请选择结束时间' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="促销描述"
              name="description"
            >
              <Input.TextArea
                rows={3}
                placeholder="请输入促销描述"
              />
            </Form.Item>
          </Form>
        ) : (
          // 价格策略表单
          <div>
            <Form
              form={form}
              layout="vertical"
              disabled={modalMode === 'view'}
            >
              <Form.Item
                label="策略名称"
                name="name"
                rules={[{ required: true, message: '请输入策略名称' }]}
              >
                <Input placeholder="请输入策略名称" />
              </Form.Item>

              <Form.Item
                label="策略描述"
                name="description"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="请输入策略描述"
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="策略类型"
                    name="type"
                    rules={[{ required: true, message: '请选择策略类型' }]}
                  >
                    <Select placeholder="请选择策略类型">
                      <Option value="fixed">固定价格</Option>
                      <Option value="percentage">百分比</Option>
                      <Option value="tiered">阶梯价格</Option>
                      <Option value="dynamic">动态价格</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="优先级"
                    name="priority"
                    rules={[{ required: true, message: '请输入优先级' }]}
                  >
                    <InputNumber
                      min={1}
                      max={100}
                      style={{ width: '100%' }}
                      placeholder="数值越大优先级越高"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="状态"
                name="isActive"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              </Form.Item>
            </Form>

            {modalMode !== 'view' && (
              <>
                <Divider>价格规则</Divider>
                <Form form={rulesForm} layout="vertical">
                  <Form.List name="rules">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Card key={key} size="small" style={{ marginBottom: 8 }}>
                            <Row gutter={16}>
                              <Col span={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'type']}
                                  label="规则类型"
                                  rules={[{ required: true, message: '请选择规则类型' }]}
                                >
                                  <Select placeholder="规则类型">
                                    <Option value="discount">折扣</Option>
                                    <Option value="markup">加价</Option>
                                    <Option value="fixed_price">固定价格</Option>
                                  </Select>
                                </Form.Item>
                              </Col>
                              <Col span={8}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'value']}
                                  label="数值"
                                  rules={[{ required: true, message: '请输入数值' }]}
                                >
                                  <InputNumber
                                    style={{ width: '100%' }}
                                    placeholder="数值"
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={6}>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'minQuantity']}
                                  label="最小数量"
                                >
                                  <InputNumber
                                    style={{ width: '100%' }}
                                    placeholder="最小数量"
                                  />
                                </Form.Item>
                              </Col>
                              <Col span={2}>
                                <Form.Item label=" ">
                                  <Button
                                    type="link"
                                    danger
                                    onClick={() => remove(name)}
                                  >
                                    删除
                                  </Button>
                                </Form.Item>
                              </Col>
                            </Row>
                          </Card>
                        ))}
                        <Form.Item>
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            block
                            icon={<PlusOutlined />}
                          >
                            添加规则
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Form>
              </>
            )}

            {modalMode === 'view' && formData && (
              <>
                <Divider>价格规则</Divider>
                {(formData as PricingStrategy).rules?.map((rule, index) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Text strong>规则类型：</Text>
                        <Tag>{rule.type === 'discount' ? '折扣' : rule.type === 'markup' ? '加价' : '固定价格'}</Tag>
                      </Col>
                      <Col span={8}>
                        <Text strong>数值：</Text>
                        <span>{rule.value}</span>
                      </Col>
                      <Col span={8}>
                        <Text strong>数量范围：</Text>
                        <span>{rule.minQuantity || 0} - {rule.maxQuantity || '∞'}</span>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PricingManagement;