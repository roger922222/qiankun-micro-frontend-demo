/**
 * 商品管理 Zustand Store
 * 使用Zustand进行状态管理，支持TypeScript类型安全
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { globalLogger } from '@shared/utils/logger';

// 商品接口定义
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

// 商品分类接口
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
}

// 商品筛选条件
export interface ProductFilter {
  keyword?: string;
  category?: string;
  status?: Product['status'];
  priceRange?: [number, number];
  tags?: string[];
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

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
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  setSelectedProduct: (product: Product | null) => void;
  
  setCategories: (categories: ProductCategory[]) => void;
  addCategory: (category: Omit<ProductCategory, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<ProductCategory>) => void;
  deleteCategory: (id: string) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<ProductFilter>) => void;
  clearFilter: () => void;
  
  setPagination: (pagination: Partial<ProductState['pagination']>) => void;
  
  showModal: (mode: ProductState['modalMode'], product?: Product) => void;
  hideModal: () => void;
  setFormData: (data: Partial<Product>) => void;
  clearFormData: () => void;
  
  // 业务逻辑方法
  searchProducts: (keyword: string) => void;
  filterProducts: (filter: ProductFilter) => Product[];
  getProductsByCategory: (categoryId: string) => Product[];
  getProductStats: () => {
    total: number;
    active: number;
    inactive: number;
    discontinued: number;
    lowStock: number;
  };
  
  // 批量操作
  batchUpdateProducts: (ids: string[], updates: Partial<Product>) => void;
  batchDeleteProducts: (ids: string[]) => void;
  
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
        
        // 商品操作
        setProducts: (products) => {
          set((state) => {
            state.products = products;
            state.pagination.total = products.length;
          });
          globalLogger.info('Products updated', { count: products.length });
        },
        
        addProduct: (productData) => {
          const newProduct: Product = {
            ...productData,
            id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'current_user',
            updatedBy: 'current_user'
          };
          
          set((state) => {
            state.products.unshift(newProduct);
            state.pagination.total = state.products.length;
          });
          
          globalLogger.info('Product added', { productId: newProduct.id, name: newProduct.name });
        },
        
        updateProduct: (id, updates) => {
          set((state) => {
            const index = state.products.findIndex(p => p.id === id);
            if (index !== -1) {
              state.products[index] = {
                ...state.products[index],
                ...updates,
                updatedAt: new Date().toISOString(),
                updatedBy: 'current_user'
              };
            }
          });
          
          globalLogger.info('Product updated', { productId: id, updates });
        },
        
        deleteProduct: (id) => {
          set((state) => {
            state.products = state.products.filter(p => p.id !== id);
            state.pagination.total = state.products.length;
            if (state.selectedProduct?.id === id) {
              state.selectedProduct = null;
            }
          });
          
          globalLogger.info('Product deleted', { productId: id });
        },
        
        setSelectedProduct: (product) => {
          set((state) => {
            state.selectedProduct = product;
          });
        },
        
        // 分类操作
        setCategories: (categories) => {
          set((state) => {
            state.categories = categories;
          });
        },
        
        addCategory: (categoryData) => {
          const newCategory: ProductCategory = {
            ...categoryData,
            id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          
          set((state) => {
            state.categories.push(newCategory);
          });
          
          globalLogger.info('Category added', { categoryId: newCategory.id, name: newCategory.name });
        },
        
        updateCategory: (id, updates) => {
          set((state) => {
            const index = state.categories.findIndex(c => c.id === id);
            if (index !== -1) {
              state.categories[index] = { ...state.categories[index], ...updates };
            }
          });
        },
        
        deleteCategory: (id) => {
          set((state) => {
            state.categories = state.categories.filter(c => c.id !== id);
          });
        },
        
        // UI状态管理
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
        
        // 业务逻辑方法
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
        
        // 批量操作
        batchUpdateProducts: (ids, updates) => {
          set((state) => {
            state.products = state.products.map(p => 
              ids.includes(p.id) 
                ? { ...p, ...updates, updatedAt: new Date().toISOString(), updatedBy: 'current_user' }
                : p
            );
          });
          
          globalLogger.info('Products batch updated', { count: ids.length, updates });
        },
        
        batchDeleteProducts: (ids) => {
          set((state) => {
            state.products = state.products.filter(p => !ids.includes(p.id));
            state.pagination.total = state.products.length;
            if (state.selectedProduct && ids.includes(state.selectedProduct.id)) {
              state.selectedProduct = null;
            }
          });
          
          globalLogger.info('Products batch deleted', { count: ids.length });
        },
        
        // 重置状态
        reset: () => {
          set(initialState);
          globalLogger.info('Product store reset');
        }
      })),
      {
        name: 'product-store',
        partialize: (state) => ({
          products: state.products,
          categories: state.categories,
          filter: state.filter,
          pagination: state.pagination
        })
      }
    ),
    {
      name: 'product-store'
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