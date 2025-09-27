/**
 * 应用侧边栏组件
 * 包含导航菜单
 */

import React from 'react';
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  SettingOutlined,
  UserOutlined,
  DesktopOutlined,
  BellOutlined,
  SecurityScanOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

// 模拟共享库 - 在实际项目中这些会从@shared导入
const globalLogger = {
  info: (message: string, ...args: any[]) => console.log('[INFO]', message, ...args),
  warn: (message: string, ...args: any[]) => console.warn('[WARN]', message, ...args),
  error: (message: string, ...args: any[]) => console.error('[ERROR]', message, ...args)
};

const { Sider } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const pathname = location.pathname;
    if (pathname.includes('/profile')) return 'profile';
    if (pathname.includes('/system')) return 'system';
    if (pathname.includes('/notifications')) return 'notifications';
    if (pathname.includes('/security')) return 'security';
    if (pathname.includes('/language')) return 'language';
    return 'general';
  };

  // 菜单项配置
  const menuItems: MenuItem[] = [
    {
      key: 'general',
      icon: <SettingOutlined />,
      label: '通用设置',
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '用户配置',
    },
    {
      key: 'system',
      icon: <DesktopOutlined />,
      label: '系统配置',
    },
    {
      type: 'divider'
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: '通知设置',
    },
    {
      key: 'security',
      icon: <SecurityScanOutlined />,
      label: '安全设置',
    },
    {
      key: 'language',
      icon: <GlobalOutlined />,
      label: '语言设置',
    }
  ];

  // 菜单点击处理
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    globalLogger.info('Menu clicked', { key, currentPath: location.pathname });
    
    switch (key) {
      case 'general':
        navigate('/general');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'system':
        navigate('/system');
        break;
      case 'notifications':
        navigate('/notifications');
        break;
      case 'security':
        navigate('/security');
        break;
      case 'language':
        navigate('/language');
        break;
      default:
        globalLogger.warn('Unknown menu key', { key });
        break;
    }
  };

  return (
    <Sider
      width={240}
      className="settings-app-sidebar"
      theme="light"
      collapsible={false}
    >
      <Menu
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  );
};

export default AppSidebar;