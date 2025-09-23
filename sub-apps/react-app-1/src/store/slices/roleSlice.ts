import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Role } from '@/types';

interface RoleState {
  selectedRoleIds: string[];
  searchKeyword: string;
}

const initialState: RoleState = {
  selectedRoleIds: [],
  searchKeyword: '',
};

const roleSlice = createSlice({
  name: 'role',
  initialState,
  reducers: {
    setSelectedRoleIds: (state, action: PayloadAction<string[]>) => {
      state.selectedRoleIds = action.payload;
    },
    setSearchKeyword: (state, action: PayloadAction<string>) => {
      state.searchKeyword = action.payload;
    },
  },
});

export const { setSelectedRoleIds, setSearchKeyword } = roleSlice.actions;
export default roleSlice.reducer;