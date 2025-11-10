import type { 
  Product, 
  ProductCategory, 
  ProductStats,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  PaginatedResponse,
  ApiResponse 
} from '../types';
import { bffApiClient } from './bffApi';

// 商品相关API
export const productApi = {
  // 获取商品列表
  async getProducts(filter?: any, page = 1, pageSize = 10): Promise<PaginatedResponse<Product[]>> {
    const params = new URLSearchParams();
    
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    
    const response = await bffApiClient.get(`/api/products?${params.toString()}`);
    return response;
  },
  
  // 获取单个商品
  async getProductById(id: string): Promise<ApiResponse<Product>> {
    const response = await bffApiClient.get(`/api/products/${id}`);
    return response;
  },
  
  // 创建商品
  async createProduct(data: CreateProductDto): Promise<ApiResponse<Product>> {
    const response = await bffApiClient.post('/api/products/create', data);
    return response;
  },
  
  // 更新商品
  async updateProduct(id: string, data: UpdateProductDto): Promise<ApiResponse<Product>> {
    const response = await bffApiClient.put(`/api/products/${id}`, data);
    return response;
  },
  
  // 删除商品
  async deleteProduct(id: string): Promise<ApiResponse<Product>> {
    const response = await bffApiClient.delete(`/api/products/${id}`);
    return response;
  },
  
  // 获取商品统计
  async getProductStats(): Promise<ApiResponse<ProductStats>> {
    const response = await bffApiClient.get('/api/products/stats');
    return response;
  },
  
  // 批量更新商品
  async batchUpdateProducts(ids: string[], updates: Partial<Product>): Promise<ApiResponse<Product[]>> {
    const response = await bffApiClient.post('/api/products/batch-update', { ids, updates });
    return response;
  },
  
  // 批量删除商品
  async batchDeleteProducts(ids: string[]): Promise<ApiResponse<Product[]>> {
    const response = await bffApiClient.post('/api/products/batch-delete', { ids });
    return response;
  },
};

// 分类相关API
export const categoryApi = {
  // 获取分类列表
  async getCategories(): Promise<ApiResponse<ProductCategory[]>> {
    const response = await bffApiClient.get('/api/categories');
    return response;
  },
  
  // 创建分类
  async createCategory(data: CreateCategoryDto): Promise<ApiResponse<ProductCategory>> {
    const response = await bffApiClient.post('/api/categories', data);
    return response;
  },
  
  // 更新分类
  async updateCategory(id: string, data: UpdateCategoryDto): Promise<ApiResponse<ProductCategory>> {
    const response = await bffApiClient.put(`/api/categories/${id}`, data);
    return response;
  },
  
  // 删除分类
  async deleteCategory(id: string): Promise<ApiResponse<ProductCategory>> {
    const response = await bffApiClient.delete(`/api/categories/${id}`);
    return response;
  },
  
  // 获取单个分类
  async getCategoryById(id: string): Promise<ApiResponse<ProductCategory>> {
    const response = await bffApiClient.get(`/api/categories/${id}`);
    return response;
  },
};

// 库存相关API
export const inventoryApi = {
  // 更新库存
  async updateStock(productId: string, quantity: number, type: 'increase' | 'decrease'): Promise<ApiResponse<Product>> {
    const response = await bffApiClient.post(`/api/inventory/${productId}`, { quantity, type });
    return response;
  },
  
  // 批量更新库存
  async batchUpdateStock(updates: Array<{ productId: string; quantity: number; type: 'increase' | 'decrease' }>): Promise<ApiResponse<Product[]>> {
    const response = await bffApiClient.post('/api/inventory', updates);
    return response;
  },
  
  // 获取低库存商品
  async getLowStockProducts(threshold = 10): Promise<ApiResponse<Product[]>> {
    const response = await bffApiClient.get(`/api/inventory?threshold=${threshold}`);
    return response;
  },
};

// 价格相关API
export const pricingApi = {
  // 批量更新价格
  async batchUpdatePrices(updates: Array<{ productId: string; price: number }>): Promise<ApiResponse<Product[]>> {
    const response = await bffApiClient.post('/api/pricing', updates);
    return response;
  },
  
  // 获取价格统计
  async getPricingStats(): Promise<ApiResponse<any>> {
    const response = await bffApiClient.get('/api/pricing');
    return response;
  },
};