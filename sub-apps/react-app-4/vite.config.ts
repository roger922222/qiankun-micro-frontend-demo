import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { legacyQiankun } from 'vite-plugin-legacy-qiankun';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
    legacyQiankun({
      name: 'react-dashboard',
      devSandbox: true,
    }),
  ],
  
  server: {
    port: 3004,
    host: '0.0.0.0',
    cors: true,
    hmr: {
      overlay: false, // 禁用错误覆盖层以解决微前端环境下的 HTMLElement 构造函数错误
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
  
  preview: {
    port: 3004,
    host: '0.0.0.0',
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  
  base: process.env.NODE_ENV === 'production' ? '/react-dashboard/' : '/',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../../shared'),
    },
  },

  optimizeDeps: {
    include: [
      'pdfjs-dist',
      'html2canvas',
      'jspdf',
      'xlsx',
      'workbox-window',
      'echarts',
      'echarts-for-react'
    ],
    exclude: ['@antv/g2plot', '@ant-design/charts'],
  },
  
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.REACT_APP_API_BASE_URL': JSON.stringify(process.env.REACT_APP_API_BASE_URL || '/api'),
    'process.env.REACT_APP_WS_URL': JSON.stringify(process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws/dashboard'),
    // 添加完整的 process 对象定义以解决微前端环境下的兼容性问题
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV || 'development',
      REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL || '/api',
      REACT_APP_WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws/dashboard',
    }),
    // 为了向后兼容，也定义 process 对象本身
    'process': JSON.stringify({
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL || '/api',
        REACT_APP_WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws/dashboard',
      }
    }),
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: [/^@shared/],
      output: {
        manualChunks: {
          'pdfjs-dist': ['pdfjs-dist'],
          'export-utils': ['html2canvas', 'jspdf', 'xlsx'],
          'sw-utils': ['workbox-window']
        },
      },
    },
  },
});