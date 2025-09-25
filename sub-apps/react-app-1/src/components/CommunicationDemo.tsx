/**
 * React子应用通信功能演示组件
 * 展示在子应用中如何使用通信功能
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Input,
  Select,
  Tag,
  Timeline,
  Alert,
  Form,
  message,
  Badge,
  Statistic
} from 'antd';
import {
  SendOutlined,
  GlobalOutlined,
  LinkOutlined,
  BellOutlined,
  SyncOutlined,
  ApiOutlined,
  MessageOutlined
} from '@ant-design/icons';

// 导入通信功能
import { globalEventBus } from '@shared/communication/event-bus';
import { globalStateManager } from '@shared/communication/global-state';
import { globalRouteManager } from '@shared/communication/navigation';
import { globalNotificationService } from '@shared/communication/realtime';
import { EVENT_TYPES } from '@shared/types/events';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * 通信演示组件
 */
const CommunicationDemo: React.FC = () => {
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [globalState, setGlobalState] = useState<any>({});
  const [form] = Form.useForm();

  useEffect(() => {
    // 监听事件
    const handleEvent = (event: any) => {
      setEventHistory(prev => [event, ...prev.slice(0, 9)]);
    };

    // 监听状态变化
    const handleStateChange = (newState: any) => {
      setGlobalState(newState);
    };

    globalEventBus.onAny(handleEvent);
    globalStateManager.subscribe(handleStateChange);

    // 初始化状态
    setGlobalState(globalStateManager.getState());

    // 发送应用就绪事件
    globalEventBus.emit({
      type: EVENT_TYPES.APP_READY,
      source: 'react-app-1-demo',
      data: { message: '用户管理应用通信演示组件已就绪' },
      timestamp: new Date().toISOString(),
      id: `demo-ready-${Date.now()}`
    });

    return () => {
      globalEventBus.offAny(handleEvent);
      globalStateManager.unsubscribe(handleStateChange);
    };
  }, []);

  // 发送事件
  const handleSendEvent = async (values: any) => {
    try {
      await globalEventBus.emit({
        type: values.eventType,
        source: 'react-app-1',
        data: JSON.parse(values.eventData || '{}'),
        timestamp: new Date().toISOString(),
        id: `react-app-1-${Date.now()}`
      });
      message.success('事件发送成功');
      form.resetFields();
    } catch (error) {
      message.error('事件发送失败: ' + (error as Error).message);
    }
  };

  // 更新状态
  const handleUpdateState = () => {
    const stateUpdate = {
      userManagement: {
        lastAction: '演示状态更新',
        timestamp: new Date().toISOString(),
        activeUsers: Math.floor(Math.random() * 100) + 1
      }
    };
    
    globalStateManager.setState(stateUpdate);
    message.success('状态更新成功');
  };

  // 跨应用导航
  const handleNavigation = (appName: string, path: string = '/') => {
    globalRouteManager.navigateToApp(appName, path, {
      from: 'react-app-1',
      timestamp: new Date().toISOString(),
      reason: '演示导航'
    });
  };

  // 发送通知
  const handleSendNotification = () => {
    globalNotificationService.show({
      title: '来自用户管理应用',
      message: '这是一个来自React用户管理应用的通知消息',
      type: 'success',
      duration: 5000
    });
  };

  return (
    <div style={{ padding: '16px' }}>
      <Alert
        message="React子应用通信演示"
        description="这是在React子应用中的通信功能演示，展示了如何在子应用中使用各种通信功能。"
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <Row gutter={[16, 16]}>
        {/* 事件发送 */}
        <Col span={12}>
          <Card title="发送事件" size="small" extra={<SendOutlined />}>
            <Form form={form} onFinish={handleSendEvent} layout="vertical" size="small">
              <Form.Item 
                name="eventType" 
                label="事件类型"
                rules={[{ required: true }]}
              >
                <Select placeholder="选择事件类型" size="small">
                  <Option value={EVENT_TYPES.USER_LOGIN}>用户登录</Option>
                  <Option value={EVENT_TYPES.USER_LOGOUT}>用户登出</Option>
                  <Option value={EVENT_TYPES.DATA_UPDATE}>数据更新</Option>
                  <Option value="USER_CREATED">用户创建</Option>
                  <Option value="USER_UPDATED">用户更新</Option>
                  <Option value="USER_DELETED">用户删除</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name="eventData" label="事件数据">
                <TextArea 
                  rows={3} 
                  placeholder='{"userId": 123, "action": "create"}'
                  size="small"
                />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" size="small" icon={<SendOutlined />}>
                  发送事件
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 状态管理 */}
        <Col span={12}>
          <Card title="状态管理" size="small" extra={<GlobalOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>当前用户数据:</Text>
                <div style={{ marginTop: 8 }}>
                  <pre style={{ 
                    background: '#f5f5f5', 
                    padding: '8px', 
                    borderRadius: '4px',
                    fontSize: '11px',
                    maxHeight: '120px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(globalState.user || {}, null, 2)}
                  </pre>
                </div>
              </div>
              
              <Button 
                type="primary" 
                size="small" 
                icon={<SyncOutlined />}
                onClick={handleUpdateState}
                style={{ width: '100%' }}
              >
                更新用户管理状态
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 跨应用导航 */}
        <Col span={12}>
          <Card title="跨应用导航" size="small" extra={<LinkOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                size="small" 
                onClick={() => handleNavigation('react-app-2')}
                style={{ width: '100%' }}
              >
                商品管理
              </Button>
              <Button 
                size="small" 
                onClick={() => handleNavigation('react-app-3')}
                style={{ width: '100%' }}
              >
                订单管理
              </Button>
              <Button 
                size="small" 
                onClick={() => handleNavigation('vue-app-1')}
                style={{ width: '100%' }}
              >
                消息中心
              </Button>
              <Button 
                size="small" 
                onClick={() => handleNavigation('main', '/communication-demo')}
                style={{ width: '100%' }}
              >
                返回演示页面
              </Button>
            </Space>
          </Card>
        </Col>

        {/* 实时通信 */}
        <Col span={12}>
          <Card title="实时通信" size="small" extra={<MessageOutlined />}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                size="small" 
                icon={<BellOutlined />}
                onClick={handleSendNotification}
                style={{ width: '100%' }}
              >
                发送通知
              </Button>
              
              <div>
                <Text strong>统计信息:</Text>
                <Row gutter={8} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Statistic 
                      title="接收事件" 
                      value={eventHistory.length}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="状态键数" 
                      value={Object.keys(globalState).length}
                      valueStyle={{ fontSize: '14px' }}
                    />
                  </Col>
                </Row>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 事件历史 */}
        <Col span={24}>
          <Card 
            title="最近事件" 
            size="small" 
            extra={<Badge count={eventHistory.length} />}
          >
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              <Timeline size="small">
                {eventHistory.slice(0, 5).map((event, index) => (
                  <Timeline.Item key={index}>
                    <div>
                      <Tag color="blue" style={{ fontSize: '11px' }}>{event.type}</Tag>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {event.source}
                      </Text>
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Text style={{ fontSize: '10px' }}>
                        {JSON.stringify(event.data)}
                      </Text>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CommunicationDemo;