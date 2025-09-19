/**
 * 用户状态管理Slice
 * 管理用户相关的状态
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserStatus } from '@shared/types';

// 用户状态接口
interface UserState {
  users: User[];
  currentUser: User | null;
  selectedUsers: string[];
  filters: {
    keyword: string;
    status: UserStatus | 'all';
    role: string;
    dateRange: [string, string] | null;
  };
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  loading: boolean;
  error: string | null;
}

// 初始状态
const initialState: UserState = {
  users: [],
  currentUser: null,
  selectedUsers: [],
  filters: {
    keyword: '',
    status: 'all',
    role: '',
    dateRange: null
  },
  pagination: {
    current: 1,
    pageSize: 20,
    total: 0
  },
  loading: false,
  error: null
};

// 创建slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<User[]>) => {
      state.users = action.payload;
    },
    
    addUser: (state, action: PayloadAction<User>) => {
      state.users.unshift(action.payload);
      state.pagination.total += 1;
    },
    
    updateUser: (state, action: PayloadAction<User>) => {
      const index = state.users.findIndex(user => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = action.payload;
      }
      if (state.currentUser?.id === action.payload.id) {
        state.currentUser = action.payload;
      }
    },
    
    removeUser: (state, action: PayloadAction<string>) => {
      state.users = state.users.filter(user => user.id !== action.payload);
      state.selectedUsers = state.selectedUsers.filter(id => id !== action.payload);
      state.pagination.total -= 1;
      if (state.currentUser?.id === action.payload) {
        state.currentUser = null;
      }
    },
    
    removeUsers: (state, action: PayloadAction<string[]>) => {
      state.users = state.users.filter(user => !action.payload.includes(user.id));
      state.selectedUsers = state.selectedUsers.filter(id => !action.payload.includes(id));
      state.pagination.total -= action.payload.length;
      if (state.currentUser && action.payload.includes(state.currentUser.id)) {
        state.currentUser = null;
      }
    },
    
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
    },
    
    setSelectedUsers: (state, action: PayloadAction<string[]>) => {
      state.selectedUsers = action.payload;
    },
    
    toggleUserSelection: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      const index = state.selectedUsers.indexOf(userId);
      if (index === -1) {
        state.selectedUsers.push(userId);
      } else {
        state.selectedUsers.splice(index, 1);
      }
    },
    
    selectAllUsers: (state) => {
      state.selectedUsers = state.users.map(user => user.id);
    },
    
    clearSelection: (state) => {
      state.selectedUsers = [];
    },
    
    setFilters: (state, action: PayloadAction<Partial<UserState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // 重置分页
      state.pagination.current = 1;
    },
    
    setPagination: (state, action: PayloadAction<Partial<UserState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    resetState: (state) => {
      Object.assign(state, initialState);
    }
  }
});

// 导出actions
export const {
  setUsers,
  addUser,
  updateUser,
  removeUser,
  removeUsers,
  setCurrentUser,
  setSelectedUsers,
  toggleUserSelection,
  selectAllUsers,
  clearSelection,
  setFilters,
  setPagination,
  setLoading,
  setError,
  clearError,
  resetState
} = userSlice.actions;

// 导出reducer
export default userSlice.reducer;

// 导出selectors
export const selectUsers = (state: { user: UserState }) => state.user.users;
export const selectCurrentUser = (state: { user: UserState }) => state.user.currentUser;
export const selectSelectedUsers = (state: { user: UserState }) => state.user.selectedUsers;
export const selectUserFilters = (state: { user: UserState }) => state.user.filters;
export const selectUserPagination = (state: { user: UserState }) => state.user.pagination;
export const selectUserLoading = (state: { user: UserState }) => state.user.loading;
export const selectUserError = (state: { user: UserState }) => state.user.error;

// 复合selectors
export const selectFilteredUsers = (state: { user: UserState }) => {
  const { users, filters } = state.user;
  return users.filter(user => {
    // 关键词过滤
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      if (!user.username.toLowerCase().includes(keyword) &&
          !user.email.toLowerCase().includes(keyword) &&
          !(user.nickname?.toLowerCase().includes(keyword))) {
        return false;
      }
    }
    
    // 状态过滤
    if (filters.status !== 'all' && user.status !== filters.status) {
      return false;
    }
    
    // 角色过滤
    if (filters.role && !user.roles.some(role => role.code === filters.role)) {
      return false;
    }
    
    // 日期范围过滤
    if (filters.dateRange) {
      const userDate = new Date(user.createdAt);
      const startDate = new Date(filters.dateRange[0]);
      const endDate = new Date(filters.dateRange[1]);
      if (userDate < startDate || userDate > endDate) {
        return false;
      }
    }
    
    return true;
  });
};

export const selectSelectedUsersData = (state: { user: UserState }) => {
  const { users, selectedUsers } = state.user;
  return users.filter(user => selectedUsers.includes(user.id));
};