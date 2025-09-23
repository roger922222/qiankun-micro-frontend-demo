export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: string;
  nickname?: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  roles: Role[];
  permissions: Permission[];
  profile: UserProfile;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  department?: string;
  position?: string;
  location?: string;
  bio?: string;
  birthDate?: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: Permission[];
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  resource: string;
  action: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip: string;
  userAgent: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GetUsersParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  nickname?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  roles?: string[];
  profile?: Partial<UserProfile>;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  phone?: string;
  nickname?: string;
  status?: 'active' | 'inactive' | 'suspended' | 'pending';
  roles?: string[];
  profile?: Partial<UserProfile>;
}