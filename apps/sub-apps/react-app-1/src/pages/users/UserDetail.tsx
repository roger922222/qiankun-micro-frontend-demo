import React from 'react';
import { Card, Descriptions, Tag, Space, Avatar, Button } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useGetUserByIdQuery } from '@/store/api/userApi';
import { formatDate, formatUserStatus } from '@/utils';

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: user, isLoading } = useGetUserByIdQuery(id!);

  if (isLoading) {
    return <Card loading />;
  }

  if (!user) {
    return <Card>用户不存在</Card>;
  }

  const { text: statusText, color: statusColor } = formatUserStatus(user.status);

  return (
    <div className="user-detail-page">
      <Card
        title="用户详情"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')}>
            返回列表
          </Button>
        }
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label="头像" span={2}>
            <Avatar size={64} src={user.avatar} icon={!user.avatar && user.username?.[0]} />
          </Descriptions.Item>
          
          <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
          <Descriptions.Item label="昵称">{user.nickname || '-'}</Descriptions.Item>
          
          <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
          <Descriptions.Item label="手机号">{user.phone || '-'}</Descriptions.Item>
          
          <Descriptions.Item label="状态">
            <Tag color={statusColor}>{statusText}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            <Space wrap>
              {user.roles?.map((role) => (
                <Tag key={role.id} color="blue">
                  {role.name}
                </Tag>
              ))}
            </Space>
          </Descriptions.Item>
          
          <Descriptions.Item label="部门">{user.profile?.department || '-'}</Descriptions.Item>
          <Descriptions.Item label="职位">{user.profile?.position || '-'}</Descriptions.Item>
          
          <Descriptions.Item label="个人简介" span={2}>
            {user.profile?.bio || '-'}
          </Descriptions.Item>
          
          <Descriptions.Item label="最后登录时间">
            {user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(user.createdAt)}
          </Descriptions.Item>
          
          <Descriptions.Item label="更新时间">
            {formatDate(user.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default UserDetail;