/**
 * 系统配置页面
 * 包含系统设置、功能开关、API配置等
 */

import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Space,
  Typography,
  Row,
  Col,
  Switch,
  Divider,
  Tag,
  Alert,
  Descriptions,
  Progress
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  ApiOutlined,
  CloudOutlined,
  SecurityScanOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useSnapshot } from 'valtio';

import { settingsStore, settingsActions } from '../store/settingsStore';

// 模拟共享库 - 在实际项目中这会从@shared导入
const globalLogger = {
  info: (message: string, ...args: any[]) => console.log('[INFO]', message, ...args),
  error: (message: string, ...args: any[]) => console.error('[ERROR]', message, ...args)
};

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const SystemConfig: React.FC = () => {
  const settings = useSnapshot(settingsStore);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 初始化表单值
  React.useEffect(() => {
    form.setFieldsValue({
      siteName: settings.system.siteName,
      version: settings.system.version,
      apiUrl: settings.system.apiUrl,
      cdnUrl: settings.system.cdnUrl,
      darkMode: settings.system.features.darkMode,
      multiLanguage: settings.system.features.multiLanguage,
      notifications: settings.system.features.notifications,
    });
  }, [settings.system, form]);

  // 保存系统配置
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // 更新系统配置
      settingsActions.updateSystem({
        siteName: values.siteName,
        version: values.version,
        apiUrl: values.apiUrl,
        cdnUrl: values.cdnUrl,
        features: {
          darkMode: values.darkMode,
          multiLanguage: values.multiLanguage,
          notifications: values.notifications,
        }
      });

      // 保存到本地存储
      settingsActions.saveToStorage();
      
      message.success('系统配置保存成功');
      globalLogger.info('System config saved', values);
      
    } catch (error) {
      message.error('系统配置保存失败');
      globalLogger.error('Failed to save system config', error as Error);
    } finally {
      setLoading(false);
    }
  };

  // 重置系统配置
  const handleReset = () => {
    form.setFieldsValue({
      siteName: 'Qiankun微前端系统',
      version: '1.0.0',
      apiUrl: 'https://api.example.com',
      cdnUrl: 'https://cdn.example.com',
      darkMode: true,
      multiLanguage: true,
      notifications: true,
    });
    message.info('系统配置已重置');
  };

  // 测试API连接
  const handleTestApi = async () => {
    const apiUrl = form.getFieldValue('apiUrl');
    if (!apiUrl) {
      message.warning('请先输入API地址');
      return;
    }

    try {
      message.loading('正在测试API连接...', 2);
      // 模拟API测试
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success('API连接测试成功');
      globalLogger.info('API connection test successful', { apiUrl });
    } catch (error) {
      message.error('API连接测试失败');
      globalLogger.error('API connection test failed', error as Error);
    }
  };

  // 清理缓存
  const handleClearCache = () => {
    try {
      localStorage.removeItem('react-settings-store');
      sessionStorage.clear();
      message.success('缓存清理成功');
      globalLogger.info('Cache cleared');
    } catch (error) {
      message.error('缓存清理失败');
      globalLogger.error('Failed to clear cache', error as Error);
    }
  };

  return (
    <div className="settings-page fade-in">
      <div className="settings-page-header">
        <Title level={2}>系统配置</Title>
        <Paragraph>
          管理系统的基础配置、功能开关和服务连接设置。请谨慎修改这些配置。
        </Paragraph>
      </div>

      <div className="settings-page-content">
        <Alert
          message="配置提醒"
          description="系统配置修改后可能需要重启应用才能生效，请在维护时间内进行操作。"
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={form}
          layout="vertical"
          className="settings-form"
          onFinish={handleSave}
        >
          {/* 基础配置 */}
          <Card title="基础配置" className="settings-card">
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="站点名称"
                  name="siteName"
                  rules={[
                    { required: true, message: '请输入站点名称' },
                    { max: 50, message: '站点名称最多50个字符' }
                  ]}
                >
                  <Input 
                    prefix={<SettingOutlined />} 
                    placeholder="请输入站点名称"
                    maxLength={50}
                    showCount
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  label="系统版本"
                  name="version"
                  rules={[
                    { required: true, message: '请输入系统版本' },
                    { pattern: /^\d+\.\d+\.\d+$/, message: '版本格式应为 x.x.x' }
                  ]}
                >
                  <Input 
                    placeholder="例如: 1.0.0"
                    maxLength={20}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 服务配置 */}
          <Card 
            title="服务配置" 
            className="settings-card"
            extra={
              <Button size="small" onClick={handleTestApi}>
                测试连接
              </Button>
            }
          >
            <Form.Item
              label="API服务地址"
              name="apiUrl"
              rules={[
                { required: true, message: '请输入API服务地址' },
                { type: 'url', message: '请输入有效的URL地址' }
              ]}
            >
              <Input 
                prefix={<ApiOutlined />} 
                placeholder="https://api.example.com"
                addonAfter={
                  <Button type="link" size="small" onClick={handleTestApi}>
                    测试
                  </Button>
                }
              />
            </Form.Item>
            
            <Form.Item
              label="CDN服务地址"
              name="cdnUrl"
              rules={[
                { type: 'url', message: '请输入有效的URL地址' }
              ]}
            >
              <Input 
                prefix={<CloudOutlined />} 
                placeholder="https://cdn.example.com"
              />
            </Form.Item>
          </Card>

          {/* 功能开关 */}
          <Card title="功能开关" className="settings-card">
            <div className="feature-switches">
              <div className="feature-switch">
                <div className="feature-info">
                  <div className="feature-title">深色模式支持</div>
                  <div className="feature-desc">允许用户切换到深色主题模式</div>
                </div>
                <Form.Item name="darkMode" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </div>
              
              <div className="feature-switch">
                <div className="feature-info">
                  <div className="feature-title">多语言支持</div>
                  <div className="feature-desc">启用国际化功能，支持多种语言</div>
                </div>
                <Form.Item name="multiLanguage" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </div>
              
              <div className="feature-switch">
                <div className="feature-info">
                  <div className="feature-title">通知系统</div>
                  <div className="feature-desc">启用系统通知和消息推送功能</div>
                </div>
                <Form.Item name="notifications" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </div>
            </div>
          </Card>

          {/* 系统状态 */}
          <Card title="系统状态" className="settings-card">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="运行状态">
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  正常运行
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="服务状态">
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  服务正常
                </Tag>
              </Descriptions.Item>
              
              <Descriptions.Item label="内存使用">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Progress percent={68} size="small" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    680MB / 1GB
                  </Text>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="存储空间">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Progress percent={45} size="small" />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    4.5GB / 10GB
                  </Text>
                </Space>
              </Descriptions.Item>
              
              <Descriptions.Item label="启动时间">
                2024-01-01 10:00:00
              </Descriptions.Item>
              
              <Descriptions.Item label="运行时长">
                2天 14小时 32分钟
              </Descriptions.Item>
            </Descriptions>
            
            <Divider />
            
            <Space>
              <Button 
                size="small" 
                icon={<ReloadOutlined />}
                onClick={handleClearCache}
              >
                清理缓存
              </Button>
              <Button size="small" icon={<SecurityScanOutlined />} disabled>
                安全扫描
              </Button>
              <Button size="small" disabled>
                性能优化
              </Button>
            </Space>
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
                保存配置
              </Button>
            </Space>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default SystemConfig;