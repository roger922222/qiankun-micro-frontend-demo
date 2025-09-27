/**
 * 应用头部组件
 * 包含Logo、用户信息、主题切换等功能
 */

import React from 'react';
import { Layout, Space, Dropdown, Avatar, Switch, Button, Typography } from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  BulbOutlined,
  BulbFilled,
  GlobalOutlined
} from '@ant-design/icons';
import { useSnapshot } from 'valtio';
import type { MenuProps } from 'antd';

import { settingsStore, settingsActions } from '../../store/settingsStore';

// 模拟共享库 - 在实际项目中这些会从@shared导入
const globalEventBus = {
  emit: (event: any) => console.log('Event emitted:', event)
};

const globalLogger = {
  info: (message: string, ...args: any[]) => console.log('[INFO]', message, ...args)
};

const EVENT_TYPES = {
  THEME_CHANGE: 'THEME_CHANGE',
  LANGUAGE_CHANGE: 'LANGUAGE_CHANGE',
  USER_LOGOUT: 'USER_LOGOUT'
};

const { Header } = Layout;
const { Text } = Typography;

const AppHeader: React.FC = () => {
  const settings = useSnapshot(settingsStore);

  // 主题切换处理
  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    settingsActions.setTheme(newTheme);
    
    // 发送主题变更事件
    globalEventBus.emit({
      type: EVENT_TYPES.THEME_CHANGE,
      source: 'react-settings',
      timestamp: new Date().toISOString(),
      id: `theme-change-${Date.now()}`,
      data: { theme: newTheme }
    });
    
    globalLogger.info('Theme changed', { theme: newTheme });
  };

  // 语言切换处理
  const handleLanguageChange = () => {
    const newLanguage = settings.language === 'zh-CN' ? 'en-US' : 'zh-CN';
    settingsActions.setLanguage(newLanguage);
    
    // 发送语言变更事件
    globalEventBus.emit({
      type: EVENT_TYPES.LANGUAGE_CHANGE,
      source: 'react-settings',
      timestamp: new Date().toISOString(),
      id: `language-change-${Date.now()}`,
      data: { language: newLanguage }
    });
    
    globalLogger.info('Language changed', { language: newLanguage });
  };

  // 用户菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => {
        globalLogger.info('Navigate to profile');
        // 这里可以添加导航逻辑
      }
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
      onClick: () => {
        globalLogger.info('Navigate to account settings');
        // 这里可以添加导航逻辑
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        globalLogger.info('User logout');
        
        // 发送用户登出事件
        globalEventBus.emit({
          type: EVENT_TYPES.USER_LOGOUT,
          source: 'react-settings',
          timestamp: new Date().toISOString(),
          id: `user-logout-${Date.now()}`,
          data: { reason: 'manual' }
        });
        
        // 重置设置
        settingsActions.reset();
      }
    }
  ];

  return (
    <Header className="settings-app-header">
      <div className="logo">
        <SettingOutlined />
        <span>设置中心</span>
      </div>
      
      <div className="header-actions">
        <Space size="middle">
          {/* 主题切换 */}
          <Space>
            {settings.theme === 'light' ? <BulbOutlined /> : <BulbFilled />}
            <Switch
              checked={settings.theme === 'dark'}
              onChange={handleThemeChange}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {settings.theme === 'light' ? '浅色' : '深色'}
            </Text>
          </Space>
          
          {/* 语言切换 */}
          <Button
            type="text"
            icon={<GlobalOutlined />}
            size="small"
            onClick={handleLanguageChange}
            title="切换语言"
          >
            {settings.language === 'zh-CN' ? '中文' : 'EN'}
          </Button>
          
          {/* 用户信息下拉菜单 */}
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <div className="user-info">
              <Avatar
                size="small"
                src={settings.user.avatar}
                icon={!settings.user.avatar && <UserOutlined />}
                style={{ backgroundColor: '#fa8c16' }}
              />
              <span style={{ marginLeft: 8, fontSize: '14px' }}>
                {settings.user.name || '未登录'}
              </span>
            </div>
          </Dropdown>
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader;