/**
 * 商品分类管理 Zustand Store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { globalLogger } from '@shared/utils/logger';

// 商品分类接口
export interface Category {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// 分类筛选条件
export interface CategoryFilter {
  keyword?: string;
  level?: number;
  isActive?: boolean;
  parentId?: string;
}

// Store状态接口
interface CategoryState {
  // 分类数据
  categories: Category[];
  selectedCategory: Category | null;
  treeData: Category[];
  
  // UI状态
  loading: boolean;
  error: string | null;
  filter: CategoryFilter;
  
  // 表单状态
  isModalVisible: boolean;
  modalMode: 'create' | 'edit' | 'view';
  formData: Partial<Category>;
  
  // Actions
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'children'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  setSelectedCategory: (category: Category | null) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<CategoryFilter>) => void;
  clearFilter: () => void;
  
  showModal: (mode: CategoryState['modalMode'], category?: Category) => void;
  hideModal: () => void;
  setFormData: (data: Partial<Category>) => void;
  clearFormData: () => void;
  
  // 业务逻辑方法
  buildTreeData: () => void;
  getCategoryPath: (categoryId: string) => Category[];
  getChildCategories: (parentId: string) => Category[];
  updateCategoryOrder: (categoryId: string, newOrder: number) => void;
  toggleCategoryStatus: (categoryId: string) => void;
  
  // 批量操作
  batchUpdateCategories: (ids: string[], updates: Partial<Category>) => void;
  batchDeleteCategories: (ids: string[]) => void;
  
  // 数据重置
  reset: () => void;
}

// 初始状态
const initialState = {
  categories: [],
  selectedCategory: null,
  treeData: [],
  loading: false,
  error: null,
  filter: {},
  isModalVisible: false,
  modalMode: 'create' as const,
  formData: {}
};

// 创建Store
export const useCategoryStore = create<CategoryState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // 分类操作
        setCategories: (categories) => {
          set((state) => {
            state.categories = categories;
          });
          get().buildTreeData();
          globalLogger.info('Categories updated', { count: categories.length });
        },
        
        addCategory: (categoryData) => {
          const newCategory: Category = {
            ...categoryData,
            id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'current_user',
            updatedBy: 'current_user'
          };
          
          set((state) => {
            state.categories.push(newCategory);
          });
          
          get().buildTreeData();
          globalLogger.info('Category added', { categoryId: newCategory.id, name: newCategory.name });
        },
        
        updateCategory: (id, updates) => {
          set((state) => {
            const index = state.categories.findIndex(c => c.id === id);
            if (index !== -1) {
              state.categories[index] = {
                ...state.categories[index],
                ...updates,
                updatedAt: new Date().toISOString(),
                updatedBy: 'current_user'
              };
            }
          });
          
          get().buildTreeData();
          globalLogger.info('Category updated', { categoryId: id, updates });
        },
        
        deleteCategory: (id) => {
          const { categories } = get();
          const hasChildren = categories.some(c => c.parentId === id);
          
          if (hasChildren) {
            set((state) => {
              state.error = '该分类下还有子分类，无法删除';
            });
            return;
          }
          
          set((state) => {
            state.categories = state.categories.filter(c => c.id !== id);
            if (state.selectedCategory?.id === id) {
              state.selectedCategory = null;
            }
          });
          
          get().buildTreeData();
          globalLogger.info('Category deleted', { categoryId: id });
        },
        
        setSelectedCategory: (category) => {
          set((state) => {
            state.selectedCategory = category;
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
            globalLogger.error('Category store error', new Error(error));
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
        
        // 模态框管理
        showModal: (mode, category) => {
          set((state) => {
            state.isModalVisible = true;
            state.modalMode = mode;
            state.formData = category ? { ...category } : {};
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
        buildTreeData: () => {
          const { categories } = get();
          
          // 构建树形结构
          const buildTree = (parentId?: string): Category[] => {
            return categories
              .filter(cat => cat.parentId === parentId)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map(cat => ({
                ...cat,
                children: buildTree(cat.id)
              }));
          };
          
          const treeData = buildTree();
          
          set((state) => {
            state.treeData = treeData;
          });
        },
        
        getCategoryPath: (categoryId) => {
          const { categories } = get();
          const path: Category[] = [];
          
          const findPath = (id: string): boolean => {
            const category = categories.find(c => c.id === id);
            if (!category) return false;
            
            path.unshift(category);
            if (category.parentId) {
              return findPath(category.parentId);
            }
            return true;
          };
          
          findPath(categoryId);
          return path;
        },
        
        getChildCategories: (parentId) => {
          const { categories } = get();
          return categories.filter(c => c.parentId === parentId);
        },
        
        updateCategoryOrder: (categoryId, newOrder) => {
          set((state) => {
            const category = state.categories.find(c => c.id === categoryId);
            if (category) {
              category.sortOrder = newOrder;
              category.updatedAt = new Date().toISOString();
              category.updatedBy = 'current_user';
            }
          });
          
          get().buildTreeData();
        },
        
        toggleCategoryStatus: (categoryId) => {
          set((state) => {
            const category = state.categories.find(c => c.id === categoryId);
            if (category) {
              category.isActive = !category.isActive;
              category.updatedAt = new Date().toISOString();
              category.updatedBy = 'current_user';
            }
          });
        },
        
        // 批量操作
        batchUpdateCategories: (ids, updates) => {
          set((state) => {
            state.categories = state.categories.map(c => 
              ids.includes(c.id) 
                ? { ...c, ...updates, updatedAt: new Date().toISOString(), updatedBy: 'current_user' }
                : c
            );
          });
          
          get().buildTreeData();
          globalLogger.info('Categories batch updated', { count: ids.length, updates });
        },
        
        batchDeleteCategories: (ids) => {
          set((state) => {
            state.categories = state.categories.filter(c => !ids.includes(c.id));
            if (state.selectedCategory && ids.includes(state.selectedCategory.id)) {
              state.selectedCategory = null;
            }
          });
          
          get().buildTreeData();
          globalLogger.info('Categories batch deleted', { count: ids.length });
        },
        
        // 重置状态
        reset: () => {
          set(initialState);
          globalLogger.info('Category store reset');
        }
      })),
      {
        name: 'category-store',
        partialize: (state) => ({
          categories: state.categories,
          filter: state.filter
        })
      }
    ),
    {
      name: 'category-store'
    }
  )
);

// 选择器
export const categorySelectors = {
  categories: (state: CategoryState) => state.categories,
  selectedCategory: (state: CategoryState) => state.selectedCategory,
  treeData: (state: CategoryState) => state.treeData,
  loading: (state: CategoryState) => state.loading,
  error: (state: CategoryState) => state.error,
  filter: (state: CategoryState) => state.filter,
  isModalVisible: (state: CategoryState) => state.isModalVisible,
  modalMode: (state: CategoryState) => state.modalMode,
  formData: (state: CategoryState) => state.formData,
  
  // 计算属性选择器
  activeCategories: (state: CategoryState) => state.categories.filter(c => c.isActive),
  rootCategories: (state: CategoryState) => state.categories.filter(c => !c.parentId),
  categoryCount: (state: CategoryState) => state.categories.length
};