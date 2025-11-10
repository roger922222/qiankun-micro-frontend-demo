import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { legacyQiankun } from 'vite-plugin-legacy-qiankun';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue({
      // 在开发环境禁用CSS热更新，避免与qiankun样式沙箱冲突
      reactivityTransform: true,
      template: {
        compilerOptions: {
          // 确保在微前端环境下正确处理样式
          whitespace: 'preserve'
        }
      }
    }),
    legacyQiankun({
      name: 'vue-message-center',
      devSandbox: false
    }) as any,
  ],
  
  server: {
    port: 3006,
    host: '0.0.0.0',
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    // 优化 HMR 配置减少样式冲突和路由重新加载
    hmr: {
      overlay: false, // 禁用错误覆盖层避免样式干扰
      clientPort: 3006,
      // 减少 HMR 更新频率，避免路由频繁重新加载
      timeout: 60000
    },
    // 增加文件监听延迟减少频繁更新
    watch: {
      usePolling: false,
      interval: 300,
      // 忽略不必要的文件变化
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**']
    }
  },
  
  preview: {
    port: 3006,
    host: '0.0.0.0',
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  
  base: process.env.NODE_ENV === 'production' ? '/vue-message-center/' : '/',
  
  css: {
    preprocessorOptions: {
      // 确保样式在微前端环境下正确处理
      scss: {
        additionalData: `$qiankun-prefix: '.vue-message-center';`
      }
    },
    // 开发环境样式处理优化
    devSourcemap: true,
    // 样式模块化配置
    modules: {
      localsConvention: 'camelCase'
    },
    // 强制内联样式以避免 qiankun 样式沙箱问题
    postcss: {
      plugins: [
        {
          postcssPlugin: 'qiankun-style-fix',
          Once(root) {
            // 为所有样式规则添加更高的优先级
            root.walkRules(rule => {
              if (rule.selector.includes('.vue-message-center')) {
                rule.selector = rule.selector.replace(/\.vue-message-center/g, '.vue-message-center');
              }
            });
          }
        }
      ]
    }
  },
  
  // 根据 qiankun 官方文档，配置资源处理
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot'],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../../shared')
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    // 根据 qiankun 官方文档，优化资源处理和路由性能
    cssCodeSplit: false, // 关闭 CSS 代码分割，避免动态样式加载问题
    // 确保资源路径正确
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // 将所有资源内联或使用 base64，避免路径问题
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/[name].[hash].css';
          }
          return 'assets/[name].[hash].[ext]';
        },
        // 优化代码分割，提升路由切换性能
        manualChunks: (id) => {
          // 将 Vue Router 相关代码单独打包
          if (id.includes('vue-router')) {
            return 'vue-router';
          }
          // 将 Ant Design Vue 组件单独打包
          if (id.includes('ant-design-vue')) {
            return 'antd';
          }
          // 将共享库单独打包
          if (id.includes('@shared')) {
            return 'shared';
          }
          // 将 node_modules 中的其他库打包到 vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    // 配置资源内联阈值
    assetsInlineLimit: 8192, // 8kb 以下的资源将被内联为 base64
    // 优化构建性能
    target: 'es2015',
    minify: 'esbuild' // 使用 esbuild 替代 terser，构建更快
  }
});