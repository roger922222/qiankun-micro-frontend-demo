// A/B 测试管理器
interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  segments: string[];
  rolloutPercentage: number;
  conditions: FlagCondition[];
  metadata: {
    createdAt: number;
    createdBy: string;
    lastModified: number;
  };
}

interface FlagCondition {
  type: 'user_attribute' | 'device_type' | 'location' | 'time_range' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  key: string;
  value: any;
}

interface UserSegment {
  id: string;
  name: string;
  description: string;
  conditions: FlagCondition[];
  userCount: number;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: TestVariant[];
  trafficAllocation: number; // 参与测试的用户百分比
  startDate: number;
  endDate?: number;
  targetMetrics: string[];
  metadata: {
    createdAt: number;
    createdBy: string;
    hypothesis: string;
    successCriteria: string;
  };
}

interface TestVariant {
  name: string;
  percentage: number;
  config: any;
  description?: string;
}

interface ExposureEvent {
  testId: string;
  variant: string;
  userId: string;
  timestamp: number;
  context: any;
}

interface ConversionEvent {
  testId: string;
  variant: string;
  userId: string;
  metric: string;
  value: number;
  timestamp: number;
}

export class FeatureFlagManager {
  private flags = new Map<string, FeatureFlag>();
  private userSegments = new Map<string, UserSegment>();
  private abTests = new Map<string, ABTest>();
  private exposureEvents: ExposureEvent[] = [];
  private conversionEvents: ConversionEvent[] = [];
  private userCache = new Map<string, any>();

  constructor() {
    this.loadConfiguration();
    this.initializeDefaultSegments();
  }

  // 注册功能开关
  registerFlag(flag: FeatureFlag): void {
    this.flags.set(flag.name, {
      ...flag,
      metadata: {
        ...flag.metadata,
        lastModified: Date.now()
      }
    });
    
    this.saveConfiguration();
    console.log(`Feature flag registered: ${flag.name}`);
  }

  // 检查功能是否启用
  isEnabled(flagName: string, userId: string, context: any = {}): boolean {
    const flag = this.flags.get(flagName);
    if (!flag || !flag.enabled) {
      return false;
    }

    try {
      // 检查用户分组
      const userSegment = this.getUserSegment(userId, context);
      if (!flag.segments.includes(userSegment.id)) {
        return false;
      }

      // 检查百分比推出
      if (flag.rolloutPercentage < 100) {
        const hash = this.hashUserId(userId, flagName);
        if (hash > flag.rolloutPercentage) {
          return false;
        }
      }

      // 检查条件规则
      const conditionsMet = this.evaluateConditions(flag.conditions, context);
      
      if (conditionsMet) {
        // 记录功能使用
        this.trackFeatureUsage(flagName, userId, context);
      }
      
      return conditionsMet;
    } catch (error) {
      console.error(`Error evaluating flag ${flagName}:`, error);
      return false;
    }
  }

  // A/B 测试分组
  getVariant(testId: string, userId: string, context: any = {}): string {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') {
      return 'control';
    }

