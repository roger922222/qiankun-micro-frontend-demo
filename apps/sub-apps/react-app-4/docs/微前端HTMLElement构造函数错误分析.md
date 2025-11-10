# Research: 微前端项目中 HTMLElement 构造函数错误分析

## Research Question
>用户遇到了一个微前端项目中的错误：`sub-apps/react-app-4 Uncaught (in promise) TypeError: Failed to construct 'HTMLElement': Illegal constructor at new ErrorOverlay (overlay.ts:174:5)`。这个错误发生在 react-app-4 子应用中，涉及到 ErrorOverlay 的构造，从堆栈跟踪来看，错误源于 overlay.ts 第174行的 ErrorOverlay 构造函数、client.ts 中的 createErrorOverlay 函数以及 WebSocket 消息处理过程。

我需要分析这个错误的具体原因、在微前端环境中 HTMLElement 构造函数失败的根本原因，以及如何修复这个问题。

- Topic 1: HTMLElement 构造函数错误的技术原理和常见触发场景
- Topic 2: 微前端 qiankun 环境下的沙箱机制与 DOM API 冲突
- Topic 3: Vite HMR ErrorOverlay 与微前端集成的兼容性问题
- Topic 4: 具体的解决方案和配置修复

## Summary
这是一个典型的微前端环境下 Vite HMR ErrorOverlay 与 qiankun 沙箱机制冲突导致的问题。错误的根本原因是 ErrorOverlay 组件尝试在微前端子应用的沙箱环境中直接构造 HTMLElement，但由于跨 realm 的上下文差异和沙箱代理机制，导致构造函数调用失败。

## Key Findings

### 错误根本原因分析
- **跨 realm 构造问题**: 在微前端环境中，主应用和子应用运行在不同的 JavaScript realm 中，HTMLElement 构造函数在不同 realm 间不兼容 ([vite.config.ts](sub-apps/react-app-4/vite.config.ts#L1-80))
- **沙箱代理冲突**: qiankun 的沙箱机制代理了 DOM API，ErrorOverlay 尝试直接构造 HTMLElement 时与代理机制冲突
- **HMR 覆盖层注入问题**: Vite 的 HMR ErrorOverlay 在子应用中注入时，使用了错误的 window 上下文

### 项目配置分析
从项目配置可以看出：
- 使用了 `vite-plugin-legacy-qiankun` 插件进行微前端集成 ([vite.config.ts](sub-apps/react-app-4/vite.config.ts#L13-16))
- 配置了开发沙箱 `devSandbox: true`
- 端口配置为 3004，支持跨域访问 ([vite.config.ts](sub-apps/react-app-4/vite.config.ts#L19-32))

### 已知解决方案模式
在项目文档中发现了相关的配置建议：
- 在开发环境中关闭 HMR overlay 来避免此类冲突 ([qiankun-troubleshooting-guide.md](docs/qiankun-troubleshooting-guide.md#L981))
- 优化依赖预构建配置来减少构建冲突

### 技术栈兼容性
项目使用的技术栈：
- React 18 + TypeScript
- Vite 4.1.0 构建工具
- qiankun 微前端框架
- 多个文件预览相关依赖（pdfjs-dist, react-pdf 等）

## Code References
- [vite.config.ts](sub-apps/react-app-4/vite.config.ts#L1-80) - Vite 配置文件，包含微前端插件配置
- [package.json](sub-apps/react-app-4/package.json#L1-77) - 项目依赖配置
- [qiankun-troubleshooting-guide.md](docs/qiankun-troubleshooting-guide.md#L981) - 故障排除指南中的 overlay 配置建议

## Architecture Insights
微前端架构中的关键模式：
- **沙箱隔离**: qiankun 使用 Proxy 沙箱隔离子应用的全局变量和 DOM 操作
- **资源隔离**: 子应用的静态资源和构建产物需要独立管理
- **开发体验**: HMR 和错误覆盖层需要特殊处理以避免跨应用冲突

## Historical Context (from .coda/output/research/)
暂未发现相关的历史研究文档。

## Related Research
暂未发现相关的研究文档。

## Open Questions
1. 是否需要完全禁用 ErrorOverlay，还是可以通过配置修复？
2. 是否存在其他类似的 DOM API 冲突问题？
3. 生产环境是否也会遇到类似问题？
4. 是否需要检查其他子应用的配置一致性？