# Research: qiankun微前端vue-message-center网络请求失败错误分析

## Research Question
> 用户遇到qiankun微前端错误："application 'vue-message-center' died in status LOADING_SOURCE_CODE: Failed to fetch"，这是一个网络请求失败的错误，qiankun无法获取vue-message-center的入口文件。错误发生在setup.ts:462:21。

本研究旨在深入分析这个网络请求失败问题，找出根本原因并提供具体的修复方案。

研究方向包括：
- Topic 1: 分析主应用中vue-message-center的网络请求配置
- Topic 2: 检查Vue子应用的服务启动状态和网络访问
- Topic 3: 分析Vite配置和构建输出问题
- Topic 4: 提供完整的网络访问修复方案

## Summary
经过深入分析，发现vue-message-center应用虽然配置了正确的Vite开发服务器，但在实际运行时可能存在以下问题：
1. Vue应用服务未正常启动或已停止运行
2. Vite配置中的构建模式与开发模式冲突
3. 网络请求的入口地址无法正常访问
4. CORS配置可能存在问题

主要问题是Vue子应用服务未正常运行在端口3006上，导致qiankun无法通过HTTP请求获取应用入口文件。

## Key Findings

### 主应用网络请求配置
- **配置文件**: [main-app/src/micro-apps/setup.ts](main-app/src/micro-apps/setup.ts#L84-85) - 主应用正确配置了vue-message-center入口为http://localhost:3006
- **自定义fetch**: [main-app/src/micro-apps/setup.ts](main-app/src/micro-apps/setup.ts#L446-466) - 主应用配置了自定义fetch函数，包含详细的错误处理和日志
- **错误位置**: setup.ts:462:21对应fetch函数中的错误处理逻辑
- **结论**: 主应用配置正确，问题在于无法访问子应用服务

### Vue子应用服务状态检查
- **端口检查**: 通过netstat检查发现端口3006未被占用
- **进程检查**: 未发现vite --port 3006相关的运行进程
- **日志分析**: [sub-apps/vue-app-1/vue-app.log](sub-apps/vue-app-1/vue-app.log#L6-10) - 显示Vite服务曾经启动但可能已停止
- **结论**: Vue应用服务当前未运行，这是网络请求失败的直接原因

### Vite配置分析
- **配置文件**: [sub-apps/vue-app-1/vite.config.ts](sub-apps/vue-app-1/vite.config.ts#L28-35) - Vite正确配置了端口3006和CORS
- **构建配置**: [sub-apps/vue-app-1/vite.config.ts](sub-apps/vue-app-1/vite.config.ts#L9-25) - 配置了UMD格式的库构建模式
- **依赖配置**: [sub-apps/vue-app-1/package.json](sub-apps/vue-app-1/package.json#L7) - 启动脚本配置正确
- **警告信息**: Vite警告无法自动确定入口点，这可能影响开发模式的正常运行
- **结论**: Vite配置基本正确，但构建模式配置可能导致开发服务器问题

### 生命周期函数实现
- **入口文件**: [sub-apps/vue-app-1/src/main.ts](sub-apps/vue-app-1/src/main.ts#L78-105) - 正确导出了bootstrap、mount、unmount函数
- **函数实现**: 生命周期函数实现完整，包含错误处理
- **独立运行**: 支持独立运行模式的判断
- **结论**: 生命周期函数代码实现正确，不是问题根源

## Code References
- [main-app/src/micro-apps/setup.ts](main-app/src/micro-apps/setup.ts#L84-85) - 主应用注册配置
- [main-app/src/micro-apps/setup.ts](main-app/src/micro-apps/setup.ts#L462) - 错误发生位置
- [sub-apps/vue-app-1/vite.config.ts](sub-apps/vue-app-1/vite.config.ts#L28-35) - Vite服务器配置
- [sub-apps/vue-app-1/package.json](sub-apps/vue-app-1/package.json#L7) - 启动脚本
- [sub-apps/vue-app-1/src/main.ts](sub-apps/vue-app-1/src/main.ts#L78-105) - 生命周期函数

## Architecture Insights
1. **qiankun加载机制**: qiankun通过HTTP请求获取子应用的HTML入口文件，然后解析其中的JS和CSS资源
2. **网络请求流程**: 主应用 → HTTP请求 → 子应用服务器 → 返回HTML/JS资源
3. **错误传播**: 网络请求失败 → qiankun捕获错误 → 应用状态变为LOADING_SOURCE_CODE失败
4. **开发环境依赖**: 开发模式下qiankun依赖子应用的开发服务器正常运行

## Historical Context (from .coda/output/research/)
根据之前的研究文档，这个项目曾经遇到过生命周期函数导出问题，但当前问题是更基础的网络访问问题。

## Related Research
- qiankun官方文档关于网络请求和资源加载的说明
- Vite开发服务器配置和微前端集成的最佳实践

## Open Questions
1. Vue应用服务为什么停止运行？
2. Vite的构建模式配置是否影响开发服务器？
3. 是否需要调整Vite配置以更好地支持qiankun？
4. 如何确保子应用服务的稳定运行？
5. 是否需要添加服务健康检查机制？