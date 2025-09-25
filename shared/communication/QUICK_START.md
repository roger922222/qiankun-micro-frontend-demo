# Qiankun微前端通信系统快速开始指南

## 简介

本指南将帮助您在15分钟内快速上手qiankun微前端通信系统。我们将通过简单的示例展示如何实现跨应用通信。

## 前置条件

- Node.js 16+
- 已配置的qiankun微前端环境
- 基础的TypeScript/JavaScript知识

## 快速安装

### 1. 项目结构

确保您的项目结构如下：

```
your-project/
├── main-app/          # 主应用
├── sub-apps/          # 子应用目录
│   ├── react-app-1/   # React子应用
│   └── vue-app-1/     # Vue子应用
└── shared/            # 共享库
    └── communication/ # 通信系统
```

### 2. 导入通信模块

在您的应用中导入所需的通信模块：

```typescript
// 基础通信功能
import { 
  globalEventBus,
  globalStateManager,
  globalRouteManager 
} from '@shared/communication';
```

## 5分钟快速体验

### 步骤1：发送您的第一个事件

在任意应用中发送事件：

```typescript
// 在React组件中
import { globalEventBus } from '@shared/communication/event-bus';

function MyComponent() {
  const handleClick = async () => {
    await globalEventBus.emit({
      type: 'HELLO_WORLD',
      source: 'react-app-1',
      data: { message: 'Hello from React!' },
      timestamp: new Date().toISOString(),
      id: `hello-${Date.now()}`
    });
  };

  return <button onClick={handleClick}>发送事件</button>;
}
```

### 步骤2：监听事件

在另一个应用中监听事件：

```typescript
// 在Vue组件中
import { globalEventBus } from '@shared/communication/event-bus';

export default {
  mounted() {
    globalEventBus.on('HELLO_WORLD', (event) => {
      console.log('收到消息:', event.data.message);
      alert(`收到来自 ${event.source} 的消息: ${event.data.message}`);
    });
  }
}
```

### 步骤3：共享状态

更新全局状态：

```typescript
import { globalStateManager } from '@shared/communication/global-state';

// 更新用户信息
await globalStateManager.setState({
  user: {
    id: 1,
    name: '张三',
    role: 'admin'
  }
});
```

监听状态变化：

```typescript
// 订阅状态变化
globalStateManager.subscribe((newState, prevState) => {
  console.log('状态已更新:', newState.user);
});
```

### 步骤4：跨应用导航

实现跨应用页面跳转：

```typescript
import { globalRouteManager } from '@shared/communication/navigation';

// 跳转到用户管理应用
await globalRouteManager.navigateToApp('react-app-1', '/users/123', {
  userId: 123,
  action: 'edit'
});
```

## 完整示例

### React应用示例

```typescript
// React应用 - src/components/CommunicationDemo.tsx
import React, { useState, useEffect } from 'react';
import { 
  globalEventBus, 
  globalStateManager, 
  globalRouteManager 
} from '@shared/communication';

const CommunicationDemo: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [globalState, setGlobalState] = useState<any>({});

  useEffect(() => {
    // 监听事件
    const handleEvent = (event: any) => {
      setMessages(prev => [...prev, event]);
    };

    // 监听状态变化
    const handleStateChange = (newState: any) => {
      setGlobalState(newState);
    };

    globalEventBus.onAny(handleEvent);
    globalStateManager.subscribe(handleStateChange);

    // 初始化状态
    setGlobalState(globalStateManager.getState());

    return () => {
      globalEventBus.offAny(handleEvent);
      globalStateManager.unsubscribe(handleStateChange);
    };
  }, []);

  const sendMessage = async () => {
    await globalEventBus.emit({
      type: 'USER_MESSAGE',
      source: 'react-demo',
      data: { text: '来自React的消息', timestamp: Date.now() },
      timestamp: new Date().toISOString(),
      id: `msg-${Date.now()}`
    });
  };

  const updateState = async () => {
    await globalStateManager.setState({
      demo: {
        counter: (globalState.demo?.counter || 0) + 1,
        lastUpdate: new Date().toISOString()
      }
    });
  };

  const navigateToVue = async () => {
    await globalRouteManager.navigateToApp('vue-app-1', '/messages');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>React通信演示</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={sendMessage}>发送消息</button>
        <button onClick={updateState}>更新状态</button>
        <button onClick={navigateToVue}>跳转到Vue应用</button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <h3>接收到的消息</h3>
          <div style={{ height: '200px', overflow: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: '10px', padding: '5px', background: '#f5f5f5' }}>
                <strong>{msg.type}</strong> from {msg.source}
                <br />
                <small>{JSON.stringify(msg.data)}</small>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3>全局状态</h3>
          <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px' }}>
            {JSON.stringify(globalState, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CommunicationDemo;
```

### Vue应用示例

