# API接口设计

## 1. 设计原则

### 1.1 RESTful设计
- 使用HTTP动词表示操作类型
- 资源使用名词复数形式
- 状态码语义化
- 无状态设计

### 1.2 一致性原则
- 统一的响应格式
- 统一的错误处理
- 统一的命名规范
- 统一的版本管理

### 1.3 安全性原则
- 输入验证
- 输出过滤
- 错误信息脱敏
- 访问控制

## 2. API规范

### 2.1 基础URL
```
开发环境: http://localhost:3002/api
生产环境: https://api.example.com/api
```

### 2.2 版本管理
```
/api/v1/users     # 版本1
/api/v2/users     # 版本2
```

### 2.3 请求格式
- Content-Type: application/json
- 字符编码: UTF-8
- 请求方法: GET, POST, PUT, DELETE

### 2.4 响应格式

#### 2.4.1 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2023-12-01T10:00:00Z"
}
```

#### 2.4.2 错误响应
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

#### 2.4.3 分页响应
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "total": 100,
      "page": 1,
      "pageSize": 20,
      "totalPages": 5
    }
  }
}
```

## 3. 用户管理API

### 3.1 获取用户列表

#### 请求
```http
GET /api/users
```

#### 查询参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| search | string | 否 | 搜索关键词 |
| role | string | 否 | 用户角色筛选 |
| sortBy | string | 否 | 排序字段 |
| sortOrder | string | 否 | 排序方向 asc/desc |

#### 响应示例
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1",
        "name": "张三",
        "email": "zhangsan@example.com",
        "role": "admin",
        "createdAt": "2023-12-01T10:00:00Z",
        "updatedAt": "2023-12-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "pageSize": 20,
      "totalPages": 1
    }
  }
}
```

### 3.2 获取单个用户

#### 请求
```http
GET /api/users/{id}
```

#### 路径参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户ID |

#### 响应示例
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "张三",
    "email": "zhangsan@example.com",
    "role": "admin",
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2023-12-01T10:00:00Z"
  }
}
```

### 3.3 创建用户

#### 请求
```http
POST /api/users
Content-Type: application/json

{
  "name": "李四",
  "email": "lisi@example.com",
  "role": "user"
}
```

#### 请求体参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 用户姓名，2-50字符 |
| email | string | 是 | 邮箱地址，必须唯一 |
| role | string | 是 | 用户角色：admin/user/guest |

#### 响应示例
```json
{
  "success": true,
  "data": {
    "id": "2",
    "name": "李四",
    "email": "lisi@example.com",
    "role": "user",
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2023-12-01T10:00:00Z"
  },
  "message": "用户创建成功"
}
```

### 3.4 更新用户

#### 请求
```http
PUT /api/users/{id}
Content-Type: application/json

{
  "name": "李四（更新）",
  "email": "lisi_new@example.com",
  "role": "admin"
}
```

#### 路径参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户ID |

#### 请求体参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 用户姓名 |
| email | string | 否 | 邮箱地址 |
| role | string | 否 | 用户角色 |

#### 响应示例
```json
{
  "success": true,
  "data": {
    "id": "2",
    "name": "李四（更新）",
    "email": "lisi_new@example.com",
    "role": "admin",
    "createdAt": "2023-12-01T10:00:00Z",
    "updatedAt": "2023-12-01T11:00:00Z"
  },
  "message": "用户更新成功"
}
```

### 3.5 删除用户

#### 请求
```http
DELETE /api/users/{id}
```

#### 路径参数
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 用户ID |

#### 响应示例
```json
{
  "success": true,
  "message": "用户删除成功"
}
```

## 4. 错误码定义

### 4.1 通用错误码
| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| INVALID_REQUEST | 400 | 请求参数无效 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 禁止访问 |
| NOT_FOUND | 404 | 资源不存在 |
| METHOD_NOT_ALLOWED | 405 | 请求方法不允许 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 4.2 用户相关错误码
| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| USER_NOT_FOUND | 404 | 用户不存在 |
| USER_ALREADY_EXISTS | 409 | 用户已存在 |
| INVALID_USER_DATA | 400 | 用户数据无效 |
| EMAIL_ALREADY_EXISTS | 409 | 邮箱已被使用 |
| INVALID_EMAIL_FORMAT | 400 | 邮箱格式无效 |
| INVALID_ROLE | 400 | 用户角色无效 |

