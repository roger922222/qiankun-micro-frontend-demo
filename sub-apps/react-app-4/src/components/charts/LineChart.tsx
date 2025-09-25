import React from 'react';
import { Line } from '@ant-design/charts';
import { Spin } from 'antd';

export interface LineChartData {
  name: string;
  value: number;
  date?: string;
}

export interface LineChartProps {
  data: LineChartData[];
  loading?: boolean;
  height?: number;
  xField?: string;
  yField?: string;
  seriesField?: string;
  smooth?: boolean;
  color?: string | string[];
  onDataUpdate?: (data: LineChartData[]) => void;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  loading = false,
  height = 300,
  xField = 'name',
  yField = 'value',
  seriesField,
  smooth = true,
  color = '#1890ff',
  onDataUpdate,
}) => {
  const config = {
    data,
    height,
    xField,
    yField,
    seriesField,
    smooth,
    color,
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#aaa',
      },
    },
    tooltip: {
      showMarkers: true,
    },
    interactions: [
      {
        type: 'marker-active',
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

  return <Line {...config} />;
};

export default LineChart;