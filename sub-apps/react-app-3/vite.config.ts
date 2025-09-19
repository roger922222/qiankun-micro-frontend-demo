import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 开发服务器配置
  server: {
    port: 3003,
    cors: true,
    origin: 'http://localhost:3003'
  },
  
  // 构建配置
  build: {
    target: 'es2015',
    lib: {
      entry: path.resolve(__dirname, 'src/main.tsx'),
      name: 'ReactOrderManagement',
      fileName: 'react-order-management',
      formats: ['umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../../shared/src')
    }
  },
  
  // CSS配置
  css: {
    modules: {
      localsConvention: 'camelCase'
    }
  },
  
  // 定义全局变量
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});