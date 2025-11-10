# 常见问题汇总

## 1. 端口冲突问题

### 1.1 问题描述
react-app-1后端(3002) 与 react-app-2前端(3002) 端口冲突，导致服务启动失败。

### 1.2 错误现象
```bash
Error: listen EADDRINUSE: address already in use :::3002
    at Server.setupListenHandle [as _listen2] (net.js:1318:16)
    at listenInCluster (net.js:1366:12)
```

### 1.3 根本原因
- 项目初期规划时未统一端口分配策略
- 多个子应用使用了相同的端口号
- 缺乏端口管理文档

### 1.4 解决方案

#### 临时解决方案
```bash
# 查看端口占用
lsof -i :3002

# 杀死占用进程
kill -9 <PID>

# 修改端口启动
PORT=3003 npm run dev:backend
```

#### 永久解决方案
1. **建立端口分配规范**
   ```
   react-app-1: 前端3001, 后端3002
   react-app-2: 前端3012, 后端3013
   react-app-3: 前端3023, 后端3024
   ```

2. **更新配置文件**
   ```json
   // react-app-2/package.json
   {
     "scripts": {
       "dev": "vite --port 3012",
       "dev:backend": "PORT=3013 nodemon backend/src/server.ts"
     }
   }
   ```

3. **创建端口配置文档**
   - 参考 [端口冲突详细解决方案](./port-conflicts.md)

### 1.5 预防措施
- 使用环境变量管理端口配置
- 建立端口分配表
- 在启动脚本中检查端口可用性

---

## 2. useLocation Router错误

### 2.1 问题描述
在qiankun微前端环境中，子应用使用`useLocation`时报错：`useLocation() may be used only in the context of a <Router> component`

### 2.2 错误现象
```
Error: useLocation() may be used only in the context of a <Router> component.
    at useLocation (react-router-dom.js:1405:5)
    at UserManagement (UserManagement.tsx:15:23)
```

### 2.3 根本原因
- qiankun子应用在独立运行时没有Router上下文
- 组件在Router外部使用了useLocation Hook
- 微前端集成时Router配置不正确

### 2.4 解决方案

#### 方案一：条件渲染Router
```typescript
// src/App.tsx
import { BrowserRouter } from 'react-router-dom';

function App() {
  // 检查是否在qiankun环境中
  const isQiankun = window.__POWERED_BY_QIANKUN__;
  
  const AppContent = () => (
    <div>
      <UserManagement />
    </div>
  );

  if (isQiankun) {
    // qiankun环境中，由主应用提供Router
    return <AppContent />;
  }

  // 独立运行时，自己提供Router
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
```

#### 方案二：使用可选的useLocation
```typescript
// src/hooks/useOptionalLocation.ts
import { useLocation } from 'react-router-dom';

export function useOptionalLocation() {
  try {
    return useLocation();
  } catch (error) {
    // 如果不在Router上下文中，返回默认值
    return {
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'default'
    };
  }
}
```

#### 方案三：环境检测
```typescript
// src/utils/environment.ts
export const isQiankunEnvironment = () => {
  return window.__POWERED_BY_QIANKUN__;
};

export const isStandalone = () => {
  return !window.__POWERED_BY_QIANKUN__;
};

// 组件中使用
const UserManagement = () => {
  const location = isStandalone() ? useLocation() : null;
  // 其他逻辑
};
```

### 2.5 最佳实践
- 在微前端环境中统一Router管理
- 使用环境检测进行条件渲染
- 提供Router的fallback机制

---

## 3. API 500错误和后端服务启动问题

### 3.1 问题描述
前端请求API时返回500错误，通常是由于后端服务未正确启动导致的。

### 3.2 错误现象
```
GET http://localhost:3000/api/users?page=1&pageSize=20&keyword= 500 (Internal Server Error)

[vite] http proxy error at /api/users:
Error: connect ECONNREFUSED ::1:3002
```

### 3.3 根本原因
- **TypeScript编译错误**: 后端代码存在编译错误导致服务无法启动
- **配置文件缺失**: 缺少必要的tsconfig.json配置文件
- **未使用变量错误**: TypeScript严格模式下未使用的变量导致编译失败
- **ES模块导入问题**: 模块系统配置不正确

### 3.4 诊断步骤

#### 步骤1：检查服务状态
```bash
# 检查Node.js进程
ps aux | grep node

# 检查端口占用
lsof -i :3000,3002

# 检查后端日志
cat logs/react-app-1-backend.log
```

#### 步骤2：检查代理配置
```typescript
// main-app/vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3002',  // 确认目标端口
      changeOrigin: true
    }
  }
}
```

#### 步骤3：分析错误日志
常见的TypeScript编译错误：
```
TSError: ⨯ Unable to compile TypeScript:
src/app.ts(10,1): error TS6133: 'authMiddleware' is declared but its value is never read.
src/app.ts(33,21): error TS6133: 'req' is declared but its value is never read.
```

