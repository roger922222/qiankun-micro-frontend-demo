import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { User } from './User';
import { Permission } from './Permission';
import { RolePermission } from './RolePermission';

export type RoleLevel = number; // 角色等级，数字越大权限越高

@Entity('roles')
@Index(['code'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int', default: 1 })
  level: RoleLevel;

  @ManyToMany(() => User, user => user.roles)
  users: User[];

  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' }
  })
  permissions: Permission[];

  @OneToMany(() => RolePermission, rolePermission => rolePermission.role)
  rolePermissions: RolePermission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date; // 软删除

  // 获取权限代码列表
  getPermissionCodes(): string[] {
    return this.permissions?.map(permission => permission.code) || [];
  }

  // 检查是否有特定权限
  hasPermission(permissionCode: string): boolean {
    return this.permissions?.some(permission => permission.code === permissionCode) || false;
  }

  // 检查是否是高等级角色
  isHigherLevelThan(otherRole: Role): boolean {
    return this.level > otherRole.level;
  }
}