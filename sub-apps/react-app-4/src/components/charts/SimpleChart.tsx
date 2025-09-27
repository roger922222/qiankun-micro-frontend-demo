import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

export interface SimpleChartData {
  name: string;
  value: number;
  category?: string;
}

export interface SimpleChartProps {
  data: SimpleChartData[];
  loading?: boolean;
  height?: number;
  type?: 'line' | 'bar' | 'pie';
  color?: string | string[];
}

const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  loading = false,
  height = 300,
  type = 'line',
  color = '#1890ff',
}) => {
  const getOption = () => {
    const baseOption = {
      tooltip: {
        trigger: type === 'pie' ? 'item' : 'axis',
      },
      color: typeof color === 'string' ? [color] : color,
    };

    switch (type) {
      case 'pie':
        return {
          ...baseOption,
          series: [
            {
              type: 'pie',
              radius: '50%',
              data: data.map(item => ({ name: item.name, value: item.value })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }
          ]
        };
      case 'bar':
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: data.map(item => item.name)
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              type: 'bar',
              data: data.map(item => item.value)
            }
          ]
        };
      default: // line
        return {
          ...baseOption,
          xAxis: {
            type: 'category',
            data: data.map(item => item.name)
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              type: 'line',
              data: data.map(item => item.value),
              smooth: true
            }
          ]
        };
    }
  };

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <ReactECharts option={getOption()} style={{ height }} />;
};

export default SimpleChart;