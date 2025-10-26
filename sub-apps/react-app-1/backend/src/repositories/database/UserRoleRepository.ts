import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { Role } from '../../entities/Role';
import { Permission } from '../../entities/Permission';
import { UserRole } from '../../entities/UserRole';
import { RolePermission } from '../../entities/RolePermission';

export class UserRoleRepository {
  private repository: Repository<UserRole>;

  constructor() {
    this.repository = AppDataSource.getRepository(UserRole);
  }

  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    const existing = await this.repository.findOne({
      where: { userId, roleId, deletedAt: undefined }
    });

    if (existing) {
      throw new Error('用户已拥有该角色');
    }

    const userRole = this.repository.create({ userId, roleId });
    return this.repository.save(userRole);
  }

  async removeRole(userId: string, roleId: string): Promise<boolean> {
    const result = await this.repository.softDelete({ userId, roleId });
    return result.affected !== 0;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.repository.find({
      where: { userId, deletedAt: undefined },
      relations: ['role']
    });

    return userRoles.map(ur => ur.role).filter(role => role && !role.deletedAt);
  }

  async getRoleUsers(roleId: string): Promise<User[]> {
    const userRoles = await this.repository.find({
      where: { roleId, deletedAt: undefined },
      relations: ['user']
    });

    return userRoles.map(ur => ur.user).filter(user => user && !user.deletedAt);
  }

  async hasRole(userId: string, roleId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { userId, roleId, deletedAt: undefined }
    });

    return count > 0;
  }

  async countUsersByRole(): Promise<Record<string, number>> {
    const result = await this.repository
      .createQueryBuilder('userRole')
      .innerJoin('userRole.role', 'role')
      .select('role.code', 'roleCode')
      .addSelect('COUNT(DISTINCT userRole.userId)', 'count')
      .where('userRole.deletedAt IS NULL')
      .andWhere('role.deletedAt IS NULL')
      .groupBy('role.code')
      .getRawMany();

    return result.reduce((acc, { roleCode, count }) => {
      acc[roleCode] = parseInt(count);
      return acc;
    }, {} as Record<string, number>);
  }
}