import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  Product, 
  ProductCategory, 
  ProductFilter, 
  ProductStats,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  PaginatedResponse,
  ApiResponse 
} from '@/types';

interface BffProductState {
  // 数据状态
  products: Product[];
  categories: ProductCategory[];
  selectedProduct: Product | null;
  productStats: ProductStats | null;
  
  // UI状态
  loading: boolean;
  error: string | null;
  
  // 分页状态
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  
  // 筛选状态
  filter: ProductFilter;
  
  // Actions
  setProducts: (products: Product[]) => void;
  setCategories: (categories: ProductCategory[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setProductStats: (stats: ProductStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPagination: (pagination: Partial<BffProductState['pagination']>) => void;
  setFilter: (filter: Partial<ProductFilter>) => void;
  clearFilter: () => void;
  
  // API调用方法
  fetchProducts: (filter?: ProductFilter, page?: number, pageSize?: number) => Promise<void>;
  fetchProductById: (id: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProductStats: () => Promise<void>;
  createProduct: (data: CreateProductDto) => Promise<void>;
  updateProduct: (id: string, data: UpdateProductDto) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  createCategory: (data: CreateCategoryDto) => Promise<void>;
  updateCategory: (id: string, data: UpdateCategoryDto) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // 批量操作
  batchUpdateProducts: (ids: string[], updates: Partial<Product>) => Promise<void>;
  batchDeleteProducts: (ids: string[]) => Promise<void>;
  
  // 库存管理
  updateStock: (productId: string, quantity: number, type: 'increase' | 'decrease') => Promise<void>;
  fetchLowStockProducts: (threshold?: number) => Promise<void>;
  
  // 价格管理
  batchUpdatePrices: (updates: Array<{ productId: string; price: number }>) => Promise<void>;
  fetchPricingStats: () => Promise<void>;
}

const initialState = {
  products: [],
  categories: [],
  selectedProduct: null,
  productStats: null,
  loading: false,
  error: null,
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
  filter: {},
};

// API基础配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3013';

const apiCall = async <T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || data.message || 'API调用失败');
  }
  
  return data;
};

export const useBffProductStore = create<BffProductState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // 基本状态设置
      setProducts: (products) => {
        set((state) => {
          state.products = products;
        });
      },
      
      setCategories: (categories) => {
        set((state) => {
          state.categories = categories;
        });
      },
      
      setSelectedProduct: (product) => {
        set((state) => {
          state.selectedProduct = product;
        });
      },
      
      setProductStats: (stats) => {
        set((state) => {
          state.productStats = stats;
        });
      },
      
