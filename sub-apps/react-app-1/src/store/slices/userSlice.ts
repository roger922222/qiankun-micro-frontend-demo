import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';

interface UserState {
  currentUser: User | null;
  selectedUserIds: string[];
  searchKeyword: string;
  filters: {
    status?: string;
    role?: string;
  };
}

const initialState: UserState = {
  currentUser: null,
  selectedUserIds: [],
  searchKeyword: '',
  filters: {},
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<User | null>) => {
      state.currentUser = action.payload;
    },
    setSelectedUserIds: (state, action: PayloadAction<string[]>) => {
      state.selectedUserIds = action.payload;
    },
    setSearchKeyword: (state, action: PayloadAction<string>) => {
      state.searchKeyword = action.payload;
    },
    setFilters: (state, action: PayloadAction<{ status?: string; role?: string }>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
});

export const { 
  setCurrentUser, 
  setSelectedUserIds, 
  setSearchKeyword, 
  setFilters, 
  clearFilters 
} = userSlice.actions;
export default userSlice.reducer;