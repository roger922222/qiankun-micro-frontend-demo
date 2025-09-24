# 环境搭建指南

## 1. 系统要求

### 1.1 必需软件
- **Node.js**: 18.0.0 或更高版本
- **npm**: 9.0.0 或更高版本 (推荐使用pnpm)
- **Git**: 2.30.0 或更高版本

### 1.2 推荐开发工具
- **IDE**: Visual Studio Code
- **浏览器**: Chrome 100+ (开发者工具)
- **API测试**: Postman 或 Insomnia

### 1.3 系统兼容性
- **操作系统**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **内存**: 8GB RAM (推荐16GB)
- **磁盘**: 至少2GB可用空间

## 2. 环境安装

### 2.1 Node.js安装

#### 方式一：官方下载
1. 访问 [Node.js官网](https://nodejs.org/)
2. 下载LTS版本
3. 运行安装程序

#### 方式二：使用nvm (推荐)
```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重启终端或执行
source ~/.bashrc

# 安装Node.js
nvm install 18
nvm use 18
nvm alias default 18
```

#### 验证安装
```bash
node --version  # 应显示 v18.x.x
npm --version   # 应显示 9.x.x
```

### 2.2 包管理器选择

#### 使用npm (默认)
```bash
npm --version
```

#### 使用pnpm (推荐)
```bash
# 安装pnpm
npm install -g pnpm

# 验证安装
pnpm --version
```

#### 使用yarn
```bash
# 安装yarn
npm install -g yarn

# 验证安装
yarn --version
```

## 3. 项目初始化

### 3.1 克隆项目
```bash
# 克隆仓库
git clone <repository-url>
cd qiankun-micro-frontend-demo

# 进入react-app-1目录
cd sub-apps/react-app-1
```

### 3.2 安装依赖
```bash
# 使用npm
npm install

# 或使用pnpm (推荐)
pnpm install

# 或使用yarn
yarn install
```

### 3.3 环境配置

#### 创建环境变量文件
```bash
# 复制环境变量模板
cp .env.example .env.local
```

#### 配置环境变量
```bash
# .env.local
VITE_API_BASE_URL=http://localhost:3002
VITE_APP_PORT=3001
BACKEND_PORT=3002
NODE_ENV=development
```

## 4. 开发环境启动

### 4.1 启动完整开发环境
```bash
# 同时启动前端和后端
npm run dev:all

# 或分别启动
npm run dev          # 启动前端 (端口3001)
npm run dev:backend  # 启动后端 (端口3002)
```

### 4.2 验证启动成功

#### 前端验证
1. 打开浏览器访问 `http://localhost:3001`
2. 应该看到用户管理系统界面
3. 检查浏览器控制台无错误

#### 后端验证
1. 访问 `http://localhost:3002/api/users`
2. 应该返回JSON格式的用户数据
3. 检查终端无错误日志

#### API连通性验证
1. 在前端界面尝试获取用户列表
2. 尝试创建、编辑、删除用户
3. 检查网络请求正常

## 5. IDE配置

### 5.1 Visual Studio Code

#### 必需扩展
```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

#### 工作区配置
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": [".", "backend"],
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

#### 调试配置
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vite",
      "args": ["--port", "3001"],
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.ts",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 5.2 代码格式化配置

#### Prettier配置
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

#### ESLint配置
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react", "react-hooks"],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "prefer-const": "warn"
  }
}
```

## 6. 开发工具配置

### 6.1 Git配置

#### 全局配置
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global init.defaultBranch main
```

#### 项目级配置
```bash
# 设置Git hooks
npm run prepare  # 安装husky

# 配置提交规范
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js
```

#### Git忽略文件
```gitignore
# .gitignore
node_modules/
dist/
backend/dist/
.env.local
.env.production.local
*.log
.DS_Store
coverage/
.nyc_output/
```

### 6.2 浏览器开发者工具

#### React Developer Tools
1. 安装Chrome扩展：React Developer Tools
2. 安装Redux DevTools (如果使用Redux)
3. 配置网络面板查看API请求

#### 调试技巧
```typescript
// 在代码中添加调试点
console.log('Debug info:', data);
debugger; // 浏览器会在此处暂停

// 使用React DevTools查看组件状态
// 使用Network面板查看API请求
// 使用Console面板执行调试命令
```

## 7. 数据库配置 (可选)

### 7.1 本地数据库
当前项目使用内存存储，如需持久化存储：

#### SQLite配置
```bash
npm install sqlite3 sequelize
```

```typescript
// backend/src/config/database.ts
import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: console.log,
});
```

#### MySQL配置
```bash
npm install mysql2 sequelize
```

```typescript
// backend/src/config/database.ts
export const sequelize = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'user_management',
  username: 'root',
  password: 'password',
});
```

## 8. 常见问题解决

### 8.1 端口冲突
```bash
# 查看端口占用
lsof -i :3001
lsof -i :3002

# 杀死进程
kill -9 <PID>

# 或修改端口配置
# 在.env.local中修改端口号
```

### 8.2 依赖安装失败
```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 或使用cnpm镜像
npm config set registry https://registry.npm.taobao.org
npm install
```

### 8.3 TypeScript编译错误
```bash
# 检查TypeScript配置
npx tsc --noEmit

# 重启TypeScript服务 (VS Code)
Ctrl+Shift+P -> TypeScript: Restart TS Server
```

### 8.4 热重载不工作
```bash
# 检查文件监听限制 (Linux/Mac)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 重启开发服务器
npm run dev:all
```

## 9. 性能优化

### 9.1 开发环境优化
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      overlay: false, // 禁用错误覆盖层
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'antd'], // 预构建依赖
  },
});
```

### 9.2 构建优化
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
        },
      },
    },
  },
});
```

## 10. 团队协作

### 10.1 代码规范
- 使用Prettier格式化代码
- 遵循ESLint规则
- 提交前运行lint检查
- 使用conventional commits规范

### 10.2 分支管理
```bash
# 功能开发分支
git checkout -b feature/user-management
git add .
git commit -m "feat: add user management feature"
git push origin feature/user-management

# 创建Pull Request进行代码审查
```

### 10.3 环境隔离
- 开发环境：localhost
- 测试环境：test.example.com
- 生产环境：prod.example.com

每个环境使用独立的配置文件和数据库。