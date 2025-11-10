# 前端性能优化指南

## 概述

本文档详细介绍了 React App 2 前端性能优化的各个方面，包括组件优化、渲染优化、资源优化、网络优化等，旨在提供一套完整的前端性能优化方案。

## 优化目标

1. **加载性能**: 减少首屏加载时间，提升用户体验
2. **运行性能**: 提高应用响应速度，减少卡顿
3. **资源优化**: 减少资源大小，提高加载效率
4. **网络优化**: 减少网络请求，优化数据传输
5. **用户体验**: 提供流畅的交互体验

## 性能指标

### 核心 Web 指标 (Core Web Vitals)

| 指标 | 良好 | 需要改进 | 较差 |
|------|------|----------|------|
| LCP (Largest Contentful Paint) | ≤2.5s | ≤4.0s | >4.0s |
| FID (First Input Delay) | ≤100ms | ≤300ms | >300ms |
| CLS (Cumulative Layout Shift) | ≤0.1 | ≤0.25 | >0.25 |
| FCP (First Contentful Paint) | ≤1.8s | ≤3.0s | >3.0s |
| TTI (Time to Interactive) | ≤3.8s | ≤7.3s | >7.3s |

### 自定义性能指标

- **组件渲染时间**: 单个组件渲染耗时
- **API 响应时间**: 接口请求响应耗时
- **状态更新延迟**: 用户操作到界面更新耗时
- **内存使用量**: 应用运行时的内存占用

## 组件优化

### 1. React.memo 优化

#### 基本使用
```typescript
import React from 'react';

interface ProductCardProps {
  product: Product;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
}

export const ProductCard = React.memo<ProductCardProps>(
  ({ product, onUpdate, onDelete }) => {
    // 组件实现
    return (
      <div className="product-card">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <span>{product.price}</span>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.updatedAt === nextProps.product.updatedAt &&
      prevProps.onUpdate === nextProps.onUpdate &&
      prevProps.onDelete === nextProps.onDelete
    );
  }
);

ProductCard.displayName = 'ProductCard';
```

#### 优化原则
1. **纯展示组件**: 只依赖 props，无内部状态
2. **昂贵渲染组件**: 渲染成本高的组件
3. **列表项组件**: 列表中的每个项目组件
4. **自定义比较**: 精确控制重新渲染条件

### 2. useMemo 优化

#### 复杂计算缓存
```typescript
import { useMemo } from 'react';

interface ProductListProps {
  products: Product[];
  filter: string;
  sortBy: 'name' | 'price' | 'stock';
  sortOrder: 'asc' | 'desc';
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  filter,
  sortBy,
  sortOrder
}) => {
  // 过滤和排序逻辑缓存
  const filteredAndSortedProducts = useMemo(() => {
    const startTime = performance.now();
    
    // 过滤逻辑
    let filtered = products;
    if (filter.trim()) {
      const searchTerm = filter.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
      );
    }
    
    // 排序逻辑
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = a.stock - b.stock;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    const endTime = performance.now();
    
    // 记录性能指标
    performanceMonitor.recordMetric('product_filter_sort', endTime - startTime);
    
    return sorted;
  }, [products, filter, sortBy, sortOrder]);
  
  return (
    <div className="product-list">
      {filteredAndSortedProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

#### 格式化函数缓存
```typescript
// 价格格式化缓存
const formatPrice = useMemo(() => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2
  });
}, []);

// 使用缓存的格式化函数
const formattedPrice = formatPrice.format(product.price);
```

### 3. useCallback 优化

#### 事件处理函数缓存
```typescript
import { useCallback } from 'react';

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: ''
  });
  
  // 表单提交处理函数缓存
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      // 表单验证
      const errors = validateForm(formData);
      if (Object.keys(errors).length > 0) {
        setErrors(errors);
        return;
      }
      
      // 提交表单
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitError('提交失败，请重试');
    }
  }, [formData, onSubmit]);
  
  // 输入变化处理函数缓存
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? parseFloat(value) || 0 : value
    }));
  }, []);
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        placeholder="产品名称"
      />
      {/* 其他表单项 */}
      <button type="submit">提交</button>
      <button type="button" onClick={onCancel}>取消</button>
    </form>
  );
};
```

## 虚拟滚动优化

### 1. 基本实现

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  offset: number;
  height: number;
}

export const useVirtualization = (itemCount: number, options: VirtualizationOptions) => {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 计算可见范围
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  // 生成虚拟项
  const virtualItems: VirtualItem[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      offset: i * itemHeight,
      height: itemHeight
    });
  }
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);
  
  return {
    containerRef,
    virtualItems,
    totalHeight: itemCount * itemHeight,
    handleScroll,
    scrollTop,
    startIndex,
    endIndex
  };
};
```

