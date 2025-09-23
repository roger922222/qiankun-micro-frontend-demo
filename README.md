# Qiankun 微前端架构示例项目

## 项目简介

这是一个完整的qiankun微前端架构示例项目，展示了跨框架微前端的最佳实践。项目包含1个主应用和8个子应用，集成了多种状态管理方案，实现了完整的应用间通信机制和企业级功能。

## 项目架构

### 技术栈
- **主应用**: React 18 + React Router + qiankun + TypeScript
- **React子应用**: 集成5种不同状态管理方案
  - Redux Toolkit (用户管理系统)
  - Zustand (商品管理系统)
  - Context API (订单管理系统)
  - MobX (数据看板)
  - Valtio (设置中心)
- **Vue子应用**: 集成3种不同状态管理方案
  - Vuex (消息中心)
  - Pinia (文件管理)
  - Composition API (系统监控)

### 项目结构
```
qiankun-micro-frontend-demo/
├── main-app/                 # 主应用 (React + qiankun)
├── sub-apps/                 # 子应用目录
│   ├── react-app-1/         # React + Redux Toolkit (用户管理)
│   ├── react-app-2/         # React + Zustand (商品管理)
│   ├── react-app-3/         # React + Context API (订单管理)
│   ├── react-app-4/         # React + MobX (数据看板)
│   ├── react-app-5/         # React + Valtio (设置中心)
│   ├── vue-app-1/           # Vue 3 + Vuex (消息中心)
│   ├── vue-app-2/           # Vue 3 + Pinia (文件管理)
│   └── vue-app-3/           # Vue 3 + Composition API (系统监控)
├── shared/                  # 共享库和工具
│   ├── types/              # TypeScript类型定义
│   ├── utils/              # 工具函数
│   ├── communication/      # 应用间通信
│   └── styles/             # 共享样式
├── docs/                    # 文档
├── scripts/                 # 构建脚本
└── package.json            # 根目录依赖管理
```

## 核心功能

### 1. 应用注册和动态加载
- 基于qiankun的微前端架构
- 支持应用的动态注册和卸载
- 路由级别的应用加载

### 2. 跨应用通信机制
- 事件总线通信
- 共享状态管理
- Props传递
- 全局状态同步

### 3. 路由导航和菜单管理
- 统一的路由配置
- 动态菜单生成
- 面包屑导航
- 路由守卫

### 4. 主题切换和样式隔离
- 多主题支持
- CSS沙箱隔离
- 样式前缀命名空间
- 动态主题切换

### 5. 错误边界和异常处理
- 应用级错误边界
- 全局异常捕获
- 错误日志收集
- 降级处理机制

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0

### 安装依赖
```bash
# 安装根目录依赖
npm install

# 安装所有应用依赖
npm run install:all
```

### 开发模式
```bash
# 一键启动所有应用（推荐）
./scripts/start-all.sh

# 或使用npm脚本
npm run dev

# 或分别启动
npm run dev:main      # 启动主应用
npm run dev:subs      # 启动所有子应用
```

### 应用端口分配
- **主应用**: http://localhost:3000
- **React子应用**:
  - 用户管理系统: http://localhost:3001
  - 商品管理系统: http://localhost:3002
  - 订单管理系统: http://localhost:3003
  - 数据看板: http://localhost:3004
  - 设置中心: http://localhost:3005
- **Vue子应用**:
  - 消息中心: http://localhost:3006
  - 文件管理: http://localhost:3007
  - 系统监控: http://localhost:3008

### 生产构建
```bash
# 构建所有应用
npm run build

# 或分别构建
npm run build:main    # 构建主应用
npm run build:subs    # 构建所有子应用
```

## 应用功能模块

### 主应用功能
- 应用注册和管理
- 统一导航和菜单
- 用户认证和权限
- 全局状态管理
- 主题配置

### 子应用功能

#### React应用
1. **用户管理系统** (Redux Toolkit)
   - 用户列表和详情
   - 角色权限管理
   - 用户操作日志

2. **商品管理系统** (Zustand)
   - 商品分类管理
   - 库存管理
   - 价格策略

3. **订单管理系统** (Context API)
   - 订单列表和详情
   - 订单状态跟踪
   - 支付管理

4. **数据看板** (MobX)
   - 实时数据展示
   - 图表可视化
   - 数据分析

5. **设置中心** (Valtio)
   - 系统配置
   - 个人设置
   - 偏好管理

#### Vue应用
1. **消息中心** (Vuex)
   - 消息列表
   - 通知管理
   - 消息推送

2. **文件管理** (Pinia)
   - 文件上传下载
   - 文件夹管理
   - 权限控制

3. **系统监控** (Composition API)
   - 系统状态监控
   - 性能指标
   - 日志查看

## 技术特性

### TypeScript支持
- 完整的类型定义
- 严格的类型检查
- 智能代码提示
- 类型安全的跨应用通信

### 工程化配置
- Webpack配置优化
- ESLint + Prettier代码规范
- Husky + lint-staged
- 自动化测试配置

### 性能优化
- 代码分割和懒加载
- 资源预加载
- 缓存策略
- 打包优化

## 开发指南

### 添加新的子应用
1. 在 `sub-apps/` 目录下创建新应用
2. 配置应用的入口文件和生命周期
3. 在主应用中注册新应用
4. 更新路由配置

### 应用间通信
```typescript
// 发送消息
import { EventBus } from '@shared/communication';
EventBus.emit('user-updated', userData);

// 接收消息
EventBus.on('user-updated', (data) => {
  console.log('用户数据更新:', data);
});
```

### 共享状态管理
```typescript
// 使用共享状态
import { useGlobalState } from '@shared/store';
const { user, updateUser } = useGlobalState();
```

## 部署指南

### Docker部署
```bash
# 构建镜像
docker build -t qiankun-micro-frontend .

# 运行容器
docker run -p 3000:3000 qiankun-micro-frontend
```

### Nginx配置
```nginx
server {
    listen 80;
    server_name localhost;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://backend:8080;
    }
}
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系方式

- 作者: 罗杰
- 邮箱: m16675184976@163.com
- 项目链接: [https://github.com/your-username/qiankun-micro-frontend-demo](https://github.com/your-username/qiankun-micro-frontend-demo)