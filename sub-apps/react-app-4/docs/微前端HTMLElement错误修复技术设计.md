# 微前端 HTMLElement 构造函数错误修复技术设计文档

## 1. 项目概述
### 1.1 项目背景
在 qiankun 微前端项目中，react-app-4 子应用出现了 `Failed to construct 'HTMLElement': Illegal constructor` 错误。该错误发生在 Vite HMR 的 ErrorOverlay 组件中，是由于微前端沙箱环境与原生 DOM API 构造函数的兼容性问题导致的。

### 1.2 核心问题
ErrorOverlay 组件在微前端子应用的沙箱环境中尝试直接构造 HTMLElement 时，由于跨 realm 上下文差异和 qiankun 沙箱代理机制冲突，导致构造函数调用失败。

### 1.3 解决方案概述
通过 Vite 配置优化和自定义 ErrorOverlay 处理机制，在保证功能正常运行的同时，尽量保持良好的开发体验。提供渐进式修复方案，从配置调整到代码层面的兼容性处理。

## 2. 功能列表
产物交付前，必须验证本节所有功能已完成。

### 2.1 功能需求 (Functional Requirements)
| 编号 | 模块 | 需求 | 详细 |
|------|------------|------|------|
| FR1 | Vite配置优化 | 修复 HMR ErrorOverlay 兼容性 | 通过配置调整解决 HTMLElement 构造函数错误，支持微前端环境下的错误显示 |
| FR2 | 错误处理机制 | 自定义错误覆盖层处理 | 创建兼容微前端环境的错误显示机制，确保开发时错误信息正常显示 |
| FR3 | 通用解决方案 | 提供可复用的配置模板 | 创建适用于所有微前端子应用的通用配置方案和最佳实践指南 |
| FR4 | 兼容性验证 | 确保多环境兼容性 | 验证解决方案在开发、构建、生产环境下的兼容性和稳定性 |

## 3. 用例列表 (Test Cases)
每个功能产物交付前，必须证明本节所有相关用例已通过。

### 3.1 正常用例
| 编号 | 关联需求 | 用例名称 | 用例描述 | 前置条件 | 执行步骤 | 预期结果 |
|------|----------|----------|----------|----------|----------|----------|
| TC1  | FR1 | Vite 开发服务器启动 | 验证修复后的 Vite 配置能正常启动开发服务器 | react-app-4 项目环境就绪 | 1. 应用 Vite 配置修复<br>2. 执行 npm run dev | 开发服务器正常启动，无 HTMLElement 构造错误 |
| TC2  | FR2 | 错误信息正常显示 | 验证代码错误时能正常显示错误信息 | 开发服务器运行中 | 1. 在代码中引入语法错误<br>2. 保存文件触发 HMR | 错误信息正常显示，不出现构造函数错误 |
| TC3  | FR3 | 通用配置应用 | 验证通用配置可以应用到其他子应用 | 其他子应用项目环境 | 1. 应用通用配置模板<br>2. 启动其他子应用 | 其他子应用也能正常运行，无类似错误 |
| TC4  | FR4 | 生产构建验证 | 验证修复不影响生产环境构建 | 修复配置已应用 | 1. 执行 npm run build<br>2. 执行 npm run preview | 构建成功，预览正常，无运行时错误 |

### 3.2 异常用例
| 编号 | 关联需求 | 用例名称 | 异常场景 | 触发条件 | 处理方式 | 预期结果 |
|------|----------|----------|----------|----------|----------|----------|
| TC_E1 | FR1 | 配置回退机制 | Vite 配置修复失败 | 配置语法错误或不兼容 | 提供配置回退选项和错误提示 | 能够回退到安全配置，给出明确错误信息 |
| TC_E2 | FR2 | 错误处理降级 | 自定义错误处理失败 | 沙箱环境限制过严 | 降级到基础错误显示模式 | 至少能显示基本错误信息，不影响开发 |
| TC_E3 | FR3 | 配置兼容性问题 | 通用配置在特定环境不适用 | 不同版本或特殊配置环境 | 提供环境检测和配置适配 | 能够检测环境差异，提供适配建议 |
| TC_E4 | FR4 | 微前端集成冲突 | 修复方案与 qiankun 集成冲突 | 特定 qiankun 版本或配置 | 提供兼容性检查和替代方案 | 能够检测冲突，提供替代解决方案 |

## 4. 技术架构

### 4.1 整体架构
```
微前端错误处理架构
├── 主应用 (Main App)
│   ├── qiankun 注册配置
│   └── 全局错误处理
├── 子应用 (Sub Apps)
│   ├── Vite 配置优化
│   │   ├── HMR 配置调整
│   │   ├── 沙箱兼容性设置
│   │   └── ErrorOverlay 处理
│   ├── 自定义错误处理
│   │   ├── 沙箱感知的错误显示
│   │   └── 跨 realm 兼容处理
│   └── 开发体验优化
└── 共享配置 (Shared Config)
    ├── 通用 Vite 配置模板
    └── 最佳实践指南
```

