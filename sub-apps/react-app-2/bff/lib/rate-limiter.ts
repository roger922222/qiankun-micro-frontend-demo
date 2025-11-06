import { redis } from '@/lib/redis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { NextApiRequest, NextApiResponse } from 'next';

// 限流配置
export const RATE_LIMIT_CONFIG = {
  // 通用API限流
  GENERAL: {
    points: 100,        // 每个IP每分钟100次请求
    duration: 60,       // 60秒
    blockDuration: 60,  // 封禁60秒
  },
  
  // 商品API限流
  PRODUCTS: {
    LIST: {
      points: 200,      // 每分钟200次
      duration: 60,
    },
    CREATE: {
      points: 10,       // 每分钟10次创建
      duration: 60,
    },
    UPDATE: {
      points: 20,       // 每分钟20次更新
      duration: 60,
    },
    DELETE: {
      points: 10,       // 每分钟10次删除
      duration: 60,
    },
  },
  
  // 批量操作限流
  BATCH: {
    points: 5,          // 每分钟5次批量操作
    duration: 60,
  },
  
  // 库存操作限流
  INVENTORY: {
    points: 50,         // 每分钟50次库存操作
    duration: 60,
  },
  
  // 价格操作限流
  PRICING: {
    points: 30,         // 每分钟30次价格操作
    duration: 60,
  },
  
  // 搜索限流
  SEARCH: {
    points: 300,       // 每分钟300次搜索
    duration: 60,
  },
  
  // 健康检查限流
  HEALTH: {
    points: 10,        // 每分钟10次健康检查
    duration: 60,
  },
};

// 创建限流器实例
const createRateLimiter = (config: any, keyPrefix: string) => {
  return new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `ratelimit:${keyPrefix}`,
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration,
    execEvenly: false,
    insuranceLimiter: undefined,
  });
};

// 限流器实例
export const rateLimiters = {
  general: createRateLimiter(RATE_LIMIT_CONFIG.GENERAL, 'general'),
  
  products: {
    list: createRateLimiter(RATE_LIMIT_CONFIG.PRODUCTS.LIST, 'products:list'),
    create: createRateLimiter(RATE_LIMIT_CONFIG.PRODUCTS.CREATE, 'products:create'),
    update: createRateLimiter(RATE_LIMIT_CONFIG.PRODUCTS.UPDATE, 'products:update'),
    delete: createRateLimiter(RATE_LIMIT_CONFIG.PRODUCTS.DELETE, 'products:delete'),
  },
  
  batch: createRateLimiter(RATE_LIMIT_CONFIG.BATCH, 'batch'),
  inventory: createRateLimiter(RATE_LIMIT_CONFIG.INVENTORY, 'inventory'),
  pricing: createRateLimiter(RATE_LIMIT_CONFIG.PRICING, 'pricing'),
  search: createRateLimiter(RATE_LIMIT_CONFIG.SEARCH, 'search'),
  health: createRateLimiter(RATE_LIMIT_CONFIG.HEALTH, 'health'),
};

// 获取客户端IP
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP;
  }
  
  return req.socket.remoteAddress || 'unknown';
}

// 获取限流键
function getRateLimitKey(req: NextApiRequest, suffix: string = ''): string {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const key = `${ip}:${userAgent}:${suffix}`;
  return Buffer.from(key).toString('base64'); // 避免特殊字符问题
}

// 限流中间件
export async function rateLimitMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  limiter: RateLimiterRedis,
  keySuffix: string = ''
): Promise<boolean> {
  const key = getRateLimitKey(req, keySuffix);
  
  try {
    const rateLimiterRes = await limiter.consume(key);
    
    // 设置响应头
    res.setHeader('X-RateLimit-Limit', limiter.points);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext));
    
    return true; // 允许请求
  } catch (rateLimiterRes) {
    // 超过限流
    if (rateLimiterRes instanceof Error) {
      console.error('限流器错误:', rateLimiterRes);
      return true; // 限流器错误时不阻止请求
    }
    
    // 设置响应头
    res.setHeader('X-RateLimit-Limit', limiter.points);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext));
    res.setHeader('Retry-After', Math.round(rateLimiterRes.msBeforeNext / 1000));
    
    return false; // 拒绝请求
  }
}

