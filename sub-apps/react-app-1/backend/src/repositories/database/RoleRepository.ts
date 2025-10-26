import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Role } from '../../entities/Role';
import { Permission } from '../../entities/Permission';

export class RoleRepository {
  private repository: Repository<Role>;

  constructor() {
    this.repository = AppDataSource.getRepository(Role);
  }

  async findAll(): Promise<Role[]> {
    return this.repository.find({
      relations: ['permissions'],
      order: { level: 'DESC' }
    });
  }

  async findById(id: string): Promise<Role | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });
  }

  async findByCode(code: string): Promise<Role | null> {
    return this.repository.findOne({
      where: { code },
      relations: ['permissions'],
    });
  }

  async create(roleData: Partial<Role>): Promise<Role> {
    const role = this.repository.create(roleData);
    return this.repository.save(role);
  }

  async update(id: string, roleData: Partial<Role>): Promise<Role | null> {
    await this.repository.update(id, roleData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.softDelete(id);
    return result.affected !== 0;
  }

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const role = await this.findById(roleId);
    if (!role) {
      throw new Error('角色不存在');
    }

    const permissions = await AppDataSource.getRepository(Permission)
      .createQueryBuilder('permission')
      .where('permission.id IN (:...ids)', { ids: permissionIds })
      .getMany();

    role.permissions = permissions;
    await this.repository.save(role);
  }

  async removePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await AppDataSource.createQueryBuilder()
      .relation(Role, 'permissions')
      .of(roleId)
      .remove(permissionIds);
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const role = await this.repository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    return role?.permissions || [];
  }
}