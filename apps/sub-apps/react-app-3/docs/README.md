# React-App-3 文档目录

## 概述

本目录包含了 `sub-apps/react-app-3`（订单管理系统）的详细技术文档，记录了开发过程中遇到的问题、解决方案和最佳实践。

## 文档结构

### 📋 [问题记录与解决方案.md](./问题记录与解决方案.md)
**主要内容：**
- Qiankun生命周期函数导出问题及解决方案
- ES模块导入错误问题及解决方案
- 与react-app-2对齐的重构过程
- 主应用setup.ts语法错误修复
- 路由配置问题
- TypeScript类型错误
- 预防措施和最佳实践

**适用场景：**
- 遇到类似问题时的快速查找和解决
- 了解问题的根本原因和完整解决过程
- 学习错误预防和最佳实践

### 💻 [代码对比与配置示例.md](./代码对比与配置示例.md)
**主要内容：**
- 错误代码 vs 正确代码的详细对比
- 完整的配置文件示例（package.json, vite.config.ts, tsconfig.json等）
- 状态管理完整实现代码
- 样式配置和模块化示例
- 构建和部署配置

**适用场景：**
- 需要参考具体代码实现时
- 配置新项目或调整现有配置
- 学习代码规范和架构设计

## 快速导航

### 🔧 问题解决
如果你遇到了以下问题，可以直接查看对应章节：

| 问题类型 | 查看章节 | 文档 |
|---------|----------|------|
| qiankun生命周期导出失败 | 1.1 | 问题记录与解决方案.md |
| ES模块导入错误 | 2.1 | 问题记录与解决方案.md |
| 路由在微前端环境不工作 | 5.1 | 问题记录与解决方案.md |
| TypeScript类型错误 | 6.1 | 问题记录与解决方案.md |

### 📝 代码参考
如果你需要参考具体的代码实现：

| 需求 | 查看章节 | 文档 |
|------|----------|------|
| qiankun生命周期正确实现 | 1.2 | 代码对比与配置示例.md |
| 共享库存根实现 | 2.2.1 | 代码对比与配置示例.md |
| Context API状态管理 | 4.1 | 代码对比与配置示例.md |
| Vite配置优化 | 5.2 | 代码对比与配置示例.md |
| 样式隔离和主题 | 6.2 | 代码对比与配置示例.md |

## 核心问题总结

### 1. Qiankun集成问题
**症状：** 生命周期函数无法正确导出，应用加载失败
**解决：** 使用 `vite-plugin-legacy-qiankun` 的 `createLifecyle` 辅助函数

### 2. 模块导入问题
**症状：** ES模块导入错误，共享库不存在
**解决：** 创建本地存根文件，提供基础功能实现

### 3. 路由配置问题
**症状：** 路由在微前端环境中不工作
**解决：** 正确处理 `basename` 和容器元素

### 4. 状态管理问题
**症状：** Context在微前端环境中状态丢失
**解决：** 完善的Context Provider和错误边界

## 技术栈

- **框架**: React 18 + TypeScript
- **状态管理**: Context API + useReducer
- **路由**: React Router v6
- **UI组件**: Ant Design v5
- **构建工具**: Vite
- **微前端**: qiankun + vite-plugin-legacy-qiankun
- **样式**: CSS Modules + CSS Variables

## 开发规范

### 文件命名
- 组件文件：`PascalCase.tsx` (如 `OrderList.tsx`)
- 工具文件：`camelCase.ts` (如 `orderUtils.ts`)
- 样式文件：`kebab-case.css` (如 `order-list.css`)

### 代码规范
- 使用 TypeScript 严格模式
- 组件使用函数式组件 + Hooks
- 状态管理使用 Context API
- 样式使用 CSS Modules 避免冲突

### 错误处理
- 使用 React Error Boundary 捕获组件错误
- API调用添加 try-catch 处理
- 关键操作添加日志记录

## 部署说明

### 开发环境
```bash
npm run dev
# 访问 http://localhost:3003
```

### 构建生产版本
```bash
npm run build
# 输出到 dist/ 目录
```

### 微前端集成
在主应用中注册：
```javascript
{
  name: 'react-order-management',
  entry: '//localhost:3003',
  container: '#subapp-viewport',
  activeRule: '/order-management',
}
```

## 相关文档

- [项目总体开发指南](../../../docs/DEVELOPMENT_GUIDE.md)
- [Qiankun故障排除指南](../../../docs/qiankun-troubleshooting-guide.md)
- [共享库导出问题解决](../../../shared/EXPORT_ISSUES_RESOLUTION.md)
- [React-App-2 参考实现](../../react-app-2/README.md)

## 维护说明

### 文档更新
当遇到新问题或找到更好的解决方案时，请及时更新相关文档：

1. **新问题**：在 `问题记录与解决方案.md` 中添加新章节
2. **代码改进**：在 `代码对比与配置示例.md` 中更新示例
3. **配置变更**：更新对应的配置文件示例

### 版本记录
- **v1.0.0** (2024-09-25): 初始版本，基础功能完成
- **v1.1.0** (计划): 添加更多业务功能和性能优化

## 联系方式

如果在使用过程中遇到问题，可以：
1. 查看本文档目录下的详细说明
2. 参考项目根目录的故障排除指南
3. 查看代码注释和示例

---

**最后更新时间：** 2024-09-25  
**文档版本：** v1.0.0