### 2. 组件实现

```typescript
import React from 'react';
import { useVirtualization } from '../hooks/useVirtualization';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3
}: VirtualListProps<T>) {
  const {
    containerRef,
    virtualItems,
    totalHeight,
    handleScroll
  } = useVirtualization(items.length, {
    itemHeight,
    containerHeight,
    overscan
  });
  
  return (
    <div
      ref={containerRef}
      className="virtual-list"
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.index}
              style={{
                position: 'absolute',
                top: virtualItem.offset,
                left: 0,
                width: '100%',
                height: virtualItem.height
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## 图片优化

### 1. 懒加载实现

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';

interface ImageOptimizationOptions {
  placeholder?: string;
  errorFallback?: string;
  loading?: 'lazy' | 'eager';
  threshold?: number;
}

interface ImageState {
  src: string;
  loaded: boolean;
  error: boolean;
  loading: boolean;
}

export const useImageOptimization = (
  src: string,
  options: ImageOptimizationOptions = {}
) => {
  const {
    placeholder = '/placeholder-image.jpg',
    errorFallback = '/error-image.jpg',
    loading = 'lazy',
    threshold = 0.1
  } = options;
  
  const [imageState, setImageState] = useState<ImageState>({
    src: placeholder,
    loaded: false,
    error: false,
    loading: true
  });
  
  const imgRef = useRef<HTMLImageElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const loadImage = useCallback(() => {
    if (!src) return;
    
    setImageState(prev => ({ ...prev, loading: true }));
    
    const img = new Image();
    imgRef.current = img;
    
    img.onload = () => {
      setImageState({
        src,
        loaded: true,
        error: false,
        loading: false
      });
    };
    
    img.onerror = () => {
      setImageState({
        src: errorFallback,
        loaded: false,
        error: true,
        loading: false
      });
    };
    
    img.src = src;
  }, [src, errorFallback]);
  
  const setupIntersectionObserver = useCallback((element: HTMLImageElement) => {
    if (loading !== 'lazy') {
      loadImage();
      return;
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        threshold,
        rootMargin: '50px'
      }
    );
    
    observerRef.current.observe(element);
  }, [loadImage, loading, threshold]);
  
  const onImageLoad = useCallback(() => {
    setImageState(prev => ({ ...prev, loading: false }));
  }, []);
  
  const onImageError = useCallback(() => {
    setImageState({
      src: errorFallback,
      loaded: false,
      error: true,
      loading: false
    });
  }, [errorFallback]);
  
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.onerror = null;
      }
    };
  }, []);
  
  return {
    ...imageState,
    setupIntersectionObserver,
    onImageLoad,
    onImageError,
    retry: loadImage
  };
};
```

### 2. 图片组件实现

```typescript
import React, { useEffect, useRef } from 'react';
import { useImageOptimization } from '../hooks/useImageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  errorFallback?: string;
  loading?: 'lazy' | 'eager';
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  placeholder,
  errorFallback,
  loading = 'lazy',
  threshold = 0.1,
  onLoad,
  onError
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const {
    src: currentSrc,
    loaded,
    error,
    loading: isLoading,
    setupIntersectionObserver,
    onImageLoad,
    onImageError
  } = useImageOptimization(src, {
    placeholder,
    errorFallback,
    loading,
    threshold
  });
  
  useEffect(() => {
    if (imgRef.current && loading === 'lazy') {
      setupIntersectionObserver(imgRef.current);
    }
  }, [setupIntersectionObserver, loading]);
  
  const handleLoad = () => {
    onImageLoad();
    onLoad?.();
  };
  
  const handleError = () => {
    onImageError();
    onError?.();
  };
  
  return (
    <div className={`optimized-image ${className || ''}`}>
      {isLoading && (
        <div className="image-loading">
          <div className="loading-spinner" />
        </div>
      )}
      
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
      
      {error && (
        <div className="image-error">
          <span>图片加载失败</span>
        </div>
      )}
    </div>
  );
};
```

### 3. 响应式图片

