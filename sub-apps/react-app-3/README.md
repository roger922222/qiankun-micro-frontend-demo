# React 订单管理系统

基于 React + Context API 的完整订单管理系统，包含订单管理、客户管理、支付跟踪等功能模块。

## 功能特性

### 1. 订单管理 (`/orders`)
- 订单列表展示（支持搜索、筛选、排序）
- 订单详情查看
- 订单状态管理（待确认、已确认、处理中、已发货、已完成、已取消）
- 订单项管理
- 订单备注
- 批量操作支持

### 2. 订单详情 (`/orders/:id`)
- 订单基本信息
- 客户信息
- 商品明细
- 收货地址
- 支付信息
- 订单状态历史

### 3. 订单统计 (`/stats`)
- 订单总数统计
- 销售额统计
- 订单状态分布
- 支付方式统计
- 时间趋势分析

## 技术栈

- **框架**: React 18 + TypeScript
- **状态管理**: Context API + useReducer
- **路由**: React Router v6
- **UI组件**: Ant Design v5
- **构建工具**: Vite
- **样式**: CSS Modules + Styled Components
- **微前端**: qiankun

## 项目结构

```
src/
├── components/          # 公共组件
│   └── ErrorFallback.tsx
├── context/            # Context状态管理
│   └── OrderContext.tsx
├── pages/              # 页面组件
│   ├── OrderList.tsx   # 订单列表
│   ├── OrderDetail.tsx # 订单详情
│   └── OrderStats.tsx  # 订单统计
├── styles/             # 样式文件
│   ├── App.css
│   └── index.css
├── App.tsx             # 主应用组件
├── main.tsx            # 应用入口（支持qiankun）
└── shared-stub.ts      # 共享库存根
```

## 开发指南

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 代码格式化
npm run lint:fix
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 微前端集成

本应用支持作为qiankun微前端子应用运行，主要特性：

- **生命周期管理**: 实现了bootstrap、mount、unmount生命周期
- **路由隔离**: 支持独立路由和微前端路由
- **样式隔离**: CSS作用域隔离
- **状态管理**: Context API状态管理
- **错误边界**: React错误边界处理

### qiankun配置

```javascript
// 在主应用中注册
{
  name: 'react-order-management',
  entry: '//localhost:3003',
  container: '#subapp-viewport',
  activeRule: '/order-management',
}
```

## 状态管理

使用Context API进行状态管理，主要包括：

### OrderContext
- 订单列表管理
- 订单状态更新
- 客户信息管理
- 支付状态跟踪

### 状态结构
```typescript
interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
}
```

## API接口

### 订单相关
- `GET /api/orders` - 获取订单列表
- `GET /api/orders/:id` - 获取订单详情
- `POST /api/orders` - 创建订单
- `PUT /api/orders/:id` - 更新订单
- `DELETE /api/orders/:id` - 删除订单

### 客户相关
- `GET /api/customers` - 获取客户列表
- `GET /api/customers/:id` - 获取客户详情

## 样式主题

支持自定义主题配置：

```typescript
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 4,
    fontSize: 14
  }
}
```

## 错误处理

- **React错误边界**: 捕获组件渲染错误
- **API错误处理**: 统一的错误提示
- **路由错误**: 404页面处理
- **微前端错误**: qiankun集成错误处理

## 性能优化

- **代码分割**: React.lazy + Suspense
- **状态优化**: useCallback、useMemo
- **渲染优化**: React.memo
- **打包优化**: Vite构建优化

## 浏览器兼容性

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 许可证

MIT License