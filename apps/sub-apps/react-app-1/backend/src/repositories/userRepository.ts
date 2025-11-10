import { User, Role, Permission } from '../types';

// Mock数据
let users: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    phone: '13800138000',
    nickname: '超级管理员',
    status: 'active',
    roles: [
      {
        id: '1',
        name: '超级管理员',
        code: 'SUPER_ADMIN',
        description: '系统超级管理员',
        permissions: [
          {
            id: '1',
            name: '用户管理',
            code: 'USER_MANAGE',
            resource: 'user',
            action: 'manage',
            description: '管理用户',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        level: 999,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ],
    permissions: [],
    profile: {
      department: '技术部',
      position: '技术总监',
      location: '北京',
      bio: '系统管理员'
    },
    lastLoginAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

let roles: Role[] = [
  {
    id: '1',
    name: '超级管理员',
    code: 'SUPER_ADMIN',
    description: '系统超级管理员',
    permissions: [],
    level: 999,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: '管理员',
    code: 'ADMIN',
    description: '系统管理员',
    permissions: [],
    level: 100,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: '普通用户',
    code: 'USER',
    description: '普通用户',
    permissions: [],
    level: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

let permissions: Permission[] = [
  {
    id: '1',
    name: '用户管理',
    code: 'USER_MANAGE',
    resource: 'user',
    action: 'manage',
    description: '管理用户',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    name: '角色管理',
    code: 'ROLE_MANAGE',
    resource: 'role',
    action: 'manage',
    description: '管理角色',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    name: '权限管理',
    code: 'PERMISSION_MANAGE',
    resource: 'permission',
    action: 'manage',
    description: '管理权限',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

export class UserRepository {
  async findAll(): Promise<User[]> {
    return users;
  }

  async findById(id: string): Promise<User | null> {
    return users.find(user => user.id === id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return users.find(user => user.username === username) || null;
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    return users.find(user => user.username === username || user.email === email) || null;
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    users.push(newUser);
    return newUser;
  }

  async update(id: string, userData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const index = users.findIndex(user => user.id === id);
    if (index === -1) return null;
    
    users[index] = {
      ...users[index],
      ...userData,
      updatedAt: new Date().toISOString()
    };
    
    return users[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = users.findIndex(user => user.id === id);
    if (index === -1) return false;
    
    users.splice(index, 1);
    return true;
  }
}

export class RoleRepository {
  async findAll(): Promise<Role[]> {
    return roles;
  }

  async findById(id: string): Promise<Role | null> {
    return roles.find(role => role.id === id) || null;
  }

  async findByCode(code: string): Promise<Role | null> {
    return roles.find(role => role.code === code) || null;
  }

  async create(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    const newRole: Role = {
      ...roleData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    roles.push(newRole);
    return newRole;
  }

  async update(id: string, roleData: Partial<Omit<Role, 'id' | 'createdAt'>>): Promise<Role | null> {
    const index = roles.findIndex(role => role.id === id);
    if (index === -1) return null;
    
    roles[index] = {
      ...roles[index],
      ...roleData,
      updatedAt: new Date().toISOString()
    };
    
    return roles[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = roles.findIndex(role => role.id === id);
    if (index === -1) return false;
    
    roles.splice(index, 1);
    return true;
  }
}

export class PermissionRepository {
  async findAll(): Promise<Permission[]> {
    return permissions;
  }

  async findById(id: string): Promise<Permission | null> {
    return permissions.find(permission => permission.id === id) || null;
  }

  async findByCode(code: string): Promise<Permission | null> {
    return permissions.find(permission => permission.code === code) || null;
  }
}