# 微前端监控和错误处理系统

## 概述

本系统为qiankun微前端架构提供了完整的监控和错误处理解决方案，包括性能监控、指标收集、错误管理和自动恢复机制。

## 系统架构

```
监控和错误处理系统
├── 性能监控 (Performance Monitoring)
│   ├── 性能监控器 (PerformanceMonitor)
│   ├── 指标收集器 (MetricsCollector)
│   └── 监控面板 (PerformanceMonitorUI)
├── 错误处理 (Error Handling)
│   ├── 错误管理器 (ErrorManager)
│   ├── 恢复服务 (RecoveryService)
│   └── 错误边界 (ErrorBoundary)
└── 可视化组件 (UI Components)
    ├── 性能监控面板
    └── 错误处理界面
```

## 核心功能

### 1. 性能监控系统

#### 1.1 性能监控器 (PerformanceMonitor)
- **文件**: `performance-monitor.ts`
- **功能**:
  - 监控事件处理性能
  - 监控状态更新性能
  - 监控导航性能
  - 监控内存使用情况
  - 实时性能数据收集
  - 性能阈值告警

#### 1.2 指标收集器 (MetricsCollector)
- **文件**: `metrics-collector.ts`
- **功能**:
  - 指标聚合和分析
  - 时间序列数据管理
  - 趋势分析
  - 告警管理
  - 性能报告生成

#### 1.3 监控面板 (PerformanceMonitorUI)
- **文件**: `../components/PerformanceMonitor.ts`
- **功能**:
  - 实时性能数据展示
  - 可视化图表
  - 交互式控制面板
  - HTML界面生成

### 2. 错误处理系统

#### 2.1 错误管理器 (ErrorManager)
- **文件**: `../error/error-manager.ts`
- **功能**:
  - 全局错误捕获
  - 错误分类和统计
  - 错误报告生成
  - 错误过滤和转换
  - 多种错误处理策略

#### 2.2 恢复服务 (RecoveryService)
- **文件**: `../error/recovery-service.ts`
- **功能**:
  - 事件重试机制
  - 状态回滚机制
  - 降级处理策略
  - 自动恢复流程
  - 恢复点管理

#### 2.3 错误边界 (ErrorBoundary)
- **文件**: `../components/ErrorBoundary.ts`
- **功能**:
  - React/Vue错误边界
  - 用户友好的错误界面
  - 错误恢复操作
  - 错误报告功能

## 使用方法

### 1. 基础初始化

```typescript
import { initializeCommunicationSystem } from './shared/communication';

// 初始化监控和错误处理系统
initializeCommunicationSystem({
  enableMonitoring: true,
  enableErrorHandling: true,
  enableRecovery: true
});
```

### 2. 性能监控

```typescript
import { 
  globalPerformanceMonitor,
  withPerformanceMonitoring 
} from './shared/communication/monitoring';

// 启用性能监控
globalPerformanceMonitor.setEnabled(true);

// 监控函数性能
const monitoredFunction = withPerformanceMonitoring(
  async () => {
    // 你的业务逻辑
  },
  'business-operation'
);

// 手动记录性能指标
globalPerformanceMonitor.monitorEventPerformance(
  event,
  listenerCount,
  middlewareCount,
  startTime
);
```

### 3. 错误处理

```typescript
import { 
  globalErrorManager,
  withErrorHandling 
} from './shared/communication/error';

// 错误处理装饰器
const safeFunction = withErrorHandling(
  () => {
    // 可能出错的代码
  },
  { component: 'my-component' }
);

// 手动处理错误
globalErrorManager.handleRuntimeError(error, {
  component: 'my-component',
  context: { /* 额外信息 */ }
});
```

### 4. 恢复机制

