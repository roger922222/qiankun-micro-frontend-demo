/**
 * 应用头部组件
 * 提供顶部导航栏功能
 */

import React from 'react';
import { Layout, Button, Dropdown, Avatar, Space, Badge, Typography } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useThemeState } from '../../hooks/useGlobalState';
import { User } from '@shared/types';
import './AppHeader.css';

const { Header } = Layout;
const { Text } = Typography;

interface AppHeaderProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  currentUser: User | null;
  onLogout: () => void;
}

/**
 * 应用头部组件
 */
const AppHeader: React.FC<AppHeaderProps> = ({
  collapsed,
  onCollapse,
  currentUser,
  onLogout
}) => {
  const { theme, toggleTheme } = useThemeState();

  // 用户菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: onLogout
    }
  ];

  // 通知菜单项
  const notificationItems: MenuProps['items'] = [
    {
      key: 'notification-1',
      label: (
        <div className="notification-item">
          <div className="notification-title">系统通知</div>
          <div className="notification-content">您有新的系统消息</div>
          <div className="notification-time">2分钟前</div>
        </div>
      )
    },
    {
      key: 'notification-2',
      label: (
        <div className="notification-item">
          <div className="notification-title">订单提醒</div>
          <div className="notification-content">有新订单需要处理</div>
          <div className="notification-time">5分钟前</div>
        </div>
      )
    },
    {
      type: 'divider'
    },
    {
      key: 'view-all',
      label: '查看全部通知',
      style: { textAlign: 'center' }
    }
  ];

  return (
    <Header className="app-header">
      <div className="app-header-left">
        {/* 折叠按钮 */}
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => onCollapse(!collapsed)}
          className="collapse-btn"
        />

        {/* 应用标题 */}
        <div className="app-title">
          <Text strong>Qiankun微前端示例</Text>
        </div>
      </div>

      <div className="app-header-right">
        <Space size="middle">
          {/* 主题切换 */}
          <Button
            type="text"
            icon={theme.current === 'light' ? <MoonOutlined /> : <SunOutlined />}
            onClick={toggleTheme}
            title={`切换到${theme.current === 'light' ? '暗色' : '亮色'}主题`}
          />

          {/* 通知 */}
          <Dropdown
            menu={{ items: notificationItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button type="text" className="notification-btn">
              <Badge count={5} size="small">
                <BellOutlined />
              </Badge>
            </Button>
          </Dropdown>

          {/* 用户信息 */}
          {currentUser ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div className="user-info">
                <Avatar
                  size="small"
                  src={currentUser.avatar}
                  icon={<UserOutlined />}
                />
                <Text className="username">{currentUser.nickname || currentUser.username}</Text>
              </div>
            </Dropdown>
          ) : (
            <Button type="primary" size="small">
              登录
            </Button>
          )}
        </Space>
      </div>
    </Header>
  );
};

export default AppHeader;