```typescript
import React from 'react';

interface ResponsiveImageProps {
  srcSet: string;
  sizes: string;
  alt: string;
  className?: string;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  srcSet,
  sizes,
  alt,
  className
}) => {
  return (
    <img
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
};

// 使用示例
const ProductImage = ({ product }: { product: Product }) => {
  const srcSet = `
    ${product.image.small} 320w,
    ${product.image.medium} 768w,
    ${product.image.large} 1200w
  `;
  
  const sizes = `
    (max-width: 320px) 280px,
    (max-width: 768px) 700px,
    1200px
  `;
  
  return (
    <ResponsiveImage
      srcSet={srcSet}
      sizes={sizes}
      alt={product.name}
      className="product-image"
    />
  );
};
```

## 代码分割优化

### 1. 路由级代码分割

```typescript
import React, { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// 路由组件懒加载
const ProductManagement = lazy(() => 
  import('../pages/ProductManagement').then(module => ({
    default: module.ProductManagement
  }))
);

const ProductList = lazy(() => 
  import('../pages/ProductList').then(module => ({
    default: module.ProductList
  }))
);

const ProductDetail = lazy(() => 
  import('../pages/ProductDetail').then(module => ({
    default: module.ProductDetail
  }))
);

const ProductForm = lazy(() => 
  import('../pages/ProductForm').then(module => ({
    default: module.ProductForm
  }))
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/products" element={<ProductManagement />}>
          <Route index element={<ProductList />} />
          <Route path="new" element={<ProductForm />} />
          <Route path=":id" element={<ProductDetail />} />
          <Route path=":id/edit" element={<ProductForm />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
```

### 2. 组件级代码分割

```typescript
import React, { lazy, Suspense } from 'react';

// 重型组件懒加载
const HeavyChart = lazy(() => 
  import('../components/charts/HeavyChart').then(module => ({
    default: module.HeavyChart
  }))
);

const DataVisualization = lazy(() => 
  import('../components/DataVisualization').then(module => ({
    default: module.DataVisualization
  }))
);

interface DashboardProps {
  showCharts?: boolean;
  showVisualization?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  showCharts = false,
  showVisualization = false
}) => {
  return (
    <div className="dashboard">
      <h1>产品仪表板</h1>
      
      {showCharts && (
        <Suspense fallback={<div>加载图表...</div>}>
          <HeavyChart />
        </Suspense>
      )}
      
      {showVisualization && (
        <Suspense fallback={<div>加载可视化...</div>}>
          <DataVisualization />
        </Suspense>
      )}
    </div>
  );
};
```

### 3. 预加载策略

```typescript
import React, { useEffect } from 'react';

// 智能预加载 Hook
export const usePreloadComponents = (routes: string[]) => {
  useEffect(() => {
    const preloadComponents = async () => {
      // 预加载用户可能访问的组件
      const preloadPromises = routes.map(route => {
        switch (route) {
          case 'product-form':
            return import('../components/ProductForm');
          case 'product-stats':
            return import('../components/ProductStats');
          case 'category-manager':
            return import('../components/CategoryManager');
          default:
            return Promise.resolve();
        }
      });
      
      try {
        await Promise.all(preloadPromises);
        console.log('Components preloaded successfully');
      } catch (error) {
        console.error('Failed to preload components:', error);
      }
    };
    
    // 延迟预加载，避免影响首屏加载
    const timer = setTimeout(preloadComponents, 3000);
    
    return () => clearTimeout(timer);
  }, [routes]);
};

// 使用示例
const App: React.FC = () => {
  // 预加载关键组件
  usePreloadComponents(['product-form', 'product-stats']);
  
  return (
    <div className="app">
      {/* 应用内容 */}
    </div>
  );
};
```

## 性能监控

### 1. Web Vitals 监控

```typescript
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  constructor() {
    this.initializeWebVitals();
  }
  
  private initializeWebVitals(): void {
    // LCP (Largest Contentful Paint)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        this.recordMetric('LCP', entry.startTime);
        this.checkThreshold('LCP', entry.startTime);
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // FID (First Input Delay)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });
    
    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.recordMetric('CLS', clsValue);
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  private checkThreshold(metric: string, value: number): void {
    const thresholds = {
      LCP: { good: 2500, needsImprovement: 4000 },
      FID: { good: 100, needsImprovement: 300 },
      CLS: { good: 0.1, needsImprovement: 0.25 }
    };
    
    const threshold = thresholds[metric as keyof typeof thresholds];
    if (threshold) {
      if (value > threshold.needsImprovement) {
        this.reportPerformanceIssue(metric, value, 'poor');
      } else if (value > threshold.good) {
        this.reportPerformanceIssue(metric, value, 'needs-improvement');
      }
    }
  }
  
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
    
    // 发送到监控系统
    this.sendToMonitoring(name, value);
  }
  
  private sendToMonitoring(name: string, value: number): void {
    // 实现发送到监控系统的逻辑
    console.log(`Metric: ${name}, Value: ${value}`);
  }
  
  private reportPerformanceIssue(metric: string, value: number, level: string): void {
    console.warn(`Performance issue detected: ${metric} = ${value} (${level})`);
  }
}
```

