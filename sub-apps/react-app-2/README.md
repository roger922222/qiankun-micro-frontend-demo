# React 商品管理系统

基于 React + Zustand 的完整商品管理系统，包含商品管理、分类管理、库存管理、价格策略、供应商管理等功能模块。

## 功能特性

### 1. 数据统计仪表板 (`/dashboard`)
- 关键指标展示（商品总数、分类数量、供应商数量、进行中促销）
- 商品分类分布统计
- 库存状态分布（正常库存、低库存、缺货）
- 供应商状态分布
- 库存预警提示
- 最近动态（库存变动、价格变动）

### 2. 商品管理 (`/products`)
- 商品列表展示（支持搜索、筛选、排序）
- 商品详情查看
- 添加/编辑/删除商品
- 商品状态管理（在售、停售、停产）
- 商品标签管理
- 商品图片上传
- 批量操作支持

### 3. 商品分类管理 (`/categories`)
- 树形分类结构展示
- 支持多级分类（父子关系）
- 分类排序功能
- 分类状态管理（启用/禁用）
- 树形视图和表格视图切换

### 4. 库存管理 (`/inventory`)
- 库存记录查看（入库、出库、调整、调拨）
- 库存操作（入库、出库、库存调整）
- 库存预警设置
- 库存统计报表
- 供应商信息管理
- 成本追踪

### 5. 价格策略管理 (`/pricing`)
- 价格策略创建和管理
- 多种策略类型（固定价格、百分比、阶梯价格、动态价格）
- 价格规则配置
- 促销价格管理
- 价格历史记录
- 批量价格调整

### 6. 供应商管理 (`/suppliers`)
- 供应商信息管理
- 供应商评级系统
- 联系信息管理
- 信用额度管理
- 账期设置
- 供应商状态管理

## 技术栈

- **前端框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **UI 组件库**: Ant Design 5
- **路由管理**: React Router 6
- **构建工具**: Vite
- **样式处理**: CSS + Styled Components
- **表单处理**: Ant Design Form
- **数据持久化**: Zustand Persist 中间件

## 项目结构

```
src/
├── components/          # 公共组件
│   ├── ErrorFallback.tsx
│   └── ProductForm.tsx
├── pages/              # 页面组件
│   ├── Dashboard.tsx           # 数据统计
│   ├── ProductList.tsx         # 商品管理
│   ├── CategoryManagement.tsx  # 分类管理
│   ├── InventoryManagement.tsx # 库存管理
│   ├── PricingManagement.tsx   # 价格策略
│   └── SupplierManagement.tsx  # 供应商管理
├── store/              # 状态管理
│   ├── productStore.ts         # 商品状态
│   ├── categoryStore.ts        # 分类状态
│   ├── inventoryStore.ts       # 库存状态
│   ├── pricingStore.ts         # 价格状态
│   └── supplierStore.ts        # 供应商状态
├── styles/             # 样式文件
│   └── index.css
├── App.tsx            # 主应用组件
└── main.tsx           # 应用入口
```

## 状态管理架构

使用 Zustand 进行状态管理，每个功能模块都有独立的 store：

- **productStore**: 商品数据管理
- **categoryStore**: 分类数据管理  
- **inventoryStore**: 库存数据管理
- **pricingStore**: 价格策略管理
- **supplierStore**: 供应商数据管理

每个 store 都包含：
- 数据状态（列表、选中项、加载状态等）
- UI 状态（模态框、表单数据等）
- 业务逻辑方法（CRUD 操作、筛选、统计等）
- 数据持久化配置

## 主要功能特点

### 1. 完整的 CRUD 操作
- 所有实体都支持创建、读取、更新、删除操作
- 表单验证和错误处理
- 批量操作支持

### 2. 高级筛选和搜索
- 关键词搜索
- 多条件筛选
- 排序功能
- 分页支持

### 3. 数据可视化
- 统计图表展示
- 进度条显示
- 状态指示器
- 趋势分析

### 4. 用户体验优化
- 响应式设计
- 加载状态指示
- 错误边界处理
- 操作确认提示

### 5. 类型安全
- 完整的 TypeScript 类型定义
- 接口约束
- 类型推导

## 开发命令

```bash
# 开发环境启动
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check

# 代码检查
npm run lint

# 代码格式化
npm run lint:fix
```

## 示例数据

应用启动时会自动初始化示例数据，包括：
- 3个商品分类
- 3个示例商品
- 供应商信息
- 库存记录
- 价格策略
- 促销活动

## 扩展性

系统设计具有良好的扩展性：
- 模块化的状态管理
- 组件化的 UI 设计
- 类型安全的接口定义
- 可配置的业务规则

可以轻松添加新的功能模块，如：
- 订单管理
- 客户管理
- 报表分析
- 权限管理
- 系统设置