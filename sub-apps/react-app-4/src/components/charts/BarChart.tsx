import React from 'react';
import { Column } from '@ant-design/charts';
import { Spin } from 'antd';

export interface BarChartData {
  name: string;
  value: number;
  category?: string;
}

export interface BarChartProps {
  data: BarChartData[];
  loading?: boolean;
  height?: number;
  xField?: string;
  yField?: string;
  seriesField?: string;
  color?: string | string[];
  onDataUpdate?: (data: BarChartData[]) => void;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  loading = false,
  height = 300,
  xField = 'name',
  yField = 'value',
  seriesField,
  color = '#1890ff',
  onDataUpdate,
}) => {
  const config = {
    data,
    height,
    xField,
    yField,
    seriesField,
    color,
    label: {
      position: 'middle' as const,
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      [yField]: {
        alias: '数值',
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
  };

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <Column {...config} />;
};

export default BarChart;