# React App 1 用户管理系统 - 快速启动指南

## 🚀 快速启动

在根目录下执行以下命令即可启动 react-app-1 的用户管理系统（包含前后端）：

```bash
npm run start
```

## 📋 可用命令

| 命令 | 描述 |
|------|------|
| `npm run start` | 启动 react-app-1 前后端服务 |
| `npm run start:all` | 启动所有微前端应用 |
| `npm run start:react-app-1` | 仅启动 react-app-1 前后端服务（使用 concurrently） |

## 🌐 服务地址

- **前端应用**: http://localhost:3001
- **后端API**: http://localhost:3002

> ⚠️ **注意**: 为了避免端口冲突，react-app-1 的后端API使用3002端口，前端使用3001端口。前端通过代理访问后端API。

## 📦 系统功能

### ✅ 已实现功能

1. **用户管理**
   - 用户列表（分页、搜索、筛选、排序）
   - 用户创建、编辑、删除
   - 用户详情查看
   - 状态管理（正常、禁用、锁定、待审核）

2. **角色管理**
   - 角色列表和CRUD操作
   - 权限分配
   - 多级角色支持

3. **权限管理**
   - 权限列表展示
   - RBAC权限模型

4. **操作日志**
   - 完整的操作记录
   - 多维度查询（用户、操作类型、时间范围）

5. **导入导出**
   - Excel文件导入用户
   - 用户数据导出到Excel
   - 数据验证和错误处理

### 🏗️ 技术架构

- **前端**: React 18 + TypeScript + Ant Design + Redux Toolkit
- **后端**: Node.js + Express + TypeScript
- **状态管理**: Redux Toolkit + RTK Query
- **构建工具**: Vite
- **微前端**: qiankun

## 📁 项目结构

```
sub-apps/react-app-1/
├── src/                    # 前端代码
│   ├── pages/             # 页面组件
│   ├── store/             # Redux状态管理
│   ├── components/        # 通用组件
│   ├── hooks/             # 自定义Hooks
│   ├── types/             # TypeScript类型
│   ├── utils/             # 工具函数
│   ├── constants/         # 常量定义
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # 独立运行入口
│   └── main-qiankun.tsx   # 微前端入口
├── backend/               # BFF后端服务
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── services/      # 业务逻辑
│   │   ├── repositories/  # 数据访问
│   │   ├── routes/        # 路由定义
│   │   ├── middleware/    # 中间件
│   │   └── types/         # 类型定义
│   └── package.json       # 后端依赖
├── package.json           # 主包配置
├── vite.config.ts         # 前端构建配置
└── tsconfig.json          # TypeScript配置
```

## 🔧 开发模式

### 独立开发
```bash
cd sub-apps/react-app-1
npm run dev:all    # 同时启动前后端
# 或
npm run dev        # 仅前端
npm run dev:backend # 仅后端
```

### 作为微前端子应用
```bash
# 在根目录启动所有微前端应用
npm run start:all

# 或只启动 react-app-1
npm run start
```

## 📝 日志文件

日志文件位于 `logs/` 目录：
- `react-app-1-frontend.log` - 前端日志
- `react-app-1-backend.log` - 后端日志

## 🔍 测试配置

运行配置检查：
```bash
./scripts/test-react-app-1.sh
```

## 🎯 下一步

系统已经具备了完整的企业级用户管理功能，你可以：

1. **扩展功能**: 添加更多业务模块
2. **优化性能**: 实现更好的缓存策略
3. **增强安全**: 添加更完善的权限控制
4. **集成测试**: 添加自动化测试

## 📞 支持

如有问题，请检查日志文件或联系开发团队。