```vue
<!-- Vue应用 - src/components/CommunicationDemo.vue -->
<template>
  <div class="communication-demo">
    <h2>Vue通信演示</h2>
    
    <div class="controls">
      <button @click="sendMessage">发送消息</button>
      <button @click="updateState">更新状态</button>
      <button @click="navigateToReact">跳转到React应用</button>
    </div>

    <div class="content">
      <div class="messages">
        <h3>接收到的消息</h3>
        <div class="message-list">
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            class="message-item"
          >
            <strong>{{ msg.type }}</strong> from {{ msg.source }}
            <br />
            <small>{{ JSON.stringify(msg.data) }}</small>
          </div>
        </div>
      </div>

      <div class="state">
        <h3>全局状态</h3>
        <pre>{{ JSON.stringify(globalState, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  globalEventBus, 
  globalStateManager, 
  globalRouteManager 
} from '@shared/communication';

const messages = ref<any[]>([]);
const globalState = ref<any>({});

let unsubscribeEvent: (() => void) | null = null;
let unsubscribeState: (() => void) | null = null;

onMounted(() => {
  // 监听事件
  const handleEvent = (event: any) => {
    messages.value.push(event);
  };

  // 监听状态变化
  const handleStateChange = (newState: any) => {
    globalState.value = newState;
  };

  unsubscribeEvent = () => globalEventBus.offAny(handleEvent);
  unsubscribeState = globalStateManager.subscribe(handleStateChange);
  
  globalEventBus.onAny(handleEvent);
  globalState.value = globalStateManager.getState();
});

onUnmounted(() => {
  if (unsubscribeEvent) unsubscribeEvent();
  if (unsubscribeState) unsubscribeState();
});

const sendMessage = async () => {
  await globalEventBus.emit({
    type: 'USER_MESSAGE',
    source: 'vue-demo',
    data: { text: '来自Vue的消息', timestamp: Date.now() },
    timestamp: new Date().toISOString(),
    id: `msg-${Date.now()}`
  });
};

const updateState = async () => {
  await globalStateManager.setState({
    demo: {
      counter: (globalState.value.demo?.counter || 0) + 1,
      lastUpdate: new Date().toISOString()
    }
  });
};

const navigateToReact = async () => {
  await globalRouteManager.navigateToApp('react-app-1', '/users');
};
</script>

<style scoped>
.communication-demo {
  padding: 20px;
}

.controls {
  margin-bottom: 20px;
}

.controls button {
  margin-right: 10px;
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.content {
  display: flex;
  gap: 20px;
}

.messages, .state {
  flex: 1;
}

.message-list {
  height: 200px;
  overflow: auto;
  border: 1px solid #ccc;
  padding: 10px;
}

.message-item {
  margin-bottom: 10px;
  padding: 5px;
  background: #f5f5f5;
  border-radius: 4px;
}

pre {
  background: #f5f5f5;
  padding: 10px;
  font-size: 12px;
  overflow: auto;
  max-height: 200px;
}
</style>
```

## 常用功能速查

### 事件通信

```typescript
// 发送事件
await globalEventBus.emit({
  type: 'EVENT_TYPE',
  source: 'app-name',
  data: { /* 数据 */ }
});

// 监听事件
globalEventBus.on('EVENT_TYPE', (event) => {
  console.log(event.data);
});

// 监听所有事件
globalEventBus.onAny((event) => {
  console.log('收到事件:', event);
});
```

### 状态管理

```typescript
// 更新状态
await globalStateManager.setState({
  user: { name: '张三' },
  theme: 'dark'
});

// 获取状态
const state = globalStateManager.getState();

// 监听状态变化
globalStateManager.subscribe((newState, prevState) => {
  console.log('状态变化:', newState);
});
```

### 跨应用导航

```typescript
// 导航到其他应用
await globalRouteManager.navigateToApp('app-name', '/path', { param: 'value' });

// 返回上一页
await globalRouteManager.goBack();

// 获取当前路由
const currentRoute = globalRouteManager.getCurrentRoute();
```

### 实时通信

```typescript
import { globalNotificationService } from '@shared/communication/realtime';

// 显示通知
globalNotificationService.show({
  title: '通知标题',
  message: '通知内容',
  type: 'success',
  duration: 3000
});
```

## 调试技巧

### 开启调试模式

```typescript
// 在开发环境中开启调试
if (process.env.NODE_ENV === 'development') {
  globalEventBus.setDebugMode(true);
  globalStateManager.setDebugMode(true);
  globalRouteManager.setDebugMode(true);
}
```

### 查看通信状态

```typescript
// 查看事件监听器
console.log('事件监听器数量:', globalEventBus.listenerCount('EVENT_TYPE'));

// 查看当前状态
console.log('当前状态:', globalStateManager.getState());

// 查看路由历史
console.log('路由历史:', globalRouteManager.getHistory());
```

## 下一步

现在您已经掌握了基础用法，可以：

1. 查看 [完整使用指南](./USAGE_GUIDE.md) 了解高级功能
2. 参考 [API文档](./API_REFERENCE.md) 查看详细API
3. 查看 [示例代码](../examples/) 学习更多用法
4. 阅读 [最佳实践](./BEST_PRACTICES.md) 优化您的代码

## 常见问题

### Q: 事件没有被接收到怎么办？

A: 检查以下几点：
1. 确保监听器在事件发送前已注册
2. 检查事件类型是否拼写正确
3. 确保应用已正确初始化通信系统

### Q: 状态更新后其他应用没有响应？

A: 确保：
1. 其他应用已订阅状态变化
2. 状态更新使用了正确的API
3. 没有在组件卸载时忘记取消订阅

### Q: 跨应用导航不工作？

A: 检查：
1. 目标应用是否已在qiankun中注册
2. 路径是否正确
3. 目标应用是否已加载

如需更多帮助，请查看 [故障排除指南](./TROUBLESHOOTING.md)。