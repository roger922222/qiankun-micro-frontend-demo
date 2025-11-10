import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import appSlice from './slices/appSlice';
import userSlice from './slices/userSlice';
import roleSlice from './slices/roleSlice';
import permissionSlice from './slices/permissionSlice';
import { userApi } from './api/userApi';
import { roleApi } from './api/roleApi';
import { permissionApi } from './api/permissionApi';
import { logApi } from './api/logApi';

export const store = configureStore({
  reducer: {
    app: appSlice,
    user: userSlice,
    role: roleSlice,
    permission: permissionSlice,
    // RTK Query APIs
    [userApi.reducerPath]: userApi.reducer,
    [roleApi.reducerPath]: roleApi.reducer,
    [permissionApi.reducerPath]: permissionApi.reducer,
    [logApi.reducerPath]: logApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    })
      .concat(userApi.middleware)
      .concat(roleApi.middleware)
      .concat(permissionApi.middleware)
      .concat(logApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;