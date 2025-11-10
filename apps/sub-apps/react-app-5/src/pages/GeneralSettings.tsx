/**
 * 通用设置页面
 * 包含主题、语言、时区等基础设置
 */

import React, { useState } from 'react';
import {
  Card,
  Form,
  Select,
  Switch,
  Button,
  message,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  TimePicker,
  Radio
} from 'antd';
import { SaveOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSnapshot } from 'valtio';
import dayjs from 'dayjs';

import { settingsStore, settingsActions } from '../store/settingsStore';

// 模拟共享库 - 在实际项目中这些会从@shared导入
const globalEventBus = {
  emit: (event: any) => console.log('Event emitted:', event)
};

const globalLogger = {
  info: (message: string, ...args: any[]) => console.log('[INFO]', message, ...args),
  error: (message: string, ...args: any[]) => console.error('[ERROR]', message, ...args)
};

const EVENT_TYPES = {
  THEME_CHANGE: 'THEME_CHANGE',
  LANGUAGE_CHANGE: 'LANGUAGE_CHANGE'
};

const { Title, Paragraph } = Typography;
const { Option } = Select;

const GeneralSettings: React.FC = () => {
  const settings = useSnapshot(settingsStore);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 初始化表单值
  React.useEffect(() => {
    form.setFieldsValue({
      theme: settings.preferences.theme,
      language: settings.preferences.language,
      timezone: settings.preferences.timezone,
      dateFormat: settings.preferences.dateFormat,
      timeFormat: settings.preferences.timeFormat,
      emailNotifications: settings.preferences.notifications.email,
      pushNotifications: settings.preferences.notifications.push,
      smsNotifications: settings.preferences.notifications.sms,
    });
  }, [settings.preferences, form]);

  // 保存设置
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // 更新偏好设置
      settingsActions.updatePreferences({
        theme: values.theme,
        language: values.language,
        timezone: values.timezone,
        dateFormat: values.dateFormat,
        timeFormat: values.timeFormat,
        notifications: {
          email: values.emailNotifications,
          push: values.pushNotifications,
          sms: values.smsNotifications,
        }
      });

      // 发送主题变更事件（如果主题发生变化）
      if (values.theme !== settings.preferences.theme) {
        globalEventBus.emit({
          type: EVENT_TYPES.THEME_CHANGE,
          source: 'react-settings',
          timestamp: new Date().toISOString(),
          id: `theme-change-${Date.now()}`,
          data: { theme: values.theme }
        });
      }

      // 发送语言变更事件（如果语言发生变化）
      if (values.language !== settings.preferences.language) {
        globalEventBus.emit({
          type: EVENT_TYPES.LANGUAGE_CHANGE,
          source: 'react-settings',
          timestamp: new Date().toISOString(),
          id: `language-change-${Date.now()}`,
          data: { language: values.language }
        });
      }

      // 保存到本地存储
      settingsActions.saveToStorage();
      
      message.success('设置保存成功');
      globalLogger.info('General settings saved', values);
      
    } catch (error) {
      message.error('设置保存失败');
      globalLogger.error('Failed to save general settings', error as Error);
    } finally {
      setLoading(false);
    }
  };

  // 重置设置
  const handleReset = () => {
    form.setFieldsValue({
      theme: 'light',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
    });
    message.info('设置已重置');
  };

  // 测试通知
  const handleTestNotification = () => {
    message.success({
      content: '这是一条测试通知',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      duration: 3,
    });
    globalLogger.info('Test notification sent');
  };

  return (
    <div className="settings-page fade-in">
      <div className="settings-page-header">
        <Title level={2}>通用设置</Title>
        <Paragraph>
          配置应用的基础设置，包括外观主题、语言偏好、时区设置和通知选项。
        </Paragraph>
      </div>

      <div className="settings-page-content">
        <Form
          form={form}
          layout="vertical"
          className="settings-form"
          onFinish={handleSave}
        >
          {/* 外观设置 */}
          <Card title="外观设置" className="settings-card">
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="主题模式"
                  name="theme"
                  tooltip="选择浅色或深色主题"
                >
                  <Radio.Group>
                    <Radio value="light">浅色主题</Radio>
                    <Radio value="dark">深色主题</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  label="语言设置"
                  name="language"
                  tooltip="选择界面显示语言"
                >
                  <Select>
                    <Option value="zh-CN">简体中文</Option>
                    <Option value="zh-TW">繁体中文</Option>
                    <Option value="en-US">English</Option>
                    <Option value="ja-JP">日本語</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 时间设置 */}
          <Card title="时间设置" className="settings-card">
            <Row gutter={24}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="时区"
                  name="timezone"
                  tooltip="选择您所在的时区"
                >
                  <Select>
                    <Option value="Asia/Shanghai">北京时间 (UTC+8)</Option>
                    <Option value="Asia/Tokyo">东京时间 (UTC+9)</Option>
                    <Option value="Europe/London">伦敦时间 (UTC+0)</Option>
                    <Option value="America/New_York">纽约时间 (UTC-5)</Option>
                    <Option value="America/Los_Angeles">洛杉矶时间 (UTC-8)</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={8}>
                <Form.Item
                  label="日期格式"
                  name="dateFormat"
                  tooltip="选择日期显示格式"
                >
                  <Select>
                    <Option value="YYYY-MM-DD">2024-01-01</Option>
                    <Option value="YYYY/MM/DD">2024/01/01</Option>
                    <Option value="DD/MM/YYYY">01/01/2024</Option>
                    <Option value="MM/DD/YYYY">01/01/2024</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={8}>
                <Form.Item
                  label="时间格式"
                  name="timeFormat"
                  tooltip="选择时间显示格式"
                >
                  <Radio.Group>
                    <Radio value="24h">24小时制</Radio>
                    <Radio value="12h">12小时制</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
            
            <Divider />
            
            <Space>
              <span>当前时间预览：</span>
              <strong>
                {dayjs().format(
                  `${form.getFieldValue('dateFormat') || 'YYYY-MM-DD'} ${
                    form.getFieldValue('timeFormat') === '12h' ? 'hh:mm:ss A' : 'HH:mm:ss'
                  }`
                )}
              </strong>
            </Space>
          </Card>

          {/* 通知设置 */}
          <Card 
            title="通知设置" 
            className="settings-card"
            extra={
              <Button size="small" onClick={handleTestNotification}>
                测试通知
              </Button>
            }
          >
            <div className="settings-switch-item">
              <div className="switch-info">
                <div className="switch-title">邮件通知</div>
                <div className="switch-desc">接收重要系统消息的邮件通知</div>
              </div>
              <Form.Item name="emailNotifications" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
            
            <div className="settings-switch-item">
              <div className="switch-info">
                <div className="switch-title">推送通知</div>
                <div className="switch-desc">在浏览器中显示桌面通知</div>
              </div>
              <Form.Item name="pushNotifications" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
            
            <div className="settings-switch-item">
              <div className="switch-info">
                <div className="switch-title">短信通知</div>
                <div className="switch-desc">接收紧急情况的短信提醒</div>
              </div>
              <Form.Item name="smsNotifications" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </div>
          </Card>

          {/* 操作按钮 */}
          <div className="form-actions">
            <Space>
              <Button onClick={handleReset} icon={<ReloadOutlined />}>
                重置
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
              >
                保存设置
              </Button>
            </Space>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default GeneralSettings;