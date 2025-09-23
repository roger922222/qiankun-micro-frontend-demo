/**
 * 仪表盘页面
 * 显示系统概览和统计信息
 */

import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress, List, Avatar, Tag, Space, Typography } from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Helmet } from 'react-helmet-async';
import { useMicroApps } from '../hooks/useMicroApps';
import { useGlobalState } from '../hooks/useGlobalState';
import './Dashboard.css';

const { Title, Text } = Typography;

/**
 * 仪表盘页面组件
 */
const Dashboard: React.FC = () => {
  const { microApps, getAvailableApps, getUnavailableApps } = useMicroApps();
  const { state } = useGlobalState();
  const [loading, setLoading] = useState(true);

  // 模拟数据
  const [stats, setStats] = useState({
    totalUsers: 1234,
    totalProducts: 567,
    totalOrders: 890,
    totalRevenue: 123456.78,
    userGrowth: 12.5,
    productGrowth: 8.3,
    orderGrowth: 15.2,
    revenueGrowth: 23.1
  });

  const [recentActivities] = useState([
    {
      id: 1,
      type: 'user',
      title: '新用户注册',
      description: '张三 完成了账户注册',
      time: '2分钟前',
      status: 'success'
    },
    {
      id: 2,
      type: 'order',
      title: '新订单',
      description: '订单 #12345 已创建',
      time: '5分钟前',
      status: 'processing'
    },
    {
      id: 3,
      type: 'product',
      title: '商品上架',
      description: 'iPhone 15 Pro 已上架',
      time: '10分钟前',
      status: 'success'
    },
    {
      id: 4,
      type: 'system',
      title: '系统更新',
      description: '微应用 vue-message-center 已更新',
      time: '1小时前',
      status: 'warning'
    }
  ]);

  useEffect(() => {
    // 模拟数据加载
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'processing':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <CheckCircleOutlined />;
    }
  };

  // 获取活动类型标签
  const getActivityTag = (type: string) => {
    const tagMap: Record<string, { color: string; text: string }> = {
      user: { color: 'blue', text: '用户' },
      order: { color: 'green', text: '订单' },
      product: { color: 'orange', text: '商品' },
      system: { color: 'purple', text: '系统' }
    };
    
    const tag = tagMap[type] || { color: 'default', text: '其他' };
    return <Tag color={tag.color}>{tag.text}</Tag>;
  };

  const availableApps = getAvailableApps();
  const unavailableApps = getUnavailableApps();

  return (
    <>
      <Helmet>
        <title>仪表盘 - Qiankun微前端示例</title>
      </Helmet>

      <div className="dashboard-page">
        <div className="dashboard-header">
          <Title level={2}>仪表盘</Title>
          <Text type="secondary">
            欢迎回来，{state.user.currentUser?.nickname || '用户'}！
          </Text>
        </div>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} className="stats-row">
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="总用户数"
                value={stats.totalUsers}
                prefix={<UserOutlined />}
                suffix={
                  <span className="growth-indicator positive">
                    <ArrowUpOutlined />
                    {stats.userGrowth}%
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="总商品数"
                value={stats.totalProducts}
                prefix={<ShoppingOutlined />}
                suffix={
                  <span className="growth-indicator positive">
                    <ArrowUpOutlined />
                    {stats.productGrowth}%
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="总订单数"
                value={stats.totalOrders}
                prefix={<ShoppingCartOutlined />}
                suffix={
                  <span className="growth-indicator positive">
                    <ArrowUpOutlined />
                    {stats.orderGrowth}%
                  </span>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={loading}>
              <Statistic
                title="总收入"
                value={stats.totalRevenue}
                precision={2}
                prefix={<DollarOutlined />}
                suffix={
                  <span className="growth-indicator positive">
                    <ArrowUpOutlined />
                    {stats.revenueGrowth}%
                  </span>
                }
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} className="content-row">
          {/* 微应用状态 */}
          <Col xs={24} lg={12}>
            <Card title="微应用状态" className="app-status-card">
              <div className="app-status-summary">
                <Space size="large">
                  <Statistic
                    title="运行中"
                    value={availableApps.length}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Statistic
                    title="离线"
                    value={unavailableApps.length}
                    valueStyle={{ color: '#f5222d' }}
                  />
                  <Statistic
                    title="总计"
                    value={microApps.length}
                  />
                </Space>
              </div>
              
              <div className="app-status-progress">
                <Text>系统健康度</Text>
                <Progress
                  percent={Math.round((availableApps.length / microApps.length) * 100)}
                  status={availableApps.length === microApps.length ? 'success' : 'active'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>

              <List
                size="small"
                dataSource={microApps}
                renderItem={app => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size="small"
                          style={{
                            backgroundColor: availableApps.some(a => a.name === app.name)
                              ? '#52c41a'
                              : '#f5222d'
                          }}
                        >
                          {app.name.charAt(0).toUpperCase()}
                        </Avatar>
                      }
                      title={app.name}
                      description={`端口: ${typeof app.entry === 'string' ? app.entry.split(':').pop() : '3001'}`}
                    />
                    <Tag
                      color={availableApps.some(a => a.name === app.name) ? 'success' : 'error'}
                    >
                      {availableApps.some(a => a.name === app.name) ? '运行中' : '离线'}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* 最近活动 */}
          <Col xs={24} lg={12}>
            <Card title="最近活动" className="recent-activities-card">
              <List
                dataSource={recentActivities}
                renderItem={activity => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={getStatusIcon(activity.status)}
                      title={
                        <Space>
                          {getActivityTag(activity.type)}
                          {activity.title}
                        </Space>
                      }
                      description={
                        <div>
                          <div>{activity.description}</div>
                          <Text type="secondary" className="activity-time">
                            {activity.time}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        {/* 快速操作 */}
        <Row gutter={[16, 16]} className="quick-actions-row">
          <Col span={24}>
            <Card title="快速操作" className="quick-actions-card">
              <Row gutter={[16, 16]}>
                <Col xs={12} sm={8} md={6}>
                  <Card size="small" hoverable className="quick-action-item">
                    <div className="action-icon">
                      <UserOutlined />
                    </div>
                    <div className="action-title">用户管理</div>
                  </Card>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Card size="small" hoverable className="quick-action-item">
                    <div className="action-icon">
                      <ShoppingOutlined />
                    </div>
                    <div className="action-title">商品管理</div>
                  </Card>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Card size="small" hoverable className="quick-action-item">
                    <div className="action-icon">
                      <ShoppingCartOutlined />
                    </div>
                    <div className="action-title">订单管理</div>
                  </Card>
                </Col>
                <Col xs={12} sm={8} md={6}>
                  <Card size="small" hoverable className="quick-action-item">
                    <div className="action-icon">
                      <DollarOutlined />
                    </div>
                    <div className="action-title">数据看板</div>
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default Dashboard;