/**
 * 报表分析页面
 */

import React, { useState } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Select, Table, Typography, Space, Button } from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  RiseOutlined,
  DownloadOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { useOrderContext } from '../context/OrderContext';
import type { Order } from '../context/OrderContext';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface ReportData {
  date: string;
  orders: number;
  revenue: number;
  customers: number;
  avgOrderValue: number;
}

interface ProductSalesData {
  productName: string;
  quantity: number;
  revenue: number;
  orders: number;
}

const ReportsAnalytics: React.FC = () => {
  const { state } = useOrderContext();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // 生成报表数据
  const generateReportData = (): ReportData[] => {
    const filteredOrders = dateRange
      ? state.orders.filter(order => 
          order.createdAt >= dateRange[0] && order.createdAt <= dateRange[1]
        )
      : state.orders;

    // 按日期分组
    const dateMap = new Map<string, Order[]>();
    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, []);
      }
      dateMap.get(date)!.push(order);
    });

    // 生成报表数据
    const reportData: ReportData[] = [];
    dateMap.forEach((orders, date) => {
      const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const customers = new Set(orders.map(order => order.customerId)).size;
      const avgOrderValue = revenue / orders.length;

      reportData.push({
        date,
        orders: orders.length,
        revenue,
        customers,
        avgOrderValue
      });
    });

    return reportData.sort((a, b) => a.date.localeCompare(b.date));
  };

  // 生成商品销售数据
  const generateProductSalesData = (): ProductSalesData[] => {
    const filteredOrders = dateRange
      ? state.orders.filter(order => 
          order.createdAt >= dateRange[0] && order.createdAt <= dateRange[1]
        )
      : state.orders;

    const productMap = new Map<string, ProductSalesData>();

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (productMap.has(item.productName)) {
          const data = productMap.get(item.productName)!;
          data.quantity += item.quantity;
          data.revenue += item.totalPrice;
          data.orders += 1;
        } else {
          productMap.set(item.productName, {
            productName: item.productName,
            quantity: item.quantity,
            revenue: item.totalPrice,
            orders: 1
          });
        }
      });
    });

    return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
  };

  // 获取总体统计
  const getOverallStats = () => {
    const filteredOrders = dateRange
      ? state.orders.filter(order => 
          order.createdAt >= dateRange[0] && order.createdAt <= dateRange[1]
        )
      : state.orders;

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = filteredOrders.length;
    const totalCustomers = new Set(filteredOrders.map(order => order.customerId)).size;
    const avgOrderValue = totalRevenue / Math.max(totalOrders, 1);

    // 计算增长率（模拟数据）
    const revenueGrowth = Math.random() * 20 - 10; // -10% 到 +10%
    const orderGrowth = Math.random() * 15 - 7.5; // -7.5% 到 +7.5%
    const customerGrowth = Math.random() * 25 - 12.5; // -12.5% 到 +12.5%

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      revenueGrowth,
      orderGrowth,
      customerGrowth
    };
  };

  const reportData = generateReportData();
  const productSalesData = generateProductSalesData();
  const overallStats = getOverallStats();

  const reportColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '订单数量',
      dataIndex: 'orders',
      key: 'orders',
      sorter: (a: ReportData, b: ReportData) => a.orders - b.orders,
    },
    {
      title: '营业收入',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue: number) => `¥${revenue.toFixed(2)}`,
      sorter: (a: ReportData, b: ReportData) => a.revenue - b.revenue,
    },
    {
      title: '客户数量',
      dataIndex: 'customers',
      key: 'customers',
      sorter: (a: ReportData, b: ReportData) => a.customers - b.customers,
    },
    {
      title: '平均订单价值',
      dataIndex: 'avgOrderValue',
      key: 'avgOrderValue',
      render: (value: number) => `¥${value.toFixed(2)}`,
      sorter: (a: ReportData, b: ReportData) => a.avgOrderValue - b.avgOrderValue,
    },
  ];

  const productColumns = [
    {
      title: '商品名称',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: '销售数量',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a: ProductSalesData, b: ProductSalesData) => a.quantity - b.quantity,
    },
    {
      title: '销售收入',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue: number) => `¥${revenue.toFixed(2)}`,
      sorter: (a: ProductSalesData, b: ProductSalesData) => a.revenue - b.revenue,
    },
    {
      title: '订单数量',
      dataIndex: 'orders',
      key: 'orders',
      sorter: (a: ProductSalesData, b: ProductSalesData) => a.orders - b.orders,
    },
    {
      title: '平均单价',
      key: 'avgPrice',
      render: (record: ProductSalesData) => `¥${(record.revenue / record.quantity).toFixed(2)}`,
    },
  ];

  const handleExport = () => {
    // 模拟导出功能
    const csvContent = "data:text/csv;charset=utf-8," 
      + "日期,订单数量,营业收入,客户数量,平均订单价值\n"
      + reportData.map(row => 
          `${row.date},${row.orders},${row.revenue.toFixed(2)},${row.customers},${row.avgOrderValue.toFixed(2)}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <Title level={2}>报表分析</Title>

      {/* 筛选条件 */}
      <Card style={{ marginBottom: 24 }}>
        <Space size="large">
          <div>
            <span style={{ marginRight: 8 }}>时间范围：</span>
            <RangePicker
              onChange={(dates, dateStrings) => {
                setDateRange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null);
              }}
            />
          </div>
          <div>
            <span style={{ marginRight: 8 }}>报表类型：</span>
            <Select
              value={reportType}
              onChange={setReportType}
              style={{ width: 120 }}
            >
              <Select.Option value="daily">日报表</Select.Option>
              <Select.Option value="weekly">周报表</Select.Option>
              <Select.Option value="monthly">月报表</Select.Option>
            </Select>
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
          >
            导出报表
          </Button>
        </Space>
      </Card>

      {/* 总体统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总营业收入"
              value={overallStats.totalRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ fontSize: '12px', color: overallStats.revenueGrowth >= 0 ? '#52c41a' : '#f5222d', marginTop: 4 }}>
              <RiseOutlined /> {overallStats.revenueGrowth >= 0 ? '+' : ''}{overallStats.revenueGrowth.toFixed(1)}%
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={overallStats.totalOrders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ fontSize: '12px', color: overallStats.orderGrowth >= 0 ? '#52c41a' : '#f5222d', marginTop: 4 }}>
              <RiseOutlined /> {overallStats.orderGrowth >= 0 ? '+' : ''}{overallStats.orderGrowth.toFixed(1)}%
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总客户数"
              value={overallStats.totalCustomers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ fontSize: '12px', color: overallStats.customerGrowth >= 0 ? '#52c41a' : '#f5222d', marginTop: 4 }}>
              <RiseOutlined /> {overallStats.customerGrowth >= 0 ? '+' : ''}{overallStats.customerGrowth.toFixed(1)}%
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均订单价值"
              value={overallStats.avgOrderValue}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title={<><LineChartOutlined /> 销售趋势</>}>
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 4 }}>
              <div style={{ textAlign: 'center', color: '#666' }}>
                <LineChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>销售趋势图表</div>
                <div style={{ fontSize: '12px', marginTop: 8 }}>
                  可集成 ECharts、Chart.js 等图表库显示销售趋势
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><PieChartOutlined /> 订单状态分布</>}>
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 4 }}>
              <div style={{ textAlign: 'center', color: '#666' }}>
                <PieChartOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                <div>订单状态饼图</div>
                <div style={{ fontSize: '12px', marginTop: 8 }}>
                  显示各种订单状态的分布情况
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 销售报表 */}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={<><BarChartOutlined /> 销售报表</>}>
            <Table
              columns={reportColumns}
              dataSource={reportData}
              rowKey="date"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 商品销售排行 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="商品销售排行">
            <Table
              columns={productColumns}
              dataSource={productSalesData}
              rowKey="productName"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReportsAnalytics;