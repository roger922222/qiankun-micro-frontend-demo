# 迁移指南

## 1. 从分离配置到合并配置

### 1.1 迁移概述

本指南帮助您从前后端分离的配置结构迁移到统一的配置管理。

**迁移前结构**:
```
react-app-1/
├── package.json          # 前端配置
├── src/                  # 前端代码
├── backend/
│   ├── package.json      # 后端配置
│   ├── src/              # 后端代码
│   └── tsconfig.json     # 后端TS配置
└── tsconfig.json         # 前端TS配置
```

**迁移后结构**:
```
react-app-1/
├── package.json          # 统一配置
├── tsconfig.json         # 前端TS配置
├── tsconfig.backend.json # 后端TS配置
├── src/                  # 前端代码
├── backend/src/          # 后端代码
├── shared/               # 共享代码
└── docs/                 # 项目文档
```

### 1.2 预迁移检查

在开始迁移前，请确认以下条件：

```bash
# 1. 检查Node.js版本
node --version  # 应该 >= 18.0.0

# 2. 检查当前项目状态
git status      # 确保没有未提交的更改

# 3. 备份重要文件
mkdir backup
cp package.json backup/
cp backend/package.json backup/backend-package.json
cp tsconfig.json backup/
cp backend/tsconfig.json backup/backend-tsconfig.json
```

### 1.3 分步迁移流程

#### 步骤1: 停止所有服务
```bash
# 停止前端服务
pkill -f "vite"

# 停止后端服务  
pkill -f "nodemon"
pkill -f "node.*server"

# 确认端口释放
lsof -i :3001
lsof -i :3002
```

#### 步骤2: 合并package.json
```bash
# 1. 备份现有配置
cp package.json package.json.frontend.backup
cp backend/package.json backend/package.json.backup

# 2. 创建新的package.json
cat > package.json << 'EOF'
{
  "name": "react-app-1",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3001",
    "dev:backend": "PORT=3002 nodemon backend/src/server.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:backend\"",
    "build": "tsc && vite build",
    "build:backend": "tsc -p tsconfig.backend.json",
    "build:all": "npm run build && npm run build:backend",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "antd": "^5.0.0",
    "zustand": "^4.4.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dayjs": "^1.11.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/node": "^18.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.5",
    "vitest": "^0.34.0",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "nodemon": "^2.0.20",
    "ts-node": "^10.9.0",
    "concurrently": "^7.6.0"
  }
}
EOF
```

#### 步骤3: 配置TypeScript
```bash
# 1. 更新前端TypeScript配置
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["src", "shared"],
  "exclude": ["backend"]
}
EOF

# 2. 创建后端TypeScript配置
cat > tsconfig.backend.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "outDir": "./backend/dist",
    "rootDir": "./backend/src",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["backend/src", "shared"],
  "exclude": ["src", "backend/dist"]
}
EOF
```

#### 步骤4: 创建共享代码目录
```bash
# 创建shared目录结构
mkdir -p shared/{types,constants,utils}

# 创建共享类型定义
cat > shared/types/user.ts << 'EOF'
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}
EOF

# 创建API类型定义
cat > shared/types/api.ts << 'EOF'
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
EOF
```

#### 步骤5: 更新Vite配置
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

#### 步骤6: 清理和安装依赖
```bash
# 1. 清理旧依赖
rm -rf node_modules backend/node_modules
rm -f package-lock.json backend/package-lock.json

# 2. 安装新依赖
npm install

# 3. 验证安装
npm ls --depth=0
```

#### 步骤7: 更新导入路径
```bash
# 使用脚本批量更新导入路径
cat > update-imports.sh << 'EOF'
#!/bin/bash

# 更新前端代码中的导入路径
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|../../../shared|@shared|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|../../shared|@shared|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|../shared|@shared|g'

# 更新后端代码中的导入路径
find backend/src -name "*.ts" | xargs sed -i 's|../../../shared|@shared|g'
find backend/src -name "*.ts" | xargs sed -i 's|../../shared|@shared|g'
find backend/src -name "*.ts" | xargs sed -i 's|../shared|@shared|g'

echo "导入路径更新完成"
EOF

chmod +x update-imports.sh
./update-imports.sh
```

### 1.4 验证迁移

