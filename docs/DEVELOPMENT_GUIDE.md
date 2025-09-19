# Qiankun微前端开发指南

## 项目概述

本项目是一个完整的qiankun微前端架构示例，包含1个主应用和8个子应用，展示了跨框架微前端的最佳实践。

## 技术架构

### 应用架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        主应用 (Main App)                         │
│                    React + qiankun + TypeScript                 │
│                         Port: 3000                              │
└─────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼───────┐ ┌────▼────┐ ┌──────▼──────┐
            │  React子应用   │ │Vue子应用 │ │   共享库     │
            │               │ │         │ │  (Shared)   │
            └───────────────┘ └─────────┘ └─────────────┘
                    │              │
        ┌───────────┼──────────────┼───────────┐
        │           │              │           │
   ┌────▼────┐ ┌───▼───┐      ┌───▼───┐ ┌────▼────┐
   │App 1-5  │ │状态管理│      │App 1-3│ │状态管理  │
   │Redux等  │ │方案   │      │Vuex等 │ │方案     │
   └─────────┘ └───────┘      └───────┘ └─────────┘
```

### 状态管理方案对比

| 应用 | 框架 | 状态管理 | 特点 | 适用场景 |
|------|------|----------|------|----------|
| react-app-1 | React | Redux Toolkit | 强类型、可预测、时间旅行调试 | 复杂业务逻辑、大型应用 |
| react-app-2 | React | Zustand | 轻量、简单、TypeScript友好 | 中小型应用、快速开发 |
| react-app-3 | React | Context API | 原生、无额外依赖 | 简单状态共享 |
| react-app-4 | React | MobX | 响应式、面向对象 | 复杂数据关系 |
| react-app-5 | React | Valtio | 代理模式、简洁API | 现代化状态管理 |
| vue-app-1 | Vue | Vuex | 官方推荐、成熟稳定 | Vue 2/3兼容 |
| vue-app-2 | Vue | Pinia | 现代化、TypeScript支持 | Vue 3推荐 |
| vue-app-3 | Vue | Composition API | 原生、组合式 | 逻辑复用 |

## 开发环境搭建

### 环境要求

- **Node.js**: >= 16.0.0
- **包管理器**: pnpm >= 8.0.0 (推荐) 或 npm >= 8.0.0
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+

### 快速开始

1. **克隆项目**
```bash
git clone https://github.com/your-username/qiankun-micro-frontend-demo.git
cd qiankun-micro-frontend-demo
```

2. **安装依赖**
```bash
# 使用一键安装脚本（推荐）
npm run install:all

# 或手动安装
npm install
cd shared && npm install && cd ..
cd main-app && npm install && cd ..
# ... 为每个子应用安装依赖
```

3. **启动开发服务器**
```bash
# 一键启动所有应用（推荐）
./scripts/start-all.sh

# 或使用npm脚本
npm run dev
```

4. **访问应用**
- 主应用: http://localhost:3000
- 各子应用可独立访问对应端口

## 项目结构详解

```
qiankun-micro-frontend-demo/
├── main-app/                     # 主应用
│   ├── src/
│   │   ├── components/          # 公共组件
│   │   ├── layouts/             # 布局组件
│   │   ├── micro-apps/          # 微应用配置
│   │   ├── pages/               # 页面组件
│   │   ├── router/              # 路由配置
│   │   ├── store/               # 状态管理
│   │   ├── utils/               # 工具函数
│   │   └── App.tsx              # 应用入口
│   ├── public/                  # 静态资源
│   ├── package.json            # 依赖配置
│   └── vite.config.ts          # 构建配置
├── sub-apps/                    # 子应用目录
│   ├── react-app-1/            # React + Redux Toolkit
│   │   ├── src/
│   │   │   ├── components/     # 组件
│   │   │   ├── pages/          # 页面
│   │   │   ├── store/          # Redux store
│   │   │   ├── App.tsx         # 应用组件
│   │   │   └── main.tsx        # 入口文件（qiankun生命周期）
│   │   └── package.json
│   ├── react-app-2/            # React + Zustand
│   ├── react-app-3/            # React + Context API
│   ├── react-app-4/            # React + MobX
│   ├── react-app-5/            # React + Valtio
│   ├── vue-app-1/              # Vue + Vuex
│   ├── vue-app-2/              # Vue + Pinia
│   └── vue-app-3/              # Vue + Composition API
├── shared/                      # 共享库
│   ├── src/
│   │   ├── types/              # TypeScript类型定义
│   │   ├── utils/              # 工具函数
│   │   ├── communication/      # 应用间通信
│   │   ├── constants/          # 常量定义
│   │   └── styles/             # 共享样式
│   └── package.json
├── scripts/                     # 构建脚本
│   └── start-all.sh            # 一键启动脚本
├── docs/                        # 文档
└── package.json                # 根目录配置
```

## 核心功能实现

### 1. qiankun生命周期配置

每个子应用都需要实现qiankun的生命周期函数：

```typescript
// src/main.tsx (React应用示例)
export async function bootstrap() {
  console.log('应用启动');
}

export async function mount(props: any) {
  console.log('应用挂载', props);
  render(props);
}

export async function unmount(props: any) {
  console.log('应用卸载');
  // 清理工作
}

// 独立运行支持
if (!window.__POWERED_BY_QIANKUN__) {
  render();
}
```

### 2. 应用间通信

#### 事件总线通信
```typescript
import { globalEventBus } from '@shared/communication/event-bus';

// 发送事件
globalEventBus.emit({
  type: 'USER_UPDATED',
  source: 'user-management',
  data: { userId: '123', name: 'John' }
});

