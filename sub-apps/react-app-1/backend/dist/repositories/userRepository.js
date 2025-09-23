"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionRepository = exports.RoleRepository = exports.UserRepository = void 0;
// Mock数据
let users = [
    {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        phone: '13800138000',
        nickname: '超级管理员',
        status: 'active',
        roles: [
            {
                id: '1',
                name: '超级管理员',
                code: 'SUPER_ADMIN',
                description: '系统超级管理员',
                permissions: [
                    {
                        id: '1',
                        name: '用户管理',
                        code: 'USER_MANAGE',
                        resource: 'user',
                        action: 'manage',
                        description: '管理用户',
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-01T00:00:00Z'
                    }
                ],
                level: 999,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
            }
        ],
        permissions: [],
        profile: {
            department: '技术部',
            position: '技术总监',
            location: '北京',
            bio: '系统管理员'
        },
        lastLoginAt: '2024-01-15T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
];
let roles = [
    {
        id: '1',
        name: '超级管理员',
        code: 'SUPER_ADMIN',
        description: '系统超级管理员',
        permissions: [],
        level: 999,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '2',
        name: '管理员',
        code: 'ADMIN',
        description: '系统管理员',
        permissions: [],
        level: 100,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '3',
        name: '普通用户',
        code: 'USER',
        description: '普通用户',
        permissions: [],
        level: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
];
let permissions = [
    {
        id: '1',
        name: '用户管理',
        code: 'USER_MANAGE',
        resource: 'user',
        action: 'manage',
        description: '管理用户',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '2',
        name: '角色管理',
        code: 'ROLE_MANAGE',
        resource: 'role',
        action: 'manage',
        description: '管理角色',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    },
    {
        id: '3',
        name: '权限管理',
        code: 'PERMISSION_MANAGE',
        resource: 'permission',
        action: 'manage',
        description: '管理权限',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
    }
];
class UserRepository {
    async findAll() {
        return users;
    }
    async findById(id) {
        return users.find(user => user.id === id) || null;
    }
    async findByUsername(username) {
        return users.find(user => user.username === username) || null;
    }
    async findByUsernameOrEmail(username, email) {
        return users.find(user => user.username === username || user.email === email) || null;
    }
    async create(userData) {
        const newUser = {
            ...userData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        users.push(newUser);
        return newUser;
    }
    async update(id, userData) {
        const index = users.findIndex(user => user.id === id);
        if (index === -1)
            return null;
        users[index] = {
            ...users[index],
            ...userData,
            updatedAt: new Date().toISOString()
        };
        return users[index];
    }
    async delete(id) {
        const index = users.findIndex(user => user.id === id);
        if (index === -1)
            return false;
        users.splice(index, 1);
        return true;
    }
}
exports.UserRepository = UserRepository;
class RoleRepository {
    async findAll() {
        return roles;
    }
    async findById(id) {
        return roles.find(role => role.id === id) || null;
    }
    async findByCode(code) {
        return roles.find(role => role.code === code) || null;
    }
    async create(roleData) {
        const newRole = {
            ...roleData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        roles.push(newRole);
        return newRole;
    }
    async update(id, roleData) {
        const index = roles.findIndex(role => role.id === id);
        if (index === -1)
            return null;
        roles[index] = {
            ...roles[index],
            ...roleData,
            updatedAt: new Date().toISOString()
        };
        return roles[index];
    }
    async delete(id) {
        const index = roles.findIndex(role => role.id === id);
        if (index === -1)
            return false;
        roles.splice(index, 1);
        return true;
    }
}
exports.RoleRepository = RoleRepository;
class PermissionRepository {
    async findAll() {
        return permissions;
    }
    async findById(id) {
        return permissions.find(permission => permission.id === id) || null;
    }
    async findByCode(code) {
        return permissions.find(permission => permission.code === code) || null;
    }
}
exports.PermissionRepository = PermissionRepository;
//# sourceMappingURL=userRepository.js.map