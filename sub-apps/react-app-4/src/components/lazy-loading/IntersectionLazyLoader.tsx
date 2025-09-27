import React, { useState, useEffect, useRef, Suspense, ComponentType } from 'react';
import { Skeleton, Spin } from 'antd';

interface LazyComponentProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  rootMargin?: string;
  threshold?: number;
  preloadDistance?: number;
  enablePreload?: boolean;
  [key: string]: any;
}

interface LazyLoadState {
  isVisible: boolean;
  isPreloading: boolean;
  isLoaded: boolean;
  error: Error | null;
  Component: ComponentType<any> | null;
}

const DefaultFallback: React.FC = () => (
  <div style={{ padding: '20px' }}>
    <Skeleton active paragraph={{ rows: 4 }} />
  </div>
);

const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <p>组件加载失败: {error.message}</p>
    <button onClick={retry}>重试</button>
  </div>
);

export const IntersectionLazyLoader: React.FC<LazyComponentProps> = ({
  component: loadComponent,
  fallback: Fallback = DefaultFallback,
  errorFallback: ErrorFallback = DefaultErrorFallback,
  rootMargin = '100px',
  threshold = 0.1,
  preloadDistance = 200,
  enablePreload = true,
  ...componentProps
}) => {
  const [state, setState] = useState<LazyLoadState>({
    isVisible: false,
    isPreloading: false,
    isLoaded: false,
    error: null,
    Component: null
  });
  
  const ref = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 组件加载函数
  const loadComponentAsync = async () => {
    try {
      console.log('Loading lazy component...');
      const module = await loadComponent();
      setState(prev => ({
        ...prev,
        Component: module.default,
        isLoaded: true,
        error: null
      }));
    } catch (error) {
      console.error('Failed to load lazy component:', error);
      setState(prev => ({
        ...prev,
        error: error as Error,
        isLoaded: false
      }));
    }
  };

  // 重试函数
  const retry = () => {
    setState(prev => ({
      ...prev,
      error: null,
      isLoaded: false
    }));
    loadComponentAsync();
  };

  useEffect(() => {
    if (!ref.current) return;

    // 创建 Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        
        if (entry.isIntersecting && !state.isVisible) {
          setState(prev => ({ ...prev, isVisible: true }));
          
          // 立即加载组件
          if (!state.isLoaded && !state.error) {
            loadComponentAsync();
          }
          
          // 断开观察，避免重复触发
          if (observerRef.current) {
            observerRef.current.disconnect();
          }
        }
        
        // 预加载逻辑
        if (enablePreload && !state.isPreloading && !state.isLoaded) {
          const distance = entry.boundingClientRect.top;
          if (distance <= preloadDistance && distance > 0) {
            setState(prev => ({ ...prev, isPreloading: true }));
            console.log('Preloading component...');
            
            // 预加载组件代码（不渲染）
            loadComponent().then(() => {
              console.log('Component preloaded successfully');
            }).catch(error => {
              console.warn('Component preload failed:', error);
            });
          }
        }
      },
      { 
        rootMargin, 
        threshold: Array.isArray(threshold) ? threshold : [threshold]
      }
    );
    
    observerRef.current.observe(ref.current);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold, preloadDistance, enablePreload, state.isVisible, state.isPreloading, state.isLoaded]);

  // 渲染逻辑
  const renderContent = () => {
    if (state.error) {
      return <ErrorFallback error={state.error} retry={retry} />;
    }
    
    if (!state.isVisible) {
      return <Fallback />;
    }
    
    if (!state.Component) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Spin size="large" tip="正在加载组件..." />
        </div>
      );
    }
    
    return (
      <Suspense fallback={<Fallback />}>
        <state.Component {...componentProps} />
      </Suspense>
    );
  };

  return (
    <div 
      ref={ref} 
      style={{ minHeight: '100px' }}
      data-lazy-loader="intersection"
    >
      {renderContent()}
    </div>
  );
};

// 高阶组件版本
export function withIntersectionLazyLoading<P extends object>(
  loadComponent: () => Promise<{ default: ComponentType<P> }>,
  options: Partial<LazyComponentProps> = {}
) {
  return function LazyComponent(props: P) {
    return (
      <IntersectionLazyLoader
        component={loadComponent}
        {...options}
        {...props}
      />
    );
  };
}

// 路由级懒加载组件
interface RouteLazyLoaderProps extends LazyComponentProps {
  routePath: string;
  preloadRelatedRoutes?: string[];
}

export const RouteLazyLoader: React.FC<RouteLazyLoaderProps> = ({
  routePath,
  preloadRelatedRoutes = [],
  ...props
}) => {
  useEffect(() => {
    // 预加载相关路由
    if (preloadRelatedRoutes.length > 0) {
      const preloadTimer = setTimeout(() => {
        preloadRelatedRoutes.forEach(async (route) => {
          try {
            // 这里可以根据路由配置动态导入
            console.log(`Preloading related route: ${route}`);
          } catch (error) {
            console.warn(`Failed to preload route ${route}:`, error);
          }
        });
      }, 2000); // 2秒后开始预加载

      return () => clearTimeout(preloadTimer);
    }
  }, [preloadRelatedRoutes]);

  return <IntersectionLazyLoader {...props} />;
};

export default IntersectionLazyLoader;