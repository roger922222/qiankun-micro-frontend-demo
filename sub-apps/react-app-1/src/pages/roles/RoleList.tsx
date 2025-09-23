import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Input, 
  Card,
  Row,
  Col,
  Tag,
  Popconfirm,
  message,
  Modal,
  Form,
  Tree
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useGetRolesQuery, useCreateRoleMutation, useUpdateRoleMutation, useDeleteRoleMutation } from '@/store/api/roleApi';
import { useGetPermissionsQuery } from '@/store/api/permissionApi';
import type { ColumnsType } from 'antd/es/table';
import type { Role, Permission } from '@/types';

const { Search } = Input;

const RoleList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  const { data: roles = [], isLoading, refetch } = useGetRolesQuery();
  const { data: permissions = [] } = useGetPermissionsQuery();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    role.code.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const handleCreate = () => {
    setEditingRole(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({
      ...role,
      permissions: role.permissions.map(p => p.id),
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRole(id).unwrap();
      message.success('角色删除成功');
    } catch (error) {
      message.error('删除角色失败');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const roleData = {
        ...values,
        permissions: permissions.filter(p => values.permissions?.includes(p.id)),
      };

      if (editingRole) {
        await updateRole({ id: editingRole.id, data: roleData }).unwrap();
        message.success('角色更新成功');
      } else {
        await createRole(roleData).unwrap();
        message.success('角色创建成功');
      }
      
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error(editingRole ? '角色更新失败' : '角色创建失败');
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const permissionTreeData = permissions.map(permission => ({
    title: `${permission.name} (${permission.code})`,
    key: permission.id,
    value: permission.id,
  }));

  const columns: ColumnsType<Role> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '角色编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '权限',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 200,
      render: (permissions: Permission[]) => (
        <Space size="small" wrap>
          {permissions?.map((permission) => (
            <Tag key={permission.id} size="small">
              {permission.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: number) => <Tag color="blue">{level}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定要删除这个角色吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="role-list-page">
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="搜索角色名称或编码"
              allowClear
              enterButton={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onSearch={setSearchKeyword}
            />
          </Col>
          <Col span={16} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新建角色
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredRoles}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: filteredRoles.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current || 1);
            setPageSize(pagination.pageSize || 20);
          }}
        />
      </Card>

      <Modal
        title={editingRole ? '编辑角色' : '创建角色'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ level: 1 }}
        >
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            label="角色编码"
            name="code"
            rules={[{ required: true, message: '请输入角色编码' }]}
          >
            <Input placeholder="请输入角色编码" disabled={!!editingRole} />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea
              rows={2}
              placeholder="请输入角色描述"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="级别"
            name="level"
            rules={[{ required: true, message: '请输入角色级别' }]}
          >
            <Input type="number" placeholder="请输入角色级别" />
          </Form.Item>

          <Form.Item
            label="权限"
            name="permissions"
          >
            <Tree
              checkable
              treeData={permissionTreeData}
              placeholder="请选择权限"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleList;