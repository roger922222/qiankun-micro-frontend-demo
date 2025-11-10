/**
 * 语言设置页面
 * 管理界面语言、时区、本地化偏好
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
  Select,
  Radio,
  Alert,
  Badge,
  Tooltip,
  Input,
  TimePicker,
  DatePicker
} from 'antd';
import {
  SaveOutlined,
  ReloadOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  TranslationOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { useSnapshot } from 'valtio';
import dayjs from 'dayjs';

import { settingsStore, settingsActions, LanguageSettings } from '../store/settingsStore';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

const LanguageSettingsPage: React.FC = () => {
  const settings = useSnapshot(settingsStore);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 语言选项
  const languageOptions = [
    { value: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { value: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
    { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { value: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
    { value: 'ja-JP', label: '日本語', flag: '🇯🇵' },
    { value: 'ko-KR', label: '한국어', flag: '🇰🇷' },
    { value: 'fr-FR', label: 'Français', flag: '🇫🇷' },
    { value: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'es-ES', label: 'Español', flag: '🇪🇸' },
    { value: 'it-IT', label: 'Italiano', flag: '🇮🇹' },
    { value: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
    { value: 'ru-RU', label: 'Русский', flag: '🇷🇺' },
    { value: 'ar-SA', label: 'العربية', flag: '🇸🇦' }
  ];

  // 时区选项
  const timezoneOptions = [
    { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)', city: '上海' },
    { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)', city: '东京' },
    { value: 'Asia/Seoul', label: '韩国标准时间 (UTC+9)', city: '首尔' },
    { value: 'Asia/Singapore', label: '新加坡时间 (UTC+8)', city: '新加坡' },
    { value: 'Asia/Hong_Kong', label: '香港时间 (UTC+8)', city: '香港' },
    { value: 'Europe/London', label: '格林威治标准时间 (UTC+0)', city: '伦敦' },
    { value: 'Europe/Paris', label: '中欧时间 (UTC+1)', city: '巴黎' },
    { value: 'Europe/Berlin', label: '中欧时间 (UTC+1)', city: '柏林' },
    { value: 'America/New_York', label: '美国东部时间 (UTC-5)', city: '纽约' },
    { value: 'America/Los_Angeles', label: '美国太平洋时间 (UTC-8)', city: '洛杉矶' },
    { value: 'America/Chicago', label: '美国中部时间 (UTC-6)', city: '芝加哥' },
    { value: 'Australia/Sydney', label: '澳大利亚东部时间 (UTC+10)', city: '悉尼' }
  ];

  // 日期格式选项
  const dateFormatOptions = [
    { value: 'YYYY-MM-DD', label: '2024-01-15', example: dayjs().format('YYYY-MM-DD') },
    { value: 'DD/MM/YYYY', label: '15/01/2024', example: dayjs().format('DD/MM/YYYY') },
    { value: 'MM/DD/YYYY', label: '01/15/2024', example: dayjs().format('MM/DD/YYYY') },
    { value: 'DD.MM.YYYY', label: '15.01.2024', example: dayjs().format('DD.MM.YYYY') },
    { value: 'YYYY年MM月DD日', label: '2024年01月15日', example: dayjs().format('YYYY年MM月DD日') },
    { value: 'MMM DD, YYYY', label: 'Jan 15, 2024', example: dayjs().format('MMM DD, YYYY') },
    { value: 'DD MMM YYYY', label: '15 Jan 2024', example: dayjs().format('DD MMM YYYY') }
  ];

  // 数字格式选项
  const numberFormatOptions = [
    { 
      value: { decimal: '.', thousands: ',', currency: '$' }, 
      label: '美式格式', 
      example: '1,234.56 $' 
    },
    { 
      value: { decimal: ',', thousands: '.', currency: '€' }, 
      label: '欧式格式', 
      example: '1.234,56 €' 
    },
    { 
      value: { decimal: '.', thousands: ',', currency: '¥' }, 
      label: '中式格式', 
      example: '1,234.56 ¥' 
    },
    { 
      value: { decimal: '.', thousands: ' ', currency: '₽' }, 
      label: '俄式格式', 
      example: '1 234.56 ₽' 
    }
  ];

  // 初始化表单值
  const initialValues = {
    ...settings.languageSettings
  };

  // 保存设置
  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      settingsActions.updateLanguageSettings(values);
      
      // 同步到全局语言设置
      if (values.locale !== settings.language) {
        settingsActions.setLanguage(values.locale);
      }
      
      settingsActions.saveToStorage();
      message.success('语言设置已保存');
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

  // 检测系统语言
  const detectSystemLanguage = () => {
    const systemLang = navigator.language || 'zh-CN';
    form.setFieldsValue({ locale: systemLang });
    message.info(`已检测到系统语言: ${systemLang}`);
  };

  // 检测系统时区
  const detectSystemTimezone = () => {
    const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    form.setFieldsValue({ timezone: systemTimezone });
    message.info(`已检测到系统时区: ${systemTimezone}`);
  };

  // 预览格式化效果
  const previewFormat = (format: string, type: 'date' | 'number') => {
    if (type === 'date') {
      return dayjs().format(format);
    }
    // 这里可以添加数字格式预览逻辑
    return '1,234.56';
  };

  return (
    <div className="language-settings-page">
      <div className="page-header">
        <Title level={2}>
          <GlobalOutlined /> 语言设置
        </Title>
        <Paragraph type="secondary">
          管理界面语言、时区、日期格式和本地化偏好设置
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSave}
        className="settings-form"
      >
        {/* 界面语言设置 */}
        <Card 
          title={
            <Space>
              <TranslationOutlined />
              <span>界面语言</span>
            </Space>
          }
          className="settings-card"
          extra={
            <Button size="small" onClick={detectSystemLanguage}>
              检测系统语言
            </Button>
          }
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="语言设置"
                description="选择您偏好的界面显示语言，更改后需要刷新页面生效"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="locale"
                label="主要语言"
                rules={[{ required: true, message: '请选择主要语言' }]}
              >
                <Select
                  showSearch
                  placeholder="选择语言"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {languageOptions.map(lang => (
                    <Option key={lang.value} value={lang.value}>
                      <Space>
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="fallbackLocale"
                label="备用语言"
                extra="当主要语言不可用时使用的备用语言"
              >
                <Select placeholder="选择备用语言">
                  {languageOptions.map(lang => (
                    <Option key={lang.value} value={lang.value}>
                      <Space>
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="rtl"
                label="从右到左显示"
                valuePropName="checked"
                extra="适用于阿拉伯语、希伯来语等从右到左的语言"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 时区设置 */}
        <Card 
          title={
            <Space>
              <ClockCircleOutlined />
              <span>时区设置</span>
            </Space>
          }
          className="settings-card"
          extra={
            <Button size="small" onClick={detectSystemTimezone}>
              检测系统时区
            </Button>
          }
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="时区信息"
                description={`当前时间: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`}
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col span={24}>
              <Form.Item
                name="timezone"
                label="时区"
                rules={[{ required: true, message: '请选择时区' }]}
              >
                <Select
                  showSearch
                  placeholder="选择时区"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {timezoneOptions.map(tz => (
                    <Option key={tz.value} value={tz.value}>
                      <Space>
                        <EnvironmentOutlined />
                        <span>{tz.city}</span>
                        <Text type="secondary">({tz.label})</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 日期时间格式 */}
        <Card 
          title={
            <Space>
              <CalendarOutlined />
              <span>日期时间格式</span>
            </Space>
          }
          className="settings-card"
        >
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="dateFormat"
                label="日期格式"
                extra="选择日期的显示格式"
              >
                <Select placeholder="选择日期格式">
                  {dateFormatOptions.map(format => (
                    <Option key={format.value} value={format.value}>
                      <Space>
                        <span>{format.label}</span>
                        <Text type="secondary">({format.example})</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="timeFormat"
                label="时间格式"
                extra="选择时间的显示格式"
              >
                <Radio.Group>
                  <Radio value="12h">12小时制 (下午 2:30)</Radio>
                  <Radio value="24h">24小时制 (14:30)</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 数字格式设置 */}
        <Card 
          title={
            <Space>
              <DollarOutlined />
              <span>数字格式</span>
            </Space>
          }
          className="settings-card"
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="数字格式设置"
                description="设置数字、货币的显示格式，包括小数点和千位分隔符"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name={['numberFormat', 'decimal']}
                label="小数点符号"
                rules={[{ required: true, message: '请输入小数点符号' }]}
              >
                <Input placeholder="." maxLength={1} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name={['numberFormat', 'thousands']}
                label="千位分隔符"
                rules={[{ required: true, message: '请输入千位分隔符' }]}
              >
                <Input placeholder="," maxLength={1} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name={['numberFormat', 'currency']}
                label="货币符号"
                rules={[{ required: true, message: '请输入货币符号' }]}
              >
                <Input placeholder="¥" maxLength={3} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                <Text strong>预览效果：</Text>
                <Space direction="vertical" style={{ marginLeft: 16 }}>
                  <Text>数字: 1{form.getFieldValue(['numberFormat', 'thousands']) || ','}234{form.getFieldValue(['numberFormat', 'decimal']) || '.'}56</Text>
                  <Text>货币: {form.getFieldValue(['numberFormat', 'currency']) || '¥'}1{form.getFieldValue(['numberFormat', 'thousands']) || ','}234{form.getFieldValue(['numberFormat', 'decimal']) || '.'}56</Text>
                </Space>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 本地化偏好 */}
        <Card 
          title={
            <Space>
              <SettingOutlined />
              <span>本地化偏好</span>
            </Space>
          }
          className="settings-card"
        >
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <Alert
                message="本地化设置"
                description="这些设置会影响整体的用户体验和内容显示"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="首选内容语言"
                extra="影响内容推荐和搜索结果"
              >
                <Select mode="multiple" placeholder="选择内容语言">
                  {languageOptions.map(lang => (
                    <Option key={lang.value} value={lang.value}>
                      <Space>
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="地区设置"
                extra="影响本地化内容和服务"
              >
                <Select placeholder="选择地区">
                  <Option value="CN">中国大陆</Option>
                  <Option value="HK">中国香港</Option>
                  <Option value="TW">中国台湾</Option>
                  <Option value="US">美国</Option>
                  <Option value="JP">日本</Option>
                  <Option value="KR">韩国</Option>
                  <Option value="SG">新加坡</Option>
                  <Option value="GB">英国</Option>
                  <Option value="DE">德国</Option>
                  <Option value="FR">法国</Option>
                </Select>
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
            <Tooltip title="保存后需要刷新页面才能看到语言变更效果">
              <Button 
                icon={<InfoCircleOutlined />}
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>
            </Tooltip>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default LanguageSettingsPage;