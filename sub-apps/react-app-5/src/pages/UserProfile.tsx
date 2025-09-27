/**
 * 用户配置页面
 * 包含用户个人信息、头像上传等功能
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
  Avatar,
  Upload,
  Divider,
  Tag
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  UserOutlined,
  UploadOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import { useSnapshot } from 'valtio';
import type { UploadProps } from 'antd';

import { settingsStore, settingsActions } from '../store/settingsStore';

// 模拟共享库 - 在实际项目中这会从@shared导入
const globalLogger = {
  info: (message: string, ...args: any[]) => console.log('[INFO]', message, ...args),
  error: (message: string, ...args: any[]) => console.error('[ERROR]', message, ...args)
};

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const UserProfile: React.FC = () => {
  const settings = useSnapshot(settingsStore);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(settings.user.avatar || '');

  // 初始化表单值
  React.useEffect(() => {
    form.setFieldsValue({
      name: settings.user.name,
      email: settings.user.email,
      phone: settings.user.phone,
      department: settings.user.department,
      position: settings.user.position,
    });
    setAvatarUrl(settings.user.avatar || '');
  }, [settings.user, form]);

  // 保存用户信息
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // 更新用户信息
      settingsActions.updateUser({
        ...values,
        avatar: avatarUrl,
      });

      // 保存到本地存储
      settingsActions.saveToStorage();
      
      message.success('用户信息保存成功');
      globalLogger.info('User profile saved', values);
      
    } catch (error) {
      message.error('用户信息保存失败');
      globalLogger.error('Failed to save user profile', error as Error);
    } finally {
      setLoading(false);
    }
  };

  // 重置用户信息
  const handleReset = () => {
    form.resetFields();
    setAvatarUrl('');
    message.info('用户信息已重置');
  };

  // 头像上传处理
  const handleAvatarChange: UploadProps['onChange'] = (info) => {
    if (info.file.status === 'uploading') {
      return;
    }
    if (info.file.status === 'done') {
      // 这里应该是上传成功后的URL，现在模拟一个
      const mockUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
      setAvatarUrl(mockUrl);
      message.success('头像上传成功');
    } else if (info.file.status === 'error') {
      message.error('头像上传失败');
    }
  };

  // 模拟头像上传
  const customRequest = ({ onSuccess }: any) => {
    setTimeout(() => {
      onSuccess('ok');
    }, 1000);
  };

  // 生成随机头像
  const generateRandomAvatar = () => {
    const mockUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`;
    setAvatarUrl(mockUrl);
    message.success('头像已更新');
  };

  return (
    <div className="settings-page fade-in">
      <div className="settings-page-header">
        <Title level={2}>用户配置</Title>
        <Paragraph>
          管理您的个人信息、头像和联系方式。这些信息将在系统中显示。
        </Paragraph>
      </div>

      <div className="settings-page-content">
        <Form
          form={form}
          layout="vertical"
          className="settings-form"
          onFinish={handleSave}
        >
          {/* 头像设置 */}
          <Card title="头像设置" className="settings-card">
            <div className="avatar-upload">
              <div className="avatar-preview">
                {avatarUrl ? (
                  <Avatar size={80} src={avatarUrl} />
                ) : (
                  <Avatar size={80} icon={<UserOutlined />} className="avatar-placeholder" />
                )}
              </div>
              
              <div className="upload-info">
                <h4>更换头像</h4>
                <p>支持 JPG、PNG 格式，文件大小不超过 2MB</p>
                <Space>
                  <Upload
                    name="avatar"
                    showUploadList={false}
                    customRequest={customRequest}
                    onChange={handleAvatarChange}
                    accept="image/*"
                  >
                    <Button icon={<UploadOutlined />} size="small">
                      上传头像
                    </Button>
                  </Upload>
                  <Button size="small" onClick={generateRandomAvatar}>
                    随机头像
                  </Button>
                </Space>
              </div>
            </div>
          </Card>

          {/* 基本信息 */}
          <Card title="基本信息" className="settings-card">
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="姓名"
                  name="name"
                  rules={[
                    { required: true, message: '请输入姓名' },
                    { min: 2, message: '姓名至少2个字符' },
                    { max: 20, message: '姓名最多20个字符' }
                  ]}
                >
                  <Input 
                    prefix={<UserOutlined />} 
                    placeholder="请输入您的姓名"
                    maxLength={20}
                    showCount
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  label="邮箱地址"
                  name="email"
                  rules={[
                    { required: true, message: '请输入邮箱地址' },
                    { type: 'email', message: '请输入有效的邮箱地址' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined />} 
                    placeholder="请输入邮箱地址"
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={24}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="手机号码"
                  name="phone"
                  rules={[
                    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' }
                  ]}
                >
                  <Input 
                    prefix={<PhoneOutlined />} 
                    placeholder="请输入手机号码"
                    maxLength={11}
                  />
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={12}>
                <Form.Item
                  label="部门"
                  name="department"
                >
                  <Input 
                    prefix={<TeamOutlined />} 
                    placeholder="请输入所属部门"
                    maxLength={50}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              label="职位"
              name="position"
            >
              <Input 
                prefix={<IdcardOutlined />} 
                placeholder="请输入职位信息"
                maxLength={50}
              />
            </Form.Item>
          </Card>

          {/* 账户信息 */}
          <Card title="账户信息" className="settings-card">
            <div className="system-info">
              <div className="info-item">
                <span className="info-label">用户ID</span>
                <span className="info-value">
                  {settings.user.id || '未设置'}
                </span>
              </div>
              
              <div className="info-item">
                <span className="info-label">账户状态</span>
                <span className="info-value">
                  <Tag color="green">正常</Tag>
                </span>
              </div>
              
              <div className="info-item">
                <span className="info-label">注册时间</span>
                <span className="info-value">2024-01-01 10:00:00</span>
              </div>
              
              <div className="info-item">
                <span className="info-label">最后登录</span>
                <span className="info-value">
                  {new Date().toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
            
            <Divider />
            
            <Space>
              <Button size="small" disabled>
                修改密码
              </Button>
              <Button size="small" disabled>
                绑定手机
              </Button>
              <Button size="small" disabled>
                安全设置
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
                保存信息
              </Button>
            </Space>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default UserProfile;