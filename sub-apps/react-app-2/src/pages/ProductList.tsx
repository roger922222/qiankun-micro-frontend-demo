/**
 * 商品列表页面
 */

import React, { useState } from 'react';
import { Table, Button, Space, Tag, Typography, Input, Select, Row, Col, Card, Statistic, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useProductStore, productSelectors, Product } from '../store/productStore';
import { useCategoryStore, categorySelectors } from '../store/categoryStore';
import ProductForm from '../components/ProductForm';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const ProductList: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  const products = useProductStore(productSelectors.products);
  const loading = useProductStore(productSelectors.loading);
  const productStats = useProductStore(productSelectors.productStats);
  const categories = useCategoryStore(categorySelectors.categories);
  const { addProduct, updateProduct, deleteProduct } = useProductStore();

  // 处理模态框操作
  const handleShowModal = (mode: 'create' | 'edit' | 'view', product?: Product) => {
    setModalMode(mode);
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setSelectedProduct(undefined);
  };

  const handleModalSubmit = (values: any) => {
    if (modalMode === 'create') {
      addProduct(values);
      message.success('商品创建成功');
    } else if (modalMode === 'edit' && selectedProduct) {
      updateProduct(selectedProduct.id, values);
      message.success('商品更新成功');
    }
    handleModalCancel();
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    message.success('商品删除成功');
  };

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId);
        return <Tag color="blue">{category?.name || '未分类'}</Tag>;
      },
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price: number) => `¥${price.toFixed(2)}`,
      sorter: (a: Product, b: Product) => a.price - b.price,
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (stock: number) => (
        <span style={{ color: stock < 10 ? '#ff4d4f' : stock < 20 ? '#faad14' : '#52c41a' }}>
          {stock}
        </span>
      ),
      sorter: (a: Product, b: Product) => a.stock - b.stock,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          active: { color: 'green', text: '在售' },
          inactive: { color: 'orange', text: '停售' },
          discontinued: { color: 'red', text: '停产' }
        };
        const config = statusMap[status as keyof typeof statusMap];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <div>
          {tags?.slice(0, 2).map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {tags?.length > 2 && <span>...</span>}
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Product) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleShowModal('view', record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleShowModal('edit', record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个商品吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="link" 
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 过滤商品数据
  const filteredProducts = products.filter(product => {
    const matchesKeyword = !searchKeyword || 
      product.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      product.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchKeyword.toLowerCase()));
    
    const matchesStatus = !statusFilter || product.status === statusFilter;
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    
    return matchesKeyword && matchesStatus && matchesCategory;
  });

  return (
    <div>
      {/* 页面标题和操作栏 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>商品管理</Title>
        </Col>
        <Col>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => handleShowModal('create')}
          >
            添加商品
          </Button>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="商品总数"
              value={productStats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="在售商品"
              value={productStats.active}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="停售商品"
              value={productStats.inactive}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="低库存商品"
              value={productStats.lowStock}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选和搜索 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Search
              placeholder="搜索商品名称、描述或标签"
              allowClear
              onSearch={setSearchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>
          <Col span={5}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="active">在售</Option>
              <Option value="inactive">停售</Option>
              <Option value="discontinued">停产</Option>
            </Select>
          </Col>
          <Col span={5}>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: '100%' }}
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              {categories.map(cat => (
                <Option key={cat.id} value={cat.id}>{cat.name}</Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Space>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchKeyword('');
                  setStatusFilter('');
                  setCategoryFilter('');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>
      
      {/* 商品列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 商品表单模态框 */}
      <ProductForm
        visible={modalVisible}
        mode={modalMode}
        product={selectedProduct}
        onCancel={handleModalCancel}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default ProductList;