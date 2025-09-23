/// <reference types="node" />
/// <reference types="node" />
import { User, GetUsersParams, CreateUserRequest, UpdateUserRequest, PaginatedResponse } from '../types';
import { UserRepository } from '../repositories/userRepository';
export declare class UserService {
    private userRepository;
    constructor(userRepository?: UserRepository);
    getUsers(params: GetUsersParams): Promise<PaginatedResponse<User>>;
    getUserById(id: string): Promise<User | null>;
    createUser(userData: CreateUserRequest): Promise<User>;
    updateUser(id: string, userData: UpdateUserRequest): Promise<User | null>;
    deleteUser(id: string): Promise<boolean>;
    importUsers(buffer: Buffer): Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>;
    exportUsers(params: any): Promise<Buffer>;
    private validateEmail;
    private getRolesByIds;
}
//# sourceMappingURL=userService.d.ts.map