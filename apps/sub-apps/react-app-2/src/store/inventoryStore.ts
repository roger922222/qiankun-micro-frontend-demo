/**
 * 库存管理 Zustand Store
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { globalLogger } from '@shared/utils/logger';

// 库存记录接口
export interface InventoryRecord {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjust' | 'transfer';
  quantity: number;
  beforeStock: number;
  afterStock: number;
  reason: string;
  operator: string;
  createdAt: string;
  batchNo?: string;
  supplierId?: string;
  supplierName?: string;
  cost?: number;
  expiryDate?: string;
}

// 库存预警设置
export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  minStock: number;
  maxStock: number;
  isEnabled: boolean;
  alertType: 'low' | 'high' | 'both';
  notifyUsers: string[];
  createdAt: string;
  updatedAt: string;
}

// 库存统计
export interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  turnoverRate: number;
  avgStockDays: number;
}

// 库存筛选条件
export interface InventoryFilter {
  keyword?: string;
  productId?: string;
  type?: InventoryRecord['type'];
  dateRange?: [string, string];
  operator?: string;
  batchNo?: string;
}

// Store状态接口
interface InventoryState {
  // 库存数据
  inventoryRecords: InventoryRecord[];
  inventoryAlerts: InventoryAlert[];
  selectedRecord: InventoryRecord | null;
  
  // UI状态
  loading: boolean;
  error: string | null;
  filter: InventoryFilter;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 表单状态
  isModalVisible: boolean;
  modalMode: 'in' | 'out' | 'adjust' | 'transfer' | 'alert';
  formData: Partial<InventoryRecord | InventoryAlert>;
  
  // Actions
  setInventoryRecords: (records: InventoryRecord[]) => void;
  addInventoryRecord: (record: Omit<InventoryRecord, 'id' | 'createdAt'>) => void;
  updateInventoryRecord: (id: string, updates: Partial<InventoryRecord>) => void;
  deleteInventoryRecord: (id: string) => void;
  setSelectedRecord: (record: InventoryRecord | null) => void;
  
  setInventoryAlerts: (alerts: InventoryAlert[]) => void;
  addInventoryAlert: (alert: Omit<InventoryAlert, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateInventoryAlert: (id: string, updates: Partial<InventoryAlert>) => void;
  deleteInventoryAlert: (id: string) => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilter: (filter: Partial<InventoryFilter>) => void;
  clearFilter: () => void;
  
  setPagination: (pagination: Partial<InventoryState['pagination']>) => void;
  
  showModal: (mode: InventoryState['modalMode'], data?: any) => void;
  hideModal: () => void;
  setFormData: (data: any) => void;
  clearFormData: () => void;
  
  // 业务逻辑方法
  stockIn: (productId: string, quantity: number, reason: string, cost?: number, supplierId?: string) => void;
  stockOut: (productId: string, quantity: number, reason: string) => void;
  stockAdjust: (productId: string, newStock: number, reason: string) => void;
  stockTransfer: (fromProductId: string, toProductId: string, quantity: number, reason: string) => void;
  
  getInventoryStats: () => InventoryStats;
  getProductInventoryHistory: (productId: string) => InventoryRecord[];
  checkLowStockAlerts: () => InventoryAlert[];
  
  // 批量操作
  batchStockIn: (items: Array<{ productId: string; quantity: number; cost?: number }>, reason: string) => void;
  batchStockOut: (items: Array<{ productId: string; quantity: number }>, reason: string) => void;
  
  // 数据重置
  reset: () => void;
}

// 初始状态
const initialState = {
  inventoryRecords: [],
  inventoryAlerts: [],
  selectedRecord: null,
  loading: false,
  error: null,
  filter: {},
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0
  },
  isModalVisible: false,
  modalMode: 'in' as const,
  formData: {}
};

// 创建Store
export const useInventoryStore = create<InventoryState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // 库存记录操作
        setInventoryRecords: (records) => {
          set((state) => {
            state.inventoryRecords = records;
            state.pagination.total = records.length;
          });
          globalLogger.info('Inventory records updated', { count: records.length });
        },
        
        addInventoryRecord: (recordData) => {
          const newRecord: InventoryRecord = {
            ...recordData,
            id: `inventory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString()
          };
          
          set((state) => {
            state.inventoryRecords.unshift(newRecord);
            state.pagination.total = state.inventoryRecords.length;
          });
          
          globalLogger.info('Inventory record added', { recordId: newRecord.id, type: newRecord.type });
        },
        
        updateInventoryRecord: (id, updates) => {
          set((state) => {
            const index = state.inventoryRecords.findIndex(r => r.id === id);
            if (index !== -1) {
              state.inventoryRecords[index] = { ...state.inventoryRecords[index], ...updates };
            }
          });
          
          globalLogger.info('Inventory record updated', { recordId: id, updates });
        },
        
        deleteInventoryRecord: (id) => {
          set((state) => {
            state.inventoryRecords = state.inventoryRecords.filter(r => r.id !== id);
            state.pagination.total = state.inventoryRecords.length;
            if (state.selectedRecord?.id === id) {
              state.selectedRecord = null;
            }
          });
          
          globalLogger.info('Inventory record deleted', { recordId: id });
        },
        
        setSelectedRecord: (record) => {
          set((state) => {
            state.selectedRecord = record;
          });
        },
        
        // 库存预警操作
        setInventoryAlerts: (alerts) => {
          set((state) => {
            state.inventoryAlerts = alerts;
          });
        },
        
        addInventoryAlert: (alertData) => {
          const newAlert: InventoryAlert = {
            ...alertData,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          set((state) => {
            state.inventoryAlerts.push(newAlert);
          });
          
          globalLogger.info('Inventory alert added', { alertId: newAlert.id, productId: newAlert.productId });
        },
        
        updateInventoryAlert: (id, updates) => {
          set((state) => {
            const index = state.inventoryAlerts.findIndex(a => a.id === id);
            if (index !== -1) {
              state.inventoryAlerts[index] = {
                ...state.inventoryAlerts[index],
                ...updates,
                updatedAt: new Date().toISOString()
              };
            }
          });
        },
        
        deleteInventoryAlert: (id) => {
          set((state) => {
            state.inventoryAlerts = state.inventoryAlerts.filter(a => a.id !== id);
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
            globalLogger.error('Inventory store error', new Error(error));
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
        stockIn: (productId, quantity, reason, cost, supplierId) => {
          // 这里需要获取产品信息来更新库存
          // 在实际应用中，这里会调用API
          const { addInventoryRecord } = get();
          
          addInventoryRecord({
            productId,
            productName: `Product ${productId}`, // 实际应用中从产品store获取
            type: 'in',
            quantity,
            beforeStock: 0, // 实际应用中从产品store获取
            afterStock: quantity, // 实际应用中计算
            reason,
            operator: 'current_user',
            cost,
            supplierId
          });
        },
        
        stockOut: (productId, quantity, reason) => {
          const { addInventoryRecord } = get();
          
          addInventoryRecord({
            productId,
            productName: `Product ${productId}`,
            type: 'out',
            quantity,
            beforeStock: 0,
            afterStock: 0,
            reason,
            operator: 'current_user'
          });
        },
        
        stockAdjust: (productId, newStock, reason) => {
          const { addInventoryRecord } = get();
          
          addInventoryRecord({
            productId,
            productName: `Product ${productId}`,
            type: 'adjust',
            quantity: newStock,
            beforeStock: 0,
            afterStock: newStock,
            reason,
            operator: 'current_user'
          });
        },
        
        stockTransfer: (fromProductId, toProductId, quantity, reason) => {
          const { addInventoryRecord } = get();
          
          // 出库记录
          addInventoryRecord({
            productId: fromProductId,
            productName: `Product ${fromProductId}`,
            type: 'transfer',
            quantity: -quantity,
            beforeStock: 0,
            afterStock: 0,
            reason: `转出到 ${toProductId}: ${reason}`,
            operator: 'current_user'
          });
          
          // 入库记录
          addInventoryRecord({
            productId: toProductId,
            productName: `Product ${toProductId}`,
            type: 'transfer',
            quantity: quantity,
            beforeStock: 0,
            afterStock: 0,
            reason: `从 ${fromProductId} 转入: ${reason}`,
            operator: 'current_user'
          });
        },
        
        getInventoryStats: () => {
          const { inventoryRecords } = get();
          
          // 计算统计数据
          const stats: InventoryStats = {
            totalProducts: new Set(inventoryRecords.map(r => r.productId)).size,
            totalValue: inventoryRecords.reduce((sum, r) => sum + (r.cost || 0) * r.quantity, 0),
            lowStockCount: 0, // 需要结合产品数据计算
            outOfStockCount: 0, // 需要结合产品数据计算
            turnoverRate: 0, // 需要更复杂的计算
            avgStockDays: 0 // 需要更复杂的计算
          };
          
          return stats;
        },
        
        getProductInventoryHistory: (productId) => {
          const { inventoryRecords } = get();
          return inventoryRecords
            .filter(r => r.productId === productId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },
        
        checkLowStockAlerts: () => {
          const { inventoryAlerts } = get();
          // 在实际应用中，这里会检查当前库存与预警设置
          return inventoryAlerts.filter(alert => alert.isEnabled);
        },
        
        // 批量操作
        batchStockIn: (items, reason) => {
          const { addInventoryRecord } = get();
          
          items.forEach(item => {
            addInventoryRecord({
              productId: item.productId,
              productName: `Product ${item.productId}`,
              type: 'in',
              quantity: item.quantity,
              beforeStock: 0,
              afterStock: item.quantity,
              reason,
              operator: 'current_user',
              cost: item.cost
            });
          });
          
          globalLogger.info('Batch stock in completed', { count: items.length });
        },
        
        batchStockOut: (items, reason) => {
          const { addInventoryRecord } = get();
          
          items.forEach(item => {
            addInventoryRecord({
              productId: item.productId,
              productName: `Product ${item.productId}`,
              type: 'out',
              quantity: item.quantity,
              beforeStock: 0,
              afterStock: 0,
              reason,
              operator: 'current_user'
            });
          });
          
          globalLogger.info('Batch stock out completed', { count: items.length });
        },
        
        // 重置状态
        reset: () => {
          set(initialState);
          globalLogger.info('Inventory store reset');
        }
      })),
      {
        name: 'inventory-store',
        partialize: (state) => ({
          inventoryRecords: state.inventoryRecords,
          inventoryAlerts: state.inventoryAlerts,
          filter: state.filter,
          pagination: state.pagination
        })
      }
    ),
    {
      name: 'inventory-store'
    }
  )
);

// 选择器
export const inventorySelectors = {
  inventoryRecords: (state: InventoryState) => state.inventoryRecords,
  inventoryAlerts: (state: InventoryState) => state.inventoryAlerts,
  selectedRecord: (state: InventoryState) => state.selectedRecord,
  loading: (state: InventoryState) => state.loading,
  error: (state: InventoryState) => state.error,
  filter: (state: InventoryState) => state.filter,
  pagination: (state: InventoryState) => state.pagination,
  isModalVisible: (state: InventoryState) => state.isModalVisible,
  modalMode: (state: InventoryState) => state.modalMode,
  formData: (state: InventoryState) => state.formData,
  
  // 计算属性选择器
  recentRecords: (state: InventoryState) => state.inventoryRecords.slice(0, 10),
  activeAlerts: (state: InventoryState) => state.inventoryAlerts.filter(a => a.isEnabled),
  recordCount: (state: InventoryState) => state.inventoryRecords.length
};