import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { Role } from './Role';
import { Permission } from './Permission';

// 角色-权限关联表（多对多关系）
@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @Column({ type: 'uuid' })
  permissionId: string;

  @ManyToOne(() => Role, role => role.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Permission, permission => permission.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date; // 软删除

  // 权限有效期（可选）
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  // 检查权限是否有效
  isValid(): boolean {
    if (this.deletedAt) return false;
    if (this.expiresAt && this.expiresAt < new Date()) return false;
    return true;
  }
}