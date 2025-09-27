import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Progress, Typography, Space, Tag, Button } from 'antd';
import { 
  ThunderboltOutlined, 
  EyeOutlined, 
  ClockCircleOutlined,
  MemoryOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  componentCount: number;
}

interface PerformanceOptimizerProps {
  onOptimize?: (metrics: PerformanceMetrics) => void;
}

// 性能监控和优化组件
const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({ onOptimize }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    loadTime: 0,
    renderTime: 0,
    componentCount: 0
  });
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number>();
  
  // FPS 监控
  const measureFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
      frameCountRef.current = 0;
      lastTimeRef.current = now;
      
      setMetrics(prev => ({ ...prev, fps }));
    }
    
    animationFrameRef.current = requestAnimationFrame(measureFPS);
  }, []);
  
  // 内存使用监控
  const measureMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
      setMetrics(prev => ({ ...prev, memoryUsage }));
    }
  }, []);
  
  // 渲染性能监控
  const measureRenderTime = useCallback(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const renderEntries = entries.filter(entry => entry.entryType === 'measure');
      
      if (renderEntries.length > 0) {
        const avgRenderTime = renderEntries.reduce((sum, entry) => sum + entry.duration, 0) / renderEntries.length;
        setMetrics(prev => ({ ...prev, renderTime: Math.round(avgRenderTime) }));
      }
    });
    
    observer.observe({ entryTypes: ['measure'] });
    return () => observer.disconnect();
  }, []);
  
  // 组件数量统计
  const countComponents = useCallback(() => {
    const componentCount = document.querySelectorAll('[data-reactroot] *').length;
    setMetrics(prev => ({ ...prev, componentCount }));
  }, []);
  
  // 性能优化建议
  const getOptimizationSuggestions = (metrics: PerformanceMetrics) => {
    const suggestions = [];
    
    if (metrics.fps < 30) {
      suggestions.push({
        type: 'error',
        message: 'FPS过低，建议减少动画或使用虚拟化'
      });
    } else if (metrics.fps < 50) {
      suggestions.push({
        type: 'warning',
        message: 'FPS较低，可考虑优化渲染性能'
      });
    }
    
    if (metrics.memoryUsage > 80) {
      suggestions.push({
        type: 'error',
        message: '内存使用过高，建议检查内存泄漏'
      });
    } else if (metrics.memoryUsage > 60) {
      suggestions.push({
        type: 'warning',
        message: '内存使用较高，建议优化数据结构'
      });
    }
    
    if (metrics.renderTime > 100) {
      suggestions.push({
        type: 'error',
        message: '渲染时间过长，建议使用React.memo或useMemo'
      });
    } else if (metrics.renderTime > 50) {
      suggestions.push({
        type: 'warning',
        message: '渲染时间较长，可考虑组件优化'
      });
    }
    
    if (metrics.componentCount > 1000) {
      suggestions.push({
        type: 'warning',
        message: '组件数量较多，建议使用虚拟化或懒加载'
      });
    }
    
    return suggestions;
  };
  
  // 自动优化
  const performOptimization = async () => {
    setIsOptimizing(true);
    
    try {
      // 清理无用的事件监听器
      const cleanupListeners = () => {
        // 移除无用的事件监听器
        window.removeEventListener('resize', () => {});
        window.removeEventListener('scroll', () => {});
      };
      
      // 垃圾回收提示
      const suggestGC = () => {
        if ('gc' in window && typeof (window as any).gc === 'function') {
          (window as any).gc();
        }
      };
      
      // 优化图片加载
      const optimizeImages = () => {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (!img.loading) {
            img.loading = 'lazy';
          }
        });
      };
      
      // 执行优化
      cleanupListeners();
      optimizeImages();
      suggestGC();
      
      // 重新测量性能
      setTimeout(() => {
        measureMemory();
        countComponents();
        onOptimize?.(metrics);
      }, 1000);
      
    } finally {
      setTimeout(() => setIsOptimizing(false), 2000);
    }
  };
  
  useEffect(() => {
    // 启动性能监控
    measureFPS();
    measureMemory();
    countComponents();
    
    const cleanup = measureRenderTime();
    
    // 定期更新指标
    const interval = setInterval(() => {
      measureMemory();
      countComponents();
    }, 5000);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearInterval(interval);
      cleanup();
    };
  }, [measureFPS, measureMemory, measureRenderTime, countComponents]);
  
  const suggestions = getOptimizationSuggestions(metrics);
  
  return (
    <Card 
      title={
        <Space>
          <ThunderboltOutlined />
          <span>性能监控</span>
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<ReloadOutlined />}
          loading={isOptimizing}
          onClick={performOptimization}
        >
          优化
        </Button>
      }
      size="small"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* FPS 指标 */}
        <div>
          <Text strong>帧率 (FPS)</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress 
              percent={Math.min((metrics.fps / 60) * 100, 100)}
              strokeColor={metrics.fps >= 50 ? '#52c41a' : metrics.fps >= 30 ? '#faad14' : '#ff4d4f'}
              size="small"
              style={{ flex: 1 }}
            />
            <Text>{metrics.fps}</Text>
          </div>
        </div>
        
        {/* 内存使用 */}
        <div>
          <Text strong>内存使用</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress 
              percent={metrics.memoryUsage}
              strokeColor={metrics.memoryUsage < 60 ? '#52c41a' : metrics.memoryUsage < 80 ? '#faad14' : '#ff4d4f'}
              size="small"
              style={{ flex: 1 }}
            />
            <Text>{metrics.memoryUsage}%</Text>
          </div>
        </div>
        
        {/* 渲染时间 */}
        <div>
          <Space>
            <ClockCircleOutlined />
            <Text>渲染时间: {metrics.renderTime}ms</Text>
          </Space>
        </div>
        
        {/* 组件数量 */}
        <div>
          <Space>
            <EyeOutlined />
            <Text>组件数量: {metrics.componentCount}</Text>
          </Space>
        </div>
        
        {/* 优化建议 */}
        {suggestions.length > 0 && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>优化建议:</Text>
            <Space direction="vertical" size="small">
              {suggestions.map((suggestion, index) => (
                <Tag 
                  key={index}
                  color={suggestion.type === 'error' ? 'red' : 'orange'}
                >
                  {suggestion.message}
                </Tag>
              ))}
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default PerformanceOptimizer;