/**
 * 通知设置页面
 * 管理各类通知偏好和推送设置
 */

import React, { useState } from 'react';
import {
  Card,
  Form,
  Switch,
  Button,
  message,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  TimePicker,
  Radio,
  Select,
  Alert,
  Badge,
  Tooltip
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  BellOutlined,
  MailOutlined,
  MobileOutlined,
  DesktopOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useSnapshot } from 'valtio';
import dayjs from 'dayjs';

import { settingsStore, settingsActions, NotificationSettings } from '../store/settingsStore';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const NotificationSettingsPage: React.FC = () => {
  const settings = useSnapshot(settingsStore);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 初始化表单值
  const initialValues = {
    ...settings.notifications,
    schedule: {
      ...settings.notifications.schedule,
      startTime: settings.notifications.schedule.startTime ? dayjs(settings.notifications.schedule.startTime, 'HH:mm') : dayjs('09:00', 'HH:mm'),
      endTime: settings.notifications.schedule.endTime ? dayjs(settings.notifications.schedule.endTime, 'HH:mm') : dayjs('18:00', 'HH:mm'),
    }
  };

  // 保存设置
  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const notificationSettings: Partial<NotificationSettings> = {
        ...values,
        schedule: {
          ...values.schedule,
          startTime: values.schedule?.startTime?.format('HH:mm') || '09:00',
          endTime: values.schedule?.endTime?.format('HH:mm') || '18:00',
        }
      };

      settingsActions.updateNotifications(notificationSettings);
      settingsActions.saveToStorage();
      message.success('通知设置已保存');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 重置设置
  const handleReset = () => {
    form.resetFields();
    message.info('已重置为默认设置');
  };

  // 测试通知
  const handleTestNotification = (type: string) => {
    message.info(`${type}通知测试已发送`);
  };

  return (
    <div className="notification-settings-page">
      <div className="page-header">
        <Title level={2}>
          <BellOutlined /> 通知设置
        </Title>
        <Paragraph type="secondary">
          管理您的通知偏好，控制何时以及如何接收通知
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSave}
        className="settings-form"
      >
        {/* 邮件通知设置 */}
        <Card 
          title={
            <Space>
              <MailOutlined />
              <span>邮件通知</span>
            </Space>
          }
          className="settings-card"
          extra={
            <Button 
              size="small" 
              onClick={() => handleTestNotification('邮件')}
            >
              测试邮件
            </Button>
          }
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="邮件通知设置"
                description="选择您希望通过邮件接收的通知类型"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name={['email', 'system']}
                label="系统通知"
                valuePropName="checked"
                extra="系统更新、维护通知等"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name={['email', 'security']}
                label="安全警报"
                valuePropName="checked"
                extra="登录异常、密码变更等"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name={['email', 'marketing']}
                label="营销邮件"
                valuePropName="checked"
                extra="产品推广、活动信息等"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 推送通知设置 */}
        <Card 
          title={
            <Space>
              <MobileOutlined />
              <span>推送通知</span>
            </Space>
          }
          className="settings-card"
          extra={
            <Button 
              size="small" 
              onClick={() => handleTestNotification('推送')}
            >
              测试推送
            </Button>
          }
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="推送通知设置"
                description="控制不同设备和平台的推送通知"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name={['push', 'desktop']}
                label={
                  <Space>
                    <DesktopOutlined />
                    <span>桌面推送</span>
                  </Space>
                }
                valuePropName="checked"
                extra="浏览器桌面通知"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name={['push', 'mobile']}
                label={
                  <Space>
                    <MobileOutlined />
                    <span>移动推送</span>
                  </Space>
                }
                valuePropName="checked"
                extra="手机APP推送通知"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name={['push', 'browser']}
                label="浏览器通知"
                valuePropName="checked"
                extra="网页内通知提醒"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 通知时间设置 */}
        <Card 
          title={
            <Space>
              <ClockCircleOutlined />
              <span>通知时间</span>
            </Space>
          }
          className="settings-card"
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Form.Item
                name={['schedule', 'enabled']}
                label="启用勿扰时间"
                valuePropName="checked"
                extra="在指定时间段内不接收非紧急通知"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['schedule', 'startTime']}
                label="勿扰开始时间"
                dependencies={[['schedule', 'enabled']]}
              >
                <TimePicker 
                  format="HH:mm" 
                  placeholder="选择开始时间"
                  disabled={!form.getFieldValue(['schedule', 'enabled'])}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['schedule', 'endTime']}
                label="勿扰结束时间"
                dependencies={[['schedule', 'enabled']]}
              >
                <TimePicker 
                  format="HH:mm" 
                  placeholder="选择结束时间"
                  disabled={!form.getFieldValue(['schedule', 'enabled'])}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 通知频率设置 */}
        <Card 
          title={
            <Space>
              <SettingOutlined />
              <span>通知频率</span>
            </Space>
          }
          className="settings-card"
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="frequency"
                label="通知频率"
                extra="控制通知的发送频率"
              >
                <Radio.Group>
                  <Radio value="immediate">立即通知</Radio>
                  <Radio value="hourly">每小时汇总</Radio>
                  <Radio value="daily">每日汇总</Radio>
                  <Radio value="weekly">每周汇总</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 通知类型设置 */}
        <Card 
          title={
            <Space>
              <InfoCircleOutlined />
              <span>通知类型</span>
            </Space>
          }
          className="settings-card"
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="通知类型管理"
                description="选择您希望接收的通知类型"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={['categories', 'updates']}
                label={
                  <Space>
                    <Badge status="processing" />
                    <span>系统更新</span>
                  </Space>
                }
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={['categories', 'reminders']}
                label={
                  <Space>
                    <Badge status="warning" />
                    <span>提醒通知</span>
                  </Space>
                }
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={['categories', 'alerts']}
                label={
                  <Space>
                    <Badge status="error" />
                    <span>警报通知</span>
                  </Space>
                }
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={['categories', 'promotions']}
                label={
                  <Space>
                    <Badge status="success" />
                    <span>推广信息</span>
                  </Space>
                }
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 操作按钮 */}
        <Card className="settings-actions">
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={loading}
            >
              保存设置
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleReset}
            >
              重置设置
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default NotificationSettingsPage;