    // 检查测试时间范围
    const now = Date.now();
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      return 'control';
    }

    try {
      // 检查用户是否参与测试
      const participationHash = this.hashUserId(userId, `${testId}_participation`);
      if (participationHash > test.trafficAllocation) {
        return 'control';
      }

      // 分配变体
      const variantHash = this.hashUserId(userId, `${testId}_variant`);
      let cumulative = 0;
      
      for (const variant of test.variants) {
        cumulative += variant.percentage;
        if (variantHash <= cumulative) {
          // 记录曝光事件
          this.recordExposure(testId, variant.name, userId, context);
          return variant.name;
        }
      }
      
      return 'control';
    } catch (error) {
      console.error(`Error getting variant for test ${testId}:`, error);
      return 'control';
    }
  }

  // 创建 A/B 测试
  createABTest(test: Omit<ABTest, 'id'>): string {
    const testId = this.generateTestId();
    const fullTest: ABTest = {
      ...test,
      id: testId,
      metadata: {
        createdAt: Date.now(),
        createdBy: this.getCurrentUser(),
        hypothesis: test.metadata?.hypothesis || '',
        successCriteria: test.metadata?.successCriteria || ''
      }
    };

    // 验证变体百分比总和
    const totalPercentage = test.variants.reduce((sum, v) => sum + v.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('变体百分比总和必须等于100%');
    }

    this.abTests.set(testId, fullTest);
    this.saveConfiguration();
    
    console.log(`A/B test created: ${testId}`);
    return testId;
  }

  // 启动 A/B 测试
  startABTest(testId: string): void {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'running';
    test.startDate = Date.now();
    
    this.abTests.set(testId, test);
    this.saveConfiguration();
    
    console.log(`A/B test started: ${testId}`);
  }

  // 停止 A/B 测试
  stopABTest(testId: string): void {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'completed';
    test.endDate = Date.now();
    
    this.abTests.set(testId, test);
    this.saveConfiguration();
    
    console.log(`A/B test stopped: ${testId}`);
  }

  // 记录转化事件
  recordConversion(testId: string, userId: string, metric: string, value: number = 1): void {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'running') {
      return;
    }

    // 获取用户当前变体
    const variant = this.getVariant(testId, userId);
    
    const conversionEvent: ConversionEvent = {
      testId,
      variant,
      userId,
      metric,
      value,
      timestamp: Date.now()
    };

    this.conversionEvents.push(conversionEvent);
    this.saveEvents();
    
    console.log(`Conversion recorded: ${testId} - ${variant} - ${metric}`);
  }

  // 获取测试结果
  getTestResults(testId: string): TestResults {
    const test = this.abTests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    const exposures = this.exposureEvents.filter(e => e.testId === testId);
    const conversions = this.conversionEvents.filter(e => e.testId === testId);

    const results: TestResults = {
      testId,
      testName: test.name,
      status: test.status,
      startDate: test.startDate,
      endDate: test.endDate,
      variants: {}
    };

    // 计算每个变体的统计数据
    test.variants.forEach(variant => {
      const variantExposures = exposures.filter(e => e.variant === variant.name);
      const variantConversions = conversions.filter(e => e.variant === variant.name);
      
      const uniqueUsers = new Set(variantExposures.map(e => e.userId)).size;
      const totalConversions = variantConversions.length;
      const conversionRate = uniqueUsers > 0 ? (totalConversions / uniqueUsers) * 100 : 0;

      // 按指标分组转化
      const metricStats: { [metric: string]: MetricStats } = {};
      test.targetMetrics.forEach(metric => {
        const metricConversions = variantConversions.filter(c => c.metric === metric);
        const metricValue = metricConversions.reduce((sum, c) => sum + c.value, 0);
        const metricRate = uniqueUsers > 0 ? (metricConversions.length / uniqueUsers) * 100 : 0;
        
        metricStats[metric] = {
          conversions: metricConversions.length,
          totalValue: metricValue,
          conversionRate: metricRate,
          averageValue: metricConversions.length > 0 ? metricValue / metricConversions.length : 0
        };
      });

      results.variants[variant.name] = {
        exposures: variantExposures.length,
        uniqueUsers,
        conversions: totalConversions,
        conversionRate,
        metrics: metricStats
      };
    });

    // 计算统计显著性
    results.statisticalSignificance = this.calculateStatisticalSignificance(results);

    return results;
  }

  // 用户分组
  private getUserSegment(userId: string, context: any): UserSegment {
    // 检查缓存
    const cacheKey = `${userId}_${JSON.stringify(context)}`;
    const cached = this.userCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 评估用户属于哪个分组
    for (const segment of this.userSegments.values()) {
      if (this.evaluateConditions(segment.conditions, { userId, ...context })) {
        this.userCache.set(cacheKey, segment);
        return segment;
      }
    }

    // 默认分组
    const defaultSegment = this.userSegments.get('default') || {
      id: 'default',
      name: 'Default',
      description: 'Default user segment',
      conditions: [],
      userCount: 0
    };

    this.userCache.set(cacheKey, defaultSegment);
    return defaultSegment;
  }

  // 条件评估
  private evaluateConditions(conditions: FlagCondition[], context: any): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const contextValue = this.getContextValue(condition.key, context);
      return this.evaluateCondition(condition, contextValue);
    });
  }

  private evaluateCondition(condition: FlagCondition, value: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      default:
        return false;
    }
  }

  private getContextValue(key: string, context: any): any {
    const keys = key.split('.');
    let value = context;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  // 用户ID哈希
  private hashUserId(userId: string, salt: string): number {
    const str = `${userId}_${salt}`;
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash) % 100;
  }

  // 记录曝光事件
  private recordExposure(testId: string, variant: string, userId: string, context: any): void {
    const exposureEvent: ExposureEvent = {
      testId,
      variant,
      userId,
      timestamp: Date.now(),
      context
    };

    this.exposureEvents.push(exposureEvent);
    this.saveEvents();
  }

  // 统计显著性计算
  private calculateStatisticalSignificance(results: TestResults): { [variant: string]: number } {
    const significance: { [variant: string]: number } = {};
    
    // 简化的卡方检验实现
    const variants = Object.keys(results.variants);
    if (variants.length < 2) return significance;

    const controlVariant = variants[0];
    const controlData = results.variants[controlVariant];

    for (let i = 1; i < variants.length; i++) {
      const testVariant = variants[i];
      const testData = results.variants[testVariant];
      
      // 计算p值（简化版本）
      const pValue = this.calculatePValue(controlData, testData);
      significance[testVariant] = pValue;
    }

    return significance;
  }

  private calculatePValue(control: VariantStats, test: VariantStats): number {
    // 简化的统计显著性计算
    const controlRate = control.conversionRate / 100;
    const testRate = test.conversionRate / 100;
    
    const pooledRate = (control.conversions + test.conversions) / (control.uniqueUsers + test.uniqueUsers);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/control.uniqueUsers + 1/test.uniqueUsers));
    
    if (standardError === 0) return 1;
    
    const zScore = Math.abs(testRate - controlRate) / standardError;
    
    // 简化的p值计算
    return Math.max(0.001, 1 - (zScore / 4)); // 简化公式
  }

  // 配置管理
  private loadConfiguration(): void {
    try {
      const flagsData = localStorage.getItem('feature_flags');
      if (flagsData) {
        const flags = JSON.parse(flagsData);
        this.flags = new Map(flags);
      }

      const testsData = localStorage.getItem('ab_tests');
      if (testsData) {
        const tests = JSON.parse(testsData);
        this.abTests = new Map(tests);
      }

      const eventsData = localStorage.getItem('ab_events');
      if (eventsData) {
        const events = JSON.parse(eventsData);
        this.exposureEvents = events.exposures || [];
        this.conversionEvents = events.conversions || [];
      }
    } catch (error) {
      console.warn('Failed to load A/B test configuration:', error);
    }
  }

  private saveConfiguration(): void {
    try {
      localStorage.setItem('feature_flags', JSON.stringify(Array.from(this.flags.entries())));
      localStorage.setItem('ab_tests', JSON.stringify(Array.from(this.abTests.entries())));
    } catch (error) {
      console.warn('Failed to save A/B test configuration:', error);
    }
  }

  private saveEvents(): void {
    try {
      const events = {
        exposures: this.exposureEvents,
        conversions: this.conversionEvents
      };
      localStorage.setItem('ab_events', JSON.stringify(events));
    } catch (error) {
      console.warn('Failed to save A/B test events:', error);
    }
  }

  // 初始化默认分组
  private initializeDefaultSegments(): void {
    const defaultSegments: UserSegment[] = [
      {
        id: 'default',
        name: 'Default Users',
        description: 'All users',
        conditions: [],
        userCount: 0
      },
      {
        id: 'new_users',
        name: 'New Users',
        description: 'Users registered in the last 30 days',
        conditions: [
          {
            type: 'user_attribute',
            operator: 'greater_than',
            key: 'registrationDate',
            value: Date.now() - 30 * 24 * 60 * 60 * 1000
          }
        ],
        userCount: 0
      },
      {
        id: 'mobile_users',
        name: 'Mobile Users',
        description: 'Users on mobile devices',
        conditions: [
          {
            type: 'device_type',
            operator: 'equals',
            key: 'deviceType',
            value: 'mobile'
          }
        ],
        userCount: 0
      }
    ];

    defaultSegments.forEach(segment => {
      this.userSegments.set(segment.id, segment);
    });
  }

  // 工具方法
  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUser(): string {
    return 'system'; // 在实际应用中应该从认证系统获取
  }

  private trackFeatureUsage(flagName: string, userId: string, context: any): void {
    // 记录功能使用情况
    console.log(`Feature used: ${flagName} by ${userId}`);
  }

  // 公共API
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  getAllTests(): ABTest[] {
    return Array.from(this.abTests.values());
  }

  getTestById(testId: string): ABTest | undefined {
    return this.abTests.get(testId);
  }
}

// 类型定义
interface TestResults {
  testId: string;
  testName: string;
  status: string;
  startDate: number;
  endDate?: number;
  variants: { [variantName: string]: VariantStats };
  statisticalSignificance?: { [variant: string]: number };
}

interface VariantStats {
  exposures: number;
  uniqueUsers: number;
  conversions: number;
  conversionRate: number;
  metrics: { [metric: string]: MetricStats };
}

interface MetricStats {
  conversions: number;
  totalValue: number;
  conversionRate: number;
  averageValue: number;
}

// 单例导出
export const featureFlagManager = new FeatureFlagManager();