# 项目结构说明

## 1. 整体架构

```
react-app-1/
├── src/                    # 前端源码目录
├── backend/               # 后端源码目录
├── shared/                # 前后端共享代码
├── docs/                  # 项目文档
├── package.json           # 项目配置文件
├── tsconfig.json          # 前端TypeScript配置
├── tsconfig.backend.json  # 后端TypeScript配置
├── vite.config.ts         # Vite构建配置
└── README.md             # 项目说明
```

## 2. 前端目录结构 (src/)

```
src/
├── components/            # 可复用组件
│   ├── common/           # 通用组件
│   │   ├── Header/
│   │   ├── Footer/
│   │   └── Layout/
│   └── business/         # 业务组件
│       ├── UserForm/
│       ├── UserTable/
│       └── UserModal/
├── pages/                # 页面组件
│   ├── UserManagement/   # 用户管理页面
│   ├── Dashboard/        # 仪表板页面
│   └── NotFound/         # 404页面
├── services/             # API服务层
│   ├── api.ts           # API配置
│   ├── userService.ts   # 用户相关API
│   └── types.ts         # API类型定义
├── store/                # 状态管理
│   ├── userStore.ts     # 用户状态
│   └── globalStore.ts   # 全局状态
├── hooks/                # 自定义Hook
│   ├── useUsers.ts      # 用户数据Hook
│   └── useApi.ts        # API调用Hook
├── utils/                # 工具函数
│   ├── format.ts        # 格式化工具
│   ├── validation.ts    # 验证工具
│   └── constants.ts     # 常量定义
├── styles/               # 样式文件
│   ├── global.css       # 全局样式
│   ├── variables.css    # CSS变量
│   └── components.css   # 组件样式
├── types/                # TypeScript类型定义
│   ├── user.ts          # 用户类型
│   ├── api.ts           # API类型
│   └── common.ts        # 通用类型
├── App.tsx              # 应用根组件
├── main.tsx             # 应用入口文件
└── main-qiankun.tsx     # qiankun集成入口
```

### 2.1 组件设计原则

#### 2.1.1 组件分类
- **通用组件 (common/)**: 与业务无关的可复用组件
- **业务组件 (business/)**: 特定业务场景的组件
- **页面组件 (pages/)**: 路由对应的页面级组件

#### 2.1.2 组件命名规范
```typescript
// 组件文件命名：PascalCase
UserForm/
├── index.tsx          # 组件主文件
├── UserForm.module.css # 组件样式
├── types.ts           # 组件类型定义
└── hooks.ts           # 组件专用Hook
```

#### 2.1.3 组件导出规范
```typescript
// 统一使用默认导出
export default UserForm;

// 类型和常量使用命名导出
export type { UserFormProps };
export { USER_FORM_FIELDS };
```

### 2.2 状态管理架构

#### 2.2.1 Zustand Store结构
```typescript
// store/userStore.ts
interface UserStore {
  // 状态
  users: User[];
  loading: boolean;
  error: string | null;
  
  // 操作
  fetchUsers: () => Promise<void>;
  addUser: (user: CreateUserRequest) => Promise<void>;
  updateUser: (id: string, user: UpdateUserRequest) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  // 重置
  reset: () => void;
}
```

#### 2.2.2 状态管理最佳实践
- 按功能模块划分Store
- 异步操作统一处理loading和error状态
- 提供reset方法用于状态重置
- 使用immer确保状态不可变性

## 3. 后端目录结构 (backend/)

```
backend/
├── src/                  # 后端源码
│   ├── controllers/      # 控制器层
│   │   ├── userController.ts
│   │   └── baseController.ts
│   ├── services/         # 业务逻辑层
│   │   ├── userService.ts
│   │   └── baseService.ts
│   ├── models/           # 数据模型
│   │   ├── User.ts
│   │   └── BaseModel.ts
│   ├── routes/           # 路由定义
│   │   ├── userRoutes.ts
│   │   ├── index.ts
│   │   └── middleware.ts
│   ├── utils/            # 工具函数
│   │   ├── logger.ts
│   │   ├── validator.ts
│   │   └── response.ts
│   ├── config/           # 配置文件
│   │   ├── database.ts
│   │   └── app.ts
│   ├── types/            # 类型定义
│   │   ├── api.ts
│   │   └── common.ts
│   └── server.ts         # 服务器入口
├── dist/                 # 编译输出目录
└── nodemon.json          # nodemon配置
```

