// 更新后的 Zustand store，集成 BFF API
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { globalLogger } from '@shared/utils/logger';
import { productApi, categoryApi, inventoryApi, pricingApi } from '../services/productApi';
import type { 
  Product, 
  ProductCategory, 
  ProductFilter, 
  ProductStats,
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto
} from '../types';

// Store状态接口
interface ProductState {
  // 商品数据
  products: Product[];
  categories: ProductCategory[];
  selectedProduct: Product | null;
  
  // UI状态
  loading: boolean;
  error: string | null;
  filter: ProductFilter;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 表单状态
  isModalVisible: boolean;
  modalMode: 'create' | 'edit' | 'view';
  formData: Partial<Product>;
  
  // Actions
  setProducts: (products: Product[]) => void;
  setCategories: (categories: ProductCategory[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<ProductFilter>) => void;
  clearFilter: () => void;
  
  setPagination: (pagination: Partial<ProductState['pagination']>) => void;
  
  showModal: (mode: ProductState['modalMode'], product?: Product) => void;
  hideModal: () => void;
  setFormData: (data: Partial<Product>) => void;
  clearFormData: () => void;
  
  // API集成方法
  fetchProducts: (filter?: ProductFilter, page?: number, pageSize?: number) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchProductStats: () => Promise<ProductStats>;
  
  createProduct: (productData: CreateProductDto) => Promise<void>;
  updateProduct: (id: string, updates: UpdateProductDto) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  createCategory: (categoryData: CreateCategoryDto) => Promise<void>;
  updateCategory: (id: string, updates: UpdateCategoryDto) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // 批量操作
  batchUpdateProducts: (ids: string[], updates: Partial<Product>) => Promise<void>;
  batchDeleteProducts: (ids: string[]) => Promise<void>;
  
  // 库存管理
  updateStock: (productId: string, quantity: number, type: 'increase' | 'decrease') => Promise<void>;
  fetchLowStockProducts: (threshold?: number) => Promise<void>;
  
  // 价格管理
  batchUpdatePrices: (updates: Array<{ productId: string; price: number }>) => Promise<void>;
  
  // 业务逻辑方法
  searchProducts: (keyword: string) => void;
  filterProducts: (filter: ProductFilter) => Product[];
  getProductsByCategory: (categoryId: string) => Product[];
  getProductStats: () => ProductStats;
  
  // 数据重置
  reset: () => void;
}

// 初始状态
const initialState = {
  products: [],
  categories: [],
  selectedProduct: null,
  loading: false,
  error: null,
  filter: {},
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0
  },
  isModalVisible: false,
  modalMode: 'create' as const,
  formData: {}
};