// 智能限流决策
export class SmartRateLimiter {
  private static requestHistory = new Map<string, Array<{timestamp: number; endpoint: string}>>();
  private static readonly HISTORY_WINDOW = 5 * 60 * 1000; // 5分钟
  private static readonly MAX_HISTORY_SIZE = 1000;
  
  /**
   * 分析请求模式，检测异常行为
   */
  static analyzeRequestPattern(req: NextApiRequest): { isSuspicious: boolean; reason?: string } {
    const ip = getClientIP(req);
    const now = Date.now();
    const endpoint = req.url || 'unknown';
    
    // 清理过期历史记录
    this.cleanupHistory(ip);
    
    // 获取IP的历史记录
    if (!this.requestHistory.has(ip)) {
      this.requestHistory.set(ip, []);
    }
    
    const history = this.requestHistory.get(ip)!;
    
    // 添加当前请求
    history.push({ timestamp: now, endpoint });
    
    // 限制历史记录大小
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }
    
    // 分析异常模式
    const recentRequests = history.filter(h => now - h.timestamp < 60000); // 最近1分钟
    
    // 1. 检查请求频率异常
    if (recentRequests.length > 500) { // 1分钟内超过500次
      return { isSuspicious: true, reason: '请求频率异常' };
    }
    
    // 2. 检查端点分布异常
    const endpointCounts = new Map<string, number>();
    for (const req of recentRequests) {
      endpointCounts.set(req.endpoint, (endpointCounts.get(req.endpoint) || 0) + 1);
    }
    
    // 如果某个端点占比过高（>80%），可能是攻击
    for (const [ep, count] of endpointCounts) {
      if (count / recentRequests.length > 0.8) {
        return { isSuspicious: true, reason: `端点分布异常: ${ep}` };
      }
    }
    
    // 3. 检查请求时间分布异常
    const timeWindows = new Map<number, number>();
    for (const req of recentRequests) {
      const window = Math.floor(req.timestamp / 1000); // 1秒窗口
      timeWindows.set(window, (timeWindows.get(window) || 0) + 1);
    }
    
    // 如果某个时间窗口请求过多，可能是突发攻击
    for (const [window, count] of timeWindows) {
      if (count > 100) { // 1秒内超过100次
        return { isSuspicious: true, reason: '时间分布异常' };
      }
    }
    
    return { isSuspicious: false };
  }
  
  /**
   * 清理过期历史记录
   */
  private static cleanupHistory(ip: string): void {
    const now = Date.now();
    const history = this.requestHistory.get(ip);
    
    if (history) {
      const validHistory = history.filter(h => now - h.timestamp < this.HISTORY_WINDOW);
      this.requestHistory.set(ip, validHistory);
      
      // 如果历史记录为空，删除该IP的记录
      if (validHistory.length === 0) {
        this.requestHistory.delete(ip);
      }
    }
  }
  
  /**
   * 获取IP的信誉分数（0-100，100为最高信誉）
   */
  static getIPReputation(ip: string): number {
    const history = this.requestHistory.get(ip) || [];
    const now = Date.now();
    
    if (history.length === 0) {
      return 80; // 新IP默认信誉分数
    }
    
    const recentRequests = history.filter(h => now - h.timestamp < 300000); // 5分钟
    
    // 基础分数
    let score = 100;
    
    // 根据请求频率扣分
    const requestsPerMinute = recentRequests.length / 5;
    if (requestsPerMinute > 60) {
      score -= 50;
    } else if (requestsPerMinute > 30) {
      score -= 30;
    } else if (requestsPerMinute > 10) {
      score -= 10;
    }
    
    // 根据行为模式调整分数
    const analysis = this.analyzeRequestPattern({
      headers: { 'x-forwarded-for': ip },
      url: 'reputation-check',
    } as any);
    
    if (analysis.isSuspicious) {
      score -= 40;
    }
    
    return Math.max(0, score);
  }
}

