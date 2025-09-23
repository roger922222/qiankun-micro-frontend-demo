import { User, Role, Permission } from '../types';
export declare class UserRepository {
    findAll(): Promise<User[]>;
    findById(id: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    findByUsernameOrEmail(username: string, email: string): Promise<User | null>;
    create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
    update(id: string, userData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null>;
    delete(id: string): Promise<boolean>;
}
export declare class RoleRepository {
    findAll(): Promise<Role[]>;
    findById(id: string): Promise<Role | null>;
    findByCode(code: string): Promise<Role | null>;
    create(roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>): Promise<Role>;
    update(id: string, roleData: Partial<Omit<Role, 'id' | 'createdAt'>>): Promise<Role | null>;
    delete(id: string): Promise<boolean>;
}
export declare class PermissionRepository {
    findAll(): Promise<Permission[]>;
    findById(id: string): Promise<Permission | null>;
    findByCode(code: string): Promise<Permission | null>;
}
//# sourceMappingURL=userRepository.d.ts.map