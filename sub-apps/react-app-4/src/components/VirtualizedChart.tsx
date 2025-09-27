import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { throttle } from 'lodash';
import { LineChart, AreaChart, BarChart } from './charts';
import { Spin } from 'antd';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface VirtualizedChartProps {
  data: ChartData[];
  height: number;
  itemHeight?: number;
  renderThreshold?: number;
  chartType?: 'line' | 'area' | 'bar';
  color?: string;
  smooth?: boolean;
  loading?: boolean;
}

// LTTB (Largest-Triangle-Three-Buckets) 数据采样算法
const sampleDataLTTB = (data: ChartData[], threshold: number): ChartData[] => {
  if (data.length <= threshold) return data;
  
  const sampledData: ChartData[] = [];
  const bucketSize = (data.length - 2) / (threshold - 2);
  
  // 添加第一个点
  sampledData.push(data[0]);
  
  let a = 0; // 当前选中的点
  
  for (let i = 0; i < threshold - 2; i++) {
    // 计算下一个桶的平均点
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    const avgRangeLength = avgRangeEnd - avgRangeStart;
    
    let avgX = 0;
    let avgY = 0;
    
    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += j;
      avgY += data[j].value;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;
    
    // 在当前桶中找到面积最大的三角形
    const rangeOffs = Math.floor(i * bucketSize) + 1;
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1;
    
    let maxArea = -1;
    let maxAreaPoint = rangeOffs;
    
    for (let j = rangeOffs; j < rangeTo; j++) {
      const area = Math.abs(
        (data[a].value - avgY) * (j - avgX) - 
        (a - avgX) * (data[j].value - avgY)
      ) * 0.5;
      
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = j;
      }
    }
    
    sampledData.push(data[maxAreaPoint]);
    a = maxAreaPoint;
  }
  
  // 添加最后一个点
  sampledData.push(data[data.length - 1]);
  
  return sampledData;
};

const VirtualizedChart: React.FC<VirtualizedChartProps> = ({
  data,
  height,
  itemHeight = 50,
  renderThreshold = 1000,
  chartType = 'line',
  color = '#1890ff',
  smooth = false,
  loading = false
}) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 判断是否需要虚拟化
  const shouldVirtualize = data.length > renderThreshold;
  
  // 数据采样优化
  const processedData = useMemo(() => {
    if (data.length <= 500) return data;
    
    // 使用 LTTB 算法进行数据采样
    return sampleDataLTTB(data, 500);
  }, [data]);
  
  // 虚拟化数据
  const visibleData = useMemo(() => {
    if (!shouldVirtualize) return processedData;
    return processedData.slice(visibleRange.start, visibleRange.end);
  }, [processedData, shouldVirtualize, visibleRange]);
  
  // 滚动处理
  const handleScroll = useCallback(
    throttle((scrollTop: number) => {
      if (shouldVirtualize) {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(
          start + Math.ceil(height / itemHeight) + 10, // 预加载10个项目
          processedData.length
        );
        setVisibleRange({ start, end });
      }
    }, 16), // 60fps
    [processedData.length, itemHeight, height, shouldVirtualize]
  );
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const onScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      handleScroll(target.scrollTop);
    };
    
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, [handleScroll]);
  
  // 渲染图表组件
  const renderChart = () => {
    const chartProps = {
      data: visibleData,
      height: shouldVirtualize ? height - 20 : height,
      color,
      smooth,
      loading
    };
    
    switch (chartType) {
      case 'area':
        return <AreaChart {...chartProps} />;
      case 'bar':
        return <BarChart {...chartProps} />;
      case 'line':
      default:
        return <LineChart {...chartProps} />;
    }
  };
  
  if (loading) {
    return (
      <div style={{ 
        height, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Spin size="large" />
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        height, 
        overflow: shouldVirtualize ? 'auto' : 'hidden',
        position: 'relative'
      }}
    >
      {shouldVirtualize && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 10,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10
        }}>
          显示 {visibleRange.start + 1}-{Math.min(visibleRange.end, processedData.length)} / {data.length}
        </div>
      )}
      
      {shouldVirtualize ? (
        <div style={{ height: processedData.length * itemHeight }}>
          <div style={{
            transform: `translateY(${visibleRange.start * itemHeight}px)`,
            height: (visibleRange.end - visibleRange.start) * itemHeight
          }}>
            {renderChart()}
          </div>
        </div>
      ) : (
        renderChart()
      )}
      
      {data.length > 500 && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          数据已采样: {processedData.length}/{data.length}
        </div>
      )}
    </div>
  );
};

export default VirtualizedChart;