### 4.3 错误响应示例
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在",
    "details": {
      "userId": "123",
      "timestamp": "2023-12-01T10:00:00Z"
    }
  }
}
```

## 5. 数据验证规则

### 5.1 用户数据验证

#### 5.1.1 姓名验证
```typescript
const nameValidation = {
  required: true,
  minLength: 2,
  maxLength: 50,
  pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/,
  message: "姓名必须为2-50个字符，只能包含中文、英文和空格"
};
```

#### 5.1.2 邮箱验证
```typescript
const emailValidation = {
  required: true,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  maxLength: 100,
  message: "请输入有效的邮箱地址"
};
```

#### 5.1.3 角色验证
```typescript
const roleValidation = {
  required: true,
  enum: ['admin', 'user', 'guest'],
  message: "角色必须是admin、user或guest之一"
};
```

### 5.2 验证实现示例

#### 5.2.1 前端验证
```typescript
// services/validation.ts
export const validateUser = (userData: CreateUserRequest): ValidationResult => {
  const errors: string[] = [];
  
  if (!userData.name || userData.name.length < 2) {
    errors.push('姓名至少需要2个字符');
  }
  
  if (!isValidEmail(userData.email)) {
    errors.push('请输入有效的邮箱地址');
  }
  
  if (!['admin', 'user', 'guest'].includes(userData.role)) {
    errors.push('请选择有效的用户角色');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

#### 5.2.2 后端验证
```typescript
// backend/src/utils/validator.ts
export class UserValidator {
  static validateCreateUser(userData: CreateUserRequest): ValidationResult {
    const schema = Joi.object({
      name: Joi.string().min(2).max(50).required(),
      email: Joi.string().email().max(100).required(),
      role: Joi.string().valid('admin', 'user', 'guest').required()
    });
    
    const { error } = schema.validate(userData);
    
    return {
      isValid: !error,
      errors: error ? error.details.map(d => d.message) : []
    };
  }
}
```

## 6. API测试

### 6.1 单元测试示例
```typescript
// backend/src/controllers/__tests__/userController.test.ts
describe('UserController', () => {
  test('should get users list', async () => {
    const req = mockRequest();
    const res = mockResponse();
    
    await userController.getUsers(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.any(Array)
    });
  });
  
  test('should create user', async () => {
    const userData = {
      name: '测试用户',
      email: 'test@example.com',
      role: 'user'
    };
    
    const req = mockRequest({ body: userData });
    const res = mockResponse();
    
    await userController.createUser(req, res);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining(userData)
    });
  });
});
```

### 6.2 集成测试示例
```typescript
// backend/src/__tests__/integration/users.test.ts
describe('Users API Integration', () => {
  test('should handle complete user lifecycle', async () => {
    // 创建用户
    const createResponse = await request(app)
      .post('/api/users')
      .send({
        name: '集成测试用户',
        email: 'integration@example.com',
        role: 'user'
      })
      .expect(201);
    
    const userId = createResponse.body.data.id;
    
    // 获取用户
    await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);
    
    // 更新用户
    await request(app)
      .put(`/api/users/${userId}`)
      .send({ name: '更新后的用户名' })
      .expect(200);
    
    // 删除用户
    await request(app)
      .delete(`/api/users/${userId}`)
      .expect(200);
  });
});
```

## 7. API文档生成

### 7.1 OpenAPI规范
```yaml
# api-docs.yaml
openapi: 3.0.0
info:
  title: User Management API
  version: 1.0.0
  description: 用户管理系统API文档

paths:
  /api/users:
    get:
      summary: 获取用户列表
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
      responses:
        200:
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsersResponse'
```

### 7.2 自动化文档生成
```typescript
// backend/src/docs/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Management API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
```

## 8. 性能优化

### 8.1 缓存策略
- 用户列表缓存5分钟
- 单个用户信息缓存10分钟
- 使用ETag进行条件请求

### 8.2 分页优化
- 默认分页大小20条
- 最大分页大小100条
- 支持游标分页

### 8.3 查询优化
- 支持字段选择
- 支持数据预加载
- 避免N+1查询问题

## 9. 安全考虑

### 9.1 输入验证
- 所有输入参数严格验证
- SQL注入防护
- XSS攻击防护

### 9.2 访问控制
- 基于角色的权限控制
- API访问频率限制
- 敏感操作审计日志

### 9.3 数据保护
- 敏感信息脱敏
- 数据传输加密
- 错误信息不泄露内部信息