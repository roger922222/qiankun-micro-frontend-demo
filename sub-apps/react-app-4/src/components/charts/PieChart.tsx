import React from 'react';
import { Pie } from '@ant-design/charts';
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

  return <Pie {...config} />;
};

export default PieChart;