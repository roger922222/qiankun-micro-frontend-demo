import React, { useState, useEffect, ComponentType } from 'react';
import { Spin, Alert } from 'antd';
import { featureFlagManager } from '../../utils/ab-test-manager';

interface ABTestProps {
  testId: string;
  variants: {
    [key: string]: ComponentType<any>;
  };
  fallback?: ComponentType<any>;
  onExposure?: (variant: string, testId: string) => void;
  onConversion?: (metric: string, value?: number) => void;
  userId?: string;
  context?: any;
  loadingTimeout?: number;
  [key: string]: any;
}

interface ABTestState {
  variant: string;
  isLoading: boolean;
  error: string | null;
  isExposed: boolean;
}

const DefaultFallback: React.FC = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <Spin size="large" />
  </div>
);

const ErrorFallback: React.FC<{ error: string; testId: string }> = ({ error, testId }) => (
  <Alert
    message="A/B测试加载失败"
    description={`测试ID: ${testId} - ${error}`}
    type="error"
    showIcon
  />
);

export const ABTestWrapper: React.FC<ABTestProps> = ({
  testId,
  variants,
  fallback: Fallback = DefaultFallback,
  onExposure,
  onConversion,
  userId,
  context = {},
  loadingTimeout = 3000,
  ...componentProps
}) => {
  const [state, setState] = useState<ABTestState>({
    variant: 'control',
    isLoading: true,
    error: null,
    isExposed: false
  });

  useEffect(() => {
    initializeTest();
  }, [testId, userId]);

  const initializeTest = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // 设置加载超时
      const timeoutId = setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: '测试加载超时',
          variant: 'control'
        }));
      }, loadingTimeout);

      // 获取用户ID
      const effectiveUserId = userId || getCurrentUserId();
      if (!effectiveUserId) {
        throw new Error('无法获取用户ID');
      }

      // 获取测试变体
      const selectedVariant = featureFlagManager.getVariant(testId, effectiveUserId, context);
      
      clearTimeout(timeoutId);
      
      setState(prev => ({
        ...prev,
        variant: selectedVariant,
        isLoading: false,
        isExposed: true
      }));

      // 触发曝光回调
      if (onExposure && selectedVariant !== 'control') {
        onExposure(selectedVariant, testId);
      }

      // 记录分析事件
      recordAnalyticsEvent('ab_test_exposure', {
        testId,
        variant: selectedVariant,
        userId: effectiveUserId,
        context
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || '未知错误',
        variant: 'control'
      }));
    }
  };

  // 转化事件处理
  const handleConversion = (metric: string, value: number = 1) => {
    if (!state.isExposed) return;

    const effectiveUserId = userId || getCurrentUserId();
    if (!effectiveUserId) return;

    try {
      // 记录转化事件
      featureFlagManager.recordConversion(testId, effectiveUserId, metric, value);
      
      // 触发转化回调
      if (onConversion) {
        onConversion(metric, value);
      }

      // 记录分析事件
      recordAnalyticsEvent('ab_test_conversion', {
        testId,
        variant: state.variant,
        userId: effectiveUserId,
        metric,
        value
      });

      console.log(`Conversion recorded: ${testId} - ${state.variant} - ${metric}`);
    } catch (error) {
      console.error('Failed to record conversion:', error);
    }
  };

  // 渲染逻辑
  const renderContent = () => {
    if (state.error) {
      return <ErrorFallback error={state.error} testId={testId} />;
    }

    if (state.isLoading) {
      return <Fallback />;
    }

    // 获取变体组件
    const VariantComponent = variants[state.variant] || variants['control'];
    
    if (!VariantComponent) {
      console.warn(`No component found for variant: ${state.variant}`);
      return variants['control'] ? 
        React.createElement(variants['control'], { ...componentProps, onConversion: handleConversion }) :
        <ErrorFallback error={`变体 ${state.variant} 未找到对应组件`} testId={testId} />;
    }

    // 渲染变体组件并传入转化处理函数
    return React.createElement(VariantComponent, {
      ...componentProps,
      onConversion: handleConversion,
      variant: state.variant,
      testId
    });
  };

  return (
    <div data-ab-test={testId} data-variant={state.variant}>
      {renderContent()}
    </div>
  );
};

// 高阶组件版本
export function withABTest<P extends object>(
  testId: string,
  variants: { [key: string]: ComponentType<P> },
  options: Partial<ABTestProps> = {}
) {
  return function ABTestComponent(props: P) {
    return (
      <ABTestWrapper
        testId={testId}
        variants={variants}
        {...options}
        {...props}
      />
    );
  };
}