### 4.2 核心组件
**前端组件**:
- Vite 配置模块：处理 HMR 和 ErrorOverlay 的微前端兼容性
- 自定义错误处理组件：提供沙箱环境下的错误显示功能
- 配置检测工具：自动检测环境和配置兼容性

### 4.3 技术选型
**前端技术栈**:
- Vite 4.1.0：构建工具，需要配置优化
- qiankun：微前端框架，提供沙箱隔离
- vite-plugin-legacy-qiankun：微前端集成插件

**配置策略**:
- 渐进式修复：从简单配置到复杂处理
- 兼容性优先：确保不同环境下的稳定性
- 开发体验平衡：在修复问题的同时保持开发效率

## 5. 核心设计

### 5.1 错误根本原因技术分析
**HTMLElement 构造函数错误的技术原理**:
1. **跨 Realm 问题**: 微前端子应用运行在独立的 JavaScript realm 中，主应用和子应用的 HTMLElement 构造函数不是同一个对象
2. **沙箱代理冲突**: qiankun 使用 Proxy 沙箱代理全局对象，ErrorOverlay 直接调用 `new HTMLElement()` 时与代理机制冲突
3. **自定义元素注册问题**: ErrorOverlay 可能继承 HTMLElement 但未正确注册为自定义元素

**具体修复配置**:
```typescript
// vite.config.ts 修复配置
export default defineConfig({
  server: {
    hmr: {
      overlay: false, // 方案1：完全禁用 overlay
      // 或者使用方案2：自定义 overlay 配置
      // overlay: {
      //   warnings: true,
      //   errors: true,
      //   position: 'top-right'
      // }
    },
  },
  
  // 确保全局对象正确定义
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  
  // 优化插件配置
  plugins: [
    react({
      // 禁用 React 刷新的错误覆盖层
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: [
          ['@emotion/babel-plugin']
        ]
      }
    }),
    legacyQiankun({
      name: 'react-dashboard',
      devSandbox: true,
    })
  ]
});
```

### 5.2 前端设计
| 组件名 | 路径 | 描述 | 参数 |
|--------|------|------|------|
| ViteConfigOptimizer | vite.config.ts | Vite 配置优化器 | hmrConfig, overlayConfig, sandboxConfig |
| CustomErrorBoundary | src/components/ErrorBoundary.tsx | 自定义错误边界组件 | fallback, onError, resetOnPropsChange |
| MicroFrontendErrorHandler | src/utils/errorHandler.ts | 微前端错误处理工具 | errorType, context, recoveryOptions |
| ConfigTemplate | templates/vite.micro.config.ts | 通用配置模板 | appName, port, sandboxMode |

**组件间关系**:
- ViteConfigOptimizer 为核心配置处理器，负责生成兼容的 Vite 配置
- CustomErrorBoundary 作为运行时错误捕获组件，处理沙箱环境下的错误显示
- MicroFrontendErrorHandler 提供错误处理逻辑和恢复机制
- ConfigTemplate 提供标准化的配置模板，确保一致性

### 5.3 具体修复实施方案

**方案一：快速修复（推荐优先尝试）**
1. 修改 `sub-apps/react-app-4/vite.config.ts`，在 server 配置中添加：
```typescript
server: {
  port: 3004,
  host: '0.0.0.0',
  cors: true,
  hmr: {
    overlay: false, // 禁用错误覆盖层
  },
  // ... 其他配置保持不变
}
```

**方案二：兼容性修复（保持开发体验）**
1. 创建自定义错误处理组件 `src/components/MicroFrontendErrorBoundary.tsx`
2. 修改 Vite 配置使用自定义错误处理：
```typescript
plugins: [
  react({
    // 禁用默认的错误覆盖层
    fastRefresh: true,
    jsxImportSource: 'react',
  }),
  // 自定义插件处理错误显示
  {
    name: 'micro-frontend-error-handler',
    configureServer(server) {
      server.ws.on('error', (error) => {
        // 自定义错误处理逻辑
        console.error('Micro-frontend error:', error);
      });
    }
  }
]
```

**方案三：通用配置模板**
创建 `templates/vite.micro.config.template.ts` 供其他子应用使用：
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { legacyQiankun } from 'vite-plugin-legacy-qiankun';

export const createMicroFrontendConfig = (appName: string, port: number) => {
  return defineConfig({
    plugins: [
      react(),
      legacyQiankun({
        name: appName,
        devSandbox: true,
      }),
    ],
    server: {
      port,
      host: '0.0.0.0',
      cors: true,
      hmr: {
        overlay: false, // 微前端环境下禁用
      },
    },
    define: {
      global: 'globalThis',
    },
  });
};
```