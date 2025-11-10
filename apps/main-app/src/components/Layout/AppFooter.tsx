/**
 * 应用底部组件
 * 提供版权信息和链接
 */

import React from 'react';
import { Layout, Typography, Space, Divider } from 'antd';
import { GithubOutlined, HeartFilled } from '@ant-design/icons';
import './AppFooter.css';

const { Footer } = Layout;
const { Text, Link } = Typography;

/**
 * 应用底部组件
 */
const AppFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Footer className="app-footer">
      <div className="footer-content">
        <div className="footer-main">
          <Space split={<Divider type="vertical" />} size="middle">
            <Text type="secondary">
              © {currentYear} Qiankun微前端示例项目
            </Text>
            <Text type="secondary">
              Made with <HeartFilled className="heart-icon" /> by 罗杰
            </Text>
            <Link 
              href="https://github.com/your-username/qiankun-micro-frontend-demo" 
              target="_blank"
              className="github-link"
            >
              <GithubOutlined /> GitHub
            </Link>
          </Space>
        </div>
        
        <div className="footer-links">
          <Space split={<Divider type="vertical" />} size="small">
            <Link href="/docs" target="_blank">文档</Link>
            <Link href="/changelog" target="_blank">更新日志</Link>
            <Link href="/support" target="_blank">技术支持</Link>
          </Space>
        </div>
      </div>
    </Footer>
  );
};

export default AppFooter;