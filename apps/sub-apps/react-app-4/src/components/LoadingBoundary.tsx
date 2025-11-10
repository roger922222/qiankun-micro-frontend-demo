import React, { Suspense, Component, ReactNode } from 'react';
import { Spin, Alert, Button, Card } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

interface LoadingBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface LoadingBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

// 高级加载边界组件，结合错误边界和 Suspense
class LoadingBoundary extends Component<LoadingBoundaryProps, LoadingBoundaryState> {
  private retryTimer?: NodeJS.Timeout;
  
  constructor(props: LoadingBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<LoadingBoundaryState> {
    return {
      hasError: true,
      error
    };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.error('LoadingBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }
  
  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }
  
  handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    
    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: undefined,
        retryCount: retryCount + 1
      });
      
      // 延迟重试，避免立即失败
      this.retryTimer = setTimeout(() => {
        // 强制重新渲染
        this.forceUpdate();
      }, 1000);
    }
  };
  
  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      retryCount: 0
    });
  };
  
  render() {
    const { children, fallback } = this.props;
    const { hasError, error, retryCount } = this.state;
    
    if (hasError) {
      const maxRetries = 3;
      const canRetry = retryCount < maxRetries;
      
      return (
        <Card style={{ margin: '20px 0' }}>
          <Alert
            message="组件加载失败"
            description={
              <div>
                <p>组件在加载过程中发生错误，请尝试刷新页面或联系技术支持。</p>
                {error && (
                  <details style={{ marginTop: 8 }}>
                    <summary>错误详情</summary>
                    <pre style={{ 
                      background: '#f5f5f5', 
                      padding: 8, 
                      borderRadius: 4,
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {error.message}
                      {error.stack && `\n\n${error.stack}`}
                    </pre>
                  </details>
                )}
                <div style={{ marginTop: 16 }}>
                  {canRetry ? (
                    <Button 
                      type="primary" 
                      icon={<ReloadOutlined />}
                      onClick={this.handleRetry}
                    >
                      重试 ({retryCount}/{maxRetries})
                    </Button>
                  ) : (
                    <Button 
                      type="default" 
                      icon={<ExclamationCircleOutlined />}
                      onClick={this.handleReset}
                    >
                      重置组件
                    </Button>
                  )}
                </div>
              </div>
            }
            type="error"
            showIcon
          />
        </Card>
      );
    }
    
    return (
      <Suspense 
        fallback={
          fallback || (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px',
              flexDirection: 'column'
            }}>
              <Spin size="large" />
              <div style={{ marginTop: 16, color: '#666' }}>
                组件加载中...
              </div>
            </div>
          )
        }
      >
        {children}
      </Suspense>
    );
  }
}

export default LoadingBoundary;