import React from 'react';
import { Result, Button } from 'antd';
import { FallbackProps } from 'react-error-boundary';

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <Result
      status="error"
      title="应用出现错误"
      subTitle={error?.message || '未知错误'}
      extra={
        <Button type="primary" onClick={resetErrorBoundary}>
          重新加载
        </Button>
      }
    />
  );
};

export default ErrorFallback;