### 2. 组件性能监控

```typescript
// 组件渲染时间监控
export const measureComponentPerformance = (
  componentName: string,
  fn: () => void
) => {
  const startMark = `${componentName}-start`;
  const endMark = `${componentName}-end`;
  const measureName = `${componentName}-measure`;
  
  performance.mark(startMark);
  fn();
  performance.mark(endMark);
  performance.measure(measureName, startMark, endMark);
  
  const measure = performance.getEntriesByName(measureName)[0];
  
  // 记录性能指标
  performanceMonitor.recordMetric(`${componentName}-render`, measure.duration);
  
  // 清理标记
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);
  
  return measure.duration;
};

// 使用示例
const ProductList: React.FC<ProductListProps> = (props) => {
  return measureComponentPerformance('ProductList', () => {
    // 组件渲染逻辑
    return (
      <div className="product-list">
        {/* 组件内容 */}
      </div>
    );
  });
};
```

## 最佳实践

### 1. 优化原则

1. **测量优先**: 先测量性能问题，再针对性优化
2. **渐进优化**: 逐步优化，避免过度优化
3. **用户体验**: 以用户体验为核心，平衡性能和功能
4. **持续监控**: 持续监控性能指标，及时发现问题

### 2. 性能预算

```typescript
// 性能预算配置
const PERFORMANCE_BUDGET = {
  // 加载性能
  firstLoad: {
    js: 200 * 1024,      // 200KB
    css: 50 * 1024,      // 50KB
    images: 500 * 1024,  // 500KB
    total: 800 * 1024   // 800KB
  },
  
  // 运行时性能
  runtime: {
    firstPaint: 1000,    // 1秒
    firstContentfulPaint: 1500,  // 1.5秒
    timeToInteractive: 3000,     // 3秒
    largestContentfulPaint: 2500  // 2.5秒
  },
  
  // 内存使用
  memory: {
    maxHeapSize: 50 * 1024 * 1024,  // 50MB
    maxEventListeners: 100
  }
};
```

### 3. 优化检查清单

#### 加载性能
- [ ] 代码分割和懒加载
- [ ] 图片优化和懒加载
- [ ] 资源压缩和缓存
- [ ] CDN 加速
- [ ] 预加载关键资源

#### 运行性能
- [ ] React.memo 优化
- [ ] useMemo/useCallback 使用
- [ ] 虚拟滚动实现
- [ ] 事件监听器清理
- [ ] 内存泄漏检查

#### 网络优化
- [ ] 请求去重和缓存
- [ ] 批量请求处理
- [ ] 错误重试机制
- [ ] 超时处理
- [ ] 网络状态适配

#### 用户体验
- [ ] 加载状态展示
- [ ] 错误边界处理
- [ ] 骨架屏实现
- [ ] 渐进式加载
- [ ] 离线支持

## 性能测试

### 1. 测试工具

```bash
# Lighthouse CI
npm install -g lighthouse-ci
lighthouse-ci https://localhost:3002

# WebPageTest
npm install -g webpagetest
webpagetest test https://localhost:3002

# Chrome DevTools
# Performance 面板分析
# Network 面板分析
# Memory 面板分析
```

### 2. 自动化测试

```typescript
// 性能测试用例
describe('Performance Tests', () => {
  test('First Contentful Paint should be under 1.5s', async () => {
    const result = await measureFCP();
    expect(result).toBeLessThan(1500);
  });
  
  test('Largest Contentful Paint should be under 2.5s', async () => {
    const result = await measureLCP();
    expect(result).toBeLessThan(2500);
  });
  
  test('Component render time should be under 100ms', async () => {
    const renderTime = measureComponentRender('ProductList');
    expect(renderTime).toBeLessThan(100);
  });
});
```

## 总结

前端性能优化是一个持续的过程，需要：

1. **建立基准**: 了解当前性能状况
2. **设定目标**: 制定可衡量的性能目标
3. **持续监控**: 实时监控性能指标
4. **定期优化**: 定期审查和优化代码
5. **团队协作**: 建立性能优化文化

通过系统性的性能优化，React App 2 的性能得到了显著提升，为用户提供了更好的使用体验。