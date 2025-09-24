# React User Management System

## 项目简介

基于React + TypeScript + Express的用户管理系统，采用前后端一体化配置管理。该项目是qiankun微前端架构中的子应用，实现了用户管理的完整功能。

## 核心特性

- 🚀 **前后端一体化**：统一的配置管理和依赖管理
- 🔧 **TypeScript支持**：完整的类型安全保障
- 🎯 **微前端集成**：支持qiankun框架集成
- 📱 **响应式设计**：基于Ant Design的现代UI
- 🔐 **用户权限管理**：完整的用户CRUD操作

## 快速开始

### 安装依赖
```bash
# 在项目根目录
npm install
```

### 启动开发环境
```bash
# 启动前后端服务
npm run dev:all

# 仅启动前端
npm run dev

# 仅启动后端
npm run dev:backend
```

### 构建项目
```bash
# 构建前端
npm run build

# 构建后端
npm run build:backend
```

## 端口配置

- **前端开发服务器**: 3001
- **后端API服务器**: 3002
- **前端构建产物**: 通过nginx或静态服务器提供

## 文档导航

### 📋 架构设计
- [前后端配置合并设计](./architecture/frontend-backend-merge.md) - 一体化配置管理方案
- [项目结构说明](./architecture/project-structure.md) - 代码组织和模块划分
- [API接口设计](./architecture/api-design.md) - RESTful API设计规范

### 🛠 开发指南
- [环境搭建指南](./development/setup-guide.md) - 开发环境配置
- [编码规范](./development/coding-standards.md) - TypeScript和React规范
- [构建部署指南](./development/build-deploy.md) - 构建和部署流程

### 🔧 问题排查
- [常见问题汇总](./troubleshooting/common-issues.md) - 已知问题和解决方案
- [端口冲突问题](./troubleshooting/port-conflicts.md) - 端口配置相关问题
- [依赖问题](./troubleshooting/dependency-issues.md) - 包管理和依赖冲突

### 📝 变更记录
- [v1.0.0配置合并](./changelog/v1.0.0-config-merge.md) - 前后端配置合并变更
- [迁移指南](./changelog/migration-guides.md) - 版本升级指南

## 项目状态

✅ **已完成功能**
- 用户列表展示
- 用户增删改查
- 前后端配置合并
- TypeScript类型安全
- qiankun微前端集成

🚧 **开发中功能**
- 用户权限管理
- 数据导入导出
- 高级搜索过滤

## 技术栈

### 前端
- React 18
- TypeScript
- Vite
- Ant Design
- Zustand (状态管理)

### 后端
- Node.js
- Express
- TypeScript
- 内存数据存储

## 贡献指南

1. 阅读[编码规范](./development/coding-standards.md)
2. 查看[环境搭建指南](./development/setup-guide.md)
3. 遵循Git提交规范
4. 提交前运行测试和lint检查

## 许可证

MIT License