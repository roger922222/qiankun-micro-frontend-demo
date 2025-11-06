// 商品相关类型定义
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductFilter {
  keyword?: string;
  category?: string;
  status?: Product['status'];
  priceRange?: [number, number];
  tags?: string[];
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductDto {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  images?: string[];
  tags?: string[];
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  id: string;
}

export interface CreateCategoryDto {
  name: string;
  description: string;
  parentId?: string;
  level?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  id: string;
}

export interface ProductStats {
  total: number;
  active: number;
  inactive: number;
  discontinued: number;
  lowStock: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}