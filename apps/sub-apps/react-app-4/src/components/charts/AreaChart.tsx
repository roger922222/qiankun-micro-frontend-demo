import React from 'react';
import ReactECharts from 'echarts-for-react';
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
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(item => item[xField])
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '数据',
        type: 'line',
        smooth: smooth,
        areaStyle: {
          opacity: 0.6,
          color: typeof color === 'string' ? color : color[0]
        },
        lineStyle: {
          width: 2,
          color: typeof color === 'string' ? color : color[0]
        },
        itemStyle: {
          color: typeof color === 'string' ? color : color[0]
        },
        data: data.map(item => item[yField])
      }
    ]
  };

  if (loading) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <ReactECharts option={option} style={{ height }} />;
};

export default AreaChart;