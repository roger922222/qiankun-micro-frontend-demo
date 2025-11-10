import React, { useRef, useEffect, useState } from 'react';
import { Card, Tooltip, Spin } from 'antd';

interface HeatmapDataPoint {
  x: number | string;
  y: number | string;
  value: number;
  label?: string;
}

interface HeatmapProps {
  data: HeatmapDataPoint[];
  config?: {
    width?: number;
    height?: number;
    colorScale?: 'viridis' | 'plasma' | 'inferno' | 'magma' | 'blues' | 'reds';
    interpolation?: 'nearest' | 'bilinear' | 'bicubic';
    showLabels?: boolean;
    showTooltip?: boolean;
    margin?: { top: number; right: number; bottom: number; left: number };
    xAxisLabel?: string;
    yAxisLabel?: string;
    title?: string;
  };
  onCellClick?: (dataPoint: HeatmapDataPoint) => void;
  onCellHover?: (dataPoint: HeatmapDataPoint | null) => void;
}

interface ColorScale {
  [key: string]: string[];
}

const COLOR_SCALES: ColorScale = {
  viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  plasma: ['#0d0887', '#6a00a8', '#b12a90', '#e16462', '#fca636', '#f0f921'],
  inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fca50a', '#fcffa4'],
  magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
  blues: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c'],
  reds: ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d']
};

