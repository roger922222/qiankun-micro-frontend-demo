import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Permission } from '../../entities/Permission';

export class PermissionRepository {
  private repository: Repository<Permission>;

  constructor() {
    this.repository = AppDataSource.getRepository(Permission);
  }

  async findAll(): Promise<Permission[]> {
    return this.repository.find({
      order: { resource: 'ASC', action: 'ASC' }
    });
  }

  async findById(id: string): Promise<Permission | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByCode(code: string): Promise<Permission | null> {
    return this.repository.findOne({ where: { code } });
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return this.repository.find({
      where: { resource },
      order: { action: 'ASC' }
    });
  }

  async findByCodes(codes: string[]): Promise<Permission[]> {
    return this.repository.find({
      where: { code: In(codes) }
    });
  }

  async create(permissionData: Partial<Permission>): Promise<Permission> {
    const permission = this.repository.create(permissionData);
    return this.repository.save(permission);
  }

  async update(id: string, permissionData: Partial<Permission>): Promise<Permission | null> {
    await this.repository.update(id, permissionData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return result.affected !== 0;
  }

  async getResourceActions(): Promise<Record<string, string[]>> {
    const permissions = await this.repository
      .createQueryBuilder('permission')
      .select('permission.resource', 'resource')
      .addSelect('permission.action', 'action')
      .distinct(true)
      .orderBy('permission.resource')
      .addOrderBy('permission.action')
      .getRawMany();

    const result: Record<string, string[]> = {};
    permissions.forEach(({ resource, action }) => {
      if (!result[resource]) {
        result[resource] = [];
      }
      result[resource].push(action);
    });

    return result;
  }

  async getPermissionStats(): Promise<Record<string, number>> {
    const stats = await this.repository
      .createQueryBuilder('permission')
      .select('permission.resource', 'resource')
      .addSelect('COUNT(*)', 'count')
      .groupBy('permission.resource')
      .getRawMany();

    return stats.reduce((acc, { resource, count }) => {
      acc[resource] = parseInt(count);
      return acc;
    }, {} as Record<string, number>);
  }
}