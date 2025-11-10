import React, { useState } from 'react';
import { Card, Row, Col, Typography, Select, DatePicker, Space, Button } from 'antd';
import { LineChart, PieChart, BarChart, AreaChart } from '../components/charts';
import { DownloadOutlined, SettingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface ChartConfig {
  type: 'line' | 'pie' | 'bar' | 'area';
  title: string;
  data: any[];
}

const Visualization: React.FC = () => {
  const [selectedChart, setSelectedChart] = useState<string>('sales');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);

  // 模拟数据
  const chartConfigs: Record<string, ChartConfig> = {
    sales: {
      type: 'line',
      title: '销售趋势',
      data: [
        { name: '1月', value: 4000 },
        { name: '2月', value: 3000 },
        { name: '3月', value: 2000 },
        { name: '4月', value: 2780 },
        { name: '5月', value: 1890 },
        { name: '6月', value: 2390 },
        { name: '7月', value: 3490 },
      ],
    },
    users: {
      type: 'pie',
      title: '用户分布',
      data: [
        { name: '新用户', value: 6800 },
        { name: '老用户', value: 4480 },
        { name: '活跃用户', value: 3200 },
        { name: '流失用户', value: 1200 },
      ],
    },
    products: {
      type: 'bar',
      title: '产品销量',
      data: [
        { name: '产品A', value: 320 },
        { name: '产品B', value: 280 },
        { name: '产品C', value: 220 },
        { name: '产品D', value: 180 },
        { name: '产品E', value: 150 },
      ],
    },
    revenue: {
      type: 'area',
      title: '收入趋势',
      data: [
        { name: '1月', value: 45000 },
        { name: '2月', value: 52000 },
        { name: '3月', value: 48000 },
        { name: '4月', value: 61000 },
        { name: '5月', value: 55000 },
        { name: '6月', value: 67000 },
        { name: '7月', value: 73000 },
      ],
    },
  };

  const renderChart = (config: ChartConfig) => {
    const commonProps = {
      data: config.data,
      height: 400,
    };

    switch (config.type) {
      case 'line':
        return <LineChart {...commonProps} color="#1890ff" />;
      case 'pie':
        return <PieChart {...commonProps} color={['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16']} />;
      case 'bar':
        return <BarChart {...commonProps} color="#52c41a" />;
      case 'area':
        return <AreaChart {...commonProps} color="#722ed1" />;
      default:
        return null;
    }
  };

  const handleExport = () => {
    // 模拟导出功能
    console.log('导出图表数据');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>图表可视化</Title>

      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span>选择图表类型：</span>
              <Select
                style={{ width: '100%' }}
                value={selectedChart}
                onChange={setSelectedChart}
                options={[
                  { label: '销售趋势', value: 'sales' },
                  { label: '用户分布', value: 'users' },
                  { label: '产品销量', value: 'products' },
                  { label: '收入趋势', value: 'revenue' },
                ]}
              />
            </Space>
          </Col>
          <Col span={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span>时间范围：</span>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              />
            </Space>
          </Col>
          <Col span={10}>
            <Space style={{ float: 'right' }}>
              <Button icon={<SettingOutlined />}>
                配置
              </Button>
              <Button 
                type="primary" 
                icon={<DownloadOutlined />}
                onClick={handleExport}
              >
                导出
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={16}>
          <Card title={chartConfigs[selectedChart].title} bordered={false}>
            {renderChart(chartConfigs[selectedChart])}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="图表配置" bordered={false} style={{ marginBottom: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <strong>图表类型：</strong>
                <span style={{ textTransform: 'capitalize' }}>
                  {chartConfigs[selectedChart].type}
                </span>
              </div>
              <div>
                <strong>数据点数：</strong>
                <span>{chartConfigs[selectedChart].data.length}</span>
              </div>
              <div>
                <strong>更新时间：</strong>
                <span>{dayjs().format('YYYY-MM-DD HH:mm:ss')}</span>
              </div>
            </Space>
          </Card>

          <Card title="快速切换" bordered={false}>
            <Row gutter={[8, 8]}>
              {Object.entries(chartConfigs).map(([key, config]) => (
                <Col span={12} key={key}>
                  <Button
                    size="small"
                    type={selectedChart === key ? 'primary' : 'default'}
                    onClick={() => setSelectedChart(key)}
                    style={{ width: '100%' }}
                  >
                    {config.title}
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Visualization;