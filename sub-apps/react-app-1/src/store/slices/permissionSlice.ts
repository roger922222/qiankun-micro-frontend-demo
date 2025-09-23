import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Permission } from '@/types';

interface PermissionState {
  selectedPermissionIds: string[];
  searchKeyword: string;
}

const initialState: PermissionState = {
  selectedPermissionIds: [],
  searchKeyword: '',
};

const permissionSlice = createSlice({
  name: 'permission',
  initialState,
  reducers: {
    setSelectedPermissionIds: (state, action: PayloadAction<string[]>) => {
      state.selectedPermissionIds = action.payload;
    },
    setSearchKeyword: (state, action: PayloadAction<string>) => {
      state.searchKeyword = action.payload;
    },
  },
});

export const { setSelectedPermissionIds, setSearchKeyword } = permissionSlice.actions;
export default permissionSlice.reducer;