### 3.5 解决方案

#### 方案1：修复TypeScript编译错误
```typescript
// 修复未使用的导入
// 修改前
import { authMiddleware } from './middleware/auth';

// 修改后
// import { authMiddleware } from './middleware/auth';

// 修复未使用的参数
// 修改前
app.get('/health', (req, res) => {
app.use('*', (req, res) => {

// 修改后
app.get('/health', (_req, res) => {
app.use('*', (_req, res) => {
```

#### 方案2：创建backend TypeScript配置
```json
// sub-apps/react-app-1/backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 方案3：重启后端服务
```bash
cd sub-apps/react-app-1
npm run dev:backend
```

**成功启动标志**:
```
🚀 BFF服务器运行在端口 3002
📊 API文档: http://localhost:3002/api-docs
```

### 3.6 验证修复效果
1. ✅ 后端服务成功启动在3002端口
2. ✅ API请求可以正常转发
3. ✅ 用户管理页面可以正常加载数据

### 3.7 预防措施
- **代码质量检查**: 启用ESLint检查未使用变量
- **TypeScript配置**: 确保所有子项目都有完整的TypeScript配置
- **服务监控**: 添加健康检查端点监控服务状态
- **详细文档**: 参考 [API 500错误完整诊断方案](./api-500-error-diagnosis.md)

---

## 4. roles.map TypeError解决方案

### 4.1 问题描述
在渲染用户角色时出现`TypeError: roles.map is not a function`错误。

### 4.2 错误现象
```
TypeError: roles.map is not a function
    at UserList.render (UserList.tsx:25:15)
    at finishClassComponent (react-dom.js:8)
```

### 4.3 根本原因
- API返回的数据结构不符合预期
- roles字段不是数组类型
- 数据初始化状态处理不当
- TypeScript类型定义不准确

### 4.4 解决方案

#### 方案一：数据验证和类型守卫
```typescript
// src/utils/typeGuards.ts
export function isArray<T>(value: any): value is T[] {
  return Array.isArray(value);
}

export function ensureArray<T>(value: T[] | T | undefined | null): T[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (isArray(value)) {
    return value;
  }
  return [value];
}

// 组件中使用
const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  const renderUserRoles = (roles: string[] | string | undefined) => {
    const roleArray = ensureArray(roles);
    return roleArray.map((role, index) => (
      <Tag key={index}>{role}</Tag>
    ));
  };

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          {renderUserRoles(user.roles)}
        </div>
      ))}
    </div>
  );
};
```

#### 方案二：API数据标准化
```typescript
// src/services/userService.ts
interface ApiUser {
  id: string;
  name: string;
  email: string;
  roles?: string | string[]; // API可能返回字符串或数组
}

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[]; // 标准化为数组
}

function normalizeUser(apiUser: ApiUser): User {
  return {
    ...apiUser,
    roles: ensureArray(apiUser.roles),
  };
}

