/**
 * React设置中心子应用主组件
 * 使用Valtio进行状态管理
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, message } from 'antd';
import { Helmet } from 'react-helmet-async';
import { useSnapshot } from 'valtio';

// 导入页面组件
import GeneralSettings from './pages/GeneralSettings';
import UserProfile from './pages/UserProfile';
import SystemConfig from './pages/SystemConfig';
import NotificationSettings from './pages/NotificationSettings';
import SecuritySettings from './pages/SecuritySettings';
import LanguageSettings from './pages/LanguageSettings';

// 导入布局组件
import AppHeader from './components/Layout/AppHeader';
import AppSidebar from './components/Layout/AppSidebar';
import AppFooter from './components/Layout/AppFooter';

// 导入样式
import './styles/App.css';

// 导入共享库
import { globalEventBus } from '@shared/communication/event-bus';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';

// 导入Valtio Store
import { settingsStore } from './store/settingsStore';

const { Content } = Layout;

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const settings = useSnapshot(settingsStore);

  useEffect(() => {
    globalLogger.info('Settings App mounted');

    // 监听全局事件
    const handleGlobalEvent = (event: any) => {
      globalLogger.info('Received global event', event);
      
      switch (event.type) {
        case EVENT_TYPES.THEME_CHANGE:
          document.documentElement.setAttribute('data-theme', event.data.theme);
          settingsStore.theme = event.data.theme;
          break;
          
        case EVENT_TYPES.USER_LOGOUT:
          settingsStore.reset();
          message.info('用户已登出，设置已重置');
          break;
          
        case EVENT_TYPES.LANGUAGE_CHANGE:
          settingsStore.language = event.data.language;
          message.info(`语言已切换为: ${event.data.language}`);
          break;
          
        default:
          break;
      }
    };

    // 注册事件监听器
    globalEventBus.on(EVENT_TYPES.THEME_CHANGE, handleGlobalEvent);
    globalEventBus.on(EVENT_TYPES.USER_LOGOUT, handleGlobalEvent);
    globalEventBus.on(EVENT_TYPES.LANGUAGE_CHANGE, handleGlobalEvent);

    // 发送应用就绪事件
    globalEventBus.emit({
      type: 'APP_READY',
      source: 'react-settings',
      timestamp: new Date().toISOString(),
      id: `app-ready-${Date.now()}`,
      data: {
        appName: 'react-settings',
        version: '1.0.0',
        features: ['user-settings', 'system-config', 'preferences', 'notifications', 'security', 'language']
      }
    });

    // 初始化示例数据
    initializeSampleData();

    return () => {
      globalEventBus.off(EVENT_TYPES.THEME_CHANGE, handleGlobalEvent);
      globalEventBus.off(EVENT_TYPES.USER_LOGOUT, handleGlobalEvent);
      globalEventBus.off(EVENT_TYPES.LANGUAGE_CHANGE, handleGlobalEvent);
      
      globalLogger.info('Settings App unmounted');
    };
  }, []);

  /**
   * 初始化示例数据
   */
  const initializeSampleData = () => {
    // 初始化设置数据
    if (!settings.user.name) {
      settingsStore.user = {
        id: 'user_1',
        name: '张三',
        email: 'zhangsan@example.com',
        avatar: '/avatars/default.png',
        phone: '13800138000',
        department: '技术部',
        position: '前端工程师'
      };

      settingsStore.preferences = {
        theme: 'light',
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      };

      // 初始化通知设置
      settingsStore.notifications = {
        email: {
          system: true,
          marketing: false,
          security: true
        },
        push: {
          desktop: true,
          mobile: true,
          browser: false
        },
        schedule: {
          startTime: '09:00',
          endTime: '18:00',
          enabled: false
        },
        frequency: 'immediate',
        categories: {
          updates: true,
          reminders: true,
          alerts: true,
          promotions: false
        }
      };

      // 初始化安全设置
      settingsStore.security = {
        password: {
          lastChanged: new Date().toISOString(),
          requireStrong: true,
          expiryDays: 90
        },
        twoFactor: {
          enabled: false,
          method: 'app',
          backupCodes: []
        },
        sessions: {
          current: 'session-' + Date.now(),
          active: 1,
          maxSessions: 5
        },
        loginSecurity: {
          allowMultipleDevices: true,
          sessionTimeout: 30,
          requireVerification: false
        },
        devices: {
          trusted: []
        }
      };

      // 初始化语言设置
      settingsStore.languageSettings = {
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        dateFormat: 'YYYY-MM-DD',
        timeFormat: '24h',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: '¥'
        },
        rtl: false,
        fallbackLocale: 'en-US'
      };

      settingsStore.system = {
        siteName: 'Qiankun微前端系统',
        version: '1.0.0',
        apiUrl: 'https://api.example.com',
        cdnUrl: 'https://cdn.example.com',
        features: {
          darkMode: true,
          multiLanguage: true,
          notifications: true
        }
      };
    }
    
    globalLogger.info('Settings sample data initialized');
  };

  return (
    <>
      <Helmet>
        <title>设置中心 - React + Valtio</title>
        <meta name="description" content="基于React和Valtio的设置中心系统" />
      </Helmet>

      <Layout className="settings-app-layout">
        <AppHeader />
        
        <Layout>
          <AppSidebar />
          
          <Layout className="settings-app-content">
            <Content className="settings-app-main">
              <div className="settings-app-container">
                <Routes>
                  <Route path="/" element={<Navigate to="/general" replace />} />
                  <Route path="/general" element={<GeneralSettings />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route path="/system" element={<SystemConfig />} />
                  <Route path="/notifications" element={<NotificationSettings />} />
                  <Route path="/security" element={<SecuritySettings />} />
                  <Route path="/language" element={<LanguageSettings />} />
                  <Route path="*" element={<Navigate to="/general" replace />} />
                </Routes>
              </div>
            </Content>
            
            <AppFooter />
          </Layout>
        </Layout>
      </Layout>
    </>
  );
};

export default App;