// Hook 版本
export function useABTest(testId: string, userId?: string, context: any = {}) {
  const [variant, setVariant] = useState<string>('control');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initTest = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const effectiveUserId = userId || getCurrentUserId();
        if (!effectiveUserId) {
          throw new Error('无法获取用户ID');
        }

        const selectedVariant = featureFlagManager.getVariant(testId, effectiveUserId, context);
        setVariant(selectedVariant);

        // 记录曝光
        recordAnalyticsEvent('ab_test_exposure', {
          testId,
          variant: selectedVariant,
          userId: effectiveUserId,
          context
        });

      } catch (err) {
        setError(err.message);
        setVariant('control');
      } finally {
        setIsLoading(false);
      }
    };

    initTest();
  }, [testId, userId]);

  const recordConversion = (metric: string, value: number = 1) => {
    const effectiveUserId = userId || getCurrentUserId();
    if (!effectiveUserId || variant === 'control') return;

    featureFlagManager.recordConversion(testId, effectiveUserId, metric, value);
    
    recordAnalyticsEvent('ab_test_conversion', {
      testId,
      variant,
      userId: effectiveUserId,
      metric,
      value
    });
  };

  return {
    variant,
    isLoading,
    error,
    recordConversion,
    isControl: variant === 'control'
  };
}

// 功能开关 Hook
export function useFeatureFlag(flagName: string, userId?: string, context: any = {}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFlag = async () => {
      try {
        setIsLoading(true);

        const effectiveUserId = userId || getCurrentUserId();
        if (!effectiveUserId) {
          setIsEnabled(false);
          return;
        }

        const enabled = featureFlagManager.isEnabled(flagName, effectiveUserId, context);
        setIsEnabled(enabled);

        // 记录功能开关使用
        if (enabled) {
          recordAnalyticsEvent('feature_flag_enabled', {
            flagName,
            userId: effectiveUserId,
            context
          });
        }

      } catch (error) {
        console.error(`Error checking feature flag ${flagName}:`, error);
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkFlag();
  }, [flagName, userId]);

  return { isEnabled, isLoading };
}

// 条件渲染组件
interface FeatureFlagProps {
  flagName: string;
  userId?: string;
  context?: any;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureFlag: React.FC<FeatureFlagProps> = ({
  flagName,
  userId,
  context = {},
  children,
  fallback = null
}) => {
  const { isEnabled, isLoading } = useFeatureFlag(flagName, userId, context);

  if (isLoading) {
    return <Spin size="small" />;
  }

  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

// 多变体测试组件
interface MultiVariantTestProps {
  testId: string;
  variants: Array<{
    name: string;
    component: ComponentType<any>;
    weight?: number;
  }>;
  userId?: string;
  context?: any;
  onExposure?: (variant: string) => void;
  [key: string]: any;
}

export const MultiVariantTest: React.FC<MultiVariantTestProps> = ({
  testId,
  variants,
  userId,
  context = {},
  onExposure,
  ...props
}) => {
  const variantMap = variants.reduce((acc, variant) => {
    acc[variant.name] = variant.component;
    return acc;
  }, {} as { [key: string]: ComponentType<any> });

  return (
    <ABTestWrapper
      testId={testId}
      variants={variantMap}
      userId={userId}
      context={context}
      onExposure={onExposure}
      {...props}
    />
  );
};

// 工具函数
function getCurrentUserId(): string {
  // 从localStorage、cookie或认证系统获取用户ID
  try {
    const stored = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (stored) return stored;

    // 生成临时用户ID
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('userId', tempId);
    return tempId;
  } catch {
    return `fallback_${Date.now()}`;
  }
}

function recordAnalyticsEvent(eventName: string, properties: any): void {
  // 记录分析事件到analytics系统
  try {
    // 这里应该调用实际的analytics SDK
    console.log(`Analytics Event: ${eventName}`, properties);
    
    // 示例：发送到Google Analytics
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', eventName, properties);
    }
    
    // 示例：发送到自定义analytics端点
    if (typeof fetch !== 'undefined') {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, properties })
      }).catch(error => {
        console.warn('Failed to send analytics event:', error);
      });
    }
  } catch (error) {
    console.warn('Analytics recording failed:', error);
  }
}

export default ABTestWrapper;