export async function getUsers(): Promise<User[]> {
  const response = await fetch('/api/users');
  const data = await response.json();
  
  // 标准化数据
  return data.map(normalizeUser);
}
```

#### 方案三：防御性编程
```typescript
// src/components/UserList.tsx
const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers()
      .then(data => {
        // 确保数据结构正确
        const validUsers = data.filter(user => 
          user && typeof user === 'object' && user.id
        );
        setUsers(validUsers);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          <h3>{user.name}</h3>
          <div>
            {/* 安全的角色渲染 */}
            {user.roles && Array.isArray(user.roles) ? (
              user.roles.map((role, index) => (
                <Tag key={index}>{role}</Tag>
              ))
            ) : (
              <Tag>{user.roles || 'No Role'}</Tag>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### 4.5 TypeScript类型改进
```typescript
// shared/types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[]; // 明确定义为数组
  createdAt: string;
  updatedAt: string;
}

// 如果API返回的格式不一致，定义转换类型
export interface ApiUserResponse {
  id: string;
  name: string;
  email: string;
  roles: string | string[] | null; // API可能的格式
  created_at: string; // API使用下划线命名
  updated_at: string;
}

// 转换函数
export function transformApiUser(apiUser: ApiUserResponse): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    roles: ensureArray(apiUser.roles),
    createdAt: apiUser.created_at,
    updatedAt: apiUser.updated_at,
  };
}
```

---

## 5. 前后端配置合并问题

### 5.1 问题描述
前后端配置合并后出现依赖冲突、TypeScript编译错误等问题。

### 5.2 常见错误
```bash
# 依赖冲突
npm ERR! peer dep missing: react@^18.0.0, required by @types/react@^18.0.0

# TypeScript编译错误
error TS2307: Cannot find module '@shared/types/user' or its corresponding type declarations

# 构建失败
Error: Cannot resolve module 'express' in frontend build
```

### 5.3 解决方案

#### 步骤1：分离TypeScript配置
```json
// tsconfig.json (前端)
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*", "shared/**/*"],
  "exclude": ["backend/**/*", "node_modules"]
}

// tsconfig.backend.json (后端)
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node"
  },
  "include": ["backend/src/**/*", "shared/**/*"],
  "exclude": ["src/**/*", "node_modules"]
}
```

#### 步骤2：优化依赖管理
```json
// package.json
{
  "dependencies": {
    // 前端依赖
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "antd": "^5.0.0",
    
    // 后端依赖
    "express": "^4.18.2",
    "cors": "^2.8.5",
    
    // 共享依赖
    "dayjs": "^1.11.0"
  },
  "devDependencies": {
    // 开发工具
    "typescript": "^5.0.0",
    "vite": "^4.0.0",
    "nodemon": "^2.0.20",
    "concurrently": "^7.6.0",
    
    // 类型定义
    "@types/react": "^18.0.0",
    "@types/node": "^18.0.0",
    "@types/express": "^4.17.0"
  }
}
```

#### 步骤3：配置路径映射
```typescript
// vite.config.ts
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});

// tsconfig.backend.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}
```

### 5.4 验证配置
```bash
# 检查前端编译
npx tsc --noEmit

# 检查后端编译
npx tsc -p tsconfig.backend.json --noEmit

# 测试构建
npm run build:all
```

---

## 6. 微前端集成问题

### 6.1 qiankun生命周期错误

#### 问题描述
子应用在qiankun环境中无法正常加载或卸载。

#### 错误现象
```
Application died in status LOADING_SOURCE_CODE: You need to export the functional lifecycles in xxx entry
```

#### 解决方案
```typescript
// src/main-qiankun.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

let root: ReactDOM.Root | null = null;

// 导出qiankun生命周期函数
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

### 6.2 样式隔离问题

#### 问题描述
子应用样式影响主应用或其他子应用。

#### 解决方案
```typescript
// vite.config.ts
export default defineConfig({
  css: {
    modules: {
      // 启用CSS Modules
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },
});

// 或使用styled-components
import styled from 'styled-components';

const StyledContainer = styled.div`
  padding: 20px;
  background: #fff;
`;
```

---

## 7. 性能问题

### 7.1 页面加载缓慢

#### 问题描述
应用首次加载时间过长，用户体验差。

#### 解决方案
```typescript
// 代码分割
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// 预加载关键资源
const link = document.createElement('link');
link.rel = 'preload';
link.href = '/api/users';
link.as = 'fetch';
document.head.appendChild(link);

// 组件懒加载
const LazyUserTable = React.lazy(() => 
  import('./components/UserTable').then(module => ({
    default: module.UserTable
  }))
);
```

### 7.2 内存泄漏

#### 问题描述
长时间使用后应用内存占用持续增长。

#### 解决方案
```typescript
// 清理定时器
useEffect(() => {
  const timer = setInterval(() => {
    // 定时任务
  }, 1000);

  return () => {
    clearInterval(timer);
  };
}, []);

// 清理事件监听器
useEffect(() => {
  const handleResize = () => {
    // 处理窗口大小变化
  };

  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);

// 取消网络请求
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/users', {
    signal: controller.signal
  }).then(response => {
    // 处理响应
  }).catch(error => {
    if (error.name !== 'AbortError') {
      console.error('Fetch error:', error);
    }
  });

  return () => {
    controller.abort();
  };
}, []);
```

---

## 8. 调试技巧

### 8.1 开发者工具使用
```typescript
// 添加调试信息
console.group('User Management Debug');
console.log('Users:', users);
console.log('Loading:', loading);
console.log('Error:', error);
console.groupEnd();

// 条件断点
if (user.id === 'debug-user') {
  debugger;
}

// 性能监控
console.time('fetchUsers');
await fetchUsers();
console.timeEnd('fetchUsers');
```

### 8.2 网络请求调试
```typescript
// 请求拦截器
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch request:', args);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Fetch response:', response);
      return response;
    });
};
```

### 8.3 状态调试
```typescript
// Zustand调试
import { subscribeWithSelector } from 'zustand/middleware';

const useUserStore = create(
  subscribeWithSelector((set, get) => ({
    // store定义
  }))
);

// 监听状态变化
useUserStore.subscribe(
  (state) => state.users,
  (users) => console.log('Users changed:', users)
);
```

---

## 9. 预防措施

### 9.1 代码质量检查
```json
// .eslintrc.json
{
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

### 9.2 自动化测试
```typescript
// 单元测试
test('should handle API errors gracefully', async () => {
  const mockFetch = jest.fn().mockRejectedValue(new Error('API Error'));
  global.fetch = mockFetch;

  const { result } = renderHook(() => useUsers());
  
  await waitFor(() => {
    expect(result.current.error).toBe('API Error');
  });
});
```

### 9.3 监控和告警
```typescript
// 错误监控
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // 发送错误报告
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // 发送错误报告
});
```