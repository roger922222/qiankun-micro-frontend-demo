# 编码规范

## 1. TypeScript规范

### 1.1 类型定义

#### 1.1.1 接口命名
```typescript
// ✅ 推荐：使用PascalCase，描述性命名
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
}

// ❌ 避免：使用I前缀
interface IUser {
  id: string;
}
```

#### 1.1.2 类型别名
```typescript
// ✅ 推荐：使用PascalCase
type UserRole = 'admin' | 'user' | 'guest';
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ✅ 推荐：复杂类型使用type而非interface
type EventHandler<T> = (event: T) => void;
```

#### 1.1.3 枚举定义
```typescript
// ✅ 推荐：使用PascalCase，明确的值
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

// ✅ 推荐：使用const enum提高性能
const enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
}
```

### 1.2 函数定义

#### 1.2.1 函数签名
```typescript
// ✅ 推荐：明确的参数和返回类型
async function fetchUsers(
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<User[]>> {
  // 实现
}

// ✅ 推荐：使用箭头函数表达式
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

#### 1.2.2 泛型使用
```typescript
// ✅ 推荐：有意义的泛型参数名
interface Repository<TEntity, TKey = string> {
  findById(id: TKey): Promise<TEntity | null>;
  create(entity: Omit<TEntity, 'id'>): Promise<TEntity>;
}

// ✅ 推荐：约束泛型
interface Identifiable {
  id: string;
}

function updateEntity<T extends Identifiable>(
  entity: T,
  updates: Partial<Omit<T, 'id'>>
): T {
  return { ...entity, ...updates };
}
```

### 1.3 类型安全

#### 1.3.1 严格类型检查
```typescript
// ✅ 推荐：使用严格的类型检查
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

#### 1.3.2 类型断言
```typescript
// ✅ 推荐：使用as语法，避免any
const userElement = document.getElementById('user') as HTMLInputElement;

// ✅ 推荐：使用类型守卫
function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}

// ❌ 避免：使用any类型
const data: any = response.data;
```

## 2. React规范

### 2.1 组件定义

#### 2.1.1 函数组件
```typescript
// ✅ 推荐：使用函数组件和TypeScript
interface UserFormProps {
  user?: User;
  onSubmit: (user: CreateUserRequest) => void;
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  onCancel,
}) => {
  // 组件实现
  return (
    <form onSubmit={handleSubmit}>
      {/* JSX内容 */}
    </form>
  );
};

export default UserForm;
```

#### 2.1.2 组件文件结构
```
UserForm/
├── index.tsx              # 组件主文件
├── UserForm.module.css    # 组件样式
├── types.ts               # 组件类型定义
├── hooks.ts               # 组件专用Hook
└── __tests__/             # 测试文件
    └── UserForm.test.tsx
```

#### 2.1.3 Props设计
```typescript
// ✅ 推荐：明确的Props接口
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// ✅ 推荐：使用默认参数
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
}) => {
  // 组件实现
};
```

### 2.2 Hooks使用

#### 2.2.1 自定义Hook
```typescript
// ✅ 推荐：自定义Hook命名以use开头
function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userService.getUsers();
      setUsers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}
```

#### 2.2.2 useEffect规范
```typescript
// ✅ 推荐：明确的依赖数组
useEffect(() => {
  if (userId) {
    fetchUser(userId);
  }
}, [userId, fetchUser]);

// ✅ 推荐：清理副作用
useEffect(() => {
  const timer = setInterval(() => {
    // 定时任务
  }, 1000);

  return () => {
    clearInterval(timer);
  };
}, []);
```

### 2.3 状态管理

#### 2.3.1 Zustand Store
```typescript
// ✅ 推荐：明确的Store接口
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

const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const response = await userService.getUsers();
      set({ users: response.data, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取失败',
        loading: false 
      });
    }
  },

  reset: () => set({ users: [], loading: false, error: null }),
}));
```

## 3. 样式规范

### 3.1 CSS Modules
```css
/* UserForm.module.css */
.container {
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.formItem {
  margin-bottom: 16px;
}

.submitButton {
  background: #1890ff;
  border: none;
  border-radius: 4px;
  color: #fff;
  padding: 8px 16px;
  cursor: pointer;
}

.submitButton:hover {
  background: #40a9ff;
}

.submitButton:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}
```

```typescript
// 组件中使用
import styles from './UserForm.module.css';

const UserForm: React.FC<UserFormProps> = () => {
  return (
    <div className={styles.container}>
      <div className={styles.formItem}>
        {/* 表单项 */}
      </div>
      <button className={styles.submitButton}>
        提交
      </button>
    </div>
  );
};
```

### 3.2 样式命名规范
```css
/* ✅ 推荐：使用kebab-case */
.user-form-container { }
.submit-button { }
.error-message { }

/* ✅ 推荐：BEM命名法 */
.user-form { }
.user-form__item { }
.user-form__item--required { }
.user-form__button { }
.user-form__button--primary { }
```

## 4. 文件和目录规范

