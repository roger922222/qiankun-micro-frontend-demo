# React App 2 全栈应用 - 合并方案说明

## 🎯 合并目标

将React App 2的前端应用和BFF服务合并为一个全栈应用，实现：
- 统一的项目结构
- 共享的依赖管理
- 协调的开发和部署流程
- 更好的开发体验

## 📁 项目结构

```
react-app-2-fullstack/
├── frontend/          # 前端应用 (原react-app-2)
├── backend/           # BFF服务 (原react-app-2-bff)
├── shared/            # 共享类型和工具
├── docker/            # Docker配置
├── docs/              # 文档
├── package.json       # 根包配置
├── Dockerfile         # 容器化配置
└── tsconfig.json      # TypeScript配置
```

## 🚀 开发模式

### 同时开发前端和后端
```bash
npm run dev
# 同时启动前端(端口3012)和后端(端口3002)
```

### 单独开发
```bash
npm run dev:frontend   # 只启动前端
npm run dev:backend    # 只启动后端
```

## 🔧 技术栈

### 前端 (Frontend)
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **UI库**: Ant Design
- **端口**: 3012

### 后端 (Backend)
- **框架**: Next.js 14 + TypeScript
- **数据库**: PostgreSQL + Drizzle ORM
- **缓存**: Redis
- **监控**: OpenTelemetry
- **端口**: 3002

## 📦 依赖管理

### 共享依赖 (根目录)
```json
{
  "dependencies": {
    "concurrently": "^8.2.2",
    "dotenv": "^16.3.1"
  }
}
```

### 前端依赖 (frontend/package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.3.6",
    "antd": "^5.2.1",
    "axios": "^1.3.4"
  }
}
```

### 后端依赖 (backend/package.json)
```json
{
  "dependencies": {
    "next": "^14.0.4",
    "drizzle-orm": "^0.29.1",
    "pg": "^8.11.3",
    "redis": "^4.6.10",
    "winston": "^3.11.0"
  }
}
```

## 🔗 前后端通信

### API调用
```typescript
// 前端调用后端API
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3002/api';

const response = await fetch(`${API_BASE_URL}/products`);
```

### 开发代理
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      }
    }
  }
});
```

## 🐳 Docker容器化

### 多阶段构建
```dockerfile
# 阶段1: 构建前端
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 阶段2: 构建后端
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# 阶段3: 生产运行
FROM node:18-alpine AS prod
WORKDIR /app
# 复制构建产物和启动脚本
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY docker/start-fullstack.sh ./
CMD ["./start-fullstack.sh"]
```

### 启动脚本
```bash
#!/bin/sh
# 同时启动前端和后端服务
cd backend && npm run start &
cd frontend && npm run preview -- --port 3012 &
wait
```

## 🚀 部署方案

### 开发环境
```bash
# 启动开发服务器
npm run dev

# 访问地址
# 前端: http://localhost:3012
# 后端: http://localhost:3002
# API文档: http://localhost:3002/api/docs
```

### 生产环境
```bash
# 构建应用
npm run build

# 启动生产服务
npm run start

# 或者使用Docker
docker build -t react-app-2-fullstack .
docker run -p 3002:3002 -p 3012:3012 react-app-2-fullstack
```

## 📊 性能优化

### 构建优化
- 并行构建前后端
- 共享依赖缓存
- Tree shaking优化

### 运行时优化
- 前端代码分割
- 后端API缓存
- 数据库查询优化

## 🔍 监控和日志

### 健康检查
```bash
# 前端健康检查
curl http://localhost:3012/health

# 后端健康检查  
curl http://localhost:3002/api/health
```

### 日志管理
- 前端: 浏览器控制台
- 后端: Winston日志文件
- 统一日志格式和级别

## 🛡️ 安全考虑

### 环境变量
```bash
# 开发环境
JWT_SECRET=dev-secret-key
DB_PASSWORD=dev-password

# 生产环境
JWT_SECRET=${PRODUCTION_SECRET}
DB_PASSWORD=${DATABASE_PASSWORD}
```

### CORS配置
```typescript
// 后端CORS配置
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3012'],
  credentials: true
};
```

## 📈 优势对比

| 方面 | 分离架构 | 合并架构 |
|------|----------|----------|
| 项目管理 | 复杂，多仓库 | 简单，单仓库 |
| 依赖管理 | 重复，版本冲突 | 统一，无冲突 |
| 开发体验 | 需要同时启动 | 一键启动 |
| 部署流程 | 分别部署 | 统一部署 |
| 代码共享 | 困难 | 容易 |
| 类型安全 | 需要额外配置 | 天然支持 |

## ⚠️ 注意事项

1. **端口冲突**: 确保前后端端口不冲突
2. **构建时间**: 合并后构建时间可能增加
3. **包大小**: 注意控制node_modules大小
4. **内存使用**: 同时运行前后端需要更多内存
5. **错误处理**: 需要统一错误处理机制

## 🔄 迁移步骤

1. **备份现有代码**
2. **创建新的项目结构**
3. **迁移前端代码到frontend目录**
4. **迁移后端代码到backend目录**
5. **配置workspace和依赖**
6. **更新构建和部署脚本**
7. **测试完整功能**
8. **更新文档**

## 📚 相关文档

- [BFF架构设计](../optimization/BFF_ARCHITECTURE_DESIGN.md)
- [前端性能优化](../optimization/FRONTEND_PERFORMANCE_GUIDE.md)
- [完整优化文档](../optimization/COMPLETE_OPTIMIZATION_DOCUMENTATION.md)