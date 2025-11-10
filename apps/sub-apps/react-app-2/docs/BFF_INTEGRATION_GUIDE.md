# React App 2 BFF 集成文档

## 概述

React App 2 已成功集成 Next.js BFF（Backend-for-Frontend）层，提供完整的商品管理API服务。

## 架构

```
React App 2 (前端)  ←→  Next.js BFF (服务端)  ←→  模拟数据存储
     端口: 3012           端口: 3013
```

## 功能特性

### BFF API 端点

#### 商品管理
- `GET /api/products` - 获取商品列表（支持筛选、分页、排序）
- `POST /api/products/create` - 创建商品
- `GET /api/products/[id]` - 获取单个商品详情
- `PUT /api/products/[id]` - 更新商品
- `DELETE /api/products/[id]` - 删除商品
- `GET /api/products/stats` - 获取商品统计信息
- `POST /api/products/batch-update` - 批量更新商品
- `POST /api/products/batch-delete` - 批量删除商品

#### 分类管理
- `GET /api/categories` - 获取分类列表
- `POST /api/categories` - 创建分类
- `GET /api/categories/[id]` - 获取单个分类
- `PUT /api/categories/[id]` - 更新分类
- `DELETE /api/categories/[id]` - 删除分类

#### 库存管理
- `POST /api/inventory/[productId]` - 更新商品库存
- `GET /api/inventory` - 获取低库存商品列表
- `POST /api/inventory` - 批量更新库存

#### 价格管理
- `GET /api/pricing` - 获取价格统计信息
- `POST /api/pricing` - 批量更新商品价格

#### 系统监控
- `GET /api/health` - 健康检查端点

## 快速开始

### 1. 安装依赖

```bash
cd /Users/bytedance/Downloads/qiankun-micro-frontend-demo/sub-apps/react-app-2

# 安装前端依赖
npm install

# 安装BFF依赖
cd bff
npm install
cd ..
```

### 2. 启动服务

#### 方式一：完整启动（推荐）
```bash
./start-with-bff.sh
```

#### 方式二：分别启动
```bash
# 启动BFF服务
cd bff
npm run dev

# 启动前端应用（新终端）
cd ..
npm run dev
```

### 3. 访问应用

- 前端应用：http://localhost:3012
- BFF API：http://localhost:3013
- 健康检查：http://localhost:3013/api/health

## 技术栈

### BFF层（Next.js）
- **框架**: Next.js 14
- **语言**: TypeScript
- **状态管理**: Zustand（BFF内部使用）
- **数据验证**: Zod
- **API设计**: RESTful + 统一响应格式
- **错误处理**: 全局错误边界和API错误处理

### 前端（React + Vite）
- **框架**: React 18 + Vite
- **状态管理**: Zustand（已集成BFF API调用）
- **UI组件**: Ant Design 5
- **HTTP客户端**: Axios
- **类型安全**: TypeScript

## 数据流

1. **前端请求** → 通过 Axios 调用 BFF API
2. **BFF处理** → 数据验证、业务逻辑处理
3. **数据返回** → 统一格式的 JSON 响应
4. **状态更新** → Zustand 更新前端状态

## 配置说明

### 环境变量

#### 前端配置（.env.local）
```
VITE_BFF_API_URL=http://localhost:3013
VITE_API_TIMEOUT=30000
VITE_LOG_LEVEL=info
```

#### BFF配置（bff/.env.local）
```
NODE_ENV=development
PORT=3013
CORS_ORIGIN=http://localhost:3012
API_TIMEOUT=30000
LOG_LEVEL=info
```

### CORS配置

BFF服务已配置CORS，允许前端跨域访问：
- 允许的源：http://localhost:3012
- 允许的方法：GET, POST, PUT, DELETE, OPTIONS
- 允许的头部：Content-Type, Authorization等

## API使用示例

### 获取商品列表
```typescript
import { productApi } from '../services/productApi';

const response = await productApi.getProducts(
  { keyword: '手机', status: 'active' }, // 筛选条件
  1, // 页码
  10 // 每页数量
);

console.log(response.data); // 商品列表
console.log(response.pagination); // 分页信息
```

### 创建商品
```typescript
const newProduct = {
  name: 'iPhone 15',
  description: '最新苹果手机',
  price: 7999,
  category: 'category_1',
  stock: 50,
  status: 'active',
  tags: ['手机', '苹果']
};

const response = await productApi.createProduct(newProduct);
console.log(response.data); // 创建的商品
```

### 更新库存
```typescript
const response = await inventoryApi.updateStock(
  'product_123', // 商品ID
  10, // 数量
  'increase' // 类型：increase/decrease
);
```

## 错误处理

### 统一错误响应格式
```json
{
  "success": false,
  "error": "错误信息",
  "message": "用户友好的错误消息",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### 前端错误处理
```typescript
try {
  await createProduct(productData);
  message.success('商品创建成功');
} catch (error) {
  message.error(error instanceof Error ? error.message : '创建失败');
}
```

## 性能优化

### 1. 数据缓存
- BFF层支持数据缓存（可扩展Redis）
- 前端Zustand状态持久化

### 2. 分页优化
- 服务端分页，减少数据传输
- 支持大数据集的高效查询

### 3. 批量操作
- 支持批量更新、删除操作
- 减少API调用次数

## 扩展建议

### 1. 数据库集成
当前使用内存数据，可替换为：
- PostgreSQL（推荐）
- MongoDB
- MySQL

### 2. 认证授权
集成JWT认证：
- 用户登录态管理
- API访问权限控制

### 3. 监控告警
- API调用监控
- 错误率告警
- 性能指标收集

### 4. 数据同步
- WebSocket实时数据推送
- 服务端事件（SSE）

## 部署说明

### 开发环境
```bash
npm run dev        # 启动前端开发服务器
npm run dev:bff    # 启动BFF开发服务器（在bff目录）
```

### 生产构建
```bash
npm run build      # 构建前端
npm run build:bff  # 构建BFF（在bff目录）
```

### Docker部署（可选）
可以创建Dockerfile分别容器化前端和BFF服务。

## 注意事项

1. **端口冲突**：确保3012和3013端口未被占用
2. **依赖版本**：保持Node.js版本兼容性（>=16）
3. **环境变量**：生产环境需要正确配置环境变量
4. **数据持久化**：当前为内存数据，重启服务数据会丢失

## 问题排查

### 常见问题

1. **BFF服务无法启动**
   - 检查端口3013是否被占用
   - 确认依赖安装完整

2. **前端无法连接BFF**
   - 检查CORS配置
   - 确认环境变量配置正确

3. **API调用失败**
   - 查看浏览器控制台错误信息
   - 检查BFF服务日志

### 调试工具
- BFF健康检查：http://localhost:3013/api/health
- 浏览器开发者工具Network面板
- 服务端控制台日志