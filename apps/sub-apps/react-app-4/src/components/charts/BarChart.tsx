import React from 'react';
import ReactECharts from 'echarts-for-react';
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
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item[xField])
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '数值',
        type: 'bar',
        data: data.map(item => item[yField]),
        itemStyle: {
          color: typeof color === 'string' ? color : color[0]
        },
        label: {
          show: true,
          position: 'top'
        }
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

export default BarChart;