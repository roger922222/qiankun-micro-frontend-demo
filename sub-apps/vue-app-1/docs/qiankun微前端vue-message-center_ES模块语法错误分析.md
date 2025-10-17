# Research: qiankun微前端vue-message-center ES模块语法错误分析

## Research Question
> 用户遇到qiankun微前端错误："application 'vue-message-center' died in status LOADING_SOURCE_CODE: Cannot use import statement outside a module (at main.ts:1:645)"

本研究旨在深入分析这个ES模块语法错误，这是qiankun微前端框架在加载Vue子应用时的常见问题。错误发生在LOADING_SOURCE_CODE阶段，说明qiankun能够获取到文件，但无法正确执行其中的ES模块语法。

研究方向包括：
- Topic 1: 分析Vite开发模式与qiankun的兼容性问题
- Topic 2: 检查Vue应用的构建配置和模块格式
- Topic 3: 分析qiankun的代码执行机制和ES模块处理
- Topic 4: 提供完整的Vite配置优化方案

## Summary
经过深入分析，发现这是一个典型的Vite开发模式与qiankun兼容性问题。Vue应用服务正在运行，但Vite在开发模式下使用原生ES模块语法，而qiankun通过eval()执行代码时无法处理ES模块的import语句。问题的根本原因是缺少专门的qiankun集成插件和正确的构建配置。

## Key Findings

### qiankun代码执行机制分析
- **执行方式**: qiankun通过eval()或Function构造函数执行获取到的JavaScript代码
- **ES模块限制**: eval()环境无法处理ES模块的import/export语法
- **错误位置**: main.ts:1:645指向第一行的import语句
- **兼容性**: qiankun需要UMD、SystemJS或IIFE格式的代码

### Vite开发模式特性分析
- **原生ES模块**: [sub-apps/vue-app-1/src/main.ts](sub-apps/vue-app-1/src/main.ts#L6-8) - Vite开发模式直接使用浏览器原生ES模块
- **模块加载**: 通过`<script type="module">`标签加载，支持import语法
- **热更新**: 基于ES模块的热更新机制
- **与qiankun冲突**: qiankun的eval执行环境与ES模块不兼容

### 当前Vite配置问题
- **配置文件**: [sub-apps/vue-app-1/vite.config.ts](sub-apps/vue-app-1/vite.config.ts#L12-28) - 只配置了生产构建，开发模式未处理
- **构建格式**: 生产模式使用UMD格式，但开发模式仍使用ES模块
- **缺少插件**: 没有安装vite-plugin-qiankun等专门的微前端集成插件
- **服务器配置**: 虽然配置了CORS，但缺少qiankun特定的配置

### 服务运行状态验证
- **进程状态**: Vue应用服务正在运行在端口3006
- **网络访问**: 服务可访问但返回404状态码，说明路由配置可能有问题
- **生命周期函数**: [sub-apps/vue-app-1/src/main.ts](sub-apps/vue-app-1/src/main.ts#L78-105) - 正确导出了qiankun生命周期函数
- **结论**: 服务运行正常，问题在于模块格式不兼容

### 历史解决方案参考
- **故障排除指南**: [docs/qiankun-troubleshooting-guide.md](docs/qiankun-troubleshooting-guide.md#L103-150) - 详细记录了ES模块错误的解决方案
- **推荐方案**: 使用vite-plugin-qiankun插件或配置SystemJS格式
- **成功案例**: 项目中React应用已成功解决类似问题
- **最佳实践**: 开发和生产环境使用一致的模块格式

## Code References
- [sub-apps/vue-app-1/src/main.ts](sub-apps/vue-app-1/src/main.ts#L6) - ES模块import语句
- [sub-apps/vue-app-1/vite.config.ts](sub-apps/vue-app-1/vite.config.ts#L12-28) - 当前Vite配置
- [docs/qiankun-troubleshooting-guide.md](docs/qiankun-troubleshooting-guide.md#L131-150) - SystemJS解决方案
- [sub-apps/vue-app-1/src/main.ts](sub-apps/vue-app-1/src/main.ts#L78-105) - qiankun生命周期函数

## Architecture Insights
1. **模块格式兼容性**: qiankun与现代构建工具的ES模块存在天然的兼容性问题
2. **开发生产一致性**: 开发环境和生产环境应使用相同的模块格式以避免问题
3. **插件生态**: vite-plugin-qiankun等插件专门解决了这类兼容性问题
4. **代码执行环境**: qiankun的沙箱环境对ES模块语法有限制

## Historical Context (from .coda/output/research/)
根据项目中的故障排除指南，这个问题在React应用中已经遇到过并成功解决。推荐的解决方案是：
1. 使用vite-plugin-qiankun插件（推荐）
2. 配置SystemJS构建格式（备选）
3. 强制开发模式使用构建产物（不推荐，失去热更新）

## Related Research
- qiankun官方文档关于Vite集成的说明
- vite-plugin-qiankun插件的使用指南
- 项目中其他子应用的成功配置案例

## Open Questions
1. 是否应该使用vite-plugin-qiankun插件还是手动配置SystemJS格式？
2. 如何在保持开发体验的同时解决兼容性问题？
3. Vue应用的路由配置是否需要特殊处理？
4. 是否需要调整主应用的fetch配置？