// 限流配置管理器
export class RateLimitConfigManager {
  private static configs = new Map<string, any>();
  
  /**
   * 动态调整限流配置
   */
  static adjustRateLimit(endpoint: string, factor: number): void {
    const baseConfig = this.getBaseConfig(endpoint);
    const adjustedConfig = {
      ...baseConfig,
      points: Math.round(baseConfig.points * factor),
      duration: baseConfig.duration,
    };
    
    this.configs.set(endpoint, adjustedConfig);
    console.log(`🔄 限流配置调整: ${endpoint} - 点数: ${adjustedConfig.points} (系数: ${factor})`);
  }
  
  /**
   * 获取基础限流配置
   */
  private static getBaseConfig(endpoint: string): any {
    // 根据端点类型返回基础配置
    if (endpoint.includes('/products/list')) {
      return RATE_LIMIT_CONFIG.PRODUCTS.LIST;
    } else if (endpoint.includes('/products/create')) {
      return RATE_LIMIT_CONFIG.PRODUCTS.CREATE;
    } else if (endpoint.includes('/products/')) {
      return RATE_LIMIT_CONFIG.PRODUCTS.UPDATE;
    } else if (endpoint.includes('/batch')) {
      return RATE_LIMIT_CONFIG.BATCH;
    } else if (endpoint.includes('/inventory')) {
      return RATE_LIMIT_CONFIG.INVENTORY;
    } else if (endpoint.includes('/pricing')) {
      return RATE_LIMIT_CONFIG.PRICING;
    } else if (endpoint.includes('/search')) {
      return RATE_LIMIT_CONFIG.SEARCH;
    } else if (endpoint.includes('/health')) {
      return RATE_LIMIT_CONFIG.HEALTH;
    } else {
      return RATE_LIMIT_CONFIG.GENERAL;
    }
  }
  
  /**
   * 获取当前限流配置
   */
  static getCurrentConfig(endpoint: string): any {
    return this.configs.get(endpoint) || this.getBaseConfig(endpoint);
  }
  
  /**
   * 重置限流配置
   */
  static resetConfig(endpoint?: string): void {
    if (endpoint) {
      this.configs.delete(endpoint);
      console.log(`🔄 限流配置重置: ${endpoint}`);
    } else {
      this.configs.clear();
      console.log('🔄 所有限流配置重置');
    }
  }
}

// 限流统计和报告
export class RateLimitReporter {
  private static stats = new Map<string, {
    allowed: number;
    denied: number;
    total: number;
  }>();
  
  /**
   * 记录限流结果
   */
  static recordResult(endpoint: string, allowed: boolean): void {
    if (!this.stats.has(endpoint)) {
      this.stats.set(endpoint, { allowed: 0, denied: 0, total: 0 });
    }
    
    const stat = this.stats.get(endpoint)!;
    stat.total++;
    
    if (allowed) {
      stat.allowed++;
    } else {
      stat.denied++;
    }
  }
  
  /**
   * 获取限流统计报告
   */
  static getReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    for (const [endpoint, stat] of this.stats.entries()) {
      report[endpoint] = {
        ...stat,
        denyRate: (stat.denied / stat.total * 100).toFixed(2) + '%',
        allowRate: (stat.allowed / stat.total * 100).toFixed(2) + '%',
      };
    }
    
    return report;
  }
  
  /**
   * 清理统计信息
   */
  static clearStats(): void {
    this.stats.clear();
    console.log('🗑️ 限流统计信息已清理');
  }
}

// 导出工具函数
export {
  getClientIP,
  getRateLimitKey,
  rateLimitMiddleware,
};