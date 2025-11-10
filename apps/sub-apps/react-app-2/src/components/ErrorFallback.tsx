/**
 * 错误边界回退组件
 */

import React from 'react';
import { Result, Button } from 'antd';
import { FallbackProps } from 'react-error-boundary';

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <Result
      status="500"
      title="应用发生错误"
      subTitle={error?.message || '抱歉，应用遇到了意外错误'}
      extra={
        <Button type="primary" onClick={resetErrorBoundary}>
          重新加载
        </Button>
      }
    />
  );
};

export default ErrorFallback;