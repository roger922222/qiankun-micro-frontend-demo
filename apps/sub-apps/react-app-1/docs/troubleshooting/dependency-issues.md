# 依赖问题解决方案

## 1. 依赖冲突问题

### 1.1 版本冲突

#### 问题描述
不同包要求同一依赖的不同版本，导致安装失败或运行时错误。

#### 常见错误
```bash
npm ERR! peer dep missing: react@^17.0.0, required by @types/react@^17.0.0
npm ERR! Could not resolve dependency: peer react@"^18.0.0" from react-dom@18.2.0

# 或运行时错误
Warning: Invalid hook call. Hooks can only be called inside the body of a function component.
```

#### 解决方案

**方案一：版本对齐**
```json
// package.json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  }
}
```

**方案二：使用overrides (npm 8.3+)**
```json
// package.json
{
  "overrides": {
    "react": "^18.2.0",
    "@types/react": "^18.0.0"
  }
}
```

**方案三：使用resolutions (yarn)**
```json
// package.json
{
  "resolutions": {
    "react": "^18.2.0",
    "@types/react": "^18.0.0"
  }
}
```

### 1.2 重复依赖

#### 问题描述
同一个包被安装了多个版本，导致bundle体积增大或运行时问题。

#### 检测方法
```bash
# 检查重复依赖
npm ls react
npm ls react-dom

# 查看依赖树
npm ls --depth=0

# 使用工具分析
npx duplicate-package-checker-webpack-plugin
```

#### 解决方案
```bash
# 清理node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 使用npm dedupe
npm dedupe

# 检查并修复
npm audit fix
```

## 2. TypeScript类型问题

### 2.1 类型定义缺失

#### 问题描述
```typescript
// 错误: Could not find a declaration file for module 'some-package'
import somePackage from 'some-package';
```

#### 解决方案

**方案一：安装类型定义**
```bash
npm install --save-dev @types/some-package
```

**方案二：创建类型声明**
```typescript
// src/types/global.d.ts
declare module 'some-package' {
  export interface SomeInterface {
    // 定义接口
  }
  
  const somePackage: {
    // 定义模块导出
  };
  
  export default somePackage;
}
```

**方案三：临时解决**
```typescript
// src/types/global.d.ts
declare module 'some-package';

// 使用时
const somePackage = require('some-package');
```

### 2.2 版本不兼容

#### 问题描述
TypeScript版本与类型定义版本不匹配。

#### 解决方案
```json
// package.json - 确保版本兼容
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^18.0.0",
    "@types/react": "^18.0.0"
  }
}
```

```bash
# 更新TypeScript和相关类型
npm update typescript @types/node @types/react
```

## 3. 前后端依赖隔离

### 3.1 构建时依赖混淆

#### 问题描述
前端构建时包含了后端依赖，导致构建失败或bundle过大。

#### 错误示例
```
Error: Cannot resolve module 'express' in frontend build
Module not found: Can't resolve 'fs' in '/src/components'
```

#### 解决方案

**方案一：分离package.json**
```json
// 根目录package.json (共享依赖)
{
  "dependencies": {
    "dayjs": "^1.11.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "concurrently": "^7.6.0"
  }
}

// frontend dependencies (在主package.json中)
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.0.0"
  }
}

// backend dependencies (在主package.json中)
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

**方案二：使用peerDependencies**
```json
// package.json
{
  "dependencies": {
    // 前端依赖
    "react": "^18.2.0",
    "antd": "^5.0.0",
    // 后端依赖
    "express": "^4.18.2"
  },
  "peerDependencies": {
    "react": "^18.2.0"
  }
}
```

**方案三：Vite外部化配置**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'express',
        'cors',
        'fs',
        'path',
        'http'
      ]
    }
  }
});
```

### 3.2 Node.js模块在浏览器中的问题

#### 问题描述
```
Module not found: Can't resolve 'fs'
Module not found: Can't resolve 'path'
```

#### 解决方案
```typescript
// vite.config.ts
export default defineConfig({
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Node.js polyfills
      path: 'path-browserify',
      fs: false,
      os: 'os-browserify/browser',
      crypto: 'crypto-browserify',
    }
  },
  optimizeDeps: {
    include: ['path-browserify', 'os-browserify/browser']
  }
});
```

## 4. 包管理器问题

### 4.1 npm vs pnpm vs yarn

#### 锁文件冲突
```bash
# 项目中只保留一种锁文件
rm package-lock.json  # 如果使用pnpm
rm pnpm-lock.yaml     # 如果使用npm
rm yarn.lock          # 如果使用npm/pnpm
```

#### 统一包管理器
```json
// package.json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  },
  "scripts": {
    "preinstall": "npx only-allow npm"
  }
}
```

### 4.2 缓存问题

#### 清理缓存
```bash
# npm
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# pnpm
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install

# yarn
yarn cache clean
rm -rf node_modules yarn.lock
yarn install
```

### 4.3 网络问题

#### 配置镜像源
```bash
# npm
npm config set registry https://registry.npmmirror.com

# pnpm
pnpm config set registry https://registry.npmmirror.com

# yarn
yarn config set registry https://registry.npmmirror.com

# 临时使用
npm install --registry https://registry.npmmirror.com
```

#### 代理配置
```bash
# 设置代理
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# 取消代理
npm config delete proxy
npm config delete https-proxy
```

## 5. 构建工具依赖问题

### 5.1 Vite相关问题

#### 预构建失败
```bash
# 错误信息
Error: Build failed with 1 error:
node_modules/some-package/index.js:1:0: ERROR: Top-level await is not available
```

