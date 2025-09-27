import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Typography, Space, Button, Select, DatePicker, Badge } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  UserOutlined, 
  ShoppingCartOutlined, 
  DollarOutlined, 
  EyeOutlined,
  ReloadOutlined,
  FilterOutlined,
  LayoutOutlined
} from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { LineChart, PieChart } from '../components/charts';
import VirtualizedChart from '../components/VirtualizedChart';
import { dashboardStore } from '../store/DashboardStore';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Dashboard: React.FC = observer(() => {
  useEffect(() => {
    // 使用Store的完整数据加载功能
    dashboardStore.loadDashboardData();
    
    // 启用实时数据连接
    dashboardStore.connectRealTime();
    
    // 加载布局配置
    dashboardStore.loadLayouts();
    
    // 预热缓存
    dashboardStore.warmupCache();
    
    return () => {
      dashboardStore.disconnectRealTime();
    };
  }, []);

  const handleRefresh = () => {
    dashboardStore.loadDashboardData();
  };

  const handleFilterChange = (filters: any) => {
    dashboardStore.updateFilters(filters);
  };

  const handleLayoutChange = (layoutId: string) => {
    dashboardStore.switchLayout(layoutId);
  };

  // 使用Store的computed属性优化性能
  const { 
    filteredMetrics, 
    chartConfigs, 
    isLoading, 
    layouts,
    currentLayout,
    filters,
    salesTrend,
    userAnalytics,
    isRealTimeConnected
  } = dashboardStore;

  return (
    <div>
      {/* 页面头部 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={2}>
            数据看板
            <Badge 
              status={isRealTimeConnected ? 'processing' : 'default'} 
              text={isRealTimeConnected ? '实时更新' : '离线模式'}
              style={{ marginLeft: 16 }}
            />
          </Title>
        </Col>
        <Col>
          <Space>
            {/* 筛选器 */}
            <Select
              placeholder="选择时间范围"
              style={{ width: 120 }}
              value={filters.timeRange.preset}
              onChange={(value) => handleFilterChange({ 
                timeRange: { ...filters.timeRange, preset: value } 
              })}
            >
              <Select.Option value="today">今天</Select.Option>
              <Select.Option value="last7days">最近7天</Select.Option>
              <Select.Option value="last30days">最近30天</Select.Option>
              <Select.Option value="custom">自定义</Select.Option>
            </Select>
            
            {/* 布局选择器 */}
            <Select
              placeholder="选择布局"
              style={{ width: 120 }}
              value={currentLayout}
              onChange={handleLayoutChange}
              suffixIcon={<LayoutOutlined />}
            >
              {layouts.map(layout => (
                <Select.Option key={layout.id} value={layout.id}>
                  {layout.name}
                </Select.Option>
              ))}
            </Select>
            
            {/* 刷新按钮 */}
            <Button 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={isLoading}
            >
              刷新
            </Button>
          </Space>
        </Col>
      </Row>
      
      {/* 指标卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card loading={isLoading}>
            <Statistic
              title="总用户数"
              value={filteredMetrics.totalUsers}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
              suffix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isLoading}>
            <Statistic
              title="订单数"
              value={filteredMetrics.totalOrders}
              precision={0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ShoppingCartOutlined />}
              suffix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isLoading}>
            <Statistic
              title="收入"
              value={filteredMetrics.totalRevenue}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix={<DollarOutlined />}
              suffix="¥"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isLoading}>
            <Statistic
              title="页面浏览量"
              value={filteredMetrics.pageViews}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<EyeOutlined />}
            />
            <Progress 
              percent={Math.min((filteredMetrics.pageViews / 50000) * 100, 100)} 
              strokeColor="#722ed1" 
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card 
            title={
              <Space>
                <span>销售趋势</span>
                {salesTrend.length > 500 && (
                  <Badge count={salesTrend.length} showZero style={{ backgroundColor: '#52c41a' }} />
                )}
              </Space>
            } 
            bordered={false}
          >
            {salesTrend.length > 1000 ? (
              <VirtualizedChart
                data={salesTrend}
                height={300}
                chartType="line"
                color="#1890ff"
                smooth={true}
                loading={isLoading}
              />
            ) : (
              <LineChart 
                data={salesTrend}
                loading={isLoading}
                height={300}
                color="#1890ff"
                smooth={true}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="用户分析" bordered={false}>
            <PieChart 
              data={userAnalytics}
              loading={isLoading}
              height={300}
              color={['#5B8FF9', '#5AD8A6']}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
});

export default Dashboard;