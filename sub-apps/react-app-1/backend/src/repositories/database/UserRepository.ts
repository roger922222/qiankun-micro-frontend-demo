import { Repository, FindManyOptions, FindOneOptions, Like, In } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { Role } from '../../entities/Role';
import { GetUsersParams } from '../../types';
import { CacheManager } from '../../utils/cache';

export class UserRepository {
  private repository: Repository<User>;
  private cacheManager: CacheManager;

  constructor(cacheManager?: CacheManager) {
    this.repository = AppDataSource.getRepository(User);
    this.cacheManager = cacheManager || new CacheManager();
  }

  async findAll(params?: GetUsersParams): Promise<[User[], number]> {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      status,
      role,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params || {};

    // 优化：只在需要时加载关联数据
    const queryBuilder = this.repository
      .createQueryBuilder('user')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    // 搜索过滤 - 使用索引优化
    if (keyword) {
      // 使用全文搜索或更高效的索引查询
      queryBuilder.andWhere(
        '(user.username ILIKE :keyword OR user.email ILIKE :keyword OR user.nickname ILIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // 状态过滤 - 利用索引
    if (status && status !== 'all') {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 角色过滤 - 延迟加载角色数据
    if (role) {
      queryBuilder
        .leftJoin('user.roles', 'role')
        .andWhere('role.code = :role', { role });
    }

    // 排序优化
    const order = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    queryBuilder.orderBy(`user.${sortBy}`, order);

    // 使用select优化，只选择需要的字段
    queryBuilder.select([
      'user.id',
      'user.username',
      'user.email',
      'user.phone',
      'user.nickname',
      'user.status',
      'user.profile',
      'user.lastLoginAt',
      'user.createdAt',
      'user.updatedAt'
    ]);

    const [users, total] = await queryBuilder.getManyAndCount();

    // 延迟加载角色数据（只在需要时）
    if (users.length > 0) {
      const userIds = users.map(user => user.id);
      const usersWithRoles = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();

      // 创建用户角色映射
      const userRoleMap = new Map(usersWithRoles.map(user => [user.id, user.roles]));
      
      // 将角色数据填充到原始用户对象
      users.forEach(user => {
        user.roles = userRoleMap.get(user.id) || [];
      });
    }

    return [users, total];
  }

  async findById(id: string): Promise<User | null> {
    // 优化：使用更高效的查询，避免N+1问题
    return this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByUsername(username: string): Promise<User | null> {
    // 优化：使用索引查询和延迟加载
    const user = await this.repository
      .createQueryBuilder('user')
      .where('user.username = :username', { username })
      .getOne();

    if (user) {
      // 延迟加载角色数据
      const userWithRoles = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('user.id = :id', { id: user.id })
        .getOne();
      
      if (userWithRoles) {
        user.roles = userWithRoles.roles;
      }
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    // 优化：使用索引查询和延迟加载
    const user = await this.repository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .getOne();

    if (user) {
      // 延迟加载角色数据
      const userWithRoles = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('user.id = :id', { id: user.id })
        .getOne();
      
      if (userWithRoles) {
        user.roles = userWithRoles.roles;
      }
    }

    return user;
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    // 优化：使用OR查询和延迟加载
    const user = await this.repository
      .createQueryBuilder('user')
      .where('user.username = :username OR user.email = :email', { username, email })
      .getOne();

    if (user) {
      // 延迟加载角色数据
      const userWithRoles = await this.repository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where('user.id = :id', { id: user.id })
        .getOne();
      
      if (userWithRoles) {
        user.roles = userWithRoles.roles;
      }
    }

    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.repository.update(id, userData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id); // 软删除
    return result.affected !== 0;
  }

  async countByStatus(): Promise<Record<string, number>> {
    // 优化：使用缓存避免重复计算
    const cacheKey = 'users:countByStatus';
    
    try {
      // 尝试从缓存获取
      const cachedResult = await this.cacheManager?.get<Record<string, number>>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    } catch (error) {
      console.error('获取缓存失败:', error);
    }

    const result = await this.repository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    const statusCount = result.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);

    // 缓存结果（5分钟）
    try {
      await this.cacheManager?.set(cacheKey, statusCount, 300);
    } catch (error) {
      console.error('设置缓存失败:', error);
    }

    return statusCount;
  }

  async countByRole(): Promise<Record<string, number>> {
    // 优化：使用缓存避免重复计算
    const cacheKey = 'users:countByRole';
    
    try {
      // 尝试从缓存获取
      const cachedResult = await this.cacheManager?.get<Record<string, number>>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
    } catch (error) {
      console.error('获取缓存失败:', error);
    }

    const result = await this.repository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .select('role.code', 'roleCode')
      .addSelect('COUNT(*)', 'count')
      .groupBy('role.code')
      .getRawMany();

    const roleCount = result.reduce((acc, item) => {
      if (item.roleCode) {
        acc[item.roleCode] = parseInt(item.count);
      }
      return acc;
    }, {} as Record<string, number>);

    // 缓存结果（5分钟）
    try {
      await this.cacheManager?.set(cacheKey, roleCount, 300);
    } catch (error) {
      console.error('设置缓存失败:', error);
    }

    return roleCount;
  }
}