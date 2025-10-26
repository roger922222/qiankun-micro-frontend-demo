import { Repository, FindManyOptions, FindOneOptions, Like, In } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { Role } from '../../entities/Role';
import { GetUsersParams } from '../../types';

export class UserRepository {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
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

    const queryBuilder = this.repository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    // 搜索过滤
    if (keyword) {
      queryBuilder.andWhere(
        '(user.username LIKE :keyword OR user.email LIKE :keyword OR user.nickname LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // 状态过滤
    if (status && status !== 'all') {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 角色过滤
    if (role) {
      queryBuilder.andWhere('role.code = :role', { role });
    }

    // 排序
    const order = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    queryBuilder.orderBy(`user.${sortBy}`, order);

    return queryBuilder.getManyAndCount();
  }

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({
      where: { username },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    return this.repository.findOne({
      where: [
        { username },
        { email }
      ],
      relations: ['roles', 'roles.permissions'],
    });
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
    const result = await this.repository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    return result.reduce((acc, item) => {
      acc[item.status] = parseInt(item.count);
      return acc;
    }, {} as Record<string, number>);
  }

  async countByRole(): Promise<Record<string, number>> {
    const result = await this.repository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .select('role.code', 'roleCode')
      .addSelect('COUNT(*)', 'count')
      .groupBy('role.code')
      .getRawMany();

    return result.reduce((acc, item) => {
      if (item.roleCode) {
        acc[item.roleCode] = parseInt(item.count);
      }
      return acc;
    }, {} as Record<string, number>);
  }
}