#### 编译验证
```bash
# 1. 验证前端编译
npm run build
echo "前端编译: $?"

# 2. 验证后端编译  
npm run build:backend
echo "后端编译: $?"

# 3. 验证类型检查
npx tsc --noEmit
npx tsc -p tsconfig.backend.json --noEmit
```

#### 功能验证
```bash
# 1. 启动开发环境
npm run dev:all

# 2. 在另一个终端测试API
curl http://localhost:3002/api/users

# 3. 测试前端页面
curl http://localhost:3001
```

### 1.5 回滚方案

如果迁移出现问题，可以快速回滚：

```bash
#!/bin/bash
# rollback.sh

echo "开始回滚..."

# 1. 停止服务
pkill -f "vite"
pkill -f "nodemon"

# 2. 恢复配置文件
cp backup/package.json ./
cp backup/backend-package.json backend/package.json
cp backup/tsconfig.json ./
cp backup/backend-tsconfig.json backend/tsconfig.json

# 3. 删除新文件
rm -f tsconfig.backend.json
rm -rf shared

# 4. 重新安装依赖
rm -rf node_modules
npm install

cd backend
rm -rf node_modules  
npm install

echo "回滚完成"
```

## 2. qiankun集成迁移

### 2.1 从独立应用到微前端

#### 迁移前检查
```bash
# 检查qiankun主应用配置
grep -r "react-app-1" ../main-app/src/

# 检查当前子应用入口
ls src/main*.tsx
```

#### 创建qiankun入口文件
```typescript
// src/main-qiankun.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

let root: ReactDOM.Root | null = null;

export async function bootstrap() {
  console.log('react app 1 bootstraped');
}

export async function mount(props: any) {
  console.log('react app 1 mount', props);
  
  const container = props.container 
    ? props.container.querySelector('#root') 
    : document.getElementById('root');
    
  if (container) {
    root = ReactDOM.createRoot(container);
    root.render(<App />);
  }
}

export async function unmount(props: any) {
  console.log('react app 1 unmount', props);
  
  if (root) {
    root.unmount();
    root = null;
  }
}

// 独立运行时的逻辑
if (!window.__POWERED_BY_QIANKUN__) {
  mount({});
}
```

#### 更新构建配置
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 3001,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
      output: {
        format: 'umd',
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
```

### 2.2 环境检测和适配

#### 创建环境检测工具
```typescript
// src/utils/environment.ts
export const isQiankunEnvironment = (): boolean => {
  return !!(window as any).__POWERED_BY_QIANKUN__;
};

export const isStandalone = (): boolean => {
  return !isQiankunEnvironment();
};

export const getQiankunProps = () => {
  return (window as any).__QIANKUN_DEVELOPMENT__ ? 
    (window as any).__QIANKUN_DEVELOPMENT__.props : null;
};
```

#### 条件路由配置
```typescript
// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { isStandalone } from '@/utils/environment';
import UserManagement from '@/pages/UserManagement';

function App() {
  const AppContent = () => (
    <div className="app">
      <Routes>
        <Route path="/users" element={<UserManagement />} />
        <Route path="/" element={<UserManagement />} />
      </Routes>
    </div>
  );

  // 独立运行时需要Router，qiankun环境由主应用提供
  if (isStandalone()) {
    return (
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    );
  }

  return <AppContent />;
}

export default App;
```

## 3. 数据库迁移

### 3.1 从内存存储到持久化存储

#### 当前内存存储
```typescript
// backend/src/models/User.ts (迁移前)
export class UserModel {
  private users: User[] = [
    // 内存中的数据
  ];
  
  async findAll(): Promise<User[]> {
    return this.users;
  }
}
```

#### 迁移到SQLite
```bash
# 1. 安装数据库依赖
npm install sqlite3 sequelize
npm install --save-dev @types/sqlite3
```

```typescript
// backend/src/config/database.ts
import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './data/database.sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 同步模型
    await sequelize.sync({ force: false });
    console.log('数据库模型同步完成');
  } catch (error) {
    console.error('数据库连接失败:', error);
    throw error;
  }
}
```

#### 数据迁移脚本
```typescript
// scripts/migrate-data.ts
import { sequelize } from '../backend/src/config/database';
import { UserModel as OldUserModel } from '../backend/src/models/User.old';
import { User } from '../backend/src/models/User';

