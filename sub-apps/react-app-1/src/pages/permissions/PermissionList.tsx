import React from 'react';
import { Table, Card, Row, Col, Tag, Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useGetPermissionsQuery } from '@/store/api/permissionApi';
import type { ColumnsType } from 'antd/es/table';
import type { Permission } from '@/types';

const PermissionList: React.FC = () => {
  const { data: permissionsData = [], isLoading, refetch } = useGetPermissionsQuery();
  
  // 确保permissions是数组类型，添加防御性编程
  const permissions = React.useMemo(() => {
    if (Array.isArray(permissionsData)) {
      return permissionsData;
    }
    // 如果API返回的是包装对象，尝试提取data字段
    if (permissionsData && typeof permissionsData === 'object' && 'data' in permissionsData) {
      const data = (permissionsData as any).data;
      return Array.isArray(data) ? data : [];
    }
    return [];
  }, [permissionsData]);

  const columns: ColumnsType<Permission> = [
    {
      title: '权限名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '权限编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '资源',
      dataIndex: 'resource',
      key: 'resource',
      width: 100,
      render: (resource: string) => <Tag color="blue">{resource}</Tag>,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => <Tag color="green">{action}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  return (
    <div className="permission-list-page">
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>
            </Space>
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={permissions}
          loading={isLoading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default PermissionList;