/**
 * 供应商管理 Zustand Store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { globalLogger } from '@shared/utils/logger';

// 供应商接口定义
export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  status: 'active' | 'inactive' | 'suspended';
  category: string;
  paymentTerms: string;
  creditLimit: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// 供应商筛选条件
export interface SupplierFilter {
  keyword?: string;
  status?: Supplier['status'];
  category?: string;
  rating?: number;
}

// Store状态接口
interface SupplierState {
  // 供应商数据
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  
  // UI状态
  loading: boolean;
  error: string | null;
  filter: SupplierFilter;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 表单状态
  isModalVisible: boolean;
  modalMode: 'create' | 'edit' | 'view';
  formData: Partial<Supplier>;
  
  // Actions
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  setSelectedSupplier: (supplier: Supplier | null) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<SupplierFilter>) => void;
  clearFilter: () => void;
  
  setPagination: (pagination: Partial<SupplierState['pagination']>) => void;
  
  showModal: (mode: SupplierState['modalMode'], supplier?: Supplier) => void;
  hideModal: () => void;
  setFormData: (data: Partial<Supplier>) => void;
  clearFormData: () => void;
  
  // 业务逻辑方法
  searchSuppliers: (keyword: string) => void;
  filterSuppliers: (filter: SupplierFilter) => Supplier[];
  getSupplierStats: () => {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    avgRating: number;
  };
  
  // 批量操作
  batchUpdateSuppliers: (ids: string[], updates: Partial<Supplier>) => void;
  batchDeleteSuppliers: (ids: string[]) => void;
  
  // 数据重置
  reset: () => void;
}

// 初始状态
const initialState = {
  suppliers: [],
  selectedSupplier: null,
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
export const useSupplierStore = create<SupplierState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // 供应商操作
        setSuppliers: (suppliers) => {
          set((state) => {
            state.suppliers = suppliers;
            state.pagination.total = suppliers.length;
          });
          globalLogger.info('Suppliers updated', { count: suppliers.length });
        },
        
        addSupplier: (supplierData) => {
          const newSupplier: Supplier = {
            ...supplierData,
            id: `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'current_user',
            updatedBy: 'current_user'
          };
          
          set((state) => {
            state.suppliers.unshift(newSupplier);
            state.pagination.total = state.suppliers.length;
          });
          
          globalLogger.info('Supplier added', { supplierId: newSupplier.id, name: newSupplier.name });
        },
        
        updateSupplier: (id, updates) => {
          set((state) => {
            const index = state.suppliers.findIndex(s => s.id === id);
            if (index !== -1) {
              state.suppliers[index] = {
                ...state.suppliers[index],
                ...updates,
                updatedAt: new Date().toISOString(),
                updatedBy: 'current_user'
              };
            }
          });
          
          globalLogger.info('Supplier updated', { supplierId: id, updates });
        },
        
        deleteSupplier: (id) => {
          set((state) => {
            state.suppliers = state.suppliers.filter(s => s.id !== id);
            state.pagination.total = state.suppliers.length;
            if (state.selectedSupplier?.id === id) {
              state.selectedSupplier = null;
            }
          });
          
          globalLogger.info('Supplier deleted', { supplierId: id });
        },
        
        setSelectedSupplier: (supplier) => {
          set((state) => {
            state.selectedSupplier = supplier;
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
            globalLogger.error('Supplier store error', new Error(error));
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
        showModal: (mode, supplier) => {
          set((state) => {
            state.isModalVisible = true;
            state.modalMode = mode;
            state.formData = supplier ? { ...supplier } : {};
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
        searchSuppliers: (keyword) => {
          set((state) => {
            state.filter.keyword = keyword;
          });
        },
        
        filterSuppliers: (filter) => {
          const { suppliers } = get();
          let filtered = [...suppliers];
          
          // 关键词搜索
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            filtered = filtered.filter(s => 
              s.name.toLowerCase().includes(keyword) ||
              s.code.toLowerCase().includes(keyword) ||
              s.contactPerson.toLowerCase().includes(keyword) ||
              s.email.toLowerCase().includes(keyword)
            );
          }
          
          // 状态筛选
          if (filter.status) {
            filtered = filtered.filter(s => s.status === filter.status);
          }
          
          // 分类筛选
          if (filter.category) {
            filtered = filtered.filter(s => s.category === filter.category);
          }
          
          // 评级筛选
          if (filter.rating !== undefined) {
            filtered = filtered.filter(s => s.rating >= filter.rating!);
          }
          
          return filtered;
        },
        
        getSupplierStats: () => {
          const { suppliers } = get();
          const totalRating = suppliers.reduce((sum, s) => sum + s.rating, 0);
          
          return {
            total: suppliers.length,
            active: suppliers.filter(s => s.status === 'active').length,
            inactive: suppliers.filter(s => s.status === 'inactive').length,
            suspended: suppliers.filter(s => s.status === 'suspended').length,
            avgRating: suppliers.length > 0 ? totalRating / suppliers.length : 0
          };
        },
        
        // 批量操作
        batchUpdateSuppliers: (ids, updates) => {
          set((state) => {
            state.suppliers = state.suppliers.map(s => 
              ids.includes(s.id) 
                ? { ...s, ...updates, updatedAt: new Date().toISOString(), updatedBy: 'current_user' }
                : s
            );
          });
          
          globalLogger.info('Suppliers batch updated', { count: ids.length, updates });
        },
        
        batchDeleteSuppliers: (ids) => {
          set((state) => {
            state.suppliers = state.suppliers.filter(s => !ids.includes(s.id));
            state.pagination.total = state.suppliers.length;
            if (state.selectedSupplier && ids.includes(state.selectedSupplier.id)) {
              state.selectedSupplier = null;
            }
          });
          
          globalLogger.info('Suppliers batch deleted', { count: ids.length });
        },
        
        // 重置状态
        reset: () => {
          set(initialState);
          globalLogger.info('Supplier store reset');
        }
      })),
      {
        name: 'supplier-store',
        partialize: (state) => ({
          suppliers: state.suppliers,
          filter: state.filter,
          pagination: state.pagination
        })
      }
    ),
    {
      name: 'supplier-store'
    }
  )
);

// 选择器
export const supplierSelectors = {
  suppliers: (state: SupplierState) => state.suppliers,
  selectedSupplier: (state: SupplierState) => state.selectedSupplier,
  loading: (state: SupplierState) => state.loading,
  error: (state: SupplierState) => state.error,
  filter: (state: SupplierState) => state.filter,
  pagination: (state: SupplierState) => state.pagination,
  isModalVisible: (state: SupplierState) => state.isModalVisible,
  modalMode: (state: SupplierState) => state.modalMode,
  formData: (state: SupplierState) => state.formData,
  
  // 计算属性选择器
  activeSuppliers: (state: SupplierState) => state.suppliers.filter(s => s.status === 'active'),
  supplierStats: (state: SupplierState) => state.getSupplierStats(),
  supplierCount: (state: SupplierState) => state.suppliers.length
};