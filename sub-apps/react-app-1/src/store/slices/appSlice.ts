/**
 * 应用状态管理Slice
 * 管理应用级别的状态
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// 应用状态接口
interface AppState {
  loading: boolean;
  error: string | null;
  currentRoute: {
    path: string;
    search: string;
    hash: string;
  };
  breadcrumbs: Array<{
    title: string;
    path: string;
  }>;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
}

// 初始状态
const initialState: AppState = {
  loading: false,
  error: null,
  currentRoute: {
    path: '/',
    search: '',
    hash: ''
  },
  breadcrumbs: [],
  sidebarCollapsed: false,
  theme: 'light'
};

// 创建slice
const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setCurrentRoute: (state, action: PayloadAction<{
      path: string;
      search: string;
      hash: string;
    }>) => {
      state.currentRoute = action.payload;
    },
    
    setBreadcrumbs: (state, action: PayloadAction<Array<{
      title: string;
      path: string;
    }>>) => {
      state.breadcrumbs = action.payload;
    },
    
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    }
  }
});

// 导出actions
export const {
  setLoading,
  setError,
  setCurrentRoute,
  setBreadcrumbs,
  toggleSidebar,
  setSidebarCollapsed,
  setTheme,
  clearError
} = appSlice.actions;

// 导出reducer
export default appSlice.reducer;

// 导出selectors
export const selectApp = (state: { app: AppState }) => state.app;
export const selectLoading = (state: { app: AppState }) => state.app.loading;
export const selectError = (state: { app: AppState }) => state.app.error;
export const selectCurrentRoute = (state: { app: AppState }) => state.app.currentRoute;
export const selectBreadcrumbs = (state: { app: AppState }) => state.app.breadcrumbs;
export const selectSidebarCollapsed = (state: { app: AppState }) => state.app.sidebarCollapsed;
export const selectTheme = (state: { app: AppState }) => state.app.theme;