// 创建Store
export const useProductStore = create<ProductState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // 基本状态管理
        setProducts: (products) => {
          set((state) => {
            state.products = products;
            state.pagination.total = products.length;
          });
          globalLogger.info('Products updated', { count: products.length });
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
        
        setLoading: (loading) => {
          set((state) => {
            state.loading = loading;
          });
        },
        
        setError: (error) => {
          set((state) => {
            state.error = error;
          });
          
          if (error) {
            globalLogger.error('Product store error', new Error(error));
          }
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
        
        setPagination: (pagination) => {
          set((state) => {
            state.pagination = { ...state.pagination, ...pagination };
          });
        },
        
        // 模态框管理
        showModal: (mode, product) => {
          set((state) => {
            state.isModalVisible = true;
            state.modalMode = mode;
            state.formData = product ? { ...product } : {};
          });
        },
        
        hideModal: () => {
          set((state) => {
            state.isModalVisible = false;
            state.formData = {};
          });
        },
        
        setFormData: (data) => {
          set((state) => {
            state.formData = { ...state.formData, ...data };
          });
        },
        
        clearFormData: () => {
          set((state) => {
            state.formData = {};
          });
        },
        
        // API集成方法
        fetchProducts: async (filter, page = 1, pageSize = 10) => {
          const { setLoading, setError, setProducts, setPagination } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await productApi.getProducts(filter, page, pageSize);
            
            if (response.success && response.data) {
              setProducts(response.data);
              setPagination(response.pagination);
            } else {
              throw new Error(response.message || '获取商品列表失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '获取商品列表失败';
            setError(errorMessage);
            globalLogger.error('Fetch products error', error instanceof Error ? error : new Error(errorMessage));
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        fetchCategories: async () => {
          const { setLoading, setError, setCategories } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await categoryApi.getCategories();
            
            if (response.success && response.data) {
              setCategories(response.data);
            } else {
              throw new Error(response.message || '获取分类列表失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '获取分类列表失败';
            setError(errorMessage);
            globalLogger.error('Fetch categories error', error instanceof Error ? error : new Error(errorMessage));
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        fetchProductStats: async () => {
          const { setLoading, setError } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await productApi.getProductStats();
            
            if (response.success && response.data) {
              return response.data;
            } else {
              throw new Error(response.message || '获取商品统计失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '获取商品统计失败';
            setError(errorMessage);
            globalLogger.error('Fetch product stats error', error instanceof Error ? error : new Error(errorMessage));
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        createProduct: async (productData) => {
          const { setLoading, setError, fetchProducts, filter, pagination } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await productApi.createProduct(productData);
            
            if (response.success && response.data) {
              globalLogger.info('Product created via BFF', { productId: response.data.id, name: response.data.name });
              // 重新获取商品列表
              await fetchProducts(filter, pagination.current, pagination.pageSize);
            } else {
              throw new Error(response.message || '创建商品失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '创建商品失败';
            setError(errorMessage);
            globalLogger.error('Create product error', error instanceof Error ? error : new Error(errorMessage));
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        updateProduct: async (id, updates) => {
          const { setLoading, setError, fetchProducts, filter, pagination } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await productApi.updateProduct(id, updates);
            
            if (response.success && response.data) {
              globalLogger.info('Product updated via BFF', { productId: id, updates });
              // 重新获取商品列表
              await fetchProducts(filter, pagination.current, pagination.pageSize);
            } else {
              throw new Error(response.message || '更新商品失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '更新商品失败';
            setError(errorMessage);
            globalLogger.error('Update product error', error instanceof Error ? error : new Error(errorMessage));
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
            
            const response = await productApi.deleteProduct(id);
            
            if (response.success && response.data) {
              globalLogger.info('Product deleted via BFF', { productId: id });
              // 重新获取商品列表
              await fetchProducts(filter, pagination.current, pagination.pageSize);
            } else {
              throw new Error(response.message || '删除商品失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '删除商品失败';
            setError(errorMessage);
            globalLogger.error('Delete product error', error instanceof Error ? error : new Error(errorMessage));
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        createCategory: async (categoryData) => {
          const { setLoading, setError, fetchCategories } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await categoryApi.createCategory(categoryData);
            
            if (response.success && response.data) {
              globalLogger.info('Category created via BFF', { categoryId: response.data.id, name: response.data.name });
              // 重新获取分类列表
              await fetchCategories();
            } else {
              throw new Error(response.message || '创建分类失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '创建分类失败';
            setError(errorMessage);
            globalLogger.error('Create category error', error instanceof Error ? error : new Error(errorMessage));
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        updateCategory: async (id, updates) => {
          const { setLoading, setError, fetchCategories } = get();
          
          try {
            setLoading(true);
            setError(null);
            
            const response = await categoryApi.updateCategory(id, updates);
            
            if (response.success && response.data) {
              globalLogger.info('Category updated via BFF', { categoryId: id, updates });
              // 重新获取分类列表
              await fetchCategories();
            } else {
              throw new Error(response.message || '更新分类失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '更新分类失败';
            setError(errorMessage);
            globalLogger.error('Update category error', error instanceof Error ? error : new Error(errorMessage));
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
            
            const response = await categoryApi.deleteCategory(id);
            
            if (response.success && response.data) {
              globalLogger.info('Category deleted via BFF', { categoryId: id });
              // 重新获取分类列表
              await fetchCategories();
            } else {
              throw new Error(response.message || '删除分类失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '删除分类失败';
            setError(errorMessage);
            globalLogger.error('Delete category error', error instanceof Error ? error : new Error(errorMessage));
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
            
            const response = await productApi.batchUpdateProducts(ids, updates);
            
            if (response.success && response.data) {
              globalLogger.info('Products batch updated via BFF', { count: ids.length, updates });
              // 重新获取商品列表
              await fetchProducts(filter, pagination.current, pagination.pageSize);
            } else {
              throw new Error(response.message || '批量更新商品失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '批量更新商品失败';
            setError(errorMessage);
            globalLogger.error('Batch update products error', error instanceof Error ? error : new Error(errorMessage));
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
            
            const response = await productApi.batchDeleteProducts(ids);
            
            if (response.success && response.data) {
              globalLogger.info('Products batch deleted via BFF', { count: ids.length });
              // 重新获取商品列表
              await fetchProducts(filter, pagination.current, pagination.pageSize);
            } else {
              throw new Error(response.message || '批量删除商品失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '批量删除商品失败';
            setError(errorMessage);
            globalLogger.error('Batch delete products error', error instanceof Error ? error : new Error(errorMessage));
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
            
            const response = await inventoryApi.updateStock(productId, quantity, type);
            
            if (response.success && response.data) {
              globalLogger.info('Stock updated via BFF', { productId, quantity, type });
              // 重新获取商品列表
              await fetchProducts(filter, pagination.current, pagination.pageSize);
            } else {
              throw new Error(response.message || '更新库存失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '更新库存失败';
            setError(errorMessage);
            globalLogger.error('Update stock error', error instanceof Error ? error : new Error(errorMessage));
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
            
            const response = await inventoryApi.getLowStockProducts(threshold);
            
            if (response.success && response.data) {
              setProducts(response.data);
            } else {
              throw new Error(response.message || '获取低库存商品失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '获取低库存商品失败';
            setError(errorMessage);
            globalLogger.error('Fetch low stock products error', error instanceof Error ? error : new Error(errorMessage));
            throw error;
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
            
            const response = await pricingApi.batchUpdatePrices(updates);
            
            if (response.success && response.data) {
              globalLogger.info('Prices batch updated via BFF', { count: updates.length });
              // 重新获取商品列表
              await fetchProducts(filter, pagination.current, pagination.pageSize);
            } else {
              throw new Error(response.message || '批量更新价格失败');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '批量更新价格失败';
            setError(errorMessage);
            globalLogger.error('Batch update prices error', error instanceof Error ? error : new Error(errorMessage));
            throw error;
          } finally {
            setLoading(false);
          }
        },
        
        // 业务逻辑方法（本地处理）
        searchProducts: (keyword) => {
          set((state) => {
            state.filter.keyword = keyword;
          });
        },
        
        filterProducts: (filter) => {
          const { products } = get();
          let filtered = [...products];
          
          // 关键词搜索
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            filtered = filtered.filter(p => 
              p.name.toLowerCase().includes(keyword) ||
              p.description.toLowerCase().includes(keyword) ||
              p.tags.some(tag => tag.toLowerCase().includes(keyword))
            );
          }
          
          // 分类筛选
          if (filter.category) {
            filtered = filtered.filter(p => p.category === filter.category);
          }
          
          // 状态筛选
          if (filter.status) {
            filtered = filtered.filter(p => p.status === filter.status);
          }
          
          // 价格范围筛选
          if (filter.priceRange) {
            const [min, max] = filter.priceRange;
            filtered = filtered.filter(p => p.price >= min && p.price <= max);
          }
          
          // 标签筛选
          if (filter.tags && filter.tags.length > 0) {
            filtered = filtered.filter(p => 
              filter.tags!.some(tag => p.tags.includes(tag))
            );
          }
          
          // 排序
          if (filter.sortBy) {
            filtered.sort((a, b) => {
              const aValue = a[filter.sortBy!];
              const bValue = b[filter.sortBy!];
              const order = filter.sortOrder === 'desc' ? -1 : 1;
              
              if (typeof aValue === 'string' && typeof bValue === 'string') {
                return aValue.localeCompare(bValue) * order;
              }
              
              return (aValue > bValue ? 1 : -1) * order;
            });
          }
          
          return filtered;
        },
        
        getProductsByCategory: (categoryId) => {
          const { products } = get();
          return products.filter(p => p.category === categoryId);
        },
        
        getProductStats: () => {
          const { products } = get();
          return {
            total: products.length,
            active: products.filter(p => p.status === 'active').length,
            inactive: products.filter(p => p.status === 'inactive').length,
            discontinued: products.filter(p => p.status === 'discontinued').length,
            lowStock: products.filter(p => p.stock < 10).length
          };
        },
        
        // 重置状态
        reset: () => {
          set(initialState);
          globalLogger.info('Product store reset');
        }
      })),
      {
        name: 'product-store-bff',
        partialize: (state) => ({
          products: state.products,
          categories: state.categories,
          filter: state.filter,
          pagination: state.pagination
        })
      }
    ),
    {
      name: 'product-store-bff'
    }
  )
);

// 选择器钩子
export const useProductSelector = <T>(selector: (state: ProductState) => T) => {
  return useProductStore(selector);
};

// 常用选择器
export const productSelectors = {
  products: (state: ProductState) => state.products,
  categories: (state: ProductState) => state.categories,
  selectedProduct: (state: ProductState) => state.selectedProduct,
  loading: (state: ProductState) => state.loading,
  error: (state: ProductState) => state.error,
  filter: (state: ProductState) => state.filter,
  pagination: (state: ProductState) => state.pagination,
  isModalVisible: (state: ProductState) => state.isModalVisible,
  modalMode: (state: ProductState) => state.modalMode,
  formData: (state: ProductState) => state.formData,
  
  // 计算属性选择器
  filteredProducts: (state: ProductState) => state.filterProducts(state.filter),
  productStats: (state: ProductState) => state.getProductStats(),
  activeProducts: (state: ProductState) => state.products.filter(p => p.status === 'active'),
  lowStockProducts: (state: ProductState) => state.products.filter(p => p.stock < 10)
};