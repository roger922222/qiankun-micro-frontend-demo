# Qiankun微前端通信系统使用指南

## 概述

本指南详细介绍了如何在qiankun微前端架构中使用我们的通信系统。该系统提供了完整的跨应用通信解决方案，包括事件总线、状态管理、路由通信、实时通信等功能。

## 目录

- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [API参考](#api参考)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)
- [高级用法](#高级用法)

## 快速开始

### 1. 安装和配置

```typescript
// 在主应用中初始化通信系统
import { initializeCommunication } from '@shared/communication';

// 初始化配置
await initializeCommunication({
  debug: process.env.NODE_ENV === 'development',
  enablePerformanceMonitoring: true,
  enableErrorRecovery: true
});
```

### 2. 基础事件通信

```typescript
import { globalEventBus } from '@shared/communication/event-bus';

// 发送事件
await globalEventBus.emit({
  type: 'USER_LOGIN',
  source: 'user-management',
  data: { userId: 123, username: 'john' },
  timestamp: new Date().toISOString(),
  id: `login-${Date.now()}`
});

// 监听事件
globalEventBus.on('USER_LOGIN', (event) => {
  console.log('User logged in:', event.data);
});
```

### 3. 全局状态管理

```typescript
import { globalStateManager } from '@shared/communication/global-state';

// 更新状态
await globalStateManager.setState({
  user: {
    id: 123,
    name: 'John Doe',
    role: 'admin'
  }
});

// 监听状态变化
globalStateManager.subscribe((newState, prevState) => {
  console.log('State changed:', { newState, prevState });
});

// 获取当前状态
const currentState = globalStateManager.getState();
```

### 4. 跨应用导航

```typescript
import { globalRouteManager } from '@shared/communication/navigation';

// 导航到其他应用
await globalRouteManager.navigateToApp('user-management', '/users/123', {
  userId: 123,
  tab: 'profile'
});

// 返回上一页
await globalRouteManager.goBack();
```

## 核心概念

### 事件总线 (EventBus)

事件总线是应用间异步通信的核心机制，支持发布-订阅模式。

#### 事件结构

```typescript
interface BaseEvent {
  type: string;           // 事件类型
  source: string;         // 事件源
  data: any;             // 事件数据
  timestamp: string;      // 时间戳
  id: string;            // 唯一标识
  priority?: 'low' | 'normal' | 'high';  // 优先级
  metadata?: any;        // 元数据
}
```

#### 事件类型

```typescript
export const EVENT_TYPES = {
  // 用户相关
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_PROFILE_UPDATE: 'USER_PROFILE_UPDATE',
  
  // 应用相关
  APP_READY: 'APP_READY',
  APP_ERROR: 'APP_ERROR',
  
  // 数据相关
  DATA_UPDATE: 'DATA_UPDATE',
  DATA_SYNC: 'DATA_SYNC',
  
  // UI相关
  THEME_CHANGE: 'THEME_CHANGE',
  LANGUAGE_CHANGE: 'LANGUAGE_CHANGE',
  
  // 导航相关
  NAVIGATION: 'NAVIGATION',
  ROUTE_CHANGE: 'ROUTE_CHANGE'
};
```

### 全局状态管理

全局状态管理器提供跨应用的状态共享和同步。

#### 状态结构

```typescript
interface GlobalState {
  user: {
    currentUser: User | null;
    isAuthenticated: boolean;
    permissions: string[];
  };
  
  theme: {
    mode: 'light' | 'dark';
    primaryColor: string;
  };
  
  router: {
    currentRoute: RouteInfo;
    history: RouteInfo[];
  };
  
  notifications: {
    unreadCount: number;
    items: Notification[];
  };
  
  // 应用特定状态
  [appName: string]: any;
}
```

### 路由通信

路由通信系统支持跨应用的页面导航和参数传递。

#### 导航方法

```typescript
// 基础导航
navigateToApp(appName: string, path: string, params?: any): Promise<boolean>

// 带状态导航
navigateWithState(path: string, state: any): Promise<boolean>

// 历史导航
goBack(): Promise<boolean>
goForward(): Promise<boolean>

// 替换当前路由
replace(path: string, params?: any): Promise<boolean>
```

## API参考

### EventBus API

#### 基础方法

```typescript
class EventBus {
  // 发送事件
  async emit<T extends BaseEvent>(event: T): Promise<void>
  
  // 监听事件
  on<T extends BaseEvent>(type: string, handler: EventHandler<T>): void
  
  // 监听所有事件
  onAny(handler: (event: BaseEvent) => void): void
  
  // 移除监听器
  off(type: string, handler?: EventHandler): void
  
  // 移除所有监听器
  offAny(handler?: (event: BaseEvent) => void): void
  
  // 一次性监听
  once<T extends BaseEvent>(type: string, handler: EventHandler<T>): void
  
  // 获取监听器数量
  listenerCount(type: string): number
  
  // 获取所有事件类型
  eventNames(): string[]
}
```

#### 中间件支持

```typescript
// 添加事件中间件
globalEventBus.use(async (event, next) => {
  console.log('Event middleware:', event);
  await next();
});

// 日志中间件
import { loggingMiddleware } from '@shared/communication/middleware';
globalEventBus.use(loggingMiddleware);

// 权限中间件
import { permissionMiddleware } from '@shared/communication/middleware';
globalEventBus.use(permissionMiddleware);
```

### GlobalStateManager API

#### 基础方法

```typescript
class GlobalStateManager {
  // 设置状态
  async setState(updates: Partial<GlobalState>): Promise<void>
  
  // 获取状态
  getState(): GlobalState
  
  // 获取特定路径的状态
  getStateByPath(path: string): any
  
  // 订阅状态变化
  subscribe(callback: StateChangeCallback): () => void
  
  // 重置状态
  reset(): void
  
  // 状态快照
  createSnapshot(): StateSnapshot
  
  // 恢复快照
  restoreSnapshot(snapshot: StateSnapshot): void
}
```

#### 状态中间件

```typescript
// 持久化中间件
import { persistenceMiddleware } from '@shared/communication/middleware';
globalStateManager.use(persistenceMiddleware);

// 验证中间件
import { validationMiddleware } from '@shared/communication/middleware';
globalStateManager.use(validationMiddleware);
```

### RouteManager API

#### 导航方法

```typescript
class RouteManager {
  // 跨应用导航
  async navigateToApp(
    appName: string, 
    path: string, 
    params?: NavigationParams
  ): Promise<boolean>
  
  // 当前应用内导航
  async navigate(path: string, params?: any): Promise<boolean>
  
  // 带状态导航
  async navigateWithState(
    path: string, 
    state: any
  ): Promise<boolean>
  
  // 历史导航
  async goBack(): Promise<boolean>
  async goForward(): Promise<boolean>
  
  // 替换当前路由
  async replace(path: string, params?: any): Promise<boolean>
  
  // 获取当前路由信息
  getCurrentRoute(): RouteInfo
  
  // 获取导航历史
  getHistory(): RouteHistoryEntry[]
}
```

### 实时通信 API

#### WebSocket管理器

```typescript
class WebSocketManager {
  // 连接WebSocket
  connect(url: string, options?: WebSocketOptions): Promise<void>
  
  // 断开连接
  disconnect(): void
  
  // 发送消息
  send(message: any): void
  
  // 监听消息
  onMessage(handler: (message: any) => void): void
  
  // 连接状态
  isConnected(): boolean
  
  // 重连
  reconnect(): Promise<void>
}
```

#### 通知服务

```typescript
class NotificationService {
  // 显示通知
  show(notification: NotificationOptions): string
  
  // 隐藏通知
  hide(id: string): void
  
  // 清除所有通知
  clear(): void
  
  // 获取未读数量
  getUnreadCount(): number
}
```

## 最佳实践

### 1. 事件命名规范

```typescript
// ✅ 好的事件命名
const EVENT_TYPES = {
  USER_LOGIN: 'USER_LOGIN',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  PRODUCT_INVENTORY_UPDATED: 'PRODUCT_INVENTORY_UPDATED'
};

// ❌ 避免的命名
const BAD_EVENTS = {
  login: 'login',                    // 太简单
  userLoginEvent: 'userLoginEvent',  // 冗余
  user_login: 'user_login'          // 不一致的命名风格
};
```

### 2. 状态结构设计

```typescript
// ✅ 良好的状态结构
interface AppState {
  // 按功能模块组织
  user: UserState;
  products: ProductState;
  orders: OrderState;
  ui: UIState;
  
  // 包含元数据
  _metadata: {
    version: string;
    lastUpdated: string;
    source: string;
  };
}

// ❌ 避免的结构
interface BadState {
  // 平铺所有属性
  currentUser: User;
  userPermissions: string[];
  productList: Product[];
  orderList: Order[];
  theme: string;
  // ...
}
```

### 3. 错误处理

```typescript
// ✅ 完善的错误处理
try {
  await globalEventBus.emit({
    type: 'DATA_UPDATE',
    source: 'user-management',
    data: userData
  });
} catch (error) {
  // 记录错误
  console.error('Failed to emit event:', error);
  
  // 发送错误事件
  globalEventBus.emit({
    type: 'APP_ERROR',
    source: 'user-management',
    data: { error: error.message, context: 'data-update' }
  });
  
  // 用户友好的错误提示
  showErrorNotification('数据更新失败，请重试');
}
```

### 4. 性能优化

```typescript
// ✅ 事件防抖
import { debounce } from 'lodash';

const debouncedEmit = debounce(async (event) => {
  await globalEventBus.emit(event);
}, 300);

// ✅ 状态批量更新
const batchUpdates = {
  user: updatedUser,
  products: updatedProducts
};
await globalStateManager.setState(batchUpdates);

// ✅ 条件性监听
useEffect(() => {
  if (shouldListenToEvents) {
    const unsubscribe = globalEventBus.on('DATA_UPDATE', handleDataUpdate);
    return unsubscribe;
  }
}, [shouldListenToEvents]);
```

### 5. 内存管理

```typescript
// ✅ 正确的清理
useEffect(() => {
  const unsubscribeEvent = globalEventBus.on('USER_UPDATE', handleUserUpdate);
  const unsubscribeState = globalStateManager.subscribe(handleStateChange);
  
  return () => {
    unsubscribeEvent();
    unsubscribeState();
  };
}, []);

// ✅ 避免内存泄漏
class ComponentManager {
  private subscriptions: (() => void)[] = [];
  
  subscribe(callback: () => void) {
    this.subscriptions.push(callback);
  }
  
  destroy() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }
}
```

## 故障排除

### 常见问题

#### 1. 事件未触发

**问题**：发送的事件没有被其他应用接收到。

**解决方案**：
```typescript
// 检查事件是否正确发送
console.log('Emitting event:', event);
await globalEventBus.emit(event);

// 检查监听器是否正确注册
console.log('Event listeners:', globalEventBus.listenerCount('USER_LOGIN'));

// 使用调试模式
globalEventBus.setDebugMode(true);
```

#### 2. 状态同步问题

**问题**：状态更新后其他应用没有收到通知。

**解决方案**：
```typescript
// 检查状态是否正确更新
const prevState = globalStateManager.getState();
await globalStateManager.setState(updates);
const newState = globalStateManager.getState();
console.log('State change:', { prevState, newState });

// 检查订阅是否正确
const unsubscribe = globalStateManager.subscribe((newState, prevState) => {
  console.log('State subscription triggered:', { newState, prevState });
});
```

#### 3. 路由导航失败

**问题**：跨应用导航不工作。

**解决方案**：
```typescript
// 检查应用是否已注册
console.log('Registered apps:', globalRouteManager.getRegisteredApps());

// 检查导航参数
try {
  const result = await globalRouteManager.navigateToApp('user-management', '/users');
  console.log('Navigation result:', result);
} catch (error) {
  console.error('Navigation failed:', error);
}

// 启用导航调试
globalRouteManager.setDebugMode(true);
```

### 调试工具

#### 1. 通信调试面板

```typescript
// 启用调试面板
import { enableDebugPanel } from '@shared/communication/debug';

if (process.env.NODE_ENV === 'development') {
  enableDebugPanel();
}
```

#### 2. 性能监控

```typescript
// 启用性能监控
import { globalPerformanceMonitor } from '@shared/communication/monitoring';

globalPerformanceMonitor.enable();

// 获取性能报告
const report = globalPerformanceMonitor.getReport();
console.log('Performance report:', report);
```

#### 3. 事件流可视化

```typescript
// 启用事件流追踪
globalEventBus.enableTracing();

// 获取事件流
const eventFlow = globalEventBus.getEventFlow();
console.log('Event flow:', eventFlow);
```

## 高级用法

### 1. 自定义中间件

```typescript
// 创建自定义事件中间件
class CustomEventMiddleware implements EventMiddleware {
  async process<T extends BaseEvent>(event: T): Promise<T> {
    // 自定义处理逻辑
    if (event.type === 'SENSITIVE_DATA') {
      // 数据脱敏
      event.data = this.sanitizeData(event.data);
    }
    
    return event;
  }
  
  private sanitizeData(data: any): any {
    // 实现数据脱敏逻辑
    return data;
  }
}

// 使用自定义中间件
globalEventBus.use(new CustomEventMiddleware());
```

### 2. 状态持久化策略

```typescript
// 自定义持久化策略
class CustomPersistenceStrategy implements PersistenceStrategy {
  async save(key: string, data: any): Promise<void> {
    // 保存到IndexedDB
    await this.saveToIndexedDB(key, data);
  }
  
  async load(key: string): Promise<any> {
    // 从IndexedDB加载
    return await this.loadFromIndexedDB(key);
  }
  
  async remove(key: string): Promise<void> {
    // 从IndexedDB删除
    await this.removeFromIndexedDB(key);
  }
}

// 使用自定义持久化策略
globalStateManager.setPersistenceStrategy(new CustomPersistenceStrategy());
```

### 3. 路由守卫

```typescript
// 添加路由守卫
globalRouteManager.addGuard('beforeNavigate', async (to, from) => {
  // 权限检查
  if (to.meta?.requiresAuth && !isAuthenticated()) {
    // 重定向到登录页
    return '/login';
  }
  
  // 允许导航
  return true;
});

// 添加导航后处理
globalRouteManager.addGuard('afterNavigate', async (to, from) => {
  // 记录导航日志
  analytics.track('page_view', {
    page: to.path,
    app: to.appName
  });
});
```

### 4. 实时通信扩展

```typescript
// 自定义消息处理器
class CustomMessageHandler implements MessageHandler {
  canHandle(message: any): boolean {
    return message.type === 'CUSTOM_MESSAGE';
  }
  
  async handle(message: any): Promise<void> {
    // 自定义消息处理逻辑
    console.log('Handling custom message:', message);
  }
}

// 注册自定义处理器
globalWebSocketManager.addMessageHandler(new CustomMessageHandler());
```

### 5. 错误恢复策略

```typescript
// 自定义错误恢复
class CustomErrorRecovery implements ErrorRecoveryStrategy {
  async recover(error: Error, context: any): Promise<boolean> {
    if (error.name === 'NetworkError') {
      // 网络错误恢复
      await this.retryWithBackoff(context.operation);
      return true;
    }
    
    if (error.name === 'StateCorruptionError') {
      // 状态损坏恢复
      await globalStateManager.reset();
      await this.reloadApplicationState();
      return true;
    }
    
    return false;
  }
}

// 使用自定义错误恢复
globalErrorManager.setRecoveryStrategy(new CustomErrorRecovery());
```

## 总结

本指南涵盖了qiankun微前端通信系统的主要功能和用法。通过遵循最佳实践和使用提供的API，您可以构建高效、可靠的微前端应用。

如需更多帮助，请参考：
- [快速开始指南](./QUICK_START.md)
- [API文档](./API_REFERENCE.md)
- [示例代码](../examples/)
- [故障排除指南](./TROUBLESHOOTING.md)