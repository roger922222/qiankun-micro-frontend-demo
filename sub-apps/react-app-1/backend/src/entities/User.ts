import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToMany, JoinTable, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Role } from './Role';
import bcrypt from 'bcryptjs';

export type UserStatus = 'active' | 'inactive' | 'suspended';

@Entity('users')
@Index(['username'], { unique: true })
@Index(['email'], { unique: true })
@Index(['status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 50 })
  nickname: string;

  @Column({ select: false }) // 查询时不默认返回密码
  password: string;

  @Column({ 
    type: 'enum',
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  })
  status: UserStatus;

  @Column({ type: 'jsonb', nullable: true })
  profile: {
    department?: string;
    position?: string;
    location?: string;
    bio?: string;
    avatar?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' }
  })
  roles: Role[];

  @Column({ type: 'jsonb', nullable: true })
  permissions: string[]; // 直接权限，不通过角色

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date; // 软删除

  // 密码加密钩子
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2a$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  // 验证密码方法
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // 获取所有权限（角色权限 + 直接权限）
  getAllPermissions(): string[] {
    const rolePermissions = this.roles?.flatMap(role => 
      role.permissions?.map(permission => permission.code) || []
    ) || [];
    
    const directPermissions = this.permissions || [];
    
    return [...new Set([...rolePermissions, ...directPermissions])];
  }

  // 检查是否有特定权限
  hasPermission(permissionCode: string): boolean {
    return this.getAllPermissions().includes(permissionCode);
  }

  // 检查是否有某个角色
  hasRole(roleCode: string): boolean {
    return this.roles?.some(role => role.code === roleCode) || false;
  }

  // 序列化（移除敏感信息）
  toJSON() {
    const { password, ...safeUser } = this;
    return safeUser;
  }
}