#### 解决方案
```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd'
    ],
    exclude: [
      'problematic-package'
    ]
  },
  build: {
    target: 'es2020' // 支持top-level await
  }
});
```

#### 清理Vite缓存
```bash
rm -rf node_modules/.vite
npm run dev
```

### 5.2 TypeScript编译问题

#### 路径映射问题
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}

// vite.config.ts - 确保Vite也配置了相同的别名
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
```

#### 模块解析问题
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // Vite项目使用
    // 或
    "moduleResolution": "node"     // Node.js项目使用
  }
}
```

## 6. 运行时依赖问题

### 6.1 React相关问题

#### Hook规则违反
```typescript
// ❌ 错误：在条件语句中使用Hook
function Component() {
  if (condition) {
    const [state, setState] = useState(0);
  }
}

// ✅ 正确：Hook在顶层使用
function Component() {
  const [state, setState] = useState(0);
  
  if (condition) {
    // 使用state
  }
}
```

#### 多个React实例
```bash
# 检查React版本
npm ls react

# 如果有多个版本，使用overrides统一
```

```json
// package.json
{
  "overrides": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### 6.2 样式依赖问题

#### CSS-in-JS冲突
```typescript
// 确保styled-components版本兼容
npm install styled-components@^5.3.0

// 或使用CSS Modules避免冲突
import styles from './Component.module.css';
```

#### Ant Design样式问题
```typescript
// vite.config.ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        modifyVars: {
          '@primary-color': '#1890ff',
        },
      },
    },
  },
});
```

## 7. 开发环境依赖问题

### 7.1 热重载问题

#### 文件监听限制
```bash
# Linux/Mac系统增加文件监听限制
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### Vite HMR配置
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      overlay: false, // 禁用错误覆盖
    },
    watch: {
      usePolling: true, // 在某些环境下启用轮询
    },
  },
});
```

### 7.2 开发工具依赖

#### ESLint配置冲突
```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    // 解决冲突的规则
    "@typescript-eslint/no-unused-vars": "warn",
    "no-unused-vars": "off"
  }
}
```

#### Prettier与ESLint冲突
```bash
npm install --save-dev eslint-config-prettier eslint-plugin-prettier
```

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier" // 必须放在最后
  ]
}
```

## 8. 生产环境依赖问题

### 8.1 构建依赖优化

#### 分析bundle大小
```bash
npm install --save-dev webpack-bundle-analyzer

# 或使用rollup-plugin-visualizer (Vite)
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
    }),
  ],
});
```

#### Tree Shaking优化
```typescript
// 使用ES模块导入
import { Button } from 'antd'; // ✅ 推荐
import Button from 'antd/es/button'; // ✅ 更好

// 避免整体导入
import * as antd from 'antd'; // ❌ 避免
```

### 8.2 依赖安全问题

#### 安全审计
```bash
# 检查安全漏洞
npm audit

# 自动修复
npm audit fix

# 强制修复
npm audit fix --force
```

#### 更新依赖
```bash
# 检查过时依赖
npm outdated

# 更新依赖
npm update

# 使用工具辅助更新
npx npm-check-updates -u
npm install
```

## 9. 依赖管理最佳实践

### 9.1 版本管理策略

#### 语义化版本
```json
{
  "dependencies": {
    "react": "^18.2.0",        // 兼容版本更新
    "antd": "~5.1.0",          // 只更新补丁版本
    "lodash": "4.17.21"        // 锁定版本
  }
}
```

#### 定期更新
```bash
# 每月检查一次依赖更新
npm outdated
npm audit

# 测试环境先更新验证
npm update --save-dev
npm test
```

### 9.2 依赖分类管理

```json
// package.json
{
  "dependencies": {
    // 生产环境必需的依赖
    "react": "^18.2.0",
    "antd": "^5.0.0"
  },
  "devDependencies": {
    // 开发工具依赖
    "typescript": "^5.0.0",
    "vite": "^4.0.0",
    "@types/react": "^18.0.0"
  },
  "peerDependencies": {
    // 宿主环境提供的依赖
    "react": "^18.0.0"
  },
  "optionalDependencies": {
    // 可选依赖，安装失败不影响主功能
    "fsevents": "^2.3.0"
  }
}
```

### 9.3 依赖监控

#### 自动化检查
```bash
#!/bin/bash
# scripts/check-deps.sh

echo "检查依赖状态..."

# 检查过时依赖
echo "=== 过时依赖 ==="
npm outdated

# 检查安全漏洞
echo "=== 安全审计 ==="
npm audit

# 检查重复依赖
echo "=== 重复依赖 ==="
npm ls --depth=0 | grep -E "UNMET|extraneous"

echo "依赖检查完成"
```

#### CI/CD集成
```yaml
# .github/workflows/deps-check.yml
name: Dependencies Check

on:
  schedule:
    - cron: '0 0 * * 1' # 每周一检查
  pull_request:

jobs:
  deps-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm audit
      - run: npm outdated
```

### 9.4 故障排查流程

```bash
#!/bin/bash
# scripts/fix-deps.sh

echo "🔧 依赖问题诊断和修复"

# 1. 备份当前状态
echo "📦 备份当前依赖状态..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || true

# 2. 清理环境
echo "🧹 清理依赖环境..."
rm -rf node_modules
rm -f package-lock.json

# 3. 清理缓存
echo "🗑️  清理npm缓存..."
npm cache clean --force

# 4. 重新安装
echo "📥 重新安装依赖..."
npm install

# 5. 验证安装
echo "✅ 验证依赖安装..."
npm ls --depth=0

# 6. 运行测试
echo "🧪 运行测试验证..."
npm test

echo "🎉 依赖修复完成"
```