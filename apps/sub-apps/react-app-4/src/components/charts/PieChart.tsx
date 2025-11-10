import React from 'react';
import ReactECharts from 'echarts-for-react';
import { Spin } from 'antd';

export interface PieChartData {
  name: string;
  value: number;
}

export interface PieChartProps {
  data: PieChartData[];
  loading?: boolean;
  height?: number;
  angleField?: string;
  colorField?: string;
  radius?: number;
  innerRadius?: number;
  color?: string[];
  onDataUpdate?: (data: PieChartData[]) => void;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  loading = false,
  height = 300,
  angleField = 'value',
  colorField = 'name',
  radius = 0.8,
  innerRadius = 0.6,
  color = ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E86452'],
  onDataUpdate,
}) => {
  const config = {
    data,
    height,
    angleField,
    colorField,
    radius,
    innerRadius,
    color,
    label: {
      type: 'inner',
      offset: '-30%',
      content: ({ percent }: { percent: number }) => `${(percent * 100).toFixed(0)}%`,
      style: {
        fontSize: 14,
        textAlign: 'center',
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
    legend: {
      position: 'bottom' as const,
    },
    tooltip: {
      formatter: (datum: PieChartData) => {
        return { name: datum.name, value: datum.value };
      },
    },
  };

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <ReactECharts option={{
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: '数据',
        type: 'pie',
        radius: '50%',
        data: data.map(item => ({ name: item[colorField], value: item[angleField] })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }} style={{ height }} />;
};

export default PieChart;