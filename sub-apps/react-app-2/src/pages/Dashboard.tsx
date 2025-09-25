/**
 * 数据统计仪表板页面
 */

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Progress,
  Table,
  Tag,
  Space,
  Alert,
  Timeline,
  Badge,
  Tabs
} from 'antd';
import {
  ArrowUpOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  DollarOutlined,
  UserOutlined,
  WarningOutlined,
  UpOutlined
} from '@ant-design/icons';
import { useProductStore, productSelectors } from '../store/productStore';
import { useCategoryStore, categorySelectors } from '../store/categoryStore';
import { useInventoryStore, inventorySelectors } from '../store/inventoryStore';
import { usePricingStore, pricingSelectors } from '../store/pricingStore';
import { useSupplierStore, supplierSelectors } from '../store/supplierStore';
import dayjs from 'dayjs';

// 导入专用样式
import '../styles/dashboard.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
  const products = useProductStore(productSelectors.products);
  const categories = useCategoryStore(categorySelectors.categories);
  const inventoryRecords = useInventoryStore(inventorySelectors.inventoryRecords);
  const priceHistories = usePricingStore(pricingSelectors.priceHistories);
  const promotionPrices = usePricingStore(pricingSelectors.promotionPrices);
  const suppliers = useSupplierStore(supplierSelectors.suppliers);

  const productStats = useProductStore(productSelectors.productStats);
  const supplierStats = useSupplierStore(supplierSelectors.supplierStats);

  // 计算统计数据
  const totalProducts = products.length;
  const totalCategories = categories.length;
  const totalSuppliers = suppliers.length;
  const activePromotions = promotionPrices.filter(p => p.isActive).length;

  // 低库存商品
  const lowStockProducts = products.filter(p => p.stock < 20);
  
  // 最近库存变动
  const recentInventoryChanges = inventoryRecords
    .slice(0, 10)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 最近价格变动
  const recentPriceChanges = priceHistories
    .slice(0, 5)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 商品分类分布
  const categoryDistribution = categories.map(cat => {
    const count = products.filter(p => p.category === cat.id).length;
    return {
      name: cat.name,
      count,
      percentage: totalProducts > 0 ? (count / totalProducts * 100).toFixed(1) : 0
    };
  });

  // 库存状态分布
  const stockStatusData = [
    { status: '正常库存', count: products.filter(p => p.stock >= 20).length, color: '#52c41a' },
    { status: '低库存', count: products.filter(p => p.stock < 20 && p.stock > 0).length, color: '#faad14' },
    { status: '缺货', count: products.filter(p => p.stock === 0).length, color: '#f5222d' }
  ];

  // 供应商状态分布
  const supplierStatusData = [
    { status: '正常', count: suppliers.filter(s => s.status === 'active').length, color: '#52c41a' },
    { status: '停用', count: suppliers.filter(s => s.status === 'inactive').length, color: '#faad14' },
    { status: '暂停', count: suppliers.filter(s => s.status === 'suspended').length, color: '#f5222d' }
  ];

  // 低库存商品表格列
  const lowStockColumns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '当前库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (stock: number) => (
        <Text type={stock === 0 ? 'danger' : stock < 10 ? 'warning' : undefined}>
          {stock}
        </Text>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: any, record: any) => {
        if (record.stock === 0) {
          return <Tag color="red">缺货</Tag>;
        } else if (record.stock < 10) {
          return <Tag color="orange">低库存</Tag>;
        } else {
          return <Tag color="yellow">预警</Tag>;
        }
      },
    },
  ];

  return (
    <div className="dashboard-container">
      <Title level={2} className="dashboard-title">数据统计</Title>

      {/* 关键指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-stat-card">
            <Statistic
              className="dashboard-statistic"
              title="商品总数"
              value={totalProducts}
              prefix={<ShoppingCartOutlined className="dashboard-icon dashboard-color-success" />}
              valueStyle={{ color: '#52c41a' }}
              suffix={
                <ArrowUpOutlined style={{ fontSize: '14px', color: '#52c41a' }} />
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-stat-card">
            <Statistic
              className="dashboard-statistic"
              title="商品分类"
              value={totalCategories}
              prefix={<TagsOutlined className="dashboard-icon dashboard-color-primary" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-stat-card">
            <Statistic
              className="dashboard-statistic"
              title="供应商数量"
              value={totalSuppliers}
              prefix={<UserOutlined className="dashboard-icon dashboard-color-purple" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="dashboard-stat-card">
            <Statistic
              className="dashboard-statistic"
              title="进行中促销"
              value={activePromotions}
              prefix={<DollarOutlined className="dashboard-icon dashboard-color-pink" />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 预警信息 */}
      {lowStockProducts.length > 0 && (
        <Alert
          className="dashboard-alert"
          message={`库存预警：有 ${lowStockProducts.length} 个商品库存不足`}
          description="请及时补充库存，避免影响销售"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Space>
              <Text strong>查看详情</Text>
            </Space>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        {/* 左侧内容 */}
        <Col xs={24} lg={16}>
          {/* 分类分布 */}
          <Card title="商品分类分布" className="dashboard-distribution-card">
            <Row gutter={[16, 16]}>
              {categoryDistribution.map((item, index) => (
                <Col xs={24} sm={12} lg={8} key={index}>
                  <Card size="small" className="dashboard-small-card">
                    <Statistic
                      className="dashboard-statistic"
                      title={item.name}
                      value={item.count}
                      suffix={`(${item.percentage}%)`}
                    />
                    <Progress
                      className="dashboard-progress"
                      percent={Number(item.percentage)}
                      size="small"
                      showInfo={false}
                      strokeColor="#1890ff"
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 库存状态分布 */}
          <Card title="库存状态分布" className="dashboard-distribution-card">
            <Row gutter={[16, 16]}>
              {stockStatusData.map((item, index) => (
                <Col xs={24} sm={12} lg={8} key={index}>
                  <Card size="small" className="dashboard-small-card">
                    <Statistic
                      className="dashboard-statistic"
                      title={item.status}
                      value={item.count}
                      valueStyle={{ color: item.color }}
                    />
                    <Progress
                      className="dashboard-progress"
                      percent={totalProducts > 0 ? (item.count / totalProducts * 100) : 0}
                      size="small"
                      showInfo={false}
                      strokeColor={item.color}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 供应商状态分布 */}
          <Card title="供应商状态分布" className="dashboard-distribution-card">
            <Row gutter={[16, 16]}>
              {supplierStatusData.map((item, index) => (
                <Col xs={24} sm={12} lg={8} key={index}>
                  <Card size="small" className="dashboard-small-card">
                    <Statistic
                      className="dashboard-statistic"
                      title={item.status}
                      value={item.count}
                      valueStyle={{ color: item.color }}
                    />
                    <Progress
                      className="dashboard-progress"
                      percent={totalSuppliers > 0 ? (item.count / totalSuppliers * 100) : 0}
                      size="small"
                      showInfo={false}
                      strokeColor={item.color}
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* 右侧内容 */}
        <Col xs={24} lg={8} className="dashboard-side-panel">
          {/* 低库存商品 */}
          <Card 
            className="dashboard-side-card"
            title={
              <Space>
                <WarningOutlined className="dashboard-icon dashboard-color-warning" />
                低库存商品
              </Space>
            }
            size="small"
          >
            {lowStockProducts.length > 0 ? (
              <Table
                className="dashboard-low-stock-table"
                columns={lowStockColumns}
                dataSource={lowStockProducts.slice(0, 5)}
                rowKey="id"
                pagination={false}
                size="small"
              />
            ) : (
              <div className="dashboard-empty-state">
                暂无低库存商品
              </div>
            )}
          </Card>

          {/* 最近动态 */}
          <Card title="最近动态" size="small" className="dashboard-side-card">
            <Tabs defaultActiveKey="inventory" size="small" className="dashboard-tabs">
              <TabPane tab="库存变动" key="inventory">
                <Timeline className="dashboard-timeline">
                  {recentInventoryChanges.slice(0, 5).map((record, index) => (
                    <Timeline.Item
                      key={index}
                      dot={
                        <Badge
                          status={record.type === 'in' ? 'success' : record.type === 'out' ? 'error' : 'processing'}
                        />
                      }
                    >
                      <div className="dashboard-timeline-item">
                        <div className="dashboard-timeline-item-title">{record.productName}</div>
                        <div className="dashboard-timeline-item-desc">
                          {record.type === 'in' ? '入库' : record.type === 'out' ? '出库' : '调整'} {Math.abs(record.quantity)} 件
                        </div>
                        <div className="dashboard-timeline-item-time">
                          {dayjs(record.createdAt).format('MM-DD HH:mm')}
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </TabPane>
              
              <TabPane tab="价格变动" key="price">
                <Timeline className="dashboard-timeline">
                  {recentPriceChanges.map((record, index) => (
                    <Timeline.Item
                      key={index}
                      dot={<UpOutlined style={{ color: '#1890ff' }} />}
                    >
                      <div className="dashboard-timeline-item">
                        <div className="dashboard-timeline-item-title">{record.productName}</div>
                        <div className="dashboard-timeline-item-desc">
                          ¥{record.oldPrice} → ¥{record.newPrice}
                        </div>
                        <div className="dashboard-timeline-item-time">
                          {dayjs(record.createdAt).format('MM-DD HH:mm')}
                        </div>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* 详细统计表格 */}
      <Row gutter={[16, 16]} className="dashboard-detail-stats">
        <Col xs={24} lg={12}>
          <Card title="商品统计详情" size="small" className="dashboard-detail-card">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={12}>
                <div className="dashboard-detail-statistic">
                  <Statistic
                    title="在售商品"
                    value={productStats.active}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </div>
              </Col>
              <Col xs={12} sm={12}>
                <div className="dashboard-detail-statistic">
                  <Statistic
                    title="停售商品"
                    value={productStats.inactive}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={12} sm={12}>
                <div className="dashboard-detail-statistic">
                  <Statistic
                    title="停产商品"
                    value={productStats.discontinued}
                    valueStyle={{ color: '#8c8c8c' }}
                  />
                </div>
              </Col>
              <Col xs={12} sm={12}>
                <div className="dashboard-detail-statistic">
                  <Statistic
                    title="低库存商品"
                    value={productStats.lowStock}
                    valueStyle={{ color: '#faad14' }}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="供应商统计详情" size="small" className="dashboard-detail-card">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={12}>
                <div className="dashboard-detail-statistic">
                  <Statistic
                    title="正常供应商"
                    value={supplierStats.active}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </div>
              </Col>
              <Col xs={12} sm={12}>
                <div className="dashboard-detail-statistic">
                  <Statistic
                    title="停用供应商"
                    value={supplierStats.inactive}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col xs={12} sm={12}>
                <div className="dashboard-detail-statistic">
                  <Statistic
                    title="暂停供应商"
                    value={supplierStats.suspended}
                    valueStyle={{ color: '#faad14' }}
                  />
                </div>
              </Col>
              <Col xs={12} sm={12}>
                <div className="dashboard-detail-statistic">
                  <Statistic
                    title="平均评级"
                    value={supplierStats.avgRating}
                    precision={1}
                    suffix="星"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;