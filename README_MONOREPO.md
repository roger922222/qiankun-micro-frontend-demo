# Qiankun微前端Monorepo项目

## 🚀 项目介绍

这是一个基于Monorepo架构的Qiankun微前端项目，包含1个主应用和8个子应用，支持多种技术栈和状态管理方案。

## 📦 项目结构

```
qiankun-micro-frontend-monorepo/
├── apps/                          # 应用目录
│   ├── main-app/                  # 主应用 (React + qiankun)
│   ├── sub-apps/                  # 子应用目录
│   │   ├── react-app-1/         # React用户管理 (Redux Toolkit)
│   │   ├── react-app-2/         # React商品管理 (Zustand + BFF)
│   │   ├── react-app-3/         # React订单管理 (Context API)
│   │   ├── react-app-4/         # React数据看板 (MobX)
│   │   ├── react-app-5/         # React设置中心 (Valtio)
│   │   ├── vue-app-1/           # Vue消息中心 (Vuex)
│   │   ├── vue-app-2/           # Vue文件管理 (Pinia)
│   │   └── vue-app-3/           # Vue系统监控 (Composition API)
│   └── react-app-2-bff/         # BFF服务 (Next.js + PostgreSQL + Redis)
├── packages/                      # 共享包目录
│   ├── shared/                    # 共享工具包
│   ├── eslint-config/             # ESLint配置
│   └── typescript-config/         # TypeScript配置
├── docker/                        # Docker配置
├── scripts/                       # 构建脚本
└── docs/                          # 文档目录
```

## 🛠️ 技术栈

### 前端技术
- **主应用**: React 18 + TypeScript + Vite + qiankun
- **子应用**: React 18, Vue 3
- **状态管理**: Redux Toolkit, Zustand, Context API, MobX, Valtio, Vuex, Pinia
- **UI框架**: Ant Design, Element Plus
- **构建工具**: Vite, Webpack

### 后端技术 (BFF)
- **框架**: Next.js 14
- **数据库**: PostgreSQL 15
- **缓存**: Redis 7
- **ORM**: Drizzle ORM
- **监控**: OpenTelemetry
- **日志**: Winston

### 基础设施
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **包管理**: npm workspaces
- **代码质量**: ESLint, Prettier, Husky

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (可选)

### 安装依赖
```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
npm install
npm run install:workspaces
```

### 开发模式
```bash
# 启动所有应用
npm run dev

# 启动指定应用组
npm run dev:main      # 主应用
npm run dev:react-apps # React子应用
npm run dev:vue-apps   # Vue子应用
npm run dev:bff        # BFF服务

# 使用智能启动脚本
npm run start:all
```

### 生产构建
```bash
# 构建所有应用
npm run build

# 构建指定应用
npm run build:main
npm run build:apps
npm run build:bff
```

### Docker部署
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 📋 应用端口配置

| 应用 | 端口 | 描述 |
|------|------|------|
| 主应用 | 3000 | Qiankun主应用 |
| React用户管理 | 3001 | Redux Toolkit状态管理 |
| React商品管理 | 3012 | Zustand + BFF服务 |
| React商品管理BFF | 3002 | Next.js API服务 |
| React订单管理 | 3003 | Context API状态管理 |
| React数据看板 | 3004 | MobX状态管理 |
| React设置中心 | 3005 | Valtio状态管理 |
| Vue消息中心 | 3006 | Vuex状态管理 |
| Vue文件管理 | 3007 | Pinia状态管理 |
| Vue系统监控 | 3008 | Composition API |

## 🔧 开发指南

### Monorepo工作区
本项目使用npm workspaces管理monorepo架构：

```json
{
  "workspaces": [
    "apps/*",
    "packages/*",
    "shared/*"
  ]
}
```

### 添加新应用
1. 在`apps/`目录下创建新应用
2. 配置`package.json`中的workspace依赖
3. 更新根目录的脚本配置
4. 添加Docker配置（可选）

### 共享包开发
```bash
# 构建共享包
npm run build:shared

# 发布共享包（内部使用）
cd packages/shared && npm run build
```

### 代码规范
- **ESLint**: 统一代码规范
- **Prettier**: 代码格式化
- **TypeScript**: 类型安全
- **Husky**: Git hooks

## 📊 性能优化

### 前端优化
- ✅ React.memo组件优化
- ✅ useMemo/useCallback缓存
- ✅ 虚拟滚动实现
- ✅ 图片懒加载
- ✅ 代码分割
- ✅ 预加载策略

### 后端优化 (BFF)
- ✅ Redis多层缓存
- ✅ PostgreSQL查询优化
- ✅ 智能限流
- ✅ 异常检测
- ✅ 链路追踪
- ✅ 结构化日志

### 性能指标
- 首屏加载时间: 1.1s (优化前3.2s)
- 1000项列表渲染: 25ms (优化前850ms)
- 包大小减少: 57%
- 内存占用优化: 45%

## 🛡️ 安全特性

- JWT认证授权
- 请求限流防护
- 输入验证
- SQL注入防护
- XSS防护
- CORS配置

## 📈 监控与日志

- Web Vitals性能监控
- OpenTelemetry链路追踪
- Winston结构化日志
- 健康检查
- 错误边界
- 性能告警

## 🧪 测试

```bash
# 运行所有测试
npm run test

# 运行指定应用测试
npm run test:main
npm run test:apps

# 覆盖率测试
npm run test:coverage
```

## 📚 文档

详细文档请参考：
- [完整优化文档](apps/sub-apps/react-app-2/docs/optimization/COMPLETE_OPTIMIZATION_DOCUMENTATION.md)
- [BFF架构设计](apps/sub-apps/react-app-2/docs/optimization/BFF_ARCHITECTURE_DESIGN.md)
- [前端性能优化指南](apps/sub-apps/react-app-2/docs/optimization/FRONTEND_PERFORMANCE_GUIDE.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📝 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 维护者

- 罗杰 (luojie.rt@example.com)

## 🙏 致谢

- [qiankun](https://github.com/umijs/qiankun) - 微前端框架
- [Vite](https://vitejs.dev/) - 构建工具
- [Next.js](https://nextjs.org/) - React框架
- [Vue.js](https://vuejs.org/) - 渐进式框架