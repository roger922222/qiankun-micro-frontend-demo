/**
 * 价格策略管理 Zustand Store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { globalLogger } from '@shared/utils/logger';

// 价格策略接口
export interface PricingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'fixed' | 'percentage' | 'tiered' | 'dynamic';
  isActive: boolean;
  priority: number;
  
  // 策略规则
  rules: PricingRule[];
  
  // 适用条件
  conditions: {
    productIds?: string[];
    categoryIds?: string[];
    customerGroups?: string[];
    minQuantity?: number;
    maxQuantity?: number;
    startDate?: string;
    endDate?: string;
  };
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// 价格规则接口
export interface PricingRule {
  id: string;
  type: 'discount' | 'markup' | 'fixed_price';
  value: number; // 折扣百分比、加价百分比或固定价格
  minQuantity?: number;
  maxQuantity?: number;
  condition?: string;
}

// 价格历史记录
export interface PriceHistory {
  id: string;
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changeType: 'manual' | 'strategy' | 'promotion' | 'bulk';
  reason: string;
  operator: string;
  strategyId?: string;
  strategyName?: string;
  createdAt: string;
}

// 促销价格
export interface PromotionPrice {
  id: string;
  productId: string;
  productName: string;
  originalPrice: number;
  promotionPrice: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// 价格筛选条件
export interface PricingFilter {
  keyword?: string;
  type?: PricingStrategy['type'];
  isActive?: boolean;
  productId?: string;
  categoryId?: string;
  dateRange?: [string, string];
}

// Store状态接口
interface PricingState {
  // 价格数据
  pricingStrategies: PricingStrategy[];
  priceHistories: PriceHistory[];
  promotionPrices: PromotionPrice[];
  selectedStrategy: PricingStrategy | null;
  
  // UI状态
  loading: boolean;
  error: string | null;
  filter: PricingFilter;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 表单状态
  isModalVisible: boolean;
  modalMode: 'create' | 'edit' | 'view' | 'promotion';
  formData: Partial<PricingStrategy | PromotionPrice>;
  
  // Actions
  setPricingStrategies: (strategies: PricingStrategy[]) => void;
  addPricingStrategy: (strategy: Omit<PricingStrategy, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePricingStrategy: (id: string, updates: Partial<PricingStrategy>) => void;
  deletePricingStrategy: (id: string) => void;
  setSelectedStrategy: (strategy: PricingStrategy | null) => void;
  
  setPriceHistories: (histories: PriceHistory[]) => void;
  addPriceHistory: (history: Omit<PriceHistory, 'id' | 'createdAt'>) => void;
  
  setPromotionPrices: (promotions: PromotionPrice[]) => void;
  addPromotionPrice: (promotion: Omit<PromotionPrice, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePromotionPrice: (id: string, updates: Partial<PromotionPrice>) => void;
  deletePromotionPrice: (id: string) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<PricingFilter>) => void;
  clearFilter: () => void;
  
  setPagination: (pagination: Partial<PricingState['pagination']>) => void;
  
  showModal: (mode: PricingState['modalMode'], data?: any) => void;
  hideModal: () => void;
  setFormData: (data: any) => void;
  clearFormData: () => void;
  
  // 业务逻辑方法
  calculatePrice: (productId: string, basePrice: number, quantity?: number, customerGroup?: string) => number;
  applyPricingStrategy: (strategyId: string, productIds: string[]) => void;
  batchUpdatePrices: (updates: Array<{ productId: string; newPrice: number; reason: string }>) => void;
  getProductPriceHistory: (productId: string) => PriceHistory[];
  getActivePromotions: () => PromotionPrice[];
  toggleStrategyStatus: (strategyId: string) => void;
  
  // 批量操作
  batchCreatePromotions: (promotions: Array<Omit<PromotionPrice, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  batchDeleteStrategies: (ids: string[]) => void;
  
  // 数据重置
  reset: () => void;
}

// 初始状态
const initialState = {
  pricingStrategies: [],
  priceHistories: [],
  promotionPrices: [],
  selectedStrategy: null,
  loading: false,
  error: null,
  filter: {},
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0
  },
  isModalVisible: false,
  modalMode: 'create' as const,
  formData: {}
};

// 创建Store
export const usePricingStore = create<PricingState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // 价格策略操作
        setPricingStrategies: (strategies) => {
          set((state) => {
            state.pricingStrategies = strategies;
            state.pagination.total = strategies.length;
          });
          globalLogger.info('Pricing strategies updated', { count: strategies.length });
        },
        
        addPricingStrategy: (strategyData) => {
          const newStrategy: PricingStrategy = {
            ...strategyData,
            id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'current_user',
            updatedBy: 'current_user'
          };
          
          set((state) => {
            state.pricingStrategies.unshift(newStrategy);
            state.pagination.total = state.pricingStrategies.length;
          });
          
          globalLogger.info('Pricing strategy added', { strategyId: newStrategy.id, name: newStrategy.name });
        },
        
        updatePricingStrategy: (id, updates) => {
          set((state) => {
            const index = state.pricingStrategies.findIndex(s => s.id === id);
            if (index !== -1) {
              state.pricingStrategies[index] = {
                ...state.pricingStrategies[index],
                ...updates,
                updatedAt: new Date().toISOString(),
                updatedBy: 'current_user'
              };
            }
          });
          
          globalLogger.info('Pricing strategy updated', { strategyId: id, updates });
        },
        
        deletePricingStrategy: (id) => {
          set((state) => {
            state.pricingStrategies = state.pricingStrategies.filter(s => s.id !== id);
            state.pagination.total = state.pricingStrategies.length;
            if (state.selectedStrategy?.id === id) {
              state.selectedStrategy = null;
            }
          });
          
          globalLogger.info('Pricing strategy deleted', { strategyId: id });
        },
        
        setSelectedStrategy: (strategy) => {
          set((state) => {
            state.selectedStrategy = strategy;
          });
        },
        
        // 价格历史操作
        setPriceHistories: (histories) => {
          set((state) => {
            state.priceHistories = histories;
          });
        },
        
        addPriceHistory: (historyData) => {
          const newHistory: PriceHistory = {
            ...historyData,
            id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
          };
          
          set((state) => {
            state.priceHistories.unshift(newHistory);
          });
          
          globalLogger.info('Price history added', { historyId: newHistory.id, productId: newHistory.productId });
        },
        
        // 促销价格操作
        setPromotionPrices: (promotions) => {
          set((state) => {
            state.promotionPrices = promotions;
          });
        },
        
        addPromotionPrice: (promotionData) => {
          const newPromotion: PromotionPrice = {
            ...promotionData,
            id: `promotion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set((state) => {
            state.promotionPrices.unshift(newPromotion);
          });
          
          globalLogger.info('Promotion price added', { promotionId: newPromotion.id, productId: newPromotion.productId });
        },
        
        updatePromotionPrice: (id, updates) => {
          set((state) => {
            const index = state.promotionPrices.findIndex(p => p.id === id);
            if (index !== -1) {
              state.promotionPrices[index] = {
                ...state.promotionPrices[index],
                ...updates,
                updatedAt: new Date().toISOString()
              };
            }
          });
        },
        
        deletePromotionPrice: (id) => {
          set((state) => {
            state.promotionPrices = state.promotionPrices.filter(p => p.id !== id);
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
            globalLogger.error('Pricing store error', new Error(error));
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
        showModal: (mode, data) => {
          set((state) => {
            state.isModalVisible = true;
            state.modalMode = mode;
            state.formData = data || {};
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
        calculatePrice: (productId, basePrice, quantity = 1, customerGroup) => {
          const { pricingStrategies, promotionPrices } = get();
          
          let finalPrice = basePrice;
          
          // 检查促销价格
          const activePromotion = promotionPrices.find(p => 
            p.productId === productId && 
            p.isActive &&
            new Date() >= new Date(p.startDate) &&
            new Date() <= new Date(p.endDate)
          );
          
          if (activePromotion) {
            finalPrice = activePromotion.promotionPrice;
          }
          
          // 应用价格策略
          const applicableStrategies = pricingStrategies
            .filter(s => s.isActive)
            .filter(s => {
              const conditions = s.conditions;
              
              // 检查产品条件
              if (conditions.productIds && !conditions.productIds.includes(productId)) {
                return false;
              }
              
              // 检查数量条件
              if (conditions.minQuantity && quantity < conditions.minQuantity) {
                return false;
              }
              
              if (conditions.maxQuantity && quantity > conditions.maxQuantity) {
                return false;
              }
              
              // 检查客户组条件
              if (conditions.customerGroups && customerGroup && !conditions.customerGroups.includes(customerGroup)) {
                return false;
              }
              
              // 检查时间条件
              const now = new Date();
              if (conditions.startDate && now < new Date(conditions.startDate)) {
                return false;
              }
              
              if (conditions.endDate && now > new Date(conditions.endDate)) {
                return false;
              }
              
              return true;
            })
            .sort((a, b) => b.priority - a.priority); // 按优先级排序
          
          // 应用第一个匹配的策略
          if (applicableStrategies.length > 0) {
            const strategy = applicableStrategies[0];
            const rule = strategy.rules.find(r => 
              (!r.minQuantity || quantity >= r.minQuantity) &&
              (!r.maxQuantity || quantity <= r.maxQuantity)
            );
            
            if (rule) {
              switch (rule.type) {
                case 'discount':
                  finalPrice = finalPrice * (1 - rule.value / 100);
                  break;
                case 'markup':
                  finalPrice = finalPrice * (1 + rule.value / 100);
                  break;
                case 'fixed_price':
                  finalPrice = rule.value;
                  break;
              }
            }
          }
          
          return Math.round(finalPrice * 100) / 100; // 保留两位小数
        },
        
        applyPricingStrategy: (strategyId, productIds) => {
          const { pricingStrategies, addPriceHistory } = get();
          const strategy = pricingStrategies.find(s => s.id === strategyId);
          
          if (!strategy) {
            set((state) => {
              state.error = '价格策略不存在';
            });
            return;
          }
          
          // 这里需要获取产品信息并应用策略
          // 在实际应用中，这里会调用API更新产品价格
          productIds.forEach(productId => {
            addPriceHistory({
              productId,
              productName: `Product ${productId}`,
              oldPrice: 0, // 从产品store获取
              newPrice: 0, // 计算新价格
              changeType: 'strategy',
              reason: `应用价格策略: ${strategy.name}`,
              operator: 'current_user',
              strategyId: strategy.id,
              strategyName: strategy.name
            });
          });
          
          globalLogger.info('Pricing strategy applied', { strategyId, productCount: productIds.length });
        },
        
        batchUpdatePrices: (updates) => {
          const { addPriceHistory } = get();
          
          updates.forEach(update => {
            addPriceHistory({
              productId: update.productId,
              productName: `Product ${update.productId}`,
              oldPrice: 0, // 从产品store获取
              newPrice: update.newPrice,
              changeType: 'bulk',
              reason: update.reason,
              operator: 'current_user'
            });
          });
          
          globalLogger.info('Batch price update completed', { count: updates.length });
        },
        
        getProductPriceHistory: (productId) => {
          const { priceHistories } = get();
          return priceHistories
            .filter(h => h.productId === productId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        
        getActivePromotions: () => {
          const { promotionPrices } = get();
          const now = new Date();
          
          return promotionPrices.filter(p => 
            p.isActive &&
            now >= new Date(p.startDate) &&
            now <= new Date(p.endDate)
          );
        },
        
        toggleStrategyStatus: (strategyId) => {
          set((state) => {
            const strategy = state.pricingStrategies.find(s => s.id === strategyId);
            if (strategy) {
              strategy.isActive = !strategy.isActive;
              strategy.updatedAt = new Date().toISOString();
              strategy.updatedBy = 'current_user';
            }
          });
        },
        
        // 批量操作
        batchCreatePromotions: (promotions) => {
          const { addPromotionPrice } = get();
          
          promotions.forEach(promotion => {
            addPromotionPrice(promotion);
          });
          
          globalLogger.info('Batch promotions created', { count: promotions.length });
        },
        
        batchDeleteStrategies: (ids) => {
          set((state) => {
            state.pricingStrategies = state.pricingStrategies.filter(s => !ids.includes(s.id));
            state.pagination.total = state.pricingStrategies.length;
            if (state.selectedStrategy && ids.includes(state.selectedStrategy.id)) {
              state.selectedStrategy = null;
            }
          });
          
          globalLogger.info('Pricing strategies batch deleted', { count: ids.length });
        },
        
        // 重置状态
        reset: () => {
          set(initialState);
          globalLogger.info('Pricing store reset');
        }
      })),
      {
        name: 'pricing-store',
        partialize: (state) => ({
          pricingStrategies: state.pricingStrategies,
          priceHistories: state.priceHistories,
          promotionPrices: state.promotionPrices,
          filter: state.filter,
          pagination: state.pagination
        })
      }
    ),
    {
      name: 'pricing-store'
    }
  )
);

// 选择器
export const pricingSelectors = {
  pricingStrategies: (state: PricingState) => state.pricingStrategies,
  priceHistories: (state: PricingState) => state.priceHistories,
  promotionPrices: (state: PricingState) => state.promotionPrices,
  selectedStrategy: (state: PricingState) => state.selectedStrategy,
  loading: (state: PricingState) => state.loading,
  error: (state: PricingState) => state.error,
  filter: (state: PricingState) => state.filter,
  pagination: (state: PricingState) => state.pagination,
  isModalVisible: (state: PricingState) => state.isModalVisible,
  modalMode: (state: PricingState) => state.modalMode,
  formData: (state: PricingState) => state.formData,
  
  // 计算属性选择器
  activeStrategies: (state: PricingState) => state.pricingStrategies.filter(s => s.isActive),
  activePromotions: (state: PricingState) => state.getActivePromotions(),
  recentPriceChanges: (state: PricingState) => state.priceHistories.slice(0, 10),
  strategyCount: (state: PricingState) => state.pricingStrategies.length
};