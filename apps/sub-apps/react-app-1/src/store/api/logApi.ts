import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { OperationLog } from '@/types';

export const logApi = createApi({
  reducerPath: 'logApi',
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
  tagTypes: ['Log', 'LogList'],
  endpoints: (builder) => ({
    // 获取操作日志列表
    getOperationLogs: builder.query<{
      data: OperationLog[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
    }, {
      page?: number;
      pageSize?: number;
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    }>({
      query: (params) => ({
        url: 'logs',
        params,
      }),
      providesTags: ['LogList'],
    }),
    
    // 获取单个操作日志
    getOperationLogById: builder.query<OperationLog, string>({
      query: (id) => `logs/${id}`,
      providesTags: (result, error, id) => [{ type: 'Log', id }],
    }),
  }),
});

export const {
  useGetOperationLogsQuery,
  useGetOperationLogByIdQuery,
} = logApi;