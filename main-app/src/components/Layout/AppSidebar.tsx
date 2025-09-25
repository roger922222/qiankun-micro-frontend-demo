/**
 * 应用侧边栏组件
 * 提供导航菜单功能
 */

import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  SettingOutlined,
  MessageOutlined,
  FolderOutlined,
  MonitorOutlined,
  ApiOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { MicroAppConfig } from '@shared/types';
import './AppSidebar.css';

const { Sider } = Layout;

interface AppSidebarProps {
  collapsed: boolean;
  selectedKeys: string[];
  microApps: MicroAppConfig[];
}

/**
 * 应用侧边栏组件
 */
const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  selectedKeys,
  microApps
}) => {
  const navigate = useNavigate();

  // 菜单项配置
  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      onClick: () => navigate('/dashboard')
    },
    {
      key: '/communication-demo',
      icon: <ApiOutlined />,
      label: '通信演示',
      onClick: () => navigate('/communication-demo')
    },
    {
      type: 'divider'
    },
    {
      key: 'react-apps',
      icon: <SettingOutlined />,
      label: 'React应用',
      children: [
        {
          key: '/user-management',
          icon: <UserOutlined />,
          label: '用户管理',
          onClick: () => navigate('/user-management')
        },
        {
          key: '/product-management',
          icon: <ShoppingOutlined />,
          label: '商品管理',
          onClick: () => navigate('/product-management')
        },
        {
          key: '/order-management',
          icon: <ShoppingCartOutlined />,
          label: '订单管理',
          onClick: () => navigate('/order-management')
        },
        {
          key: '/data-dashboard',
          icon: <BarChartOutlined />,
          label: '数据看板',
          onClick: () => navigate('/data-dashboard')
        },
        {
          key: '/settings',
          icon: <SettingOutlined />,
          label: '设置中心',
          onClick: () => navigate('/settings')
        }
      ]
    },
    {
      key: 'vue-apps',
      icon: <SettingOutlined />,
      label: 'Vue应用',
      children: [
        {
          key: '/message-center',
          icon: <MessageOutlined />,
          label: '消息中心',
          onClick: () => navigate('/message-center')
        },
        {
          key: '/file-management',
          icon: <FolderOutlined />,
          label: '文件管理',
          onClick: () => navigate('/file-management')
        },
        {
          key: '/system-monitor',
          icon: <MonitorOutlined />,
          label: '系统监控',
          onClick: () => navigate('/system-monitor')
        }
      ]
    }
  ];

  // 获取默认展开的菜单项
  const getDefaultOpenKeys = (): string[] => {
    const currentPath = selectedKeys[0];
    if (!currentPath) return [];

    if (currentPath.startsWith('/user-management') || 
        currentPath.startsWith('/product-management') ||
        currentPath.startsWith('/order-management') ||
        currentPath.startsWith('/data-dashboard') ||
        currentPath.startsWith('/settings')) {
      return ['react-apps'];
    }

    if (currentPath.startsWith('/message-center') ||
        currentPath.startsWith('/file-management') ||
        currentPath.startsWith('/system-monitor')) {
      return ['vue-apps'];
    }

    return [];
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      className="app-sidebar"
      width={240}
      collapsedWidth={64}
    >
      <div className="sidebar-logo">
        <div className="logo-icon">Q</div>
        {!collapsed && (
          <div className="logo-text">
            <div className="logo-title">Qiankun</div>
            <div className="logo-subtitle">微前端</div>
          </div>
        )}
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={selectedKeys}
        defaultOpenKeys={getDefaultOpenKeys()}
        items={menuItems}
        className="sidebar-menu"
      />

      {/* 应用状态指示器 */}
      {!collapsed && (
        <div className="app-status">
          <div className="status-title">应用状态</div>
          <div className="status-list">
            {microApps.map(app => (
              <div key={app.name} className="status-item">
                <div className="status-dot status-online" />
                <span className="status-name">{app.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Sider>
  );
};

export default AppSidebar;