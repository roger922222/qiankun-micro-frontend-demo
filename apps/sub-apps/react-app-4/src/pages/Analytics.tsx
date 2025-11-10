import React from 'react';
import { Card, Typography, Table, Tag, Row, Col } from 'antd';
import { BarChart, AreaChart } from '../components/charts';

const { Title } = Typography;

const Analytics: React.FC = () => {
  const columns = [
    {
      title: '指标名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '当前值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      render: (trend: string) => (
        <Tag color={trend === 'up' ? 'green' : 'red'}>
          {trend === 'up' ? '上升' : '下降'}
        </Tag>
      ),
    },
    {
      title: '变化率',
      dataIndex: 'change',
      key: 'change',
      render: (change: string) => (
        <span style={{ color: change.includes('+') ? '#3f8600' : '#cf1322' }}>
          {change}
        </span>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      name: '页面浏览量',
      value: '12,345',
      trend: 'up',
      change: '+15.2%',
    },
    {
      key: '2',
      name: '用户访问量',
      value: '8,901',
      trend: 'up',
      change: '+8.5%',
    },
    {
      key: '3',
      name: '转化率',
      value: '3.2%',
      trend: 'down',
      change: '-2.1%',
    },
    {
      key: '4',
      name: '平均停留时间',
      value: '2:34',
      trend: 'up',
      change: '+12.3%',
    },
  ];

  // 趋势分析数据
  const trendData = [
    { name: '页面浏览量', value: 12345 },
    { name: '用户访问量', value: 8901 },
    { name: '新用户数', value: 3456 },
    { name: '活跃用户', value: 5445 },
    { name: '转化用户', value: 285 },
  ];

  // 对比分析数据
  const comparisonData = [
    { name: '1月', value: 4000 },
    { name: '2月', value: 3000 },
    { name: '3月', value: 2000 },
    { name: '4月', value: 2780 },
    { name: '5月', value: 1890 },
    { name: '6月', value: 2390 },
    { name: '7月', value: 3490 },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>数据分析</Title>
      
      <Card title="关键指标分析" bordered={false} style={{ marginBottom: '24px' }}>
        <Table columns={columns} dataSource={data} pagination={false} />
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="指标对比分析" bordered={false}>
            <BarChart 
              data={trendData}
              height={300}
              color="#52c41a"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="趋势分析" bordered={false}>
            <AreaChart 
              data={comparisonData}
              height={300}
              color="#1890ff"
              smooth={true}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Analytics;