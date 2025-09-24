import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    cors: true,
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // 分包策略
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          qiankun: ['qiankun'],
          utils: ['lodash', 'dayjs', 'axios']
        }
      }
    },
    // 构建目标
    target: 'es2015',
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  
  // 路径解析
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../shared'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@store': resolve(__dirname, 'src/store'),
      '@types': resolve(__dirname, 'src/types'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  
  // CSS配置
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        modifyVars: {
          // Ant Design主题定制
          '@primary-color': '#1890ff',
          '@link-color': '#1890ff',
          '@success-color': '#52c41a',
          '@warning-color': '#faad14',
          '@error-color': '#f5222d',
          '@font-size-base': '14px',
          '@heading-color': 'rgba(0, 0, 0, 0.85)',
          '@text-color': 'rgba(0, 0, 0, 0.65)',
          '@text-color-secondary': 'rgba(0, 0, 0, 0.45)',
          '@disabled-color': 'rgba(0, 0, 0, 0.25)',
          '@border-radius-base': '4px',
          '@box-shadow-base': '0 2px 8px rgba(0, 0, 0, 0.15)'
        }
      }
    }
  },
  
  // 环境变量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  
  // 优化配置
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
      'qiankun',
      'lodash',
      'dayjs',
      'axios'
    ]
  }
});