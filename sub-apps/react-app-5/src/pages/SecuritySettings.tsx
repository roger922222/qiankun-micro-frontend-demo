/**
 * 安全设置页面
 * 管理密码、双因素认证、登录安全等
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
  Input,
  Select,
  Alert,
  Badge,
  Table,
  Modal,
  Progress,
  Tag,
  Tooltip,
  List,
  Avatar,
  Popconfirm
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  SecurityScanOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  MobileOutlined,
  DesktopOutlined,
  KeyOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  DeleteOutlined,
  PlusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useSnapshot } from 'valtio';
import dayjs from 'dayjs';

import { settingsStore, settingsActions, SecuritySettings } from '../store/settingsStore';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { Password } = Input;

const SecuritySettingsPage: React.FC = () => {
  const settings = useSnapshot(settingsStore);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [twoFactorModalVisible, setTwoFactorModalVisible] = useState(false);

  // 密码强度检查
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    let tips = [];

    if (password.length >= 8) {
      strength += 25;
    } else {
      tips.push('至少8个字符');
    }

    if (/[a-z]/.test(password)) {
      strength += 25;
    } else {
      tips.push('包含小写字母');
    }

    if (/[A-Z]/.test(password)) {
      strength += 25;
    } else {
      tips.push('包含大写字母');
    }

    if (/[0-9]/.test(password)) {
      strength += 25;
    } else {
      tips.push('包含数字');
    }

    return { strength, tips };
  };

  // 保存安全设置
  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      settingsActions.updateSecurity(values);
      settingsActions.saveToStorage();
      message.success('安全设置已保存');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handlePasswordChange = async (values: any) => {
    try {
      // 这里应该调用实际的密码修改API
      const securityUpdate: Partial<SecuritySettings> = {
        password: {
          ...settings.security.password,
          lastChanged: new Date().toISOString()
        }
      };
      
      settingsActions.updateSecurity(securityUpdate);
      settingsActions.saveToStorage();
      
      message.success('密码修改成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      message.error('密码修改失败');
    }
  };

  // 启用/禁用双因素认证
  const handleTwoFactorToggle = (enabled: boolean) => {
    if (enabled) {
      setTwoFactorModalVisible(true);
    } else {
              Modal.confirm({
          title: '确认禁用双因素认证',
          content: '禁用双因素认证会降低账户安全性，确定要继续吗？',
          onOk: () => {
            settingsActions.updateSecurity({
              twoFactor: {
                ...settings.security.twoFactor,
                enabled: false,
                backupCodes: [...settings.security.twoFactor.backupCodes]
              }
            });
            message.success('双因素认证已禁用');
          }
        });
    }
  };

  // 生成备用代码
  const generateBackupCodes = () => {
    const codes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
    
    settingsActions.updateSecurity({
      twoFactor: {
        ...settings.security.twoFactor,
        backupCodes: [...codes]
      }
    });
    
    message.success('备用代码已生成');
  };

  // 移除信任设备
  const handleRemoveTrustedDevice = (deviceId: string) => {
    const updatedDevices = settings.security.devices.trusted.filter(
      device => device.id !== deviceId
    );
    
    settingsActions.updateSecurity({
      devices: {
        trusted: updatedDevices
      }
    });
    
    message.success('设备已移除');
  };

  // 模拟信任设备数据
  const trustedDevices = [
    {
      id: '1',
      name: 'MacBook Pro',
      lastUsed: '2024-01-15 14:30',
      location: '上海',
      type: 'desktop'
    },
    {
      id: '2',
      name: 'iPhone 15',
      lastUsed: '2024-01-14 09:15',
      location: '北京',
      type: 'mobile'
    }
  ];

  // 登录历史数据
  const loginHistory = [
    {
      id: '1',
      time: '2024-01-15 14:30',
      location: '上海',
      device: 'MacBook Pro',
      ip: '192.168.1.100',
      status: 'success'
    },
    {
      id: '2',
      time: '2024-01-14 09:15',
      location: '北京',
      device: 'iPhone 15',
      ip: '10.0.0.50',
      status: 'success'
    },
    {
      id: '3',
      time: '2024-01-13 22:45',
      location: '深圳',
      device: '未知设备',
      ip: '203.192.1.25',
      status: 'failed'
    }
  ];

  const loginHistoryColumns = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device'
    },
    {
      title: '位置',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => (
        <Space>
          <EnvironmentOutlined />
          {location}
        </Space>
      )
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'success' ? 'green' : 'red'}>
          {status === 'success' ? '成功' : '失败'}
        </Tag>
      )
    }
  ];

  return (
    <div className="security-settings-page">
      <div className="page-header">
        <Title level={2}>
          <SecurityScanOutlined /> 安全设置
        </Title>
        <Paragraph type="secondary">
          管理您的账户安全，包括密码、双因素认证和登录安全
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={settings.security}
        onFinish={handleSave}
        className="settings-form"
      >
        {/* 密码管理 */}
        <Card 
          title={
            <Space>
              <LockOutlined />
              <span>密码管理</span>
            </Space>
          }
          className="settings-card"
          extra={
            <Button onClick={() => setPasswordModalVisible(true)}>
              修改密码
            </Button>
          }
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="密码安全提示"
                description={`上次修改时间：${dayjs(settings.security.password.lastChanged).format('YYYY-MM-DD HH:mm')}`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['password', 'requireStrong']}
                label="强制使用强密码"
                valuePropName="checked"
                extra="要求密码包含大小写字母、数字和特殊字符"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['password', 'expiryDays']}
                label="密码过期天数"
                extra="密码定期过期可提高安全性"
              >
                <Select>
                  <Option value={30}>30天</Option>
                  <Option value={60}>60天</Option>
                  <Option value={90}>90天</Option>
                  <Option value={180}>180天</Option>
                  <Option value={0}>永不过期</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 双因素认证 */}
        <Card 
          title={
            <Space>
              <SafetyCertificateOutlined />
              <span>双因素认证</span>
              {settings.security.twoFactor.enabled && (
                <Badge status="success" text="已启用" />
              )}
            </Space>
          }
          className="settings-card"
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="双因素认证"
                description="为您的账户添加额外的安全层，即使密码被泄露也能保护账户安全"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['twoFactor', 'enabled']}
                label="启用双因素认证"
                valuePropName="checked"
              >
                <Switch onChange={handleTwoFactorToggle} />
              </Form.Item>
            </Col>
            {settings.security.twoFactor.enabled && (
              <>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name={['twoFactor', 'method']}
                    label="认证方式"
                  >
                    <Select>
                      <Option value="app">认证应用</Option>
                      <Option value="sms">短信验证</Option>
                      <Option value="email">邮箱验证</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Space>
                    <Button onClick={generateBackupCodes}>
                      生成备用代码
                    </Button>
                    <Text type="secondary">
                      备用代码数量: {settings.security.twoFactor.backupCodes.length}
                    </Text>
                  </Space>
                </Col>
              </>
            )}
          </Row>
        </Card>

        {/* 登录安全 */}
        <Card 
          title={
            <Space>
              <KeyOutlined />
              <span>登录安全</span>
            </Space>
          }
          className="settings-card"
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['loginSecurity', 'allowMultipleDevices']}
                label="允许多设备登录"
                valuePropName="checked"
                extra="允许同时在多个设备上登录"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['loginSecurity', 'requireVerification']}
                label="新设备验证"
                valuePropName="checked"
                extra="在新设备登录时需要额外验证"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['loginSecurity', 'sessionTimeout']}
                label="会话超时时间（分钟）"
                extra="超过指定时间未操作将自动退出"
              >
                <Select>
                  <Option value={15}>15分钟</Option>
                  <Option value={30}>30分钟</Option>
                  <Option value={60}>1小时</Option>
                  <Option value={120}>2小时</Option>
                  <Option value={0}>永不超时</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name={['sessions', 'maxSessions']}
                label="最大会话数"
                extra="允许的最大同时登录会话数"
              >
                <Select>
                  <Option value={1}>1个</Option>
                  <Option value={3}>3个</Option>
                  <Option value={5}>5个</Option>
                  <Option value={10}>10个</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 信任设备管理 */}
        <Card 
          title={
            <Space>
              <DesktopOutlined />
              <span>信任设备</span>
            </Space>
          }
          className="settings-card"
        >
          <List
            dataSource={trustedDevices}
            renderItem={(device) => (
              <List.Item
                actions={[
                  <Popconfirm
                    title="确定要移除此设备吗？"
                    onConfirm={() => handleRemoveTrustedDevice(device.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />}>
                      移除
                    </Button>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      icon={device.type === 'mobile' ? <MobileOutlined /> : <DesktopOutlined />}
                    />
                  }
                  title={device.name}
                  description={
                    <Space direction="vertical" size="small">
                      <Text type="secondary">
                        <ClockCircleOutlined /> 最后使用: {device.lastUsed}
                      </Text>
                      <Text type="secondary">
                        <EnvironmentOutlined /> 位置: {device.location}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>

        {/* 登录历史 */}
        <Card 
          title={
            <Space>
              <ClockCircleOutlined />
              <span>登录历史</span>
            </Space>
          }
          className="settings-card"
        >
          <Table
            dataSource={loginHistory}
            columns={loginHistoryColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
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
              onClick={() => form.resetFields()}
            >
              重置设置
            </Button>
          </Space>
        </Card>
      </Form>

      {/* 修改密码模态框 */}
      <Modal
        title="修改密码"
        open={passwordModalVisible}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Password placeholder="请输入当前密码" />
          </Form.Item>
          
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少8个字符' }
            ]}
          >
            <Password 
              placeholder="请输入新密码"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Password placeholder="请再次输入新密码" />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确认修改
              </Button>
              <Button onClick={() => setPasswordModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 双因素认证设置模态框 */}
      <Modal
        title="启用双因素认证"
        open={twoFactorModalVisible}
        onCancel={() => setTwoFactorModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTwoFactorModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            onClick={() => {
              settingsActions.updateSecurity({
                twoFactor: {
                  ...settings.security.twoFactor,
                  enabled: true,
                  backupCodes: [...settings.security.twoFactor.backupCodes]
                }
              });
              setTwoFactorModalVisible(false);
              message.success('双因素认证已启用');
            }}
          >
            启用
          </Button>
        ]}
      >
        <Alert
          message="启用双因素认证"
          description="双因素认证将为您的账户提供额外的安全保护。启用后，每次登录都需要输入验证码。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>1. 在手机上安装认证应用（如Google Authenticator）</Text>
          <Text>2. 扫描二维码或手动输入密钥</Text>
          <Text>3. 输入认证应用生成的6位数字验证码</Text>
        </Space>
      </Modal>
    </div>
  );
};

export default SecuritySettingsPage;