async function migrateUsers() {
  console.log('开始迁移用户数据...');
  
  const oldModel = new OldUserModel();
  const oldUsers = await oldModel.findAll();
  
  for (const user of oldUsers) {
    await User.create({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
  
  console.log(`迁移完成，共迁移 ${oldUsers.length} 条用户记录`);
}

async function main() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    await migrateUsers();
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    await sequelize.close();
  }
}

main();
```

### 3.2 运行迁移
```bash
# 1. 创建数据目录
mkdir -p backend/data

# 2. 运行迁移脚本
npx ts-node scripts/migrate-data.ts

# 3. 验证迁移结果
sqlite3 backend/data/database.sqlite "SELECT COUNT(*) FROM users;"
```

## 4. 版本升级迁移

### 4.1 从v0.x到v1.0

#### 检查当前版本
```bash
# 检查package.json版本
grep '"version"' package.json

# 检查Git标签
git tag -l
```

#### 升级步骤
```bash
# 1. 创建升级分支
git checkout -b upgrade-to-v1.0

# 2. 执行前面的配置合并迁移
# (按照1.3节的步骤执行)

# 3. 更新版本号
npm version 1.0.0

# 4. 提交更改
git add .
git commit -m "feat: upgrade to v1.0.0 with config merge"

# 5. 合并到主分支
git checkout main
git merge upgrade-to-v1.0
git tag v1.0.0
```

### 4.2 依赖版本升级

#### 检查过时依赖
```bash
npm outdated
```

#### 安全升级
```bash
# 1. 备份当前状态
cp package.json package.json.pre-upgrade

# 2. 更新依赖
npm update

# 3. 检查安全漏洞
npm audit
npm audit fix

# 4. 测试升级结果
npm test
npm run build:all
```

## 5. 团队协作迁移

### 5.1 团队迁移计划

#### 迁移时间表
```
第1周: 准备阶段
- 团队培训和文档准备
- 迁移方案评审
- 测试环境验证

第2周: 迁移实施
- 开发环境迁移
- 功能验证测试
- 问题修复

第3周: 稳定优化
- 性能优化
- 文档完善
- 团队反馈收集
```

#### 团队沟通
```markdown
## 迁移通知

### 重要变更
1. 前后端配置已合并，启动命令有变化
2. 新增共享代码目录，导入路径需要更新
3. TypeScript配置分离，编译方式有调整

### 行动项
- [ ] 所有开发者拉取最新代码
- [ ] 按照迁移指南更新本地环境
- [ ] 验证功能正常后继续开发
- [ ] 遇到问题及时反馈

### 支持资源
- 迁移指南: docs/changelog/migration-guides.md
- 常见问题: docs/troubleshooting/common-issues.md
- 技术支持: 联系开发团队
```

### 5.2 CI/CD流水线迁移

#### 更新GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run tests
      run: npm test
    
    - name: Build frontend
      run: npm run build
    
    - name: Build backend
      run: npm run build:backend
```

## 6. 故障排查和支持

### 6.1 常见迁移问题

#### 问题1: 依赖安装失败
```bash
# 错误信息
npm ERR! peer dep missing: react@^17.0.0

# 解决方案
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 问题2: TypeScript编译错误
```bash
# 错误信息
Cannot find module '@shared/types/user'

# 解决方案
# 检查tsconfig.json路径配置
# 确保shared目录存在
# 重启TypeScript服务
```

#### 问题3: 服务启动失败
```bash
# 错误信息
Port 3002 is already in use

# 解决方案
lsof -i :3002
kill -9 <PID>
npm run dev:all
```

### 6.2 获取帮助

#### 自助排查
1. 查看[常见问题汇总](../troubleshooting/common-issues.md)
2. 检查[环境搭建指南](../development/setup-guide.md)
3. 参考[项目文档](../README.md)

#### 技术支持
- **GitHub Issues**: 提交技术问题
- **团队群组**: 实时技术讨论
- **代码审查**: 请求代码review

#### 紧急联系
- **技术负责人**: 紧急技术问题
- **项目经理**: 进度和资源问题

---

**注意**: 迁移过程中请务必备份重要数据，遇到问题及时寻求帮助。