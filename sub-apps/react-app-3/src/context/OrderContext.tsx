/**
 * 订单管理 Context API
 * 使用React Context API进行状态管理
 */

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { globalLogger } from '../shared-stub';

// 订单接口定义
export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  paymentMethod: 'credit_card' | 'alipay' | 'wechat' | 'bank_transfer';
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: Record<string, string>;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  street: string;
  zipCode: string;
  isDefault: boolean;
}

// 订单筛选条件
export interface OrderFilter {
  keyword?: string;
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
  paymentMethod?: Order['paymentMethod'];
  dateRange?: [string, string];
  amountRange?: [number, number];
  customerId?: string;
}

// State接口
interface OrderState {
  orders: Order[];
  selectedOrder: Order | null;
  loading: boolean;
  error: string | null;
  filter: OrderFilter;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  isModalVisible: boolean;
  modalMode: 'create' | 'edit' | 'view';
  formData: Partial<Order>;
}

// Action类型
type OrderAction =
  | { type: 'SET_ORDERS'; payload: Order[] }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER'; payload: { id: string; updates: Partial<Order> } }
  | { type: 'DELETE_ORDER'; payload: string }
  | { type: 'SET_SELECTED_ORDER'; payload: Order | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTER'; payload: Partial<OrderFilter> }
  | { type: 'CLEAR_FILTER' }
  | { type: 'SET_PAGINATION'; payload: Partial<OrderState['pagination']> }
  | { type: 'SHOW_MODAL'; payload: { mode: OrderState['modalMode']; order?: Order } }
  | { type: 'HIDE_MODAL' }
  | { type: 'SET_FORM_DATA'; payload: Partial<Order> }
  | { type: 'CLEAR_FORM_DATA' }
  | { type: 'RESET' };

// 初始状态
const initialState: OrderState = {
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,
  filter: {},
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0
  },
  isModalVisible: false,
  modalMode: 'create',
  formData: {}
};

