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
    include: ['pdfjs-dist'],
  },
  
  define: {
    global: 'globalThis',
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdfjs-dist': ['pdfjs-dist'],
        },
      },
    },
  },
});