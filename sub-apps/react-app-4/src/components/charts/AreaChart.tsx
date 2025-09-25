import React from 'react';
import { Area } from '@ant-design/charts';
import { Spin } from 'antd';

export interface AreaChartData {
  name: string;
  value: number;
  date?: string;
  category?: string;
}

export interface AreaChartProps {
  data: AreaChartData[];
  loading?: boolean;
  height?: number;
  xField?: string;
  yField?: string;
  seriesField?: string;
  smooth?: boolean;
  color?: string | string[];
  onDataUpdate?: (data: AreaChartData[]) => void;
}

const AreaChart: React.FC<AreaChartProps> = ({
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
    areaStyle: {
      fillOpacity: 0.6,
    },
    line: {
      size: 2,
    },
    point: {
      size: 5,
      shape: 'diamond',
      style: {
        fill: 'white',
        stroke: typeof color === 'string' ? color : color[0],
        lineWidth: 2,
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

  return <Area {...config} />;
};

export default AreaChart;