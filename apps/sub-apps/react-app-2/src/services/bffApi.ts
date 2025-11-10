// BFF API 客户端配置
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BFF_API_URL || 'http://localhost:3013';

export const bffApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
bffApiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
bffApiClient.interceptors.response.use(
  (response) => {
    // 如果响应成功，返回数据
    if (response.data?.success) {
      return response.data;
    }
    // 如果响应不成功，抛出错误
    throw new Error(response.data?.error || response.data?.message || '请求失败');
  },
  (error) => {
    // 处理网络错误或其他错误
    const message = error.response?.data?.error || error.message || '网络错误';
    console.error('BFF API Error:', message);
    return Promise.reject(new Error(message));
  }
);