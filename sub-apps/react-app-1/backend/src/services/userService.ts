import { User, GetUsersParams, CreateUserRequest, UpdateUserRequest, PaginatedResponse } from '../types';
import { UserRepository as UserRepositoryDB } from '../repositories/database/UserRepository';
import { RoleRepository } from '../repositories/database/RoleRepository';
import { User as UserEntity } from '../entities/User';
import { Role } from '../entities/Role';
import { ValidationError } from '../middleware/error';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// 临时回退到内存存储，直到数据库连接正常
const mockUsers: User[] = [
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

export class UserService {
  private userRepository: UserRepositoryDB;
  private roleRepository: RoleRepository;
  private useDatabase: boolean = false;

  constructor() {
    this.userRepository = new UserRepositoryDB();
    this.roleRepository = new RoleRepository();
    
    // 检查数据库连接
    this.checkDatabaseConnection().then(connected => {
      this.useDatabase = connected;
      console.log(connected ? '✅ 使用数据库存储' : '⚠️  使用内存存储');
    }).catch(() => {
      this.useDatabase = false;
      console.log('⚠️  使用内存存储');
    });
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      // 简单的数据库连接测试
      await this.userRepository.findAll({ page: 1, pageSize: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUsers(params: GetUsersParams): Promise<PaginatedResponse<any>> {
    if (!this.useDatabase) {
      return this.getUsersFromMemory(params);
    }

    try {
      const [users, total] = await this.userRepository.findAll(params);
      return {
        data: users.map(user => this.entityToDTO(user)),
        pagination: {
          page: params.page || 1,
          pageSize: params.pageSize || 20,
          total,
          totalPages: Math.ceil(total / (params.pageSize || 20)),
        },
      };
    } catch (error: any) {
      console.log('数据库查询失败，回退到内存存储:', error.message);
      return this.getUsersFromMemory(params);
    }
  }

  private getUsersFromMemory(params: GetUsersParams): PaginatedResponse<any> {
    let users = [...mockUsers];
    const { page = 1, pageSize = 20, keyword, status, role, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    // 搜索过滤
    if (keyword) {
      users = users.filter(user => 
        user.username.toLowerCase().includes(keyword.toLowerCase()) || 
        user.email.toLowerCase().includes(keyword.toLowerCase()) ||
        (user.nickname && user.nickname.toLowerCase().includes(keyword.toLowerCase()))
      );
    }

    // 状态过滤
    if (status && status !== 'all') {
      users = users.filter(user => user.status === status);
    }

    // 角色过滤
    if (role) {
      users = users.filter(user => 
        user.roles.some(r => r.code === role)
      );
    }

    // 排序
    users.sort((a, b) => {
      const aValue = a[sortBy as keyof User] as string | number;
      const bValue = b[sortBy as keyof User] as string | number;
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // 分页
    const total = users.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      data: paginatedUsers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getUserById(id: string): Promise<any | null> {
    if (!this.useDatabase) {
      return mockUsers.find(user => user.id === id) || null;
    }

    try {
      const user = await this.userRepository.findById(id);
      return user ? this.entityToDTO(user) : null;
    } catch (error: any) {
      console.log('数据库查询失败，回退到内存存储:', error.message);
      return mockUsers.find(user => user.id === id) || null;
    }
  }

  async createUser(userData: CreateUserRequest): Promise<any> {
    if (!this.useDatabase) {
      return this.createUserInMemory(userData);
    }

    try {
      // 数据验证
      if (!userData.username || !userData.email || !userData.password) {
        throw new ValidationError('用户名、邮箱和密码不能为空');
      }
      
      if (!this.validateEmail(userData.email)) {
        throw new ValidationError('邮箱格式不正确');
      }
      
      if (userData.password.length < 6) {
        throw new ValidationError('密码长度至少6位');
      }
      
      // 检查用户名和邮箱唯一性
      const existingUserByUsername = await this.userRepository.findByUsername(userData.username);
      if (existingUserByUsername) {
        throw new ValidationError('用户名已存在');
      }
      
      const existingUserByEmail = await this.userRepository.findByEmail(userData.email);
      if (existingUserByEmail) {
        throw new ValidationError('邮箱已存在');
      }
      
      // 处理角色
      let roles: Role[] = [];
      if (userData.roles && userData.roles.length > 0) {
        roles = await this.getRolesByIds(userData.roles);
        if (roles.length !== userData.roles.length) {
          throw new ValidationError('部分角色不存在');
        }
      }
      
      // 创建用户
      const newUser = await this.userRepository.create({
        ...userData,
        status: (userData.status || 'active') as 'active' | 'inactive' | 'suspended',
        roles,
        permissions: [],
        profile: userData.profile || {},
      });
      
      return this.entityToDTO(newUser);
    } catch (error: any) {
      console.log('数据库创建失败，回退到内存存储:', error.message);
      return this.createUserInMemory(userData);
    }
  }

  private createUserInMemory(userData: CreateUserRequest): any {
    // 检查用户名和邮箱唯一性
    const existingUser = mockUsers.find(user => 
      user.username === userData.username || user.email === userData.email
    );
    
    if (existingUser) {
      throw new ValidationError('用户名或邮箱已存在');
    }
    
    // 创建新用户
    const newUser: User = {
      id: uuidv4(),
      username: userData.username,
      email: userData.email,
      phone: userData.phone,
      nickname: userData.nickname || userData.username,
      status: userData.status || 'active',
      roles: [],
      permissions: [],
      profile: userData.profile || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    mockUsers.push(newUser);
    return newUser;
  }

  async updateUser(id: string, userData: UpdateUserRequest): Promise<any | null> {
    if (!this.useDatabase) {
      return this.updateUserInMemory(id, userData);
    }

    try {
      // 数据验证
      if (userData.email && !this.validateEmail(userData.email)) {
        throw new ValidationError('邮箱格式不正确');
      }
      
      // 检查邮箱唯一性（如果提供了邮箱）
      if (userData.email) {
        const existingUser = await this.userRepository.findByEmail(userData.email);
        if (existingUser && existingUser.id !== id) {
          throw new ValidationError('邮箱已存在');
        }
      }
      
      // 处理角色更新
      let roles: Role[] | undefined;
      if (userData.roles) {
        roles = await this.getRolesByIds(userData.roles);
        if (roles.length !== userData.roles.length) {
          throw new ValidationError('部分角色不存在');
        }
      }
      
      // 更新用户
      const updateData: any = {
        ...userData,
        roles,
      };
      
      if (userData.status) {
        updateData.status = userData.status as 'active' | 'inactive' | 'suspended';
      }
      
      const updatedUser = await this.userRepository.update(id, updateData);
      
      return updatedUser ? this.entityToDTO(updatedUser) : null;
    } catch (error: any) {
      console.log('数据库更新失败，回退到内存存储:', error.message);
      return this.updateUserInMemory(id, userData);
    }
  }

  private updateUserInMemory(id: string, userData: UpdateUserRequest): any | null {
    const userIndex = mockUsers.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return null;
    }
    
    const user = mockUsers[userIndex];
    
    // 检查邮箱唯一性
    if (userData.email && userData.email !== user.email) {
      const existingUser = mockUsers.find(u => u.email === userData.email);
      if (existingUser) {
        throw new ValidationError('邮箱已存在');
      }
    }
    
    // 更新用户数据
    mockUsers[userIndex] = {
      ...user,
      ...userData,
      roles: user.roles, // 保持原有角色数据
      updatedAt: new Date().toISOString(),
    };
    
    return mockUsers[userIndex];
  }

  async deleteUser(id: string): Promise<boolean> {
    if (!this.useDatabase) {
      return this.deleteUserFromMemory(id);
    }

    try {
      // 检查是否是超级管理员
      const user = await this.userRepository.findById(id);
      if (user && user.roles.some(role => role.code === 'SUPER_ADMIN')) {
        throw new ValidationError('不能删除超级管理员');
      }
      
      return await this.userRepository.delete(id);
    } catch (error: any) {
      console.log('数据库删除失败，回退到内存存储:', error.message);
      return this.deleteUserFromMemory(id);
    }
  }

  private deleteUserFromMemory(id: string): boolean {
    const userIndex = mockUsers.findIndex(user => user.id === id);
    if (userIndex === -1) {
      return false;
    }
    
    // 检查是否是超级管理员
    const user = mockUsers[userIndex];
    if (user.roles.some(role => role.code === 'SUPER_ADMIN')) {
      throw new ValidationError('不能删除超级管理员');
    }
    
    mockUsers.splice(userIndex, 1);
    return true;
  }

  async importUsers(buffer: Buffer): Promise<{ success: number; failed: number; errors: string[] }> {
    // 这里应该实现Excel解析逻辑
    // 简化实现
    return {
      success: 0,
      failed: 0,
      errors: ['导入功能待实现']
    };
  }

  async exportUsers(params: any): Promise<Buffer> {
    // 这里应该实现Excel导出逻辑
    // 简化实现
    return Buffer.from('Excel导出功能待实现');
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async getRolesByIds(roleIds: string[]): Promise<Role[]> {
    const roles: Role[] = [];
    
    for (const roleId of roleIds) {
      const role = await this.roleRepository.findById(roleId);
      if (role) {
        roles.push(role);
      }
    }
    
    return roles;
  }

  // 实体转换为DTO
  private entityToDTO(user: UserEntity): any {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      nickname: user.nickname,
      status: user.status,
      roles: user.roles ? user.roles.map(role => this.roleEntityToDTO(role)) : [],
      permissions: user.permissions || [],
      profile: user.profile || {},
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private roleEntityToDTO(role: Role): any {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      level: role.level,
      permissions: role.permissions ? role.permissions.map(permission => this.permissionEntityToDTO(permission)) : [],
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  private permissionEntityToDTO(permission: any): any {
    return {
      id: permission.id,
      name: permission.name,
      code: permission.code,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
    };
  }
}