export const HeatmapChart: React.FC<HeatmapProps> = ({
  data,
  config = {},
  onCellClick,
  onCellHover
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<HeatmapDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const {
    width = 800,
    height = 600,
    colorScale = 'viridis',
    interpolation = 'bilinear',
    showLabels = false,
    showTooltip = true,
    margin = { top: 50, right: 50, bottom: 50, left: 50 },
    xAxisLabel = 'X Axis',
    yAxisLabel = 'Y Axis',
    title = 'Heatmap'
  } = config;

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    canvas.width = width;
    canvas.height = height;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 渲染热力图
    renderHeatmap(ctx);
    setLoading(false);
  }, [data, config]);

  const renderHeatmap = (ctx: CanvasRenderingContext2D) => {
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // 获取数据范围
    const xValues = [...new Set(data.map(d => d.x))].sort();
    const yValues = [...new Set(data.map(d => d.y))].sort();
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const cellWidth = chartWidth / xValues.length;
    const cellHeight = chartHeight / yValues.length;

    // 创建数据映射
    const dataMap = new Map<string, HeatmapDataPoint>();
    data.forEach(d => {
      dataMap.set(`${d.x}-${d.y}`, d);
    });

    // 绘制热力图单元格
    yValues.forEach((yVal, yIndex) => {
      xValues.forEach((xVal, xIndex) => {
        const dataPoint = dataMap.get(`${xVal}-${yVal}`);
        const value = dataPoint ? dataPoint.value : 0;
        
        const x = margin.left + xIndex * cellWidth;
        const y = margin.top + yIndex * cellHeight;

        // 计算颜色
        const color = getColorFromValue(value, minValue, maxValue, colorScale);
        
        // 绘制单元格
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellWidth, cellHeight);

        // 绘制边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);

        // 绘制标签
        if (showLabels && dataPoint) {
          ctx.fillStyle = getContrastColor(color);
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const text = dataPoint.label || value.toFixed(2);
          ctx.fillText(text, x + cellWidth / 2, y + cellHeight / 2);
        }
      });
    });

    // 绘制坐标轴
    drawAxes(ctx, xValues, yValues, chartWidth, chartHeight);
    
    // 绘制标题
    drawTitle(ctx);
    
    // 绘制图例
    drawColorLegend(ctx, minValue, maxValue, colorScale);
  };

  const drawAxes = (
    ctx: CanvasRenderingContext2D,
    xValues: any[],
    yValues: any[],
    chartWidth: number,
    chartHeight: number
  ) => {
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const cellWidth = chartWidth / xValues.length;
    const cellHeight = chartHeight / yValues.length;

    // X轴标签
    xValues.forEach((val, index) => {
      const x = margin.left + index * cellWidth + cellWidth / 2;
      const y = height - margin.bottom + 10;
      ctx.fillText(String(val), x, y);
    });

    // Y轴标签
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yValues.forEach((val, index) => {
      const x = margin.left - 10;
      const y = margin.top + index * cellHeight + cellHeight / 2;
      ctx.fillText(String(val), x, y);
    });

    // 轴标题
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(xAxisLabel, width / 2, height - 20);

    // Y轴标题（旋转）
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
  };

  const drawTitle = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, width / 2, 10);
  };

  const drawColorLegend = (
    ctx: CanvasRenderingContext2D,
    minValue: number,
    maxValue: number,
    colorScale: string
  ) => {
    const legendWidth = 20;
    const legendHeight = 200;
    const legendX = width - 40;
    const legendY = margin.top;

    // 绘制渐变色条
    const gradient = ctx.createLinearGradient(0, legendY, 0, legendY + legendHeight);
    const colors = COLOR_SCALES[colorScale];
    
    colors.forEach((color, index) => {
      gradient.addColorStop(index / (colors.length - 1), color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

    // 绘制边框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // 绘制刻度
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = legendY + (i / steps) * legendHeight;
      const value = maxValue - (i / steps) * (maxValue - minValue);
      
      ctx.fillText(value.toFixed(1), legendX + legendWidth + 5, y);
      
      // 绘制刻度线
      ctx.beginPath();
      ctx.moveTo(legendX + legendWidth, y);
      ctx.lineTo(legendX + legendWidth + 3, y);
      ctx.stroke();
    }
  };

  const getColorFromValue = (
    value: number,
    minValue: number,
    maxValue: number,
    colorScale: string
  ): string => {
    const normalized = (value - minValue) / (maxValue - minValue);
    const colors = COLOR_SCALES[colorScale];
    
    if (normalized <= 0) return colors[0];
    if (normalized >= 1) return colors[colors.length - 1];
    
    const index = normalized * (colors.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    
    if (lowerIndex === upperIndex) {
      return colors[lowerIndex];
    }
    
    // 线性插值
    const ratio = index - lowerIndex;
    return interpolateColor(colors[lowerIndex], colors[upperIndex], ratio);
  };

  const interpolateColor = (color1: string, color2: string, ratio: number): string => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const getContrastColor = (backgroundColor: string): string => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setMousePosition({ x: event.clientX, y: event.clientY });

    // 计算鼠标位置对应的数据点
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const xValues = [...new Set(data.map(d => d.x))].sort();
    const yValues = [...new Set(data.map(d => d.y))].sort();
    
    const cellWidth = chartWidth / xValues.length;
    const cellHeight = chartHeight / yValues.length;

    const cellX = Math.floor((x - margin.left) / cellWidth);
    const cellY = Math.floor((y - margin.top) / cellHeight);

    if (cellX >= 0 && cellX < xValues.length && cellY >= 0 && cellY < yValues.length) {
      const xVal = xValues[cellX];
      const yVal = yValues[cellY];
      const dataPoint = data.find(d => d.x === xVal && d.y === yVal);
      
      if (dataPoint) {
        setHoveredCell(dataPoint);
        onCellHover?.(dataPoint);
      } else {
        setHoveredCell(null);
        onCellHover?.(null);
      }
    } else {
      setHoveredCell(null);
      onCellHover?.(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCell(null);
    onCellHover?.(null);
  };

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredCell && onCellClick) {
      onCellClick(hoveredCell);
    }
  };

  return (
    <Card title={title} style={{ width: '100%' }}>
      <div ref={containerRef} style={{ position: 'relative' }}>
        {loading && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}>
            <Spin size="large" />
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          style={{ 
            cursor: hoveredCell ? 'pointer' : 'default',
            display: 'block',
            margin: '0 auto'
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
        
        {showTooltip && hoveredCell && (
          <div
            style={{
              position: 'fixed',
              left: mousePosition.x + 10,
              top: mousePosition.y - 10,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              pointerEvents: 'none',
              zIndex: 1000,
              whiteSpace: 'nowrap'
            }}
          >
            <div>X: {hoveredCell.x}</div>
            <div>Y: {hoveredCell.y}</div>
            <div>Value: {hoveredCell.value.toFixed(2)}</div>
            {hoveredCell.label && <div>Label: {hoveredCell.label}</div>}
          </div>
        )}
      </div>
    </Card>
  );
};

export default HeatmapChart;