      setLoading: (loading) => {
        set((state) => {
          state.loading = loading;
        });
      },
      
      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },
      
      setPagination: (pagination) => {
        set((state) => {
          state.pagination = { ...state.pagination, ...pagination };
        });
      },
      
      setFilter: (filter) => {
        set((state) => {
          state.filter = { ...state.filter, ...filter };
        });
      },
      
      clearFilter: () => {
        set((state) => {
          state.filter = {};
        });
      },
      
      // 商品相关API
      fetchProducts: async (filter, page = 1, pageSize = 10) => {
        const { setLoading, setError, setProducts, setPagination } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const queryParams = new URLSearchParams();
          if (filter) {
            Object.entries(filter).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                  queryParams.append(key, value.join(','));
                } else {
                  queryParams.append(key, String(value));
                }
              }
            });
          }
          queryParams.append('page', String(page));
          queryParams.append('pageSize', String(pageSize));
          
          const response = await apiCall<PaginatedResponse<Product[]>>(
            `/api/products?${queryParams.toString()}`
          );
          
          setProducts(response.data || []);
          setPagination(response.pagination);
        } catch (error) {
          setError(error instanceof Error ? error.message : '获取商品列表失败');
          console.error('Fetch products error:', error);
        } finally {
          setLoading(false);
        }
      },
      
      fetchProductById: async (id) => {
        const { setLoading, setError, setSelectedProduct } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const response = await apiCall<ApiResponse<Product>>(`/api/products/${id}`);
          setSelectedProduct(response.data || null);
        } catch (error) {
          setError(error instanceof Error ? error.message : '获取商品详情失败');
          console.error('Fetch product by id error:', error);
        } finally {
          setLoading(false);
        }
      },
      
      fetchCategories: async () => {
        const { setLoading, setError, setCategories } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const response = await apiCall<ApiResponse<ProductCategory[]>>(`/api/categories`);
          setCategories(response.data || []);
        } catch (error) {
          setError(error instanceof Error ? error.message : '获取分类列表失败');
          console.error('Fetch categories error:', error);
        } finally {
          setLoading(false);
        }
      },
      
      fetchProductStats: async () => {
        const { setLoading, setError, setProductStats } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const response = await apiCall<ApiResponse<ProductStats>>(`/api/products/stats`);
          setProductStats(response.data || null);
        } catch (error) {
          setError(error instanceof Error ? error.message : '获取商品统计失败');
          console.error('Fetch product stats error:', error);
        } finally {
          setLoading(false);
        }
      },
      
      createProduct: async (data) => {
        const { setLoading, setError, fetchProducts, filter, pagination } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<Product>>('/api/products/create', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          
          // 重新获取商品列表
          await fetchProducts(filter, pagination.current, pagination.pageSize);
        } catch (error) {
          setError(error instanceof Error ? error.message : '创建商品失败');
          console.error('Create product error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      updateProduct: async (id, data) => {
        const { setLoading, setError, fetchProducts, filter, pagination } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<Product>>(`/api/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          
          // 重新获取商品列表
          await fetchProducts(filter, pagination.current, pagination.pageSize);
        } catch (error) {
          setError(error instanceof Error ? error.message : '更新商品失败');
          console.error('Update product error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      deleteProduct: async (id) => {
        const { setLoading, setError, fetchProducts, filter, pagination } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<Product>>(`/api/products/${id}`, {
            method: 'DELETE',
          });
          
          // 重新获取商品列表
          await fetchProducts(filter, pagination.current, pagination.pageSize);
        } catch (error) {
          setError(error instanceof Error ? error.message : '删除商品失败');
          console.error('Delete product error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      createCategory: async (data) => {
        const { setLoading, setError, fetchCategories } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<ProductCategory>>('/api/categories', {
            method: 'POST',
            body: JSON.stringify(data),
          });
          
          // 重新获取分类列表
          await fetchCategories();
        } catch (error) {
          setError(error instanceof Error ? error.message : '创建分类失败');
          console.error('Create category error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      updateCategory: async (id, data) => {
        const { setLoading, setError, fetchCategories } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<ProductCategory>>(`/api/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          });
          
          // 重新获取分类列表
          await fetchCategories();
        } catch (error) {
          setError(error instanceof Error ? error.message : '更新分类失败');
          console.error('Update category error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      deleteCategory: async (id) => {
        const { setLoading, setError, fetchCategories } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<ProductCategory>>(`/api/categories/${id}`, {
            method: 'DELETE',
          });
          
          // 重新获取分类列表
          await fetchCategories();
        } catch (error) {
          setError(error instanceof Error ? error.message : '删除分类失败');
          console.error('Delete category error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      // 批量操作
      batchUpdateProducts: async (ids, updates) => {
        const { setLoading, setError, fetchProducts, filter, pagination } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<Product[]>>('/api/products/batch-update', {
            method: 'POST',
            body: JSON.stringify({ ids, updates }),
          });
          
          // 重新获取商品列表
          await fetchProducts(filter, pagination.current, pagination.pageSize);
        } catch (error) {
          setError(error instanceof Error ? error.message : '批量更新商品失败');
          console.error('Batch update products error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      batchDeleteProducts: async (ids) => {
        const { setLoading, setError, fetchProducts, filter, pagination } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<Product[]>>('/api/products/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ ids }),
          });
          
          // 重新获取商品列表
          await fetchProducts(filter, pagination.current, pagination.pageSize);
        } catch (error) {
          setError(error instanceof Error ? error.message : '批量删除商品失败');
          console.error('Batch delete products error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      // 库存管理
      updateStock: async (productId, quantity, type) => {
        const { setLoading, setError, fetchProducts, filter, pagination } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<Product>>(`/api/inventory/${productId}`, {
            method: 'POST',
            body: JSON.stringify({ quantity, type }),
          });
          
          // 重新获取商品列表
          await fetchProducts(filter, pagination.current, pagination.pageSize);
        } catch (error) {
          setError(error instanceof Error ? error.message : '更新库存失败');
          console.error('Update stock error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      fetchLowStockProducts: async (threshold = 10) => {
        const { setLoading, setError, setProducts } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const response = await apiCall<ApiResponse<Product[]>>(
            `/api/inventory?threshold=${threshold}`
          );
          
          setProducts(response.data || []);
        } catch (error) {
          setError(error instanceof Error ? error.message : '获取低库存商品失败');
          console.error('Fetch low stock products error:', error);
        } finally {
          setLoading(false);
        }
      },
      
      // 价格管理
      batchUpdatePrices: async (updates) => {
        const { setLoading, setError, fetchProducts, filter, pagination } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          await apiCall<ApiResponse<Product[]>>('/api/pricing', {
            method: 'POST',
            body: JSON.stringify(updates),
          });
          
          // 重新获取商品列表
          await fetchProducts(filter, pagination.current, pagination.pageSize);
        } catch (error) {
          setError(error instanceof Error ? error.message : '批量更新价格失败');
          console.error('Batch update prices error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
      
      fetchPricingStats: async () => {
        const { setLoading, setError } = get();
        
        try {
          setLoading(true);
          setError(null);
          
          const response = await apiCall<ApiResponse<any>>('/api/pricing');
          return response.data;
        } catch (error) {
          setError(error instanceof Error ? error.message : '获取价格统计失败');
          console.error('Fetch pricing stats error:', error);
          throw error;
        } finally {
          setLoading(false);
        }
      },
    })),
    {
      name: 'bff-product-store',
    }
  )
);

// 选择器
export const useBffProductSelector = <T>(selector: (state: BffProductState) => T) => {
  return useBffProductStore(selector);
};

// 常用选择器
export const bffProductSelectors = {
  products: (state: BffProductState) => state.products,
  categories: (state: BffProductState) => state.categories,
  selectedProduct: (state: BffProductState) => state.selectedProduct,
  productStats: (state: BffProductState) => state.productStats,
  loading: (state: BffProductState) => state.loading,
  error: (state: BffProductState) => state.error,
  pagination: (state: BffProductState) => state.pagination,
  filter: (state: BffProductState) => state.filter,
};