import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { User, GetUsersParams, PaginatedResponse, CreateUserRequest, UpdateUserRequest } from '@/types';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      // 从全局状态获取token
      const token = (getState() as any).auth?.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'UserList'],
  endpoints: (builder) => ({
    // 获取用户列表
    getUsers: builder.query<PaginatedResponse<User>, GetUsersParams>({
      query: (params) => ({
        url: 'users',
        params,
      }),
      providesTags: ['UserList'],
    }),
    
    // 获取单个用户
    getUserById: builder.query<User, string>({
      query: (id) => `users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    
    // 创建用户
    createUser: builder.mutation<User, CreateUserRequest>({
      query: (userData) => ({
        url: 'users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['UserList'],
    }),
    
    // 更新用户
    updateUser: builder.mutation<User, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'UserList',
      ],
    }),
    
    // 删除用户
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['UserList'],
    }),
    
    // 导入用户
    importUsers: builder.mutation<any, FormData>({
      query: (formData) => ({
        url: 'users/import',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['UserList'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useImportUsersMutation,
} = userApi;