import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Input, 
  Select, 
  Tag, 
  Popconfirm, 
  message,
  Card,
  Row,
  Col,
  Avatar,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  SearchOutlined,
  ExportOutlined,
  ImportOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSearchKeyword, setFilters, clearFilters } from '@/store/slices/userSlice';
import { useGetUsersQuery, useDeleteUserMutation, useImportUsersMutation } from '@/store/api/userApi';
import { useGetRolesQuery } from '@/store/api/roleApi';
import { formatDate, formatUserStatus } from '@/utils';
import { USER_STATUS, USER_STATUS_LABELS } from '@/constants';
import type { ColumnsType } from 'antd/es/table';
import type { User } from '@/types';

const { Search } = Input;
const { Option } = Select;

const UserList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { searchKeyword, filters } = useAppSelector((state) => state.user);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const { data, isLoading, refetch } = useGetUsersQuery({
    page,
    pageSize,
    keyword: searchKeyword,
    status: filters.status,
    role: filters.role,
  });

  const { data: roles = [] } = useGetRolesQuery();
  const [deleteUser] = useDeleteUserMutation();
  const [importUsers] = useImportUsersMutation();

  const handleSearch = (value: string) => {
    dispatch(setSearchKeyword(value));
    setPage(1);
  };

  const handleFilterChange = (key: string, value: string) => {
    dispatch(setFilters({ ...filters, [key]: value }));
    setPage(1);
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
    dispatch(setSearchKeyword(''));
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id).unwrap();
      message.success('用户删除成功');
    } catch (error) {
      message.error('删除用户失败');
    }
  };

  const handleBatchDelete = async () => {
    try {
      // 批量删除逻辑
      message.success('批量删除成功');
      setSelectedRowKeys([]);
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleExport = () => {
    // 导出逻辑
    const params = new URLSearchParams({
      keyword: searchKeyword,
      ...(filters.status && { status: filters.status }),
      ...(filters.role && { role: filters.role }),
    });
    
    window.open(`/api/users/export?${params.toString()}`, '_blank');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const result = await importUsers(formData).unwrap();
        message.success(`导入成功：${result.data.success}条，失败：${result.data.failed}条`);
        if (result.data.errors.length > 0) {
          message.warning(`导入错误：${result.data.errors.join('; ')}`);
        }
        refetch();
      } catch (error) {
        message.error('导入失败');
      }
    };
    input.click();
  };

  const columns: ColumnsType<User> = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 200,
      render: (text, record) => (
        <Space>
          <Avatar src={record.avatar} icon={!record.avatar && text?.[0]} />
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ fontSize: 12, color: '#999' }}>{record.nickname}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const { text, color } = formatUserStatus(status);
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 150,
      render: (roles: any[]) => (
        <Space size="small" wrap>
          {roles?.map((role) => (
            <Tag key={role.id} color="blue">
              {role.name}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '部门',
      dataIndex: ['profile', 'department'],
      key: 'department',
      width: 120,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      render: (date: string) => date ? formatDate(date) : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => formatDate(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/users/edit/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="详情">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/users/${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="user-list-page">
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="搜索用户名、邮箱或昵称"
              allowClear
              enterButton={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => handleSearch(e.target.value)}
              onSearch={handleSearch}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => handleFilterChange('status', value)}
            >
              {Object.entries(USER_STATUS_LABELS).map(([key, label]) => (
                <Option key={key} value={key}>{label}</Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="选择角色"
              allowClear
              style={{ width: '100%' }}
              value={filters.role}
              onChange={(value) => handleFilterChange('role', value)}
            >
              {roles.map((role) => (
                <Option key={role.id} value={role.code}>{role.name}</Option>
              ))}
            </Select>
          </Col>
          <Col span={8}>
            <Space>
              <Button onClick={handleClearFilters}>重置</Button>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
              <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
              <Button icon={<ImportOutlined />} onClick={handleImport}>导入</Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/users/create')}
              >
                新建用户
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          rowKey="id"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={data?.data || []}
          loading={isLoading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.pagination.total || 0,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={(pagination) => {
            setPage(pagination.current || 1);
            setPageSize(pagination.pageSize || 20);
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default UserList;