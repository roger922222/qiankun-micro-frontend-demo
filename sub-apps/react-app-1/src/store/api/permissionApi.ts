import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Permission } from '@/types';

export const permissionApi = createApi({
  reducerPath: 'permissionApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Permission', 'PermissionList'],
  endpoints: (builder) => ({
    // 获取权限列表
    getPermissions: builder.query<Permission[], void>({
      query: () => 'permissions',
      providesTags: ['PermissionList'],
    }),
    
    // 获取单个权限
    getPermissionById: builder.query<Permission, string>({
      query: (id) => `permissions/${id}`,
      providesTags: (result, error, id) => [{ type: 'Permission', id }],
    }),
  }),
});

export const {
  useGetPermissionsQuery,
  useGetPermissionByIdQuery,
} = permissionApi;