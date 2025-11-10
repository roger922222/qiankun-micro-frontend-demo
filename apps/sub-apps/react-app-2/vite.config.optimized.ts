import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { legacyQiankun } from 'vite-plugin-legacy-qiankun';
import { resolve } from 'path';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import viteImagemin from 'vite-plugin-imagemin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // React插件优化配置
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-proposal-class-properties', { loose: true }],
        ],
      },
      // 快速刷新配置
      fastRefresh: true,
      // JSX运行时优化
      jsxRuntime: 'automatic',
    }),
    
    // 传统浏览器支持
    legacy({
      targets: [
        'defaults',
        'not IE 11',
        'chrome >= 60',
        'firefox >= 60',
        'safari >= 12',
        'edge >= 79',
      ],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      polyfills: [
        'es.promise',
        'es.promise.finally',
        'es/array',
        'es/object',
        'es/string',
        'es/map',
        'es/set',
      ],
    }),
    
    // 微前端支持
    legacyQiankun({
      name: 'react-product-management',
      devSandbox: true,
    }),
    
    // Gzip压缩
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // 10KB以上文件才压缩
      deleteOriginFile: false,
      verbose: true,
    }),
    
    // Brotli压缩（更好的压缩率）
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
      verbose: true,
    }),
    
    // 图片压缩优化
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 80,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          {
            name: 'removeViewBox',
            active: false,
          },
          {
            name: 'removeEmptyAttrs',
            active: false,
          },
        ],
      },
    }),
    
    // 包大小分析（仅在分析时启用）
    process.env.ANALYZE ? visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }) : null,
    
  ].filter(Boolean),
  
  // 开发服务器配置
  server: {
    port: 3012,
    host: '0.0.0.0',
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      // 安全响应头
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:3013',
        changeOrigin: true,
        // 超时配置
        timeout: 30000,
        // 错误重试
        errorHandler: (error, req, res) => {
          console.error('Proxy error:', error);
          res.status(500).json({
            success: false,
            message: '代理服务器错误',
          });
        },
      },
    },
    // HMR配置优化
    hmr: {
      overlay: true,
      port: 3012,
    },
  },
  
  // 预览服务器配置
  preview: {
    port: 3012,
    host: '0.0.0.0',
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  
  // 基础路径配置
  base: process.env.NODE_ENV === 'production' ? '/react-product-management/' : '/',
  
  // 路径别名配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../../shared'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@services': resolve(__dirname, 'src/services'),
      '@types': resolve(__dirname, 'src/types'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@assets': resolve(__dirname, 'src/assets'),
    },
  },
  
  // 构建配置优化
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development', // 开发环境启用sourcemap
    
    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动分包策略
        manualChunks: {
          // React相关库打包在一起
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'react-error-boundary'],
          
          // UI组件库打包在一起
          'ui-vendor': ['antd', '@ant-design/icons', 'styled-components'],
          
          // 状态管理打包在一起
          'state-vendor': ['zustand', 'immer'],
          
          // 工具函数打包在一起
          'utils-vendor': ['axios', 'dayjs', 'lodash', 'classnames'],
        },
        
        // 文件名配置优化
        entryFileNames: 'js/[name].[hash].js',
        chunkFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/\.css$/.test(assetInfo.name)) {
            return 'css/[name].[hash].css';
          } else if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
            return 'images/[name].[hash].[ext]';
          } else if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return 'fonts/[name].[hash].[ext]';
          } else if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name)) {
            return 'media/[name].[hash].[ext]';
          }
          
          return 'assets/[name].[hash].[ext]';
        },
      },
      
      // 外部依赖配置（微前端环境下）
      external: process.env.NODE_ENV === 'production' ? [] : [],
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
        pure_funcs: ['console.log', 'console.info'],
      },
      format: {
        comments: false,
      },
    },
    
    // 资源内联配置
    assetsInlineLimit: 4096, // 4KB以下资源内联
    
    // CSS代码分割
    cssCodeSplit: true,
    
    // 目标浏览器
    target: ['es2015', 'chrome58', 'firefox57', 'safari11', 'edge16'],
    
    // 报告压缩大小
    reportCompressedSize: true,
    
    //  chunk大小警告阈值
    chunkSizeWarningLimit: 1000, // 1000KB
  },
  
  // 优化配置
  optimizeDeps: {
    // 预构建依赖优化
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
      'axios',
      'dayjs',
      'lodash',
      'zustand',
      'immer',
    ],
    
    // 排除不需要预构建的依赖
    exclude: [],
  },
  
  // CSS配置
  css: {
    // CSS模块化配置
    modules: {
      localsConvention: 'camelCaseOnly',
      scopeBehaviour: 'local',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
    
    // PostCSS配置
    postcss: {
      plugins: [
        require('autoprefixer'),
        require('postcss-preset-env')({
          stage: 3,
          features: {
            'nesting-rules': true,
          },
        }),
      ],
    },
    
    // 预处理器选项
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
  
  // JSON配置
  json: {
    namedExports: true,
    stringify: false,
  },
  
  // 静态资源处理
  assetsInclude: [
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.svg',
    '**/*.webp',
    '**/*.ico',
    '**/*.woff',
    '**/*.woff2',
    '**/*.ttf',
    '**/*.eot',
  ],
  
  // 实验性功能
  experimental: {
    // 启用import.meta.env的解构
    importMetaEnv: true,
  },
  
  // 环境变量配置
  envPrefix: ['VITE_', 'REACT_APP_'],
  
  // 模式配置
  mode: process.env.NODE_ENV || 'development',
  
  // 清除控制台
  clearScreen: true,
  
  // 日志级别
  logLevel: 'info',
  
  // 自定义logger
  customLogger: undefined,
  
  // 缓存配置
  cacheDir: 'node_modules/.vite',
  
  // 配置文件路径
  configFile: undefined,
  
  // 环境文件路径
  envDir: process.cwd(),
  
  // 根目录
  root: process.cwd(),
  
  // 公共基础路径
  publicDir: 'public',
  
  // 历史API回退
  historyApiFallback: true,
  
  // 是否开启https
  https: false,
  
  // 是否开启open
  open: false,
  
  // 严格端口模式
  strictPort: false,
  
  // 强制开启优化
  force: undefined,
  
  // 插件配置
  pluginsOptions: {},
  
  // 应用类型
  appType: 'spa',
  
  // 是否开启ssr
  ssr: undefined,
  
  // 是否开启ssr外部
  ssrExternal: undefined,
  
  // 是否开启ssr优化
  ssrOptimizeDeps: undefined,
  
  // 是否开启worker
  worker: undefined,
  
  // 是否开启worker外部
  workerExternal: undefined,
  
  // 是否开启worker优化
  workerOptimizeDeps: undefined,
  
  // 是否开启define
  define: {},
  
  // 是否开启esbuild
  esbuild: undefined,
  
  // 是否开启rollup选项
  rollupOptions: {},
  
  // 是否开启rollup插件
  rollupPlugins: [],
  
  // 是否开启rollup外部
  rollupExternal: undefined,
  
  // 是否开启rollup输出
  rollupOutputOptions: {},
  
  // 是否开启rollup输入
  rollupInputOptions: {},
  
  // 是否开启rollup警告
  rollupOnwarn: undefined,
  
  // 是否开启rollup缓存
  rollupCache: undefined,
  
  // 是否开启rollup上下文
  rollupContext: undefined,
  
  // 是否开启rollup模块上下文
  rollupModuleContext: undefined,
  
  // 是否开启rollup保留模块
  rollupPreserveModules: undefined,
  
  // 是否开启rollup保留入口
  rollupPreserveEntrySignatures: undefined,
  
  // 是否开启rollup输入选项
  rollupInputOptions: {},
  
  // 是否开启rollup输出选项
  rollupOutputOptions: {},
  
  // 是否开启rollup外部
  rollupExternal: undefined,
  
  // 是否开启rollup插件
  rollupPlugins: [],
  
  // 是否开启rollup警告
  rollupOnwarn: undefined,
  
  // 是否开启rollup缓存
  rollupCache: undefined,
  
  // 是否开启rollup上下文
  rollupContext: undefined,
  
  // 是否开启rollup模块上下文
  rollupModuleContext: undefined,
  
  // 是否开启rollup保留模块
  rollupPreserveModules: undefined,
  
  // 是否开启rollup保留入口
  rollupPreserveEntrySignatures: undefined,
});

// 性能分析函数
export function analyzeBundleSize() {
  return {
    name: 'analyze-bundle-size',
    apply: 'build',
    enforce: 'post',
    generateBundle(options, bundle) {
      const sizes = {};
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          sizes[fileName] = {
            size: chunk.code.length,
            gzipSize: require('gzip-size').sync(chunk.code),
            brotliSize: require('brotli-size').sync(chunk.code),
          };
        }
      }
      
      console.log('\n📦 构建包大小分析:');
      console.table(sizes);
      
      // 保存分析结果
      require('fs').writeFileSync(
        'bundle-analysis.json',
        JSON.stringify(sizes, null, 2)
      );
    },
  };
}