// 监听事件
globalEventBus.on('USER_UPDATED', (event) => {
  console.log('用户更新:', event.data);
});
```

#### 全局状态管理
```typescript
import { globalStateManager } from '@shared/communication/global-state';

// 更新全局状态
globalStateManager.setState({
  user: { id: '123', name: 'John' }
});

// 获取全局状态
const state = globalStateManager.getState();
```

### 3. 路由配置

主应用路由配置：
```typescript
// main-app/src/router/index.tsx
const routes = [
  { path: '/', element: <Dashboard /> },
  { path: '/user-management/*', element: <MicroAppContainer /> },
  { path: '/product-management/*', element: <MicroAppContainer /> },
  // ...其他路由
];
```

### 4. 样式隔离

使用CSS命名空间和CSS-in-JS确保样式隔离：
```css
/* 子应用样式前缀 */
.user-management-app {
  /* 应用特定样式 */
}

.product-management-app {
  /* 应用特定样式 */
}
```

## 开发最佳实践

### 1. 代码规范

- **TypeScript**: 所有应用都使用TypeScript，确保类型安全
- **ESLint + Prettier**: 统一代码风格
- **Husky + lint-staged**: 提交前代码检查

### 2. 组件设计

- **原子化设计**: 组件按原子、分子、组织、模板、页面层级组织
- **可复用性**: 公共组件放在shared库中
- **单一职责**: 每个组件只负责一个功能

### 3. 状态管理

- **状态分层**: 区分本地状态、应用状态、全局状态
- **数据流向**: 保持单向数据流
- **副作用管理**: 合理处理异步操作

### 4. 性能优化

- **代码分割**: 使用动态导入实现懒加载
- **缓存策略**: 合理设置HTTP缓存和浏览器缓存
- **资源预加载**: 预加载关键资源

## 调试指南

### 1. 开发工具

- **React DevTools**: React应用调试
- **Vue DevTools**: Vue应用调试
- **Redux DevTools**: Redux状态调试
- **Network面板**: 网络请求调试

### 2. 常见问题

#### 应用无法加载
```bash
# 检查端口是否被占用
lsof -i :3001

# 检查应用是否正常启动
curl http://localhost:3001
```

#### 样式冲突
- 检查CSS命名空间是否正确
- 确认样式隔离配置
- 使用CSS-in-JS方案

#### 路由问题
- 检查路由配置是否正确
- 确认basename设置
- 验证history模式配置

### 3. 日志调试

```typescript
import { globalLogger } from '@shared/utils/logger';

// 不同级别的日志
globalLogger.debug('调试信息');
globalLogger.info('普通信息');
globalLogger.warn('警告信息');
globalLogger.error('错误信息');
```

## 部署指南

### 1. 构建应用

```bash
# 构建所有应用
npm run build

# 分别构建
npm run build:main    # 构建主应用
npm run build:subs    # 构建所有子应用
```

### 2. 部署配置

#### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/qiankun-demo;
    
    # 主应用
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 子应用静态资源
    location /sub-apps/ {
        alias /var/www/qiankun-demo/sub-apps/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Docker部署
```dockerfile
FROM node:16-alpine

WORKDIR /app
COPY . .

RUN npm run install:all
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### 3. 环境配置

```bash
# 生产环境变量
NODE_ENV=production
PUBLIC_PATH=/
API_BASE_URL=https://api.your-domain.com
```

## 测试策略

### 1. 单元测试

```typescript
// 组件测试示例
import { render, screen } from '@testing-library/react';
import UserList from './UserList';

test('renders user list', () => {
  render(<UserList />);
  expect(screen.getByText('用户列表')).toBeInTheDocument();
});
```

### 2. 集成测试

```typescript
// 应用间通信测试
test('cross-app communication', async () => {
  // 模拟事件发送
  globalEventBus.emit('USER_UPDATED', userData);
  
  // 验证事件接收
  await waitFor(() => {
    expect(mockHandler).toHaveBeenCalledWith(userData);
  });
});
```

### 3. E2E测试

```typescript
// Cypress E2E测试示例
describe('Micro Frontend Integration', () => {
  it('should navigate between apps', () => {
    cy.visit('/');
    cy.contains('用户管理').click();
    cy.url().should('include', '/user-management');
  });
});
```

## 扩展指南

### 1. 添加新的子应用

1. 创建应用目录结构
2. 配置package.json和构建工具
3. 实现qiankun生命周期
4. 在主应用中注册
5. 更新路由配置

### 2. 集成新的状态管理方案

1. 安装相关依赖
2. 配置状态管理器
3. 实现与全局状态的通信
4. 更新类型定义

### 3. 添加新的功能模块

1. 设计模块接口
2. 实现核心功能
3. 添加测试用例
4. 更新文档

## 故障排除

### 常见错误及解决方案

1. **Module not found**: 检查路径别名配置
2. **CORS错误**: 配置开发服务器CORS
3. **样式不生效**: 检查样式隔离配置
4. **路由404**: 验证路由配置和history模式

### 性能问题排查

1. 使用Chrome DevTools分析性能
2. 检查资源加载时间
3. 分析JavaScript执行时间
4. 优化关键渲染路径

## 贡献指南

1. Fork项目到个人仓库
2. 创建功能分支
3. 提交代码并编写测试
4. 发起Pull Request
5. 代码审查和合并

## 技术支持

- **文档**: 查看docs目录下的详细文档
- **示例**: 参考各子应用的实现
- **社区**: 加入技术交流群
- **反馈**: 提交Issue或Pull Request