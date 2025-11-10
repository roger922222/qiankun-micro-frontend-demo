# BFF 架构设计文档

## 概述

Backend-for-Frontend (BFF) 架构模式为 React App 2 商品管理系统提供了专门的后端服务层，优化了前后端数据交互，提升了系统性能和用户体验。

## 架构目标

1. **性能优化**: 减少前端请求次数，优化数据传输
2. **数据聚合**: 整合多个数据源，提供统一接口
3. **安全性**: 实现认证授权，保护后端服务
4. **可扩展性**: 支持业务快速发展和功能扩展
5. **可维护性**: 清晰的代码结构和职责分离

## 架构组件

### 1. 前端层 (React)
- **职责**: 用户界面展示和交互
- **技术**: React 18 + TypeScript + Vite
- **优化**: 组件懒加载、虚拟滚动、图片优化

### 2. BFF 层 (Next.js)
- **职责**: API 接口、业务逻辑、数据聚合
- **技术**: Next.js 14 + TypeScript + API Routes
- **功能**: 认证授权、数据缓存、性能监控

### 3. 数据层
- **主数据库**: PostgreSQL (业务数据存储)
- **缓存层**: Redis (性能优化)
- **文件存储**: 本地/云存储 (图片和文件)

## 核心设计原则

### 1. 单一职责原则
```
前端: 专注用户界面和交互体验
BFF: 专注业务逻辑和数据处理
数据库: 专注数据存储和查询优化
```

### 2. 数据聚合策略
```typescript
// 聚合多个数据源
interface ProductDetail {
  product: Product;
  inventory: Inventory;
  pricing: Pricing;
  analytics: Analytics;
}

// BFF 聚合接口
async function getProductDetail(id: string): Promise<ProductDetail> {
  const [product, inventory, pricing, analytics] = await Promise.all([
    getProduct(id),
    getInventory(id),
    getPricing(id),
    getAnalytics(id)
  ]);
  
  return {
    product,
    inventory,
    pricing,
    analytics
  };
}
```

### 3. 缓存策略
```typescript
// 多层缓存架构
class CacheManager {
  // L1: 内存缓存 (应用级)
  private memoryCache = new Map();
  
  // L2: Redis 缓存 (分布式)
  private redisCache = new Redis();
  
  // L3: 数据库缓存 (查询级)
  private dbCache = new DatabaseCache();
  
  async get<T>(key: string): Promise<T | null> {
    // L1 → L2 → L3 缓存查找
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    const redisValue = await this.redisCache.get(key);
    if (redisValue) {
      this.memoryCache.set(key, redisValue);
      return redisValue;
    }
    
    const dbValue = await this.dbCache.get(key);
    if (dbValue) {
      this.redisCache.set(key, dbValue);
      this.memoryCache.set(key, dbValue);
      return dbValue;
    }
    
    return null;
  }
}
```

## API 设计规范

### 1. RESTful 设计
```
GET    /api/v1/products          # 获取产品列表
POST   /api/v1/products          # 创建产品
GET    /api/v1/products/:id      # 获取产品详情
PUT    /api/v1/products/:id      # 更新产品
DELETE /api/v1/products/:id      # 删除产品
PATCH  /api/v1/products/:id/stock # 更新库存
```

### 2. 统一响应格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}
```

### 3. 分页和过滤
```typescript
interface PaginationParams {
  page: number;      // 页码
  limit: number;     // 每页数量
  sortBy?: string;   // 排序字段
  sortOrder?: 'asc' | 'desc';
  filter?: {         // 过滤条件
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  };
}
```

## 安全设计

### 1. 认证授权
```typescript
// JWT 认证
class AuthService {
  async authenticate(token: string): Promise<User> {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      return await this.getUserById(payload.userId);
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
  
  async authorize(user: User, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(user.id);
    return permissions.some(p => p.resource === resource && p.action === action);
  }
}
```

### 2. 限流防护
```typescript
// 多维度限流
class RateLimiterService {
  private limiters = {
    global: new RateLimiterRedis({
      points: 1000,  // 每分钟1000次
      duration: 60
    }),
    
    user: new RateLimiterRedis({
      points: 100,   // 每分钟100次
      duration: 60
    }),
    
    api: new RateLimiterRedis({
      points: 50,    // 每分钟50次
      duration: 60
    })
  };
  
