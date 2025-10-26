import { DataSource } from 'typeorm';
import bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { UserRole } from '../entities/UserRole';
import { RolePermission } from '../entities/RolePermission';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'react_app_1',
  synchronize: process.env.NODE_ENV !== 'production', // 开发环境自动同步，生产环境关闭
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Role, Permission, UserRole, RolePermission],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
  maxQueryExecutionTime: 1000, // 慢查询阈值（毫秒）
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');
    
    // 初始化基础数据
    await initializeBasicData();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    throw error;
  }
};

const initializeBasicData = async () => {
  const userRepository = AppDataSource.getRepository(User);
  const roleRepository = AppDataSource.getRepository(Role);
  const permissionRepository = AppDataSource.getRepository(Permission);
  
  // 检查是否已有基础数据
  const existingPermissions = await permissionRepository.count();
  if (existingPermissions === 0) {
    console.log('📝 初始化基础权限数据...');
    
    // 创建基础权限
    const permissions = [
      { name: '用户管理', code: 'USER_MANAGE', resource: 'user', action: 'manage' },
      { name: '用户查看', code: 'USER_VIEW', resource: 'user', action: 'view' },
      { name: '用户创建', code: 'USER_CREATE', resource: 'user', action: 'create' },
      { name: '用户更新', code: 'USER_UPDATE', resource: 'user', action: 'update' },
      { name: '用户删除', code: 'USER_DELETE', resource: 'user', action: 'delete' },
      { name: '角色管理', code: 'ROLE_MANAGE', resource: 'role', action: 'manage' },
      { name: '权限管理', code: 'PERMISSION_MANAGE', resource: 'permission', action: 'manage' },
    ];
    
    const savedPermissions = await permissionRepository.save(permissions);
    
    // 创建基础角色
    const superAdminRole = await roleRepository.save({
      name: '超级管理员',
      code: 'SUPER_ADMIN',
      description: '系统超级管理员',
      level: 999
    });
    
    const adminRole = await roleRepository.save({
      name: '管理员',
      code: 'ADMIN',
      description: '系统管理员',
      level: 100
    });
    
    const userRole = await roleRepository.save({
      name: '普通用户',
      code: 'USER',
      description: '普通用户',
      level: 1
    });
    
    // 关联权限到角色
    await AppDataSource.createQueryBuilder()
      .relation(Role, 'permissions')
      .of(superAdminRole)
      .add(savedPermissions);
    
    await AppDataSource.createQueryBuilder()
      .relation(Role, 'permissions')
      .of(adminRole)
      .add(savedPermissions.filter(p => p.code !== 'PERMISSION_MANAGE'));
    
    // 创建默认管理员用户
    const adminUser = await userRepository.save({
      username: 'admin',
      email: 'admin@example.com',
      phone: '13800138000',
      nickname: '超级管理员',
      status: 'active',
      password: await bcrypt.hash('admin123', 10),
      profile: {
        department: '技术部',
        position: '技术总监',
        location: '北京',
        bio: '系统管理员'
      }
    });
    
    // 关联角色到用户
    await AppDataSource.createQueryBuilder()
      .relation(User, 'roles')
      .of(adminUser)
      .add([superAdminRole]);
    
    console.log('✅ 基础数据初始化完成');
  }
};

export default AppDataSource;