```typescript
import { 
  globalRecoveryService,
  withRetry,
  withStateProtection 
} from './shared/communication/error';

// 重试装饰器
const retryableFunction = withRetry(
  async () => {
    // 可能失败的异步操作
  },
  { maxRetries: 3, retryDelay: 1000 }
);

// 状态保护装饰器
const protectedFunction = withStateProtection(
  () => {
    // 会修改状态的操作
  },
  'Critical operation'
);

// 手动创建恢复点
const recoveryId = globalRecoveryService.createRollbackPoint(
  currentState,
  'Before risky operation'
);

// 回滚到恢复点
await globalRecoveryService.rollbackState(recoveryId);
```

### 5. UI组件使用

```typescript
import { 
  createPerformanceMonitor,
  createErrorBoundary 
} from './shared/communication';

// 创建性能监控UI
const performanceMonitor = createPerformanceMonitor({
  container: document.getElementById('monitor-container'),
  refreshInterval: 5000
});

// 创建错误边界
const errorBoundary = createErrorBoundary({
  container: document.getElementById('error-container'),
  enableRecovery: true
});
```

## 配置选项

### 性能监控配置

```typescript
const performanceOptions = {
  enabled: true,
  maxMetrics: 1000,
  sampleRate: 1.0,
  autoCleanup: true,
  thresholds: {
    eventDuration: 10,     // 事件处理时间阈值 (ms)
    stateDuration: 5,      // 状态更新时间阈值 (ms)
    navigationDuration: 100, // 导航时间阈值 (ms)
    memoryUsage: 100 * 1024 * 1024 // 内存使用阈值 (bytes)
  }
};
```

### 错误处理配置

```typescript
const errorOptions = {
  enabled: true,
  maxErrors: 1000,
  autoReport: true,
  enableConsoleLogging: true,
  enableRemoteLogging: false,
  remoteEndpoint: 'https://api.example.com/errors'
};
```

### 恢复服务配置

```typescript
const recoveryOptions = {
  enabled: true,
  maxRollbackPoints: 50,
  autoRollbackEnabled: true,
  retryStrategies: [
    {
      name: 'Network Retry',
      errorTypes: ['network-error'],
      maxRetries: 5,
      retryDelay: 2000,
      backoffMultiplier: 2
    }
  ]
};
```

## 监控指标

### 性能指标
- **事件处理时间**: 平均、最小、最大、P50、P90、P95、P99
- **状态更新时间**: 各种状态操作的性能统计
- **内存使用**: 堆内存使用情况和趋势
- **导航性能**: 跨应用导航的耗时统计

### 错误指标
- **错误率**: 按时间段统计的错误发生率
- **错误分类**: 按错误类型和严重程度分类
- **恢复成功率**: 自动恢复机制的成功率
- **错误趋势**: 错误数量的时间趋势分析

## 告警机制

系统支持多级告警：
- **Info**: 信息性提示
- **Warning**: 性能警告
- **Error**: 错误告警
- **Critical**: 严重错误告警

告警触发条件：
- 性能指标超过阈值
- 错误率异常增长
- 内存使用过高
- 恢复机制失败

## 最佳实践

### 1. 性能监控
- 合理设置采样率，避免监控开销过大
- 定期清理历史数据，防止内存泄漏
- 根据业务需求调整性能阈值
- 关注关键路径的性能指标

### 2. 错误处理
- 为不同类型的错误设置不同的处理策略
- 及时创建恢复点，特别是在关键操作前
- 合理配置重试次数和延迟时间
- 保持错误信息的详细性和可读性

### 3. 系统集成
- 在应用启动时初始化监控系统
- 在关键业务流程中添加监控点
- 定期检查和分析监控数据
- 根据监控结果优化系统性能

## 演示和测试

查看 `../examples/monitoring-demo.html` 文件，了解如何使用监控和错误处理系统的完整演示。

## 扩展性

系统设计具有良好的扩展性：
- 支持自定义监控指标
- 支持自定义错误处理策略
- 支持自定义恢复机制
- 支持插件化的中间件系统

## 性能影响

监控系统对业务性能的影响：
- 性能监控开销 < 1%
- 错误处理开销 < 0.5%
- 内存占用 < 10MB
- 不影响关键业务流程