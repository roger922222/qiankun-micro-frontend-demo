import React, { useState, useEffect } from 'react';
import { Alert, Button, Spin } from 'antd';
import FilePreview from './FilePreview';

interface StyleSafeFilePreviewProps {
  file: File | null;
  fileType: 'PDF' | 'Word' | 'Excel' | 'CSV';
  onError?: (error: string) => void;
}

const StyleSafeFilePreview: React.FC<StyleSafeFilePreviewProps> = ({ file, fileType, onError }) => {
  const [hasStyleError, setHasStyleError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // 监听样式加载错误
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('contains') || 
          event.error?.message?.includes('CSS') ||
          event.error?.message?.includes('stylesheet')) {
        setHasStyleError(true);
        onError?.('样式加载失败，正在重试...');
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  const handleRetry = () => {
    setHasStyleError(false);
    setRetryCount(prev => prev + 1);
    // 强制刷新组件
    window.location.reload();
  };

  if (hasStyleError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Alert
          message="样式加载失败"
          description="由于微前端环境限制，样式加载出现问题。请重试或刷新页面。"
          type="warning"
          action={
            <Button type="primary" size="small" onClick={handleRetry}>
              重试 {retryCount > 0 ? `(${retryCount})` : ''}
            </Button>
          }
          style={{ marginBottom: '16px' }}
        />
        <div style={{ marginTop: '20px' }}>
          <Spin />
          <p style={{ marginTop: '10px', color: '#666' }}>
            正在尝试重新加载样式...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div key={retryCount}>
      <FilePreview 
        file={file} 
        fileType={fileType} 
        onError={(error) => {
          if (error.includes('contains') || error.includes('CSS')) {
            setHasStyleError(true);
          }
          onError?.(error);
        }}
      />
    </div>
  );
};

export default StyleSafeFilePreview;