/**
 * 错误边界回退组件
 * 当应用发生错误时显示的页面
 */

import React from 'react';
import { Result, Button, Typography, Card } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { FallbackProps } from 'react-error-boundary';

const { Paragraph, Text } = Typography;

/**
 * 错误回退组件
 */
const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
    resetErrorBoundary();
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div style={{ 
      padding: '50px 20px', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '60vh'
    }}>
      <Card style={{ maxWidth: 600, width: '100%' }}>
        <Result
          status="error"
          title="应用发生错误"
          subTitle="抱歉，应用运行时发生了意外错误。您可以尝试刷新页面或返回首页。"
          extra={[
            <Button type="primary" key="reload" icon={<ReloadOutlined />} onClick={handleReload}>
              刷新页面
            </Button>,
            <Button key="home" icon={<HomeOutlined />} onClick={handleGoHome}>
              返回首页
            </Button>
          ]}
        >
          {error && (
            <div style={{ marginTop: 16 }}>
              <Paragraph>
                <Text strong>错误详情：</Text>
              </Paragraph>
              <Paragraph>
                <Text code copyable style={{ fontSize: '12px' }}>
                  {error.message}
                </Text>
              </Paragraph>
              {process.env.NODE_ENV === 'development' && error.stack && (
                <Paragraph>
                  <Text strong>错误堆栈：</Text>
                  <pre style={{ 
                    fontSize: '11px', 
                    background: '#f5f5f5', 
                    padding: '8px', 
                    borderRadius: '4px',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {error.stack}
                  </pre>
                </Paragraph>
              )}
            </div>
          )}
        </Result>
      </Card>
    </div>
  );
};

export default ErrorFallback;