### 3.1 分层架构设计

#### 3.1.1 Controller层 (控制器)
```typescript
// controllers/userController.ts
export class UserController extends BaseController {
  async getUsers(req: Request, res: Response) {
    try {
      const users = await this.userService.getUsers();
      this.success(res, users);
    } catch (error) {
      this.error(res, error);
    }
  }
}
```

#### 3.1.2 Service层 (业务逻辑)
```typescript
// services/userService.ts
export class UserService extends BaseService {
  async getUsers(): Promise<User[]> {
    // 业务逻辑处理
    return this.userModel.findAll();
  }
  
  async createUser(userData: CreateUserRequest): Promise<User> {
    // 数据验证和业务规则
    this.validateUserData(userData);
    return this.userModel.create(userData);
  }
}
```

#### 3.1.3 Model层 (数据模型)
```typescript
// models/User.ts
export class UserModel extends BaseModel<User> {
  private users: User[] = [];
  
  async findAll(): Promise<User[]> {
    return this.users;
  }
  
  async create(userData: CreateUserRequest): Promise<User> {
    const user = { ...userData, id: this.generateId() };
    this.users.push(user);
    return user;
  }
}
```

### 3.2 API设计规范

#### 3.2.1 RESTful接口设计
```
GET    /api/users          # 获取用户列表
POST   /api/users          # 创建用户
GET    /api/users/:id      # 获取单个用户
PUT    /api/users/:id      # 更新用户
DELETE /api/users/:id      # 删除用户
```

#### 3.2.2 响应格式标准
```typescript
// 成功响应
{
  "success": true,
  "data": {},
  "message": "操作成功"
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在"
  }
}
```

## 4. 共享代码目录 (shared/)

```
shared/
├── types/                # 共享类型定义
│   ├── user.ts          # 用户相关类型
│   ├── api.ts           # API相关类型
│   └── common.ts        # 通用类型
├── constants/            # 共享常量
│   ├── api.ts           # API常量
│   ├── user.ts          # 用户常量
│   └── common.ts        # 通用常量
└── utils/                # 共享工具函数
    ├── validation.ts     # 验证工具
    ├── format.ts         # 格式化工具
    └── date.ts           # 日期工具
```

### 4.1 类型定义规范

#### 4.1.1 用户相关类型
```typescript
// shared/types/user.ts
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
```

#### 4.1.2 API相关类型
```typescript
// shared/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
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
```

### 4.2 常量定义规范

```typescript
// shared/constants/api.ts
export const API_ENDPOINTS = {
  USERS: '/api/users',
  USER_DETAIL: (id: string) => `/api/users/${id}`,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;
```

## 5. 配置文件说明

### 5.1 TypeScript配置

#### 5.1.1 前端配置 (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["src/**/*", "shared/**/*"],
  "exclude": ["backend/**/*"]
}
```

#### 5.1.2 后端配置 (tsconfig.backend.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./backend/dist",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["backend/src/**/*", "shared/**/*"],
  "exclude": ["src/**/*"]
}
```

### 5.2 Vite配置 (vite.config.ts)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
});
```

## 6. 开发规范

### 6.1 文件命名规范
- **组件文件**: PascalCase (UserForm.tsx)
- **工具文件**: camelCase (userUtils.ts)
- **常量文件**: camelCase (apiConstants.ts)
- **类型文件**: camelCase (userTypes.ts)

### 6.2 导入导出规范
```typescript
// 优先使用命名导入
import { User, UserRole } from '@shared/types/user';

// 组件使用默认导出
export default UserForm;

// 工具函数使用命名导出
export { formatDate, validateEmail };
```

### 6.3 代码组织原则
- 按功能模块组织代码
- 保持单一职责原则
- 避免循环依赖
- 合理使用抽象层次

## 7. 构建和部署

### 7.1 开发环境
```bash
npm run dev:all     # 启动前后端开发服务器
npm run dev         # 仅启动前端
npm run dev:backend # 仅启动后端
```

### 7.2 生产构建
```bash
npm run build:all     # 构建前后端
npm run build         # 仅构建前端
npm run build:backend # 仅构建后端
```

### 7.3 部署结构
```
deploy/
├── frontend/         # 前端静态文件
│   ├── index.html
│   ├── assets/
│   └── ...
└── backend/          # 后端服务
    ├── dist/         # 编译后的JS文件
    ├── package.json
    └── node_modules/
```