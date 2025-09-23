import React from 'react';
import { Card, Form, Input, Select, Button, Space, message, Row, Col } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetUserByIdQuery, useCreateUserMutation, useUpdateUserMutation } from '@/store/api/userApi';
import { useGetRolesQuery } from '@/store/api/roleApi';
import { USER_STATUS, USER_STATUS_LABELS } from '@/constants';

const { Option } = Select;

const UserForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();

  const isEdit = !!id;
  
  const { data: user, isLoading } = useGetUserByIdQuery(id!, {
    skip: !isEdit,
  });
  
  const { data: roles = [] } = useGetRolesQuery();
  const [createUser, { isLoading: createLoading }] = useCreateUserMutation();
  const [updateUser, { isLoading: updateLoading }] = useUpdateUserMutation();

  React.useEffect(() => {
    if (isEdit && user) {
      form.setFieldsValue({
        ...user,
        roles: user.roles.map(role => role.id),
      });
    }
  }, [user, isEdit, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEdit) {
        await updateUser({ id: id!, data: values }).unwrap();
        message.success('用户更新成功');
      } else {
        await createUser(values).unwrap();
        message.success('用户创建成功');
      }
      navigate('/users');
    } catch (error) {
      message.error(isEdit ? '用户更新失败' : '用户创建失败');
    }
  };

  const handleCancel = () => {
    navigate('/users');
  };

  const loading = isLoading || createLoading || updateLoading;

  return (
    <div className="user-form-page">
      <Card title={isEdit ? '编辑用户' : '创建用户'}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'active',
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 20, message: '用户名最多20个字符' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' },
                ]}
              >
                <Input placeholder="请输入用户名" disabled={isEdit} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="昵称"
                name="nickname"
                rules={[{ max: 20, message: '昵称最多20个字符' }]}
              >
                <Input placeholder="请输入昵称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
          </Row>

          {!isEdit && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="密码"
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 6, message: '密码至少6个字符' },
                  ]}
                >
                  <Input.Password placeholder="请输入密码" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  {Object.entries(USER_STATUS_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>{label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="角色"
                name="roles"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="请选择角色"
                  allowClear
                >
                  {roles.map((role) => (
                    <Option key={role.id} value={role.id}>
                      {role.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="部门"
                name={['profile', 'department']}
              >
                <Input placeholder="请输入部门" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="职位"
                name={['profile', 'position']}
              >
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="个人简介"
                name={['profile', 'bio']}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="请输入个人简介"
                  maxLength={200}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={handleCancel}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default UserForm;