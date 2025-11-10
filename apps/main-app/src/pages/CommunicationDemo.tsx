/**
 * 通信功能演示页面
 * 展示所有微前端通信功能的使用示例
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Divider,
  Input,
  Select,
  Switch,
  Tag,
  Timeline,
  Alert,
  Tabs,
  Form,
  message,
  Badge,
  Statistic,
  Progress
} from 'antd';
import {
  SendOutlined,
  GlobalOutlined,
  LinkOutlined,
  BellOutlined,
  MonitorOutlined,
  SyncOutlined,
  ApiOutlined,
  MessageOutlined,
  UserOutlined,
  SettingOutlined
} from '@ant-design/icons';

// 导入通信相关功能
import { globalEventBus } from '@shared/communication/event-bus';
import { globalStateManager } from '@shared/communication/global-state';
import { 
  globalRouteManager, 
  globalNavigationService,
  globalHistoryService 
} from '@shared/communication/navigation';
import { 
  globalNotificationService,
  globalWebSocketManager 
} from '@shared/communication/realtime';
import { 
  globalPerformanceMonitor,
  globalMetricsCollector 
} from '@shared/communication/monitoring';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * 通信演示页面组件
 */
const CommunicationDemo: React.FC = () => {
  // 状态管理
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [globalState, setGlobalState] = useState<any>({});
  const [navigationHistory, setNavigationHistory] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [realTimeStatus, setRealTimeStatus] = useState<any>({});

  // 表单状态
  const [eventForm] = Form.useForm();
  const [stateForm] = Form.useForm();
  const [navigationForm] = Form.useForm();

  // 组件状态
  const [activeTab, setActiveTab] = useState('events');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 初始化和数据更新
  useEffect(() => {
    // 监听事件总线
    const handleEvent = (event: any) => {
      setEventHistory(prev => [{
        ...event,
        timestamp: new Date().toISOString(),
        id: event.id || `event-${Date.now()}`
      }, ...prev.slice(0, 49)]); // 保留最近50个事件
    };

    // 监听状态变化
    const handleStateChange = (newState: any) => {
      setGlobalState(newState);
    };

    // 监听导航变化
    const handleNavigationChange = (navEvent: any) => {
      setNavigationHistory(prev => [navEvent, ...prev.slice(0, 19)]); // 保留最近20个导航记录
    };

    // 注册监听器
    globalEventBus.onAny(handleEvent);
    const unsubscribeState = globalStateManager.subscribe(handleStateChange);
    globalHistoryService.onHistoryChange(handleNavigationChange);

    // 初始化数据
    setGlobalState(globalStateManager.getState());
    setNavigationHistory(globalHistoryService.getHistory());

    // 性能监控定时更新
    const performanceInterval = setInterval(() => {
      if (autoRefresh) {
        const metrics = globalPerformanceMonitor.getMetrics();
        setPerformanceMetrics(metrics);
      }
    }, 2000);

    // 实时通信状态更新
    const realtimeInterval = setInterval(() => {
      if (autoRefresh) {
        setRealTimeStatus({
          websocketConnected: globalWebSocketManager.isConnected(),
          notificationCount: globalNotificationService.getUnreadCount(),
          lastHeartbeat: globalWebSocketManager.getLastHeartbeat()
        });
      }
    }, 1000);

    return () => {
      globalEventBus.offAny(handleEvent);
      unsubscribeState(); // 使用subscribe方法返回的取消订阅函数
      clearInterval(performanceInterval);
      clearInterval(realtimeInterval);
    };
  }, [autoRefresh]);

  // 事件总线演示
  const handleSendEvent = async (values: any) => {
    try {
      const event = {
        type: values.eventType,
        source: 'communication-demo',
        data: JSON.parse(values.eventData || '{}'),
        timestamp: new Date().toISOString(),
        id: `demo-${Date.now()}`
      };

      await globalEventBus.emit(event);
      message.success('事件发送成功');
      eventForm.resetFields();
    } catch (error) {
      message.error('事件发送失败: ' + (error as Error).message);
    }
  };

  // 状态管理演示
  const handleUpdateState = async (values: any) => {
    try {
      const stateUpdate = JSON.parse(values.stateData);
      await globalStateManager.setState(stateUpdate);
      message.success('状态更新成功');
      stateForm.resetFields();
    } catch (error) {
      message.error('状态更新失败: ' + (error as Error).message);
    }
  };

  // 跨应用导航演示
  const handleNavigation = async (values: any) => {
    try {
      const { targetApp, targetPath, navigationParams } = values;
      const params = navigationParams ? JSON.parse(navigationParams) : undefined;
      
      await globalRouteManager.navigateToApp(targetApp, targetPath, params);
      message.success('导航成功');
      navigationForm.resetFields();
    } catch (error) {
      message.error('导航失败: ' + (error as Error).message);
    }
  };

  // 实时通信演示
  const handleSendNotification = () => {
    globalNotificationService.show({
      title: '演示通知',
      message: '这是一个来自通信演示页面的通知',
      type: 'info',
      duration: 5000
    });
  };

  const handleWebSocketTest = () => {
    if (globalWebSocketManager.isConnected()) {
      globalWebSocketManager.send({
        type: 'test',
        data: { message: '测试消息', timestamp: new Date().toISOString() }
      });
      message.info('WebSocket测试消息已发送');
    } else {
      message.warning('WebSocket未连接');
    }
  };

  // 性能测试
  const handlePerformanceTest = () => {
    // 发送大量事件测试性能
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 100; i++) {
      promises.push(globalEventBus.emit({
        type: 'PERFORMANCE_TEST',
        source: 'demo',
        data: { index: i, timestamp: Date.now() },
        id: `perf-test-${i}`
      }));
    }

    Promise.all(promises).then(() => {
      const duration = Date.now() - startTime;
      message.success(`性能测试完成: 100个事件耗时 ${duration}ms`);
    });
  };

  // 事件总线Tab内容
  const renderEventBusDemo = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="发送事件" extra={<SendOutlined />}>
          <Form form={eventForm} onFinish={handleSendEvent} layout="vertical">
            <Form.Item 
              name="eventType" 
              label="事件类型" 
              rules={[{ required: true, message: '请选择事件类型' }]}
            >
              <Select placeholder="选择事件类型">
                <Option value={EVENT_TYPES.USER_LOGIN}>用户登录</Option>
                <Option value={EVENT_TYPES.USER_LOGOUT}>用户登出</Option>
                <Option value={EVENT_TYPES.THEME_CHANGE}>主题变更</Option>
                <Option value={EVENT_TYPES.LANGUAGE_CHANGE}>语言变更</Option>
                <Option value={EVENT_TYPES.DATA_UPDATE}>数据更新</Option>
                <Option value="CUSTOM_EVENT">自定义事件</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="eventData" label="事件数据 (JSON)">
              <TextArea 
                rows={4} 
                placeholder='{"key": "value"}'
                defaultValue={`{"message": "Hello from demo!", "timestamp": "${new Date().toISOString()}"}`}
              />
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                  发送事件
                </Button>
                <Button onClick={handlePerformanceTest} icon={<MonitorOutlined />}>
                  性能测试
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      
      <Col span={12}>
        <Card 
          title="事件历史" 
          extra={
            <Space>
              <Badge count={eventHistory.length} />
              <Switch 
                checked={autoRefresh} 
                onChange={setAutoRefresh}
                checkedChildren="自动"
                unCheckedChildren="手动"
              />
            </Space>
          }
        >
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <Timeline>
              {eventHistory.slice(0, 10).map((event, index) => (
                <Timeline.Item 
                  key={event.id || index}
                  color={event.type.includes('ERROR') ? 'red' : 'blue'}
                >
                  <div>
                    <Tag color="blue">{event.type}</Tag>
                    <Text type="secondary">{event.source}</Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text code style={{ fontSize: '12px' }}>
                      {JSON.stringify(event.data, null, 2)}
                    </Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        </Card>
      </Col>
    </Row>
  );

  // 状态管理Tab内容
  const renderStateDemo = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="更新全局状态" extra={<GlobalOutlined />}>
          <Form form={stateForm} onFinish={handleUpdateState} layout="vertical">
            <Form.Item 
              name="stateData" 
              label="状态数据 (JSON)"
              rules={[{ required: true, message: '请输入状态数据' }]}
            >
              <TextArea 
                rows={6} 
                placeholder='{"user": {"name": "张三"}, "theme": "dark"}'
                defaultValue={JSON.stringify({
                  demo: {
                    lastUpdate: new Date().toISOString(),
                    counter: Math.floor(Math.random() * 100)
                  }
                }, null, 2)}
              />
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SyncOutlined />}>
                  更新状态
                </Button>
                <Button 
                  onClick={() => {
                    setGlobalState(globalStateManager.getState());
                    message.info('状态已刷新');
                  }}
                  icon={<SyncOutlined />}
                >
                  刷新状态
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      
      <Col span={12}>
        <Card title="当前全局状态" extra={<Badge count={Object.keys(globalState).length} />}>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              fontSize: '12px',
              lineHeight: '1.4'
            }}>
              {JSON.stringify(globalState, null, 2)}
            </pre>
          </div>
        </Card>
      </Col>
    </Row>
  );

  // 导航通信Tab内容
  const renderNavigationDemo = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="跨应用导航" extra={<LinkOutlined />}>
          <Form form={navigationForm} onFinish={handleNavigation} layout="vertical">
            <Form.Item 
              name="targetApp" 
              label="目标应用"
              rules={[{ required: true, message: '请选择目标应用' }]}
            >
              <Select placeholder="选择目标应用">
                <Option value="react-app-1">用户管理 (React)</Option>
                <Option value="react-app-2">商品管理 (React)</Option>
                <Option value="react-app-3">订单管理 (React)</Option>
                <Option value="react-app-4">数据看板 (React)</Option>
                <Option value="react-app-5">设置中心 (React)</Option>
                <Option value="vue-app-1">消息中心 (Vue)</Option>
                <Option value="vue-app-2">文件管理 (Vue)</Option>
                <Option value="vue-app-3">系统监控 (Vue)</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="targetPath" label="目标路径">
              <Input placeholder="/dashboard" defaultValue="/" />
            </Form.Item>
            
            <Form.Item name="navigationParams" label="导航参数 (JSON)">
              <TextArea 
                rows={3} 
                placeholder='{"userId": 123, "tab": "profile"}'
              />
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<LinkOutlined />}>
                  导航到应用
                </Button>
                <Button 
                  onClick={() => globalHistoryService.goBack()}
                  icon={<LinkOutlined />}
                >
                  返回上页
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Col>
      
      <Col span={12}>
        <Card title="导航历史" extra={<Badge count={navigationHistory.length} />}>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <Timeline>
              {navigationHistory.slice(0, 8).map((nav, index) => (
                <Timeline.Item key={index}>
                  <div>
                    <Tag color="green">{nav.action || 'navigate'}</Tag>
                    <Text strong>{nav.appName}</Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text code>{nav.path}</Text>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {new Date(nav.timestamp).toLocaleTimeString()}
                    </Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        </Card>
      </Col>
    </Row>
  );

  // 实时通信Tab内容
  const renderRealtimeDemo = () => (
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card title="实时通信控制" extra={<MessageOutlined />}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>WebSocket状态: </Text>
              <Tag color={realTimeStatus.websocketConnected ? 'green' : 'red'}>
                {realTimeStatus.websocketConnected ? '已连接' : '未连接'}
              </Tag>
            </div>
            
            <div>
              <Text strong>未读通知: </Text>
              <Badge count={realTimeStatus.notificationCount} />
            </div>
            
            <div>
              <Text strong>最后心跳: </Text>
              <Text type="secondary">
                {realTimeStatus.lastHeartbeat ? 
                  new Date(realTimeStatus.lastHeartbeat).toLocaleTimeString() : 
                  '无'
                }
              </Text>
            </div>
            
            <Divider />
            
            <Space wrap>
              <Button 
                type="primary" 
                icon={<BellOutlined />}
                onClick={handleSendNotification}
              >
                发送通知
              </Button>
              
              <Button 
                icon={<ApiOutlined />}
                onClick={handleWebSocketTest}
                disabled={!realTimeStatus.websocketConnected}
              >
                WebSocket测试
              </Button>
              
              <Button 
                icon={<SyncOutlined />}
                onClick={() => {
                  globalWebSocketManager.reconnect();
                  message.info('正在重连WebSocket...');
                }}
              >
                重连WebSocket
              </Button>
            </Space>
          </Space>
        </Card>
      </Col>
      
      <Col span={12}>
        <Card title="通信统计" extra={<MonitorOutlined />}>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic 
                title="事件总数" 
                value={eventHistory.length}
                prefix={<SendOutlined />}
              />
            </Col>
            <Col span={12}>
              <Statistic 
                title="导航次数" 
                value={navigationHistory.length}
                prefix={<LinkOutlined />}
              />
            </Col>
          </Row>
          
          <Divider />
          
          <div>
            <Text strong>通信性能</Text>
            <div style={{ marginTop: 8 }}>
              <Text>平均事件处理时间: </Text>
              <Progress 
                percent={Math.min((performanceMetrics.avgEventTime || 0) / 10 * 100, 100)}
                size="small"
                format={() => `${performanceMetrics.avgEventTime || 0}ms`}
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <Text>内存使用率: </Text>
              <Progress 
                percent={performanceMetrics.memoryUsage || 0}
                size="small"
                status={performanceMetrics.memoryUsage > 80 ? 'exception' : 'normal'}
              />
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <ApiOutlined style={{ marginRight: '8px' }} />
          微前端通信功能演示
        </Title>
        <Paragraph>
          这个页面展示了qiankun微前端架构中所有通信功能的使用方法，包括事件总线、状态管理、
          跨应用导航、实时通信等核心功能。您可以在这里测试和体验各种通信场景。
        </Paragraph>
      </div>

      <Alert
        message="功能说明"
        description="通过下面的标签页，您可以测试不同的通信功能。所有操作都是实时的，会影响到其他微应用的状态。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
        <TabPane 
          tab={
            <span>
              <SendOutlined />
              事件总线
            </span>
          } 
          key="events"
        >
          {renderEventBusDemo()}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <GlobalOutlined />
              状态管理
            </span>
          } 
          key="state"
        >
          {renderStateDemo()}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <LinkOutlined />
              导航通信
            </span>
          } 
          key="navigation"
        >
          {renderNavigationDemo()}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <MessageOutlined />
              实时通信
            </span>
          } 
          key="realtime"
        >
          {renderRealtimeDemo()}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default CommunicationDemo;