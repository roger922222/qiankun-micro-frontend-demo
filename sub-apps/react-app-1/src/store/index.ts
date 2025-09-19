/**
 * Redux Store配置
 * 使用Redux Toolkit进行状态管理
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

// 导入reducers
import appReducer from './slices/appSlice';
import userReducer from './slices/userSlice';
import roleReducer from './slices/roleSlice';
import permissionReducer from './slices/permissionSlice';

// 导入API
import { userApi } from './api/userApi';
import { roleApi } from './api/roleApi';
import { permissionApi } from './api/permissionApi';

/**
 * 配置Redux Store
 */
export const store = configureStore({
  reducer: {
    // 应用状态
    app: appReducer,
    
    // 业务状态
    user: userReducer,
    role: roleReducer,
    permission: permissionReducer,
    
    // RTK Query API
    [userApi.reducerPath]: userApi.reducer,
    [roleApi.reducerPath]: roleApi.reducer,
    [permissionApi.reducerPath]: permissionApi.reducer,
  },
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // 忽略这些action types的序列化检查
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // 忽略这些路径的序列化检查
        ignoredPaths: ['register'],
      },
    })
      .concat(userApi.middleware)
      .concat(roleApi.middleware)
      .concat(permissionApi.middleware),
  
  // 开发工具
  devTools: process.env.NODE_ENV !== 'production',
});

// 设置RTK Query监听器
setupListeners(store.dispatch);

// 导出类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 导出hooks
export { useAppDispatch, useAppSelector } from './hooks';