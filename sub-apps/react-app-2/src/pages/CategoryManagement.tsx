/**
 * 商品分类管理页面
 */

import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Tree,
  Card,
  Row,
  Col,
  Input,
  Switch,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  EyeOutlined,
  AppstoreOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { useCategoryStore, categorySelectors, Category } from '../store/categoryStore';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const CategoryManagement: React.FC = () => {
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const categories = useCategoryStore(categorySelectors.categories);
  const treeData = useCategoryStore(categorySelectors.treeData);
  const loading = useCategoryStore(categorySelectors.loading);
  const isModalVisible = useCategoryStore(categorySelectors.isModalVisible);
  const modalMode = useCategoryStore(categorySelectors.modalMode);
  const formData = useCategoryStore(categorySelectors.formData);
  
  const {
    showModal,
    hideModal,
    setFormData,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
    updateCategoryOrder,
    buildTreeData
  } = useCategoryStore();

  const [form] = Form.useForm();

  useEffect(() => {
    // 初始化示例数据
    if (categories.length === 0) {
      initializeSampleData();
    } else {
      buildTreeData();
    }
  }, []);

  const initializeSampleData = () => {
    const sampleCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'children'>[] = [
      {
        name: '电子产品',
        description: '各类电子设备和配件',
        level: 1,
        sortOrder: 1,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: '手机通讯',
        description: '手机及通讯设备',
        parentId: undefined, // 会在添加后设置
        level: 2,
        sortOrder: 1,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: '电脑办公',
        description: '电脑及办公设备',
        level: 2,
        sortOrder: 2,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: '服装鞋帽',
        description: '时尚服装和配饰',
        level: 1,
        sortOrder: 2,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        name: '家居用品',
        description: '家庭生活用品',
        level: 1,
        sortOrder: 3,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    ];

    // 添加根分类
    const rootCategories = sampleCategories.filter(c => c.level === 1);
    rootCategories.forEach(cat => addCategory(cat));

    // 等待一下再添加子分类
    setTimeout(() => {
      const electronicsCategory = useCategoryStore.getState().categories.find(c => c.name === '电子产品');
      if (electronicsCategory) {
        const subCategories = sampleCategories.filter(c => c.level === 2);
        subCategories.forEach(cat => {
          addCategory({
            ...cat,
            parentId: electronicsCategory.id
          });
        });
      }
    }, 100);
  };

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalMode === 'create') {
        addCategory({
          ...values,
          level: values.parentId ? 2 : 1, // 简化处理，实际应该递归计算
          createdBy: 'current_user',
          updatedBy: 'current_user'
        });
        message.success('分类创建成功');
      } else if (modalMode === 'edit' && formData.id) {
        updateCategory(formData.id, values);
        message.success('分类更新成功');
      }
      
      hideModal();
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理删除
  const handleDelete = (id: string) => {
    deleteCategory(id);
    message.success('分类删除成功');
  };

  // 处理状态切换
  const handleStatusToggle = (id: string) => {
    toggleCategoryStatus(id);
    message.success('状态更新成功');
  };

  // 表格列定义
  const columns = [
    {
      title: '分类名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Category) => (
        <Space>
          <span style={{ marginLeft: record.level * 20 }}>{text}</span>
          {record.level === 1 && <Tag color="blue">根分类</Tag>}
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => <Tag color={level === 1 ? 'green' : 'orange'}>{level}</Tag>,
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      sorter: (a: Category, b: Category) => a.sortOrder - b.sortOrder,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean, record: Category) => (
        <Switch
          checked={isActive}
          onChange={() => handleStatusToggle(record.id)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: Category) => (
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
            title="确定要删除这个分类吗？"
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

  // 构建树形数据用于Tree组件
  const buildTreeNodes = (categories: Category[]): any[] => {
    return categories.map(cat => ({
      title: (
        <Space>
          <span>{cat.name}</span>
          <Tag color={cat.isActive ? 'green' : 'red'}>
            {cat.isActive ? '启用' : '禁用'}
          </Tag>
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                showModal('edit', cat);
              }}
            />
            <Popconfirm
              title="确定要删除这个分类吗？"
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDelete(cat.id);
              }}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        </Space>
      ),
      key: cat.id,
      children: cat.children ? buildTreeNodes(cat.children) : undefined,
    }));
  };

  // 过滤分类数据
  const filteredCategories = categories.filter(cat =>
    !searchKeyword || cat.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  // 设置表单初始值
  useEffect(() => {
    if (isModalVisible && modalMode !== 'create') {
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
          <Title level={2}>商品分类管理</Title>
        </Col>
        <Col>
          <Space>
            <Search
              placeholder="搜索分类名称或描述"
              allowClear
              style={{ width: 250 }}
              onSearch={setSearchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <Button.Group>
              <Button
                type={viewMode === 'tree' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('tree')}
              >
                树形视图
              </Button>
              <Button
                type={viewMode === 'table' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode('table')}
              >
                表格视图
              </Button>
            </Button.Group>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal('create')}
            >
              添加分类
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 分类展示区域 */}
      <Card>
        {viewMode === 'tree' ? (
          <Tree
            treeData={buildTreeNodes(treeData)}
            defaultExpandAll
            showLine
            style={{ minHeight: 400 }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredCategories}
            rowKey="id"
            loading={loading}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        )}
      </Card>

      {/* 分类编辑模态框 */}
      <Modal
        title={
          modalMode === 'create' ? '添加分类' :
          modalMode === 'edit' ? '编辑分类' : '查看分类'
        }
        open={isModalVisible}
        onOk={modalMode !== 'view' ? handleSubmit : undefined}
        onCancel={hideModal}
        width={600}
        footer={modalMode === 'view' ? [
          <Button key="close" onClick={hideModal}>关闭</Button>
        ] : undefined}
      >
        <Form
          form={form}
          layout="vertical"
          disabled={modalMode === 'view'}
        >
          <Form.Item
            label="分类名称"
            name="name"
            rules={[
              { required: true, message: '请输入分类名称' },
              { min: 2, max: 50, message: '分类名称长度应在2-50个字符之间' }
            ]}
          >
            <Input placeholder="请输入分类名称" />
          </Form.Item>

          <Form.Item
            label="分类描述"
            name="description"
            rules={[
              { max: 200, message: '描述长度不能超过200个字符' }
            ]}
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入分类描述"
            />
          </Form.Item>

          <Form.Item
            label="上级分类"
            name="parentId"
          >
            <Select
              placeholder="请选择上级分类（可选）"
              allowClear
            >
              {categories
                .filter(cat => cat.level === 1 && cat.id !== formData.id)
                .map(cat => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="排序值"
                name="sortOrder"
                rules={[
                  { required: true, message: '请输入排序值' }
                ]}
                initialValue={1}
              >
                <InputNumber
                  min={1}
                  max={999}
                  style={{ width: '100%' }}
                  placeholder="数值越小排序越靠前"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
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
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryManagement;