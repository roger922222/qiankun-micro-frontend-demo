import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  loading: boolean;
  breadcrumbs: Array<{ title: string; path?: string }>;
}

const initialState: AppState = {
  sidebarCollapsed: false,
  theme: 'light',
  loading: false,
  breadcrumbs: [],
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setBreadcrumbs: (state, action: PayloadAction<Array<{ title: string; path?: string }>>) => {
      state.breadcrumbs = action.payload;
    },
  },
});

export const { toggleSidebar, setTheme, setLoading, setBreadcrumbs } = appSlice.actions;
export default appSlice.reducer;