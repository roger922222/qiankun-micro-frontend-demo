import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToMany, OneToMany } from 'typeorm';
import { Role } from './Role';
import { RolePermission } from './RolePermission';

@Entity('permissions')
@Index(['code'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 50 })
  resource: string; // 资源类型：user, role, permission 等

  @Column({ length: 50 })
  action: string; // 操作类型：view, create, update, delete, manage 等

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];

  @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
  rolePermissions: RolePermission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date; // 软删除

  // 生成权限标识符
  static generateCode(resource: string, action: string): string {
    return `${resource.toUpperCase()}_${action.toUpperCase()}`;
  }

  // 解析权限代码
  static parseCode(code: string): { resource: string; action: string } {
    const parts = code.split('_');
    return {
      resource: parts[0].toLowerCase(),
      action: parts.slice(1).join('_').toLowerCase()
    };
  }
}