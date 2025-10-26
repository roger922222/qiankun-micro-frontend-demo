import { Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Column } from 'typeorm';
import { User } from './User';
import { Role } from './Role';

// 用户-角色关联表（多对多关系）
@Entity('user_roles')
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => User, user => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Role, role => role.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date; // 软删除

  // 关联有效期（可选）
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  // 检查关联是否有效
  isValid(): boolean {
    if (this.deletedAt) return false;
    if (this.expiresAt && this.expiresAt < new Date()) return false;
    return true;
  }
}