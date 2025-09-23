import { User, GetUsersParams, CreateUserRequest, UpdateUserRequest, PaginatedResponse } from '../types';
import { UserRepository } from '../repositories/userRepository';
import { ValidationError } from '../middleware/error';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  constructor(private userRepository = new UserRepository()) {}

  async getUsers(params: GetUsersParams): Promise<PaginatedResponse<User>> {
    const { page = 1, pageSize = 20, keyword, status, role, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    
    let users = await this.userRepository.findAll();
    
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

  async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
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
    const existingUser = await this.userRepository.findByUsernameOrEmail(
      userData.username,
      userData.email
    );
    
    if (existingUser) {
      throw new ValidationError('用户名或邮箱已存在');
    }
    
    // 密码加密
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // 创建用户
    const { password, roles, ...userInfo } = userData;
    const newUser = await this.userRepository.create({
      ...userInfo,
      status: userData.status || 'active',
      roles: userData.roles ? await this.getRolesByIds(userData.roles) : [],
      permissions: [],
      profile: userData.profile || {},
    });
    
    return newUser;
  }

  async updateUser(id: string, userData: UpdateUserRequest): Promise<User | null> {
    // 数据验证
    if (userData.email && !this.validateEmail(userData.email)) {
      throw new ValidationError('邮箱格式不正确');
    }
    
    // 检查邮箱唯一性（如果提供了邮箱）
    if (userData.email) {
      const existingUser = await this.userRepository.findByUsernameOrEmail('', userData.email);
      if (existingUser && existingUser.id !== id) {
        throw new ValidationError('邮箱已存在');
      }
    }
    
    // 更新用户
    const updatedUser = await this.userRepository.update(id, {
      ...userData,
      roles: userData.roles ? await this.getRolesByIds(userData.roles) : undefined,
      updatedAt: new Date().toISOString(),
    });
    
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    // 检查是否是超级管理员
    const user = await this.userRepository.findById(id);
    if (user && user.roles.some(role => role.code === 'SUPER_ADMIN')) {
      throw new ValidationError('不能删除超级管理员');
    }
    
    return await this.userRepository.delete(id);
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

  private async getRolesByIds(roleIds: string[]): Promise<any[]> {
    // 这里应该查询角色数据
    // 简化实现
    return [];
  }
}