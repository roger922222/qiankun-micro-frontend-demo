import React, { useState } from 'react';
import { Layout, Button, Switch, Dropdown, Avatar, Badge, Space, Tooltip, Typography } from 'antd';
import { 
  MenuFoldOutlined, 
  MenuUnfoldOutlined, 
  BellOutlined, 
  UserOutlined, 
  SettingOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { dashboardStore } from '../../store/DashboardStore';
import { globalEventBus } from '@shared/communication/event-bus';
import { EVENT_TYPES } from '@shared/types/events';

const { Header } = Layout;
const { Title } = Typography;

interface AppHeaderProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const AppHeader: React.FC<AppHeaderProps> = observer(({ 
  collapsed = false, 
  onCollapse 
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    const theme = checked ? 'dark' : 'light';
    
    // 更新全局主题
    document.documentElement.setAttribute('data-theme', theme);
    
    // 发送主题变更事件
    globalEventBus.emit({
      type: EVENT_TYPES.THEME_CHANGE,
      source: 'react-app-4',
      timestamp: new Date().toISOString(),
      id: `theme-change-${Date.now()}`,
      data: { theme }
    });
  };

  const handleMenuToggle = () => {
    onCollapse?.(!collapsed);
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        globalEventBus.emit({
          type: EVENT_TYPES.USER_LOGOUT,
          source: 'react-app-4',
          timestamp: new Date().toISOString(),
          id: `logout-${Date.now()}`,
          data: {}
        });
      }
    },
  ];

  const notificationMenuItems = [
    {
      key: '1',
      label: (
        <div>
          <div style={{ fontWeight: 'bold' }}>系统通知</div>
          <div style={{ fontSize: '12px', color: '#666' }}>数据更新完成</div>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <div>
          <div style={{ fontWeight: 'bold' }}>性能警告</div>
          <div style={{ fontSize: '12px', color: '#666' }}>内存使用率较高</div>
        </div>
      ),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'all',
      label: '查看全部通知',
      style: { textAlign: 'center' as const }
    },
  ];

  return (
    <Header 
      className="app-header"
      style={{
        padding: '0 16px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      {/* 左侧区域 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={handleMenuToggle}
          style={{
            fontSize: '16px',
            width: 64,
            height: 64,
          }}
        />
        
        <div style={{ marginLeft: 16 }}>
          <Title level={4} style={{ margin: 0, color: '#722ed1' }}>
            数据看板系统
          </Title>
        </div>
      </div>

      {/* 右侧区域 */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Space size="middle">
          {/* 主题切换 */}
          <Tooltip title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}>
            <Switch
              checked={isDarkMode}
              onChange={handleThemeToggle}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
          </Tooltip>

          {/* 实时连接状态 */}
          <Tooltip title={dashboardStore.isRealTimeConnected ? '实时连接正常' : '实时连接断开'}>
            <Badge 
              status={dashboardStore.isRealTimeConnected ? 'success' : 'error'} 
              text="实时数据"
            />
          </Tooltip>

          {/* 通知 */}
          <Dropdown
            menu={{ items: notificationMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Button type="text" icon={<BellOutlined />} size="large">
              <Badge count={2} size="small" />
            </Button>
          </Dropdown>

          {/* 用户菜单 */}
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Button type="text" style={{ padding: '4px 8px' }}>
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>管理员</span>
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </div>
    </Header>
  );
});

export default AppHeader;