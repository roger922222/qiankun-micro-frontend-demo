<template>
  <div id="app" class="message-app">
    <a-config-provider :locale="locale">
      <a-layout class="message-app-layout">
        <AppHeader />
        
        <a-layout>
          <AppSidebar />
          
          <a-layout class="message-app-content">
            <a-layout-content class="message-app-main">
              <div class="message-app-container">
                <router-view />
              </div>
            </a-layout-content>
            
            <AppFooter />
          </a-layout>
        </a-layout>
      </a-layout>
    </a-config-provider>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import zhCN from 'ant-design-vue/es/locale/zh_CN';

// 导入布局组件
import AppHeader from './components/Layout/AppHeader.vue';
import AppSidebar from './components/Layout/AppSidebar.vue';
import AppFooter from './components/Layout/AppFooter.vue';

// 导入共享库
import { globalEventBus } from '@shared/communication/event-bus';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';

const store = useStore();
const locale = zhCN;

onMounted(() => {
  globalLogger.info('Vue Message Center App mounted');

  // 监听全局事件
  const handleGlobalEvent = (event: any) => {
    globalLogger.info('Received global event', event);
    
    switch (event.type) {
      case EVENT_TYPES.THEME_CHANGE:
        document.documentElement.setAttribute('data-theme', event.data.theme);
        store.commit('settings/SET_THEME', event.data.theme);
        break;
        
      case EVENT_TYPES.USER_LOGOUT:
        store.commit('messages/RESET_STATE');
        break;
        
      case EVENT_TYPES.LANGUAGE_CHANGE:
        store.commit('settings/SET_LANGUAGE', event.data.language);
        break;
        
      default:
        break;
    }
  };

  // 注册事件监听器
  globalEventBus.on(EVENT_TYPES.THEME_CHANGE, handleGlobalEvent);
  globalEventBus.on(EVENT_TYPES.USER_LOGOUT, handleGlobalEvent);
  globalEventBus.on(EVENT_TYPES.LANGUAGE_CHANGE, handleGlobalEvent);

  // 发送应用就绪事件
  globalEventBus.emit({
    type: EVENT_TYPES.APP_READY,
    source: 'vue-message-center',
    timestamp: new Date().toISOString(),
    id: `app-ready-${Date.now()}`,
    data: {
      appName: 'vue-message-center',
      version: '1.0.0',
      features: ['message-management', 'notifications', 'real-time-chat']
    }
  });

  // 初始化示例数据
  initializeSampleData();
});

onUnmounted(() => {
  globalEventBus.off(EVENT_TYPES.THEME_CHANGE);
  globalEventBus.off(EVENT_TYPES.USER_LOGOUT);
  globalEventBus.off(EVENT_TYPES.LANGUAGE_CHANGE);
  
  globalLogger.info('Vue Message Center App unmounted');
});

/**
 * 初始化示例数据
 */
const initializeSampleData = () => {
  const sampleMessages = [
    {
      id: 'msg_1',
      title: '系统通知',
      content: '欢迎使用微前端消息中心！',
      type: 'system',
      status: 'unread',
      sender: 'system',
      createdAt: new Date().toISOString(),
      priority: 'normal'
    },
    {
      id: 'msg_2',
      title: '订单更新',
      content: '您的订单 ORD-2024-001 已发货',
      type: 'order',
      status: 'read',
      sender: 'order-system',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      priority: 'high'
    },
    {
      id: 'msg_3',
      title: '用户消息',
      content: '李四给您发送了一条消息',
      type: 'user',
      status: 'unread',
      sender: 'user_2',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      priority: 'normal'
    }
  ];

  store.commit('messages/SET_MESSAGES', sampleMessages);
  globalLogger.info('Message center sample data initialized', { count: sampleMessages.length });
};
</script>

<style scoped>
.message-app {
  height: 100vh;
}

.message-app-layout {
  min-height: 100vh;
}

.message-app-content {
  background: #f0f2f5;
}

.message-app-main {
  margin: 24px;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-app-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 消息相关样式 */
.message-item {
  transition: all 0.3s ease;
}

.message-item:hover {
  background-color: #f5f5f5;
}

.message-unread {
  border-left: 4px solid #1890ff;
}

.message-high-priority {
  border-left: 4px solid #ff4d4f;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-app-main {
    margin: 16px;
    padding: 16px;
  }
}
</style>