### 4.1 文件命名
```
# ✅ 推荐：组件文件使用PascalCase
UserForm.tsx
UserTable.tsx
UserModal.tsx

# ✅ 推荐：工具文件使用camelCase
userUtils.ts
apiService.ts
dateFormatter.ts

# ✅ 推荐：常量文件使用camelCase
apiConstants.ts
userConstants.ts

# ✅ 推荐：类型文件使用camelCase
userTypes.ts
apiTypes.ts
```

### 4.2 导入导出规范
```typescript
// ✅ 推荐：使用绝对路径导入
import { User, UserRole } from '@shared/types/user';
import { Button } from '@/components/common/Button';
import { userService } from '@/services/userService';

// ✅ 推荐：按类型分组导入
import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, message } from 'antd';

import { User } from '@shared/types/user';
import { userService } from '@/services/userService';
import { validateEmail } from '@/utils/validation';

// ✅ 推荐：组件使用默认导出
export default UserForm;

// ✅ 推荐：工具函数使用命名导出
export { validateEmail, formatDate };
export type { ValidationResult };
```

### 4.3 目录结构规范
```
src/
├── components/           # 组件目录
│   ├── common/          # 通用组件
│   └── business/        # 业务组件
├── pages/               # 页面组件
├── services/            # API服务
├── store/               # 状态管理
├── hooks/               # 自定义Hook
├── utils/               # 工具函数
├── types/               # 类型定义
├── constants/           # 常量定义
└── styles/              # 样式文件
```

## 5. 注释规范

### 5.1 JSDoc注释
```typescript
/**
 * 用户服务类
 * 提供用户相关的API操作
 */
export class UserService {
  /**
   * 获取用户列表
   * @param page 页码，从1开始
   * @param pageSize 每页数量，默认20
   * @returns Promise<ApiResponse<User[]>> 用户列表响应
   * @throws {Error} 当请求失败时抛出错误
   */
  async getUsers(
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<User[]>> {
    // 实现
  }

  /**
   * 创建新用户
   * @param userData 用户数据
   * @example
   * ```typescript
   * const user = await userService.createUser({
   *   name: '张三',
   *   email: 'zhangsan@example.com',
   *   role: UserRole.USER
   * });
   * ```
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    // 实现
  }
}
```

### 5.2 组件注释
```typescript
/**
 * 用户表单组件
 * 用于创建和编辑用户信息
 * 
 * @example
 * ```tsx
 * <UserForm
 *   user={selectedUser}
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 * ```
 */
interface UserFormProps {
  /** 要编辑的用户，为空时表示创建新用户 */
  user?: User;
  /** 表单提交回调 */
  onSubmit: (user: CreateUserRequest) => void;
  /** 取消操作回调 */
  onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  onSubmit,
  onCancel,
}) => {
  // TODO: 添加表单验证
  // FIXME: 修复邮箱验证问题
  // NOTE: 这里使用了Ant Design的Form组件
  
  return (
    // JSX实现
  );
};
```

## 6. 错误处理规范

### 6.1 错误类型定义
```typescript
// ✅ 推荐：定义具体的错误类型
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 6.2 错误处理
```typescript
// ✅ 推荐：统一的错误处理
async function handleApiCall<T>(
  apiCall: () => Promise<T>
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }
    return { error: '操作失败，请稍后重试' };
  }
}

// 组件中使用
const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    const { data, error } = await handleApiCall(() => 
      userService.getUsers()
    );
    
    if (error) {
      setError(error);
      message.error(error);
    } else if (data) {
      setUsers(data);
      setError(null);
    }
  };
};
```

## 7. 测试规范

### 7.1 单元测试
```typescript
// UserForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserForm } from './UserForm';

describe('UserForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render form fields', () => {
    render(
      <UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByLabelText('姓名')).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('角色')).toBeInTheDocument();
  });

  test('should validate required fields', async () => {
    render(
      <UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    const submitButton = screen.getByRole('button', { name: '提交' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('请输入姓名')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('should submit valid form data', async () => {
    const user = userEvent.setup();
    
    render(
      <UserForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    await user.type(screen.getByLabelText('姓名'), '张三');
    await user.type(screen.getByLabelText('邮箱'), 'zhangsan@example.com');
    await user.selectOptions(screen.getByLabelText('角色'), 'user');

    const submitButton = screen.getByRole('button', { name: '提交' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: '张三',
        email: 'zhangsan@example.com',
        role: 'user',
      });
    });
  });
});
```

## 8. 性能优化规范

### 8.1 React性能优化
```typescript
// ✅ 推荐：使用React.memo优化组件
const UserItem = React.memo<UserItemProps>(({ user, onEdit, onDelete }) => {
  return (
    <div>
      {/* 组件内容 */}
    </div>
  );
});

// ✅ 推荐：使用useCallback优化回调函数
const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  const handleEditUser = useCallback((user: User) => {
    // 编辑逻辑
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    // 删除逻辑
  }, []);

  return (
    <div>
      {users.map(user => (
        <UserItem
          key={user.id}
          user={user}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />
      ))}
    </div>
  );
};
```

### 8.2 代码分割
```typescript
// ✅ 推荐：使用React.lazy进行代码分割
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// App.tsx
function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/users" element={<UserManagement />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

## 9. 代码质量检查

### 9.1 ESLint配置
```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 9.2 提交前检查
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```