# 后端服务启动问题排查指南

## 概述

本文档专门针对React App 1后端服务启动失败的问题提供系统性的排查和解决方案。

## 常见问题分类

### 1. TypeScript编译错误

#### 1.1 未使用变量错误 (TS6133)
**错误现象**:
```
TSError: ⨯ Unable to compile TypeScript:
src/app.ts(10,1): error TS6133: 'authMiddleware' is declared but its value is never read.
```

**解决方案**:
```typescript
// 方案1: 注释未使用的导入
// import { authMiddleware } from './middleware/auth';

// 方案2: 使用下划线前缀表示未使用
import { authMiddleware as _authMiddleware } from './middleware/auth';

// 方案3: ESLint忽略
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { authMiddleware } from './middleware/auth';
```

#### 1.2 未使用参数错误
**错误现象**:
```
error TS6133: 'req' is declared but its value is never read.
```

**解决方案**:
```typescript
// 使用下划线前缀
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 或者省略参数名
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});
```

### 2. 模块系统配置问题

#### 2.1 ES模块导入错误
**错误现象**:
```
SyntaxError: Cannot use import statement outside a module
```

**原因分析**:
- TypeScript配置中module设置不正确
- 缺少正确的tsconfig.json文件
- Node.js版本与配置不兼容

**解决方案**:
```json
// tsconfig.json 确保使用CommonJS
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",  // 关键配置
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

#### 2.2 路径解析问题
**错误现象**:
```
Cannot find module '@/middleware/auth'
```

**解决方案**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["../shared/*"]
    }
  }
}
```

### 3. 依赖问题

#### 3.1 缺少依赖包
**错误现象**:
```
Cannot find module 'express'
Cannot find module '@types/express'
```

**解决方案**:
```bash
# 安装运行时依赖
npm install express cors helmet express-rate-limit

# 安装类型定义
npm install -D @types/express @types/cors @types/helmet
```

#### 3.2 版本冲突
**检查方法**:
```bash
npm ls express
npm ls @types/express
```

**解决方案**:
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

### 4. 端口占用问题

#### 4.1 检查端口占用
```bash
# 检查3002端口
lsof -i :3002
netstat -tulpn | grep 3002
```

#### 4.2 解决端口冲突
```bash
# 杀死占用进程
kill -9 <PID>

# 或使用不同端口
PORT=3003 npm run dev:backend
```

## 系统性排查流程

### 第一步：检查基础环境
```bash
# 检查Node.js版本
node --version

# 检查npm版本  
npm --version

# 检查TypeScript版本
npx tsc --version
```

### 第二步：检查项目配置
```bash
# 检查package.json脚本
cat package.json | grep -A 5 "scripts"

# 检查TypeScript配置
cat tsconfig.json
cat backend/tsconfig.json  # 如果存在
```

### 第三步：检查依赖安装
```bash
# 检查依赖是否完整安装
npm ls --depth=0

# 检查是否有缺失的依赖
npm audit
```

### 第四步：尝试编译
```bash
# 检查TypeScript编译
npx tsc --noEmit

# 检查后端编译（如果有独立配置）
npx tsc -p backend/tsconfig.json --noEmit
```

### 第五步：启动服务
```bash
# 启动后端服务
cd backend && npx ts-node src/app.ts

# 或使用npm脚本
npm run dev:backend
```

## 调试技巧

### 1. 启用详细日志
```bash
# 启用TypeScript详细输出
npx ts-node --transpile-only src/app.ts

# 启用Node.js调试
DEBUG=* npm run dev:backend
```

### 2. 逐步调试
```typescript
// 添加调试日志
console.log('Starting server...');
console.log('Port:', process.env.PORT || 3002);
console.log('Environment:', process.env.NODE_ENV);

// 检查导入
console.log('Express imported:', typeof express);
console.log('CORS imported:', typeof cors);
```

### 3. 使用调试器
```bash
# 启动调试模式
node --inspect-brk=0.0.0.0:9229 -r ts-node/register backend/src/app.ts
```

## 预防措施

### 1. 代码质量
```json
// .eslintrc.json
{
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_"
    }]
  }
}
```

### 2. 自动化检查
```json
// package.json
{
  "scripts": {
    "lint": "eslint backend/src --ext .ts",
    "type-check": "tsc --noEmit",
    "pre-start": "npm run lint && npm run type-check"
  }
}
```

### 3. 环境配置
```bash
# .env.example
PORT=3002
NODE_ENV=development
DEBUG=app:*
```

### 4. 健康检查
```typescript
// 添加健康检查端点
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});
```

## 常用命令速查

```bash
# 快速诊断
ps aux | grep node                    # 检查进程
lsof -i :3002                        # 检查端口
npm run dev:backend                   # 启动后端
curl http://localhost:3002/health     # 测试健康检查

# 清理重置
rm -rf node_modules package-lock.json # 清理依赖
npm install                           # 重新安装
npm run build                         # 测试构建

# 调试相关
DEBUG=* npm run dev:backend           # 详细日志
npx tsc --noEmit                      # 类型检查
npm run lint                          # 代码检查
```

## 相关文档

- [API 500错误完整诊断](./api-500-error-diagnosis.md)
- [常见问题汇总](./common-issues.md)
- [端口冲突解决方案](./port-conflicts.md)
- [开发环境搭建指南](../development/setup-guide.md)