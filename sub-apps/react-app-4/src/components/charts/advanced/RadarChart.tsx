import React, { useRef, useEffect, useState } from 'react';
import { Card, Spin } from 'antd';

interface RadarDataPoint {
  category: string;
  value: number;
  maxValue?: number;
}

interface RadarSeries {
  name: string;
  data: RadarDataPoint[];
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
}

interface RadarProps {
  data: RadarSeries[];
  config?: {
    width?: number;
    height?: number;
    radius?: number;
    levels?: number;
    showGrid?: boolean;
    showLabels?: boolean;
    showValues?: boolean;
    showLegend?: boolean;
    enableAnimation?: boolean;
    animationDuration?: number;
    margin?: { top: number; right: number; bottom: number; left: number };
    title?: string;
    colorScheme?: string[];
  };
  onPointClick?: (series: RadarSeries, point: RadarDataPoint) => void;
}

interface ProcessedPoint {
  x: number;
  y: number;
  value: number;
  category: string;
  angle: number;
  radius: number;
}

const DEFAULT_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

export const RadarChart: React.FC<RadarProps> = ({
  data,
  config = {},
  onPointClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0);

  const {
    width = 600,
    height = 600,
    radius = 200,
    levels = 5,
    showGrid = true,
    showLabels = true,
    showValues = false,
    showLegend = true,
    enableAnimation = true,
    animationDuration = 1000,
    margin = { top: 50, right: 100, bottom: 50, left: 100 },
    title = 'Radar Chart',
    colorScheme = DEFAULT_COLORS
  } = config;

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(
    (width - margin.left - margin.right) / 2,
    (height - margin.top - margin.bottom) / 2,
    radius
  );

  useEffect(() => {
    if (!data.length) return;

    setLoading(false);
    
    if (enableAnimation) {
      animateChart();
    } else {
      setAnimationProgress(1);
    }
  }, [data, config]);

  const animateChart = () => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // 使用缓动函数
      const easeProgress = easeOutCubic(progress);
      setAnimationProgress(easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const processRadarData = (): ProcessedPoint[][] => {
    if (!data.length) return [];

    // 获取所有类别
    const allCategories = [...new Set(data.flatMap(series => series.data.map(d => d.category)))];
    const angleStep = (2 * Math.PI) / allCategories.length;

    // 计算全局最大值
    const globalMax = Math.max(...data.flatMap(series => 
      series.data.map(d => d.maxValue || d.value)
    ));

    return data.map(series => {
      return allCategories.map((category, index) => {
        const dataPoint = series.data.find(d => d.category === category);
        const value = dataPoint ? dataPoint.value : 0;
        const maxValue = dataPoint?.maxValue || globalMax;
        
        const normalizedValue = value / maxValue;
        const angle = index * angleStep - Math.PI / 2; // 从顶部开始
        const pointRadius = normalizedValue * maxRadius * animationProgress;
        
        return {
          x: centerX + pointRadius * Math.cos(angle),
          y: centerY + pointRadius * Math.sin(angle),
          value,
          category,
          angle,
          radius: pointRadius
        };
      });
    });
  };

  const generatePolygonPath = (points: ProcessedPoint[]): string => {
    if (points.length === 0) return '';
    
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`
    ).join(' ') + ' Z';
    
    return pathData;
  };

  const renderGrid = () => {
    if (!showGrid) return null;

    const allCategories = [...new Set(data.flatMap(series => series.data.map(d => d.category)))];
    const angleStep = (2 * Math.PI) / allCategories.length;

    return (
      <g className="radar-grid">
        {/* 同心圆 */}
        {Array.from({ length: levels }, (_, i) => {
          const levelRadius = ((i + 1) / levels) * maxRadius;
          return (
            <circle
              key={`level-${i}`}
              cx={centerX}
              cy={centerY}
              r={levelRadius}
              fill="none"
              stroke="#e0e0e0"
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {/* 射线 */}
        {allCategories.map((category, index) => {
          const angle = index * angleStep - Math.PI / 2;
          const endX = centerX + maxRadius * Math.cos(angle);
          const endY = centerY + maxRadius * Math.sin(angle);
          
          return (
            <line
              key={`ray-${index}`}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke="#e0e0e0"
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}
      </g>
    );
  };

  const renderLabels = () => {
    if (!showLabels) return null;

    const allCategories = [...new Set(data.flatMap(series => series.data.map(d => d.category)))];
    const angleStep = (2 * Math.PI) / allCategories.length;

    return (
      <g className="radar-labels">
        {allCategories.map((category, index) => {
          const angle = index * angleStep - Math.PI / 2;
          const labelRadius = maxRadius + 20;
          const x = centerX + labelRadius * Math.cos(angle);
          const y = centerY + labelRadius * Math.sin(angle);
          
          // 根据角度调整文本对齐
          let textAnchor = 'middle';
          if (Math.cos(angle) > 0.1) textAnchor = 'start';
          else if (Math.cos(angle) < -0.1) textAnchor = 'end';
          
          return (
            <text
              key={`label-${index}`}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              fontSize="12"
              fill="#333"
            >
              {category}
            </text>
          );
        })}
      </g>
    );
  };

  const renderLegend = () => {
    if (!showLegend || data.length <= 1) return null;

    const legendX = width - margin.right + 20;
    const legendY = margin.top;
    const itemHeight = 20;

    return (
      <g className="radar-legend">
        {data.map((series, index) => {
          const y = legendY + index * itemHeight;
          const color = series.color || colorScheme[index % colorScheme.length];
          
          return (
            <g key={`legend-${index}`}>
              <rect
                x={legendX}
                y={y - 6}
                width={12}
                height={12}
                fill={color}
                opacity={series.fillOpacity || 0.3}
                stroke={color}
                strokeWidth={2}
              />
              <text
                x={legendX + 18}
                y={y}
                fontSize="12"
                fill="#333"
                alignmentBaseline="middle"
              >
                {series.name}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  const renderValues = () => {
    if (!showValues) return null;

    const processedData = processRadarData();
    
    return (
      <g className="radar-values">
        {processedData.map((seriesPoints, seriesIndex) => {
          const color = data[seriesIndex].color || colorScheme[seriesIndex % colorScheme.length];
          
          return seriesPoints.map((point, pointIndex) => (
            <text
              key={`value-${seriesIndex}-${pointIndex}`}
              x={point.x}
              y={point.y - 10}
              textAnchor="middle"
              fontSize="10"
              fill={color}
              fontWeight="bold"
            >
              {point.value}
            </text>
          ));
        })}
      </g>
    );
  };

  const handlePointClick = (seriesIndex: number, pointIndex: number) => {
    const series = data[seriesIndex];
    const point = series.data[pointIndex];
    onPointClick?.(series, point);
  };

  if (loading) {
    return (
      <Card title={title}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  const processedData = processRadarData();

  return (
    <Card title={title} style={{ width: '100%' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block', margin: '0 auto' }}
      >
        {/* 标题 */}
        <text
          x={width / 2}
          y={30}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#333"
        >
          {title}
        </text>

        {/* 网格 */}
        {renderGrid()}

        {/* 数据区域 */}
        <g className="radar-areas">
          {processedData.map((seriesPoints, seriesIndex) => {
            const series = data[seriesIndex];
            const color = series.color || colorScheme[seriesIndex % colorScheme.length];
            const fillOpacity = series.fillOpacity || 0.3;
            
            return (
              <path
                key={`area-${seriesIndex}`}
                d={generatePolygonPath(seriesPoints)}
                fill={color}
                fillOpacity={fillOpacity}
                stroke={color}
                strokeWidth={series.strokeWidth || 2}
                strokeLinejoin="round"
              />
            );
          })}
        </g>

        {/* 数据点 */}
        <g className="radar-points">
          {processedData.map((seriesPoints, seriesIndex) => {
            const series = data[seriesIndex];
            const color = series.color || colorScheme[seriesIndex % colorScheme.length];
            
            return seriesPoints.map((point, pointIndex) => (
              <circle
                key={`point-${seriesIndex}-${pointIndex}`}
                cx={point.x}
                cy={point.y}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onClick={() => handlePointClick(seriesIndex, pointIndex)}
              >
                <title>{`${point.category}: ${point.value}`}</title>
              </circle>
            ));
          })}
        </g>

        {/* 标签 */}
        {renderLabels()}

        {/* 数值 */}
        {renderValues()}

        {/* 图例 */}
        {renderLegend()}
      </svg>
    </Card>
  );
};

export default RadarChart;