// Reducer
function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case 'SET_ORDERS':
      return {
        ...state,
        orders: action.payload,
        pagination: {
          ...state.pagination,
          total: action.payload.length
        }
      };

    case 'ADD_ORDER':
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        pagination: {
          ...state.pagination,
          total: state.orders.length + 1
        }
      };

    case 'UPDATE_ORDER':
      return {
        ...state,
        orders: state.orders.map(order =>
          order.id === action.payload.id
            ? { ...order, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : order
        )
      };

    case 'DELETE_ORDER':
      return {
        ...state,
        orders: state.orders.filter(order => order.id !== action.payload),
        selectedOrder: state.selectedOrder?.id === action.payload ? null : state.selectedOrder,
        pagination: {
          ...state.pagination,
          total: state.orders.length - 1
        }
      };

    case 'SET_SELECTED_ORDER':
      return {
        ...state,
        selectedOrder: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };

    case 'SET_FILTER':
      return {
        ...state,
        filter: { ...state.filter, ...action.payload }
      };

    case 'CLEAR_FILTER':
      return {
        ...state,
        filter: {}
      };

    case 'SET_PAGINATION':
      return {
        ...state,
        pagination: { ...state.pagination, ...action.payload }
      };

    case 'SHOW_MODAL':
      return {
        ...state,
        isModalVisible: true,
        modalMode: action.payload.mode,
        formData: action.payload.order ? { ...action.payload.order } : {}
      };

    case 'HIDE_MODAL':
      return {
        ...state,
        isModalVisible: false,
        formData: {}
      };

    case 'SET_FORM_DATA':
      return {
        ...state,
        formData: { ...state.formData, ...action.payload }
      };

    case 'CLEAR_FORM_DATA':
      return {
        ...state,
        formData: {}
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// Context
const OrderContext = createContext<{
  state: OrderState;
  dispatch: React.Dispatch<OrderAction>;
  actions: {
    setOrders: (orders: Order[]) => void;
    addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateOrder: (id: string, updates: Partial<Order>) => void;
    deleteOrder: (id: string) => void;
    setSelectedOrder: (order: Order | null) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setFilter: (filter: Partial<OrderFilter>) => void;
    clearFilter: () => void;
    setPagination: (pagination: Partial<OrderState['pagination']>) => void;
    showModal: (mode: OrderState['modalMode'], order?: Order) => void;
    hideModal: () => void;
    setFormData: (data: Partial<Order>) => void;
    clearFormData: () => void;
    reset: () => void;
    filterOrders: (filter: OrderFilter) => Order[];
    getOrderStats: () => {
      total: number;
      pending: number;
      confirmed: number;
      processing: number;
      shipped: number;
      delivered: number;
      cancelled: number;
    };
  };
} | null>(null);

// Provider组件
export const OrderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  // Actions
  const actions = {
    setOrders: (orders: Order[]) => {
      dispatch({ type: 'SET_ORDERS', payload: orders });
      globalLogger.info('Orders updated', { count: orders.length });
    },

    addOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newOrder: Order = {
        ...orderData,
        id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      dispatch({ type: 'ADD_ORDER', payload: newOrder });
      globalLogger.info('Order added', { orderId: newOrder.id, orderNumber: newOrder.orderNumber });
    },

    updateOrder: (id: string, updates: Partial<Order>) => {
      dispatch({ type: 'UPDATE_ORDER', payload: { id, updates } });
      globalLogger.info('Order updated', { orderId: id, updates });
    },

    deleteOrder: (id: string) => {
      dispatch({ type: 'DELETE_ORDER', payload: id });
      globalLogger.info('Order deleted', { orderId: id });
    },

    setSelectedOrder: (order: Order | null) => {
      dispatch({ type: 'SET_SELECTED_ORDER', payload: order });
    },

    setLoading: (loading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: loading });
    },

    setError: (error: string | null) => {
      dispatch({ type: 'SET_ERROR', payload: error });
      if (error) {
        globalLogger.error('Order context error', new Error(error));
      }
    },

    setFilter: (filter: Partial<OrderFilter>) => {
      dispatch({ type: 'SET_FILTER', payload: filter });
    },

    clearFilter: () => {
      dispatch({ type: 'CLEAR_FILTER' });
    },

    setPagination: (pagination: Partial<OrderState['pagination']>) => {
      dispatch({ type: 'SET_PAGINATION', payload: pagination });
    },

    showModal: (mode: OrderState['modalMode'], order?: Order) => {
      dispatch({ type: 'SHOW_MODAL', payload: { mode, order } });
    },

    hideModal: () => {
      dispatch({ type: 'HIDE_MODAL' });
    },

    setFormData: (data: Partial<Order>) => {
      dispatch({ type: 'SET_FORM_DATA', payload: data });
    },

    clearFormData: () => {
      dispatch({ type: 'CLEAR_FORM_DATA' });
    },

    reset: () => {
      dispatch({ type: 'RESET' });
      globalLogger.info('Order context reset');
    },

    filterOrders: (filter: OrderFilter): Order[] => {
      let filtered = [...state.orders];

      // 关键词搜索
      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase();
        filtered = filtered.filter(order =>
          order.orderNumber.toLowerCase().includes(keyword) ||
          order.customerName.toLowerCase().includes(keyword) ||
          order.customerEmail.toLowerCase().includes(keyword)
        );
      }

      // 状态筛选
      if (filter.status) {
        filtered = filtered.filter(order => order.status === filter.status);
      }

      // 支付状态筛选
      if (filter.paymentStatus) {
        filtered = filtered.filter(order => order.paymentStatus === filter.paymentStatus);
      }

      // 支付方式筛选
      if (filter.paymentMethod) {
        filtered = filtered.filter(order => order.paymentMethod === filter.paymentMethod);
      }

      // 日期范围筛选
      if (filter.dateRange) {
        const [startDate, endDate] = filter.dateRange;
        filtered = filtered.filter(order =>
          order.createdAt >= startDate && order.createdAt <= endDate
        );
      }

      // 金额范围筛选
      if (filter.amountRange) {
        const [minAmount, maxAmount] = filter.amountRange;
        filtered = filtered.filter(order =>
          order.totalAmount >= minAmount && order.totalAmount <= maxAmount
        );
      }

      // 客户筛选
      if (filter.customerId) {
        filtered = filtered.filter(order => order.customerId === filter.customerId);
      }

      return filtered;
    },

    getOrderStats: () => {
      const orders = state.orders;
      return {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length
      };
    }
  };

  return (
    <OrderContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </OrderContext.Provider>
  );
};

// Hook
export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrderContext must be used within an OrderProvider');
  }
  return context;
};