import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Role } from '@/types';

export const roleApi = createApi({
  reducerPath: 'roleApi',
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
  tagTypes: ['Role', 'RoleList'],
  endpoints: (builder) => ({
    // 获取角色列表
    getRoles: builder.query<Role[], void>({
      query: () => 'roles',
      providesTags: ['RoleList'],
    }),
    
    // 获取单个角色
    getRoleById: builder.query<Role, string>({
      query: (id) => `roles/${id}`,
      providesTags: (result, error, id) => [{ type: 'Role', id }],
    }),
    
    // 创建角色
    createRole: builder.mutation<Role, Partial<Role>>({
      query: (roleData) => ({
        url: 'roles',
        method: 'POST',
        body: roleData,
      }),
      invalidatesTags: ['RoleList'],
    }),
    
    // 更新角色
    updateRole: builder.mutation<Role, { id: string; data: Partial<Role> }>({
      query: ({ id, data }) => ({
        url: `roles/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Role', id },
        'RoleList',
      ],
    }),
    
    // 删除角色
    deleteRole: builder.mutation<void, string>({
      query: (id) => ({
        url: `roles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RoleList'],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = roleApi;