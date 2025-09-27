/**
 * 应用底部组件
 * 显示版权信息和系统状态
 */

import React from 'react';
import { Layout, Typography, Space, Divider } from 'antd';
import { useSnapshot } from 'valtio';

import { settingsStore } from '../../store/settingsStore';

const { Footer } = Layout;
const { Text, Link } = Typography;

const AppFooter: React.FC = () => {
  const settings = useSnapshot(settingsStore);
  const currentYear = new Date().getFullYear();

  return (
    <Footer className="settings-app-footer">
      <Space split={<Divider type="vertical" />} size="small">
        <Text>
          © {currentYear} {settings.system.siteName || 'Qiankun微前端系统'}
        </Text>
        
        <Text>
          版本 {settings.system.version || '1.0.0'}
        </Text>
        
        <Text>
          React设置中心 - 基于Valtio状态管理
        </Text>
        
        <Link href="#" onClick={(e) => e.preventDefault()}>
          帮助文档
        </Link>
        
        <Link href="#" onClick={(e) => e.preventDefault()}>
          技术支持
        </Link>
      </Space>
    </Footer>
  );
};

export default AppFooter;