  async checkLimit(clientId: string, type: string): Promise<boolean> {
    try {
      await this.limiters[type].consume(clientId);
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### 3. 输入验证
```typescript
// Zod 验证模式
const productSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: z.number().positive().max(999999),
  stock: z.number().int().nonnegative().max(999999),
  category: z.string().min(1).max(100),
  image: z.string().url().optional()
});

// 验证中间件
function validateInput(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        });
      } else {
        next(error);
      }
    }
  };
}
```

## 性能优化

### 1. 数据库优化
```typescript
// 连接池配置
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                    // 最大连接数
  idleTimeoutMillis: 30000,   // 空闲超时
  connectionTimeoutMillis: 2000, // 连接超时
  statement_timeout: 5000     // 查询超时
});

// 查询优化
class ProductRepository {
  async findWithPagination(params: PaginationParams) {
    const { page, limit, sortBy, sortOrder, filter } = params;
    const offset = (page - 1) * limit;
    
    // 使用参数化查询防止SQL注入
    let query = `
      SELECT * FROM products 
      WHERE 1=1
    `;
    const values: any[] = [];
    let paramIndex = 1;
    
    // 动态构建过滤条件
    if (filter?.category) {
      query += ` AND category = $${paramIndex}`;
      values.push(filter.category);
      paramIndex++;
    }
    
    if (filter?.minPrice !== undefined) {
      query += ` AND price >= $${paramIndex}`;
      values.push(filter.minPrice);
      paramIndex++;
    }
    
    // 添加排序和分页
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);
    
    return pool.query(query, values);
  }
}
```

### 2. 缓存策略
```typescript
// 智能缓存策略
class CacheService {
  async cacheFirst<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // 从数据源获取
    const data = await fetcher();
    
    // 存入缓存
    await redis.setex(key, ttl, JSON.stringify(data));
    
    return data;
  }
  
  async staleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await redis.get(key);
    
    if (cached) {
      // 异步更新缓存
      fetcher().then(async (freshData) => {
        await redis.setex(key, ttl, JSON.stringify(freshData));
      }).catch(console.error);
      
      return JSON.parse(cached);
    }
    
    // 缓存未命中，同步获取并缓存
    const data = await fetcher();
    await redis.setex(key, ttl, JSON.stringify(data));
    
    return data;
  }
}
```

### 3. 性能监控
```typescript
// 性能监控中间件
function performanceMonitor() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();
    const requestId = uuidv4();
    
    // 添加请求ID到响应头
    res.setHeader('X-Request-ID', requestId);
    
    // 监听响应完成
    res.on('finish', () => {
      const duration = performance.now() - start;
      const statusCode = res.statusCode;
      
      // 记录性能指标
      logger.info('API Request', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration.toFixed(2)}ms`,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      
      // 慢查询告警
      if (duration > 1000) {
        logger.warn('Slow API Request', {
          requestId,
          method: req.method,
          url: req.url,
          duration: `${duration.toFixed(2)}ms`
        });
      }
      
      // 发送到监控系统
      metricsCollector.record('api_request_duration', duration, {
        method: req.method,
        route: req.route?.path,
        status_code: statusCode
      });
    });
    
    next();
  };
}
```

## 错误处理

### 1. 统一错误处理
```typescript
// 自定义错误类
class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

// 错误处理中间件
function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  } else {
    // 未知错误，不暴露详细信息
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred'
      }
    });
  }
}
```

### 2. 错误恢复机制
```typescript
// 自动重试机制
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // 指数退避
      await new Promise(resolve => 
        setTimeout(resolve, delay * Math.pow(2, attempt - 1))
      );
    }
  }
  
  throw lastError!;
}

// 使用示例
const product = await withRetry(() => getProduct(productId));
```

## 部署架构

### 1. 容器化部署
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
```

### 2. 环境配置
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=product_management
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: product_management
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    
volumes:
  postgres_data:
  redis_data:
```

## 监控与运维

### 1. 健康检查
```typescript
// 健康检查端点
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memory: checkMemoryUsage(),
      disk: checkDiskSpace()
    }
  };
  
  const isHealthy = Object.values(health.services).every(s => s.status === 'healthy');
  
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### 2. 性能监控
```typescript
// 性能指标收集
class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  
  record(name: string, value: number, tags?: Record<string, string>) {
    const key = this.buildMetricKey(name, tags);
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(value);
    
    // 发送到监控系统
    this.sendToMonitoringSystem(name, value, tags);
  }
  
  private buildMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags)
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${name}{${tagStr}}`;
  }
  
  private sendToMonitoringSystem(name: string, value: number, tags?: Record<string, string>) {
    // 实现发送到监控系统的逻辑
    logger.info('Metric recorded', { name, value, tags });
  }
}
```

## 最佳实践

### 1. 代码组织
```
src/
├── api/              # API 路由
├── lib/              # 核心库
├── middleware/       # 中间件
├── repositories/     # 数据访问层
├── services/         # 业务逻辑层
├── utils/            # 工具函数
├── types/            # 类型定义
└── config/           # 配置文件
```

### 2. 错误处理
- 使用自定义错误类
- 实现统一的错误处理中间件
- 记录详细的错误日志
- 提供友好的错误响应

### 3. 性能优化
- 实现多层缓存策略
- 使用数据库连接池
- 优化数据库查询
- 实现请求限流

### 4. 安全防护
- 实现认证和授权
- 验证输入数据
- 防止 SQL 注入
- 实现限流防护

### 5. 监控运维
- 实现健康检查
- 收集性能指标
- 记录访问日志
- 实现错误监控

## 总结

BFF 架构为 React App 2 提供了强大的后端支持，通过合理的设计和实现，实现了性能、安全性和可维护性的平衡。该架构支持业务的快速发展，为未来的扩展和优化奠定了坚实的基础。