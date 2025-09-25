/**
 * 商品表单组件
 */

import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
  Button,
  Row,
  Col,
  message,
  Tag
} from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useProductStore, productSelectors, Product } from '../store/productStore';
import { useCategoryStore, categorySelectors } from '../store/categoryStore';

const { Option } = Select;
const { TextArea } = Input;

interface ProductFormProps {
  visible: boolean;
  mode: 'create' | 'edit' | 'view';
  product?: Product;
  onCancel: () => void;
  onSubmit: (values: any) => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  visible,
  mode,
  product,
  onCancel,
  onSubmit
}) => {
  const [form] = Form.useForm();
  const categories = useCategoryStore(categorySelectors.categories);

  // 设置表单初始值
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && product) {
        form.setFieldsValue({
          ...product,
          tags: product.tags || []
        });
      } else if (mode === 'create') {
        form.resetFields();
        form.setFieldsValue({
          status: 'active',
          stock: 0,
          price: 0,
          tags: []
        });
      }
    }
  }, [visible, mode, product, form]);

  // 处理表单提交
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理标签输入
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);

  useEffect(() => {
    if (product?.tags) {
      setTags(product.tags);
    } else {
      setTags([]);
    }
  }, [product]);

  const handleTagAdd = () => {
    if (tagInput && !tags.includes(tagInput)) {
      const newTags = [...tags, tagInput];
      setTags(newTags);
      form.setFieldsValue({ tags: newTags });
      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    form.setFieldsValue({ tags: newTags });
  };

  // 上传配置
  const uploadProps = {
    name: 'file',
    multiple: true,
    action: '/api/upload', // 实际项目中需要配置真实的上传接口
    onChange(info: any) {
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} 文件上传成功`);
      } else if (status === 'error') {
        message.error(`${info.file.name} 文件上传失败`);
      }
    },
    beforeUpload: () => {
      // 在实际项目中，这里可以添加文件类型和大小验证
      return false; // 阻止自动上传，用于演示
    }
  };

  return (
    <Modal
      title={
        mode === 'create' ? '添加商品' :
        mode === 'edit' ? '编辑商品' : '查看商品'
      }
      open={visible}
      onOk={mode !== 'view' ? handleSubmit : undefined}
      onCancel={onCancel}
      width={800}
      okText={mode === 'create' ? '创建' : '保存'}
      footer={mode === 'view' ? [
        <Button key="close" onClick={onCancel}>关闭</Button>
      ] : undefined}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={mode === 'view'}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="商品名称"
              name="name"
              rules={[
                { required: true, message: '请输入商品名称' },
                { min: 2, max: 100, message: '商品名称长度应在2-100个字符之间' }
              ]}
            >
              <Input placeholder="请输入商品名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="商品分类"
              name="category"
              rules={[{ required: true, message: '请选择商品分类' }]}
            >
              <Select placeholder="请选择商品分类">
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="商品描述"
          name="description"
          rules={[
            { required: true, message: '请输入商品描述' },
            { max: 500, message: '描述长度不能超过500个字符' }
          ]}
        >
          <TextArea
            rows={4}
            placeholder="请输入商品描述"
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="商品价格"
              name="price"
              rules={[
                { required: true, message: '请输入商品价格' },
                { type: 'number', min: 0, message: '价格不能为负数' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入商品价格"
                precision={2}
                min={0}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value!.replace(/¥\s?|(,*)/g, '') as any}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="库存数量"
              name="stock"
              rules={[
                { required: true, message: '请输入库存数量' },
                { type: 'number', min: 0, message: '库存不能为负数' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入库存数量"
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="商品状态"
              name="status"
              rules={[{ required: true, message: '请选择商品状态' }]}
            >
              <Select placeholder="请选择商品状态">
                <Option value="active">在售</Option>
                <Option value="inactive">停售</Option>
                <Option value="discontinued">停产</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="商品标签" name="tags">
          <div>
            <div style={{ marginBottom: 8 }}>
              {tags.map(tag => (
                <Tag
                  key={tag}
                  closable={mode !== 'view'}
                  onClose={() => handleTagRemove(tag)}
                  style={{ marginBottom: 4 }}
                >
                  {tag}
                </Tag>
              ))}
            </div>
            {mode !== 'view' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onPressEnter={handleTagAdd}
                  placeholder="输入标签后按回车添加"
                  style={{ flex: 1 }}
                />
                <Button type="dashed" onClick={handleTagAdd} icon={<PlusOutlined />}>
                  添加标签
                </Button>
              </div>
            )}
          </div>
        </Form.Item>

        <Form.Item label="商品图片" name="images">
          <Upload
            {...uploadProps}
            listType="picture-card"
            disabled={mode === 'view'}
          >
            {mode !== 'view' && (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传图片</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        {mode === 'view' && product && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="创建时间">
                  <Input value={new Date(product.createdAt).toLocaleString()} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="更新时间">
                  <Input value={new Date(product.updatedAt).toLocaleString()} disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="创建人">
                  <Input value={product.createdBy} disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="更新人">
                  <Input value={product.updatedBy} disabled />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ProductForm;