import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Progress, 
  Statistic, 
  List, 
  Button, 
  Badge, 
  Tooltip, 
  Space, 
  Typography,
  Alert,
  Divider,
  Tag
} from 'antd';
import { 
  DashboardOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  ApiOutlined,
  BugOutlined,
  TrophyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { rumCollector } from '../../utils/rum-collector';

const { Title, Text } = Typography;

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

interface PerformanceAnalysis {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  trends: MetricTrend[];
}

interface Bottleneck {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  value: number;
  threshold: number;
  impact: string;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImprovement: string;
  action: () => void;
}

interface MetricTrend {
  name: string;
  current: number;
  previous: number;
  change: number;
  trend: 'improving' | 'declining' | 'stable';
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    updateMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(updateMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const updateMetrics = () => {
    try {
      const currentMetrics = rumCollector.getMetrics();
      const currentAnalysis = rumCollector.analyzePerformance();
      
      setMetrics(currentMetrics);
      setAnalysis(currentAnalysis);
      setLoading(false);
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
      setLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a';
    if (score >= 80) return '#fadb14';
    if (score >= 70) return '#fa8c16';
    if (score >= 60) return '#fa541c';
    return '#f5222d';
  };

  const getGradeColor = (grade: string): string => {
    const colors = {
      A: '#52c41a',
      B: '#fadb14', 
      C: '#fa8c16',
      D: '#fa541c',
      F: '#f5222d'
    };
    return colors[grade as keyof typeof colors] || '#d9d9d9';
  };

  const getMetricColor = (name: string, value: number): string => {
    const thresholds: { [key: string]: { good: number; poor: number } } = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[name];
    if (!threshold) return '#1890ff';

    if (value <= threshold.good) return '#52c41a';
    if (value >= threshold.poor) return '#f5222d';
    return '#faad14';
  };

  const getSeverityColor = (severity: string): string => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'blue'
    };
    return colors[severity as keyof typeof colors] || 'default';
  };

  const getPriorityColor = (priority: string): string => {
    const colors = {
      high: 'red',
      medium: 'orange', 
      low: 'green'
    };
    return colors[priority as keyof typeof colors] || 'default';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <ArrowDownOutlined style={{ color: '#52c41a' }} />;
      case 'declining':
        return <ArrowUpOutlined style={{ color: '#f5222d' }} />;
      case 'stable':
        return <MinusOutlined style={{ color: '#d9d9d9' }} />;
      default:
        return null;
    }
  };

  const formatValue = (name: string, value: number): string => {
    if (name === 'CLS') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  };

  const handleRefresh = () => {
    setLoading(true);
    updateMetrics();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (loading && !analysis) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <ReloadOutlined spin style={{ fontSize: '24px' }} />
          <div style={{ marginTop: '16px' }}>正在收集性能数据...</div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>
          <DashboardOutlined /> 性能监控面板
        </Title>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>
          <Button 
            type={autoRefresh ? 'primary' : 'default'}
            onClick={toggleAutoRefresh}
          >
            {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
          </Button>
        </Space>
      </div>

      {/* 性能评分 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={analysis?.score || 0}
                format={(percent) => (
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{percent}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>性能评分</div>
                  </div>
                )}
                strokeColor={getScoreColor(analysis?.score || 0)}
                size={120}
              />
            </div>
          </Card>
        </Col>
        
        <Col span={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: getGradeColor(analysis?.grade || 'F') }}>
                {analysis?.grade || 'F'}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                性能等级
              </div>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <Statistic
              title="监控会话"
              value={metrics.length}
              prefix={<EyeOutlined />}
              suffix="个指标"
            />
            <div style={{ marginTop: '16px' }}>
              <Badge 
                status={autoRefresh ? 'processing' : 'default'} 
                text={autoRefresh ? '实时监控中' : '监控已暂停'} 
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 核心 Web 指标 */}
      <Card title="核心 Web 指标" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {['LCP', 'FID', 'CLS', 'FCP', 'TTFB'].map(metricName => {
            const metric = metrics.find(m => m.name === metricName);
            const value = metric ? metric.value : 0;
            const color = getMetricColor(metricName, value);
            
            return (
              <Col span={4.8} key={metricName}>
                <Card size="small">
                  <Statistic
                    title={metricName}
                    value={formatValue(metricName, value)}
                    valueStyle={{ color }}
                    prefix={
                      <Tooltip title={getMetricDescription(metricName)}>
                        <ThunderboltOutlined />
                      </Tooltip>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 性能瓶颈 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <BugOutlined />
                性能瓶颈
                <Badge count={analysis?.bottlenecks?.length || 0} />
              </Space>
            }
          >
            {analysis?.bottlenecks?.length ? (
              <List
                size="small"
                dataSource={analysis.bottlenecks}
                renderItem={(bottleneck) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Badge 
                          status="error" 
                          color={getSeverityColor(bottleneck.severity)}
                        />
                      }
                      title={
                        <Space>
                          <Text strong>{bottleneck.description}</Text>
                          <Tag color={getSeverityColor(bottleneck.severity)}>
                            {bottleneck.severity}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <div>{bottleneck.impact}</div>
                          <Text type="secondary">
                            当前值: {formatValue(bottleneck.type, bottleneck.value)} 
                            (阈值: {formatValue(bottleneck.type, bottleneck.threshold)})
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="暂无性能瓶颈"
                description="当前所有指标都在正常范围内"
                type="success"
                showIcon
              />
            )}
          </Card>
        </Col>

        {/* 优化建议 */}
        <Col span={12}>
          <Card 
            title={
              <Space>
                <TrophyOutlined />
                优化建议
                <Badge count={analysis?.recommendations?.length || 0} />
              </Space>
            }
          >
            {analysis?.recommendations?.length ? (
              <List
                size="small"
                dataSource={analysis.recommendations}
                renderItem={(recommendation) => (
                  <List.Item
                    actions={[
                      <Button 
                        size="small" 
                        type="primary"
                        onClick={recommendation.action}
                      >
                        应用优化
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                                              <Tag color={getPriorityColor(recommendation.priority)}>
                        {recommendation.priority}
                      </Tag>
                      }
                      title={recommendation.title}
                      description={
                        <div>
                          <div>{recommendation.description}</div>
                          <Text type="success">
                            预期提升: {recommendation.expectedImprovement}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Alert
                message="暂无优化建议"
                description="当前性能表现良好"
                type="info"
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 性能趋势 */}
      {analysis?.trends?.length && (
        <Card 
          title={
            <Space>
              <ApiOutlined />
              性能趋势
            </Space>
          }
          style={{ marginTop: '24px' }}
        >
          <Row gutter={[16, 16]}>
            {analysis.trends.map((trend) => (
              <Col span={4.8} key={trend.name}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {trend.name}
                    </div>
                    <div style={{ margin: '8px 0' }}>
                      {getTrendIcon(trend.trend)}
                      <Text 
                        style={{ 
                          marginLeft: '8px',
                          color: trend.change > 0 ? '#f5222d' : '#52c41a'
                        }}
                      >
                        {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}%
                      </Text>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      当前: {formatValue(trend.name, trend.current)}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  );
};

// 获取指标描述
const getMetricDescription = (name: string): string => {
  const descriptions = {
    LCP: '最大内容绘制 - 页面主要内容完成渲染的时间',
    FID: '首次输入延迟 - 用户首次交互到浏览器响应的时间',
    CLS: '累积布局偏移 - 页面布局稳定性指标',
    FCP: '首次内容绘制 - 页面首次渲染内容的时间',
    TTFB: '首字节时间 - 服务器响应第一个字节的时间'
  };
  
  return descriptions[name as keyof typeof descriptions] || '';
};

export default PerformanceDashboard;