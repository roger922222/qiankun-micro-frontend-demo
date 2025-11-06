// 工具函数和常量

export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const formatTimestamp = (date?: Date): string => {
  return (date || new Date()).toISOString();
};

export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> => {
  return {
    success,
    data,
    message,
    error,
    timestamp: formatTimestamp(),
  };
};

export const createPaginatedResponse = <T>(
  data: T[],
  current: number,
  pageSize: number,
  total: number
): PaginatedResponse<T[]> => {
  return {
    success: true,
    data,
    pagination: {
      current,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    timestamp: formatTimestamp(),
  };
};

export const validatePagination = (page: any, pageSize: any) => {
  const current = Math.max(1, parseInt(String(page), 10) || 1);
  const size = Math.max(1, Math.min(100, parseInt(String(pageSize), 10) || 10));
  return { current, pageSize: size };
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 导入类型以在文件中使用
import type { ApiResponse, PaginatedResponse } from './product';