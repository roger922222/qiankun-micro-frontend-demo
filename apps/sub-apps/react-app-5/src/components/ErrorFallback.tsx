/**
 * 错误边界回退组件
 * 当应用发生错误时显示友好的错误页面
 */

import React from 'react';
import { Result, Button, Typography, Card, Space } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined, HomeOutlined } from '@ant-design/icons';
import { FallbackProps } from 'react-error-boundary';

const { Paragraph, Text } = Typography;

interface ErrorFallbackProps extends FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReset = () => {
    resetErrorBoundary();
  };

  // 开发环境显示详细错误信息
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="error-boundary">
      <Result
        status="error"
        icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
        title="应用发生错误"
        subTitle="很抱歉，应用遇到了一个意外错误。请尝试刷新页面或联系技术支持。"
        extra={
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleReset}>
                重试
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReload}>
                刷新页面
              </Button>
              <Button icon={<HomeOutlined />} onClick={handleGoHome}>
                返回首页
              </Button>
            </Space>
            
            {isDevelopment && (
              <Card
                title="错误详情 (开发模式)"
                size="small"
                style={{ textAlign: 'left', maxWidth: 600, margin: '0 auto' }}
              >
                <Paragraph>
                  <Text strong>错误消息:</Text>
                  <br />
                  <Text code>{error.message}</Text>
                </Paragraph>
                
                {error.stack && (
                  <Paragraph>
                    <Text strong>错误堆栈:</Text>
                    <br />
                    <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                      {error.stack}
                    </Text>
                  </Paragraph>
                )}
              </Card>
            )}
          </Space>
        }
      />
    </div>
  );
};

export default ErrorFallback;