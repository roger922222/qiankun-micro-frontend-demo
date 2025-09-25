/**
 * 库存管理页面
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
  Statistic,
  Alert,
  Tooltip,
  Progress,
  Badge
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  SettingOutlined,
  HistoryOutlined,
  BarChartOutlined,
  WarningOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useInventoryStore, inventorySelectors, InventoryRecord, InventoryAlert } from '../store/inventoryStore';
import { useProductStore, productSelectors } from '../store/productStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const InventoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('records');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const inventoryRecords = useInventoryStore(inventorySelectors.inventoryRecords);
  const inventoryAlerts = useInventoryStore(inventorySelectors.inventoryAlerts);
  const loading = useInventoryStore(inventorySelectors.loading);
  const isModalVisible = useInventoryStore(inventorySelectors.isModalVisible);
  const modalMode = useInventoryStore(inventorySelectors.modalMode);
  const formData = useInventoryStore(inventorySelectors.formData);
  
  const products = useProductStore(productSelectors.products);
  
  const {
    showModal,
    hideModal,
    setFormData,
    stockIn,
    stockOut,
    stockAdjust,
    addInventoryAlert,
    updateInventoryAlert,
    deleteInventoryAlert,
    getInventoryStats,
    checkLowStockAlerts
  } = useInventoryStore();

  const [form] = Form.useForm();

  useEffect(() => {
    // 初始化示例数据
    if (inventoryRecords.length === 0) {
      initializeSampleData();
    }
  }, []);

  const initializeSampleData = () => {
    // 添加一些示例库存记录
    const sampleRecords = [
      {
        productId: 'prod_1',
        productName: 'iPhone 15 Pro',
        type: 'in' as const,
        quantity: 100,
        beforeStock: 0,
        afterStock: 100,
        reason: '新品入库',
        operator: 'system',
        cost: 6000,
        supplierId: 'supplier_1',
        supplierName: '苹果官方'
      },
      {
        productId: 'prod_2',
        productName: 'MacBook Pro 14"',
        type: 'in' as const,
        quantity: 50,
        beforeStock: 0,
        afterStock: 50,
        reason: '新品入库',
        operator: 'system',
        cost: 12000,
        supplierId: 'supplier_1',
        supplierName: '苹果官方'
      },
      {
        productId: 'prod_1',
        productName: 'iPhone 15 Pro',
        type: 'out' as const,
        quantity: 20,
        beforeStock: 100,
        afterStock: 80,
        reason: '销售出库',
        operator: 'sales_team'
      }
    ];

    sampleRecords.forEach(record => {
      useInventoryStore.getState().addInventoryRecord(record);
    });

    // 添加一些示例预警设置
    const sampleAlerts = [
      {
        productId: 'prod_1',
        productName: 'iPhone 15 Pro',
        minStock: 20,
        maxStock: 200,
        isEnabled: true,
        alertType: 'low' as const,
        notifyUsers: ['admin', 'warehouse_manager']
      },
      {
        productId: 'prod_2',
        productName: 'MacBook Pro 14"',
        minStock: 10,
        maxStock: 100,
        isEnabled: true,
        alertType: 'both' as const,
        notifyUsers: ['admin', 'warehouse_manager']
      }
    ];

    sampleAlerts.forEach(alert => {
      useInventoryStore.getState().addInventoryAlert(alert);
    });
  };

  // 处理库存操作表单提交
  const handleInventorySubmit = async () => {
    try {
      const values = await form.validateFields();
      
      switch (modalMode) {
        case 'in':
          stockIn(values.productId, values.quantity, values.reason, values.cost, values.supplierId);
          message.success('入库成功');
          break;
        case 'out':
          stockOut(values.productId, values.quantity, values.reason);
          message.success('出库成功');
          break;
        case 'adjust':
          stockAdjust(values.productId, values.newStock, values.reason);
          message.success('库存调整成功');
          break;
        case 'transfer':
          // stockTransfer(values.fromProductId, values.toProductId, values.quantity, values.reason);
          message.success('库存调拨成功');
          break;
      }
      
      hideModal();
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理预警设置表单提交
  const handleAlertSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (formData.id) {
        updateInventoryAlert(formData.id as string, values);
        message.success('预警设置更新成功');
      } else {
        addInventoryAlert(values);
        message.success('预警设置创建成功');
      }
      
      hideModal();
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 库存记录表格列定义
  const recordColumns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a: InventoryRecord, b: InventoryRecord) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
      ellipsis: true,
    },
    {
      title: '操作类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => {
        const typeMap = {
          in: { color: 'green', text: '入库' },
          out: { color: 'red', text: '出库' },
          adjust: { color: 'blue', text: '调整' },
          transfer: { color: 'orange', text: '调拨' }
        };
        const config = typeMap[type as keyof typeof typeMap];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '数量变化',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (quantity: number, record: InventoryRecord) => {
        const isPositive = record.type === 'in' || (record.type === 'transfer' && quantity > 0);
        return (
          <Text type={isPositive ? 'success' : 'danger'}>
            {isPositive ? '+' : ''}{quantity}
          </Text>
        );
      },
    },
    {
      title: '库存变化',
      key: 'stockChange',
      width: 150,
      render: (_: any, record: InventoryRecord) => (
        <span>
          {record.beforeStock} → {record.afterStock}
        </span>
      ),
    },
    {
      title: '操作原因',
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
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      render: (cost: number) => cost ? `¥${cost.toFixed(2)}` : '-',
    },
  ];

  // 预警设置表格列定义
  const alertColumns = [
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: '最低库存',
      dataIndex: 'minStock',
      key: 'minStock',
      width: 100,
    },
    {
      title: '最高库存',
      dataIndex: 'maxStock',
      key: 'maxStock',
      width: 100,
    },
    {
      title: '预警类型',
      dataIndex: 'alertType',
      key: 'alertType',
      width: 100,
      render: (type: string) => {
        const typeMap = {
          low: { color: 'red', text: '低库存' },
          high: { color: 'orange', text: '高库存' },
          both: { color: 'blue', text: '双向' }
        };
        const config = typeMap[type as keyof typeof typeMap];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 80,
      render: (isEnabled: boolean) => (
        <Badge
          status={isEnabled ? 'success' : 'default'}
          text={isEnabled ? '启用' : '禁用'}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: InventoryAlert) => (
        <Space size="small">
          <Button
            type="link"
            onClick={() => showModal('alert', record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            danger
            onClick={() => {
              deleteInventoryAlert(record.id);
              message.success('预警设置删除成功');
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 获取统计数据
  const stats = getInventoryStats();
  const lowStockAlerts = checkLowStockAlerts();

  // 设置表单初始值
  useEffect(() => {
    if (isModalVisible && modalMode === 'alert' && formData.id) {
      form.setFieldsValue(formData);
    } else {
      form.resetFields();
    }
  }, [isModalVisible, modalMode, formData, form]);

  return (
    <div>
      {/* 页面标题和操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>库存管理</Title>
        </Col>
        <Col>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal('in')}
            >
              入库
            </Button>
            <Button
              icon={<MinusOutlined />}
              onClick={() => showModal('out')}
            >
              出库
            </Button>
            <Button
              icon={<SwapOutlined />}
              onClick={() => showModal('adjust')}
            >
              库存调整
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => showModal('alert')}
            >
              预警设置
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="商品总数"
              value={stats.totalProducts}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="库存总价值"
              value={stats.totalValue}
              prefix="¥"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="低库存商品"
              value={stats.lowStockCount}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="缺货商品"
              value={stats.outOfStockCount}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 预警提示 */}
      {lowStockAlerts.length > 0 && (
        <Alert
          message={`有 ${lowStockAlerts.length} 个商品库存预警`}
          description="请及时关注库存状况，避免缺货影响销售"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => setActiveTab('alerts')}>
              查看详情
            </Button>
          }
        />
      )}

      {/* 主要内容区域 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="库存记录" key="records">
            <div style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Search
                    placeholder="搜索商品名称"
                    allowClear
                    onSearch={setSearchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </Col>
                <Col span={6}>
                  <Select
                    placeholder="选择操作类型"
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="in">入库</Option>
                    <Option value="out">出库</Option>
                    <Option value="adjust">调整</Option>
                    <Option value="transfer">调拨</Option>
                  </Select>
                </Col>
                <Col span={8}>
                  <RangePicker
                    placeholder={['开始日期', '结束日期']}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={2}>
                  <Button icon={<ReloadOutlined />} />
                </Col>
              </Row>
            </div>
            
            <Table
              columns={recordColumns}
              dataSource={inventoryRecords.filter(record =>
                !searchKeyword || record.productName.toLowerCase().includes(searchKeyword.toLowerCase())
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

          <TabPane tab="预警设置" key="alerts">
            <div style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal('alert')}
              >
                添加预警设置
              </Button>
            </div>
            
            <Table
              columns={alertColumns}
              dataSource={inventoryAlerts}
              rowKey="id"
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </TabPane>

          <TabPane tab="库存统计" key="stats">
            <Row gutter={16}>
              <Col span={12}>
                <Card title="库存分布" style={{ marginBottom: 16 }}>
                  <div>库存统计图表区域（可以集成图表库）</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="库存趋势" style={{ marginBottom: 16 }}>
                  <div>库存趋势图表区域（可以集成图表库）</div>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* 库存操作模态框 */}
      <Modal
        title={
          modalMode === 'in' ? '商品入库' :
          modalMode === 'out' ? '商品出库' :
          modalMode === 'adjust' ? '库存调整' :
          modalMode === 'transfer' ? '库存调拨' : '预警设置'
        }
        open={isModalVisible}
        onOk={modalMode === 'alert' ? handleAlertSubmit : handleInventorySubmit}
        onCancel={hideModal}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          {modalMode === 'alert' ? (
            // 预警设置表单
            <>
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
                    label: `${product.name} (当前库存: ${product.stock})`
                  }))}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="最低库存"
                    name="minStock"
                    rules={[{ required: true, message: '请输入最低库存' }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      placeholder="最低库存数量"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="最高库存"
                    name="maxStock"
                    rules={[{ required: true, message: '请输入最高库存' }]}
                  >
                    <InputNumber
                      min={0}
                      style={{ width: '100%' }}
                      placeholder="最高库存数量"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="预警类型"
                name="alertType"
                rules={[{ required: true, message: '请选择预警类型' }]}
              >
                <Select placeholder="请选择预警类型">
                  <Option value="low">低库存预警</Option>
                  <Option value="high">高库存预警</Option>
                  <Option value="both">双向预警</Option>
                </Select>
              </Form.Item>
            </>
          ) : (
            // 库存操作表单
            <>
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
                    label: `${product.name} (当前库存: ${product.stock})`
                  }))}
                />

              </Form.Item>

              {modalMode === 'adjust' ? (
                <Form.Item
                  label="调整后库存"
                  name="newStock"
                  rules={[{ required: true, message: '请输入调整后库存' }]}
                >
                  <InputNumber
                    min={0}
                    style={{ width: '100%' }}
                    placeholder="调整后的库存数量"
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  label="数量"
                  name="quantity"
                  rules={[{ required: true, message: '请输入数量' }]}
                >
                  <InputNumber
                    min={1}
                    style={{ width: '100%' }}
                    placeholder="请输入数量"
                  />
                </Form.Item>
              )}

              {modalMode === 'in' && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="单价成本"
                      name="cost"
                    >
                      <InputNumber
                        min={0}
                        precision={2}
                        style={{ width: '100%' }}
                        placeholder="单价成本"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="供应商"
                      name="supplierId"
                    >
                      <Select placeholder="请选择供应商">
                        <Option value="supplier_1">苹果官方</Option>
                        <Option value="supplier_2">华为官方</Option>
                        <Option value="supplier_3">小米官方</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Form.Item
                label="操作原因"
                name="reason"
                rules={[{ required: true, message: '请输入操作原因' }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="请输入操作原因"
                />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryManagement;