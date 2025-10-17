<template>
  <div id="app" class="vue-message-app message-app" :data-qiankun="isQiankunEnv">
    <a-config-provider :locale="locale">
      <a-layout class="message-app-layout">
        <!-- 侧边栏菜单 -->
        <a-layout-sider 
          width="240" 
          class="message-app-sider"
          collapsible
          v-model:collapsed="collapsed"
        >
          <div class="sider-header">
            <h3 v-if="!collapsed">Vue 消息中心</h3>
            <div v-else class="sider-logo">Vue</div>
          </div>
          
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="vertical"
            theme="light"
            class="sider-menu"
            @select="handleMenuSelect"
          >
            <a-menu-item key="/" :disabled="isNavigating">
              <template #icon><message-outlined /></template>
              <span v-if="!collapsed">消息中心</span>
            </a-menu-item>
            
            <a-menu-item key="/push" :disabled="isNavigating">
              <template #icon><send-outlined /></template>
              <span v-if="!collapsed">消息推送</span>
            </a-menu-item>
            
            <a-menu-item key="/notifications" :disabled="isNavigating">
              <template #icon><bell-outlined /></template>
              <span v-if="!collapsed">通知中心</span>
            </a-menu-item>
            
            <a-menu-item key="/communication-demo" :disabled="isNavigating">
              <template #icon><api-outlined /></template>
              <span v-if="!collapsed">通信演示</span>
            </a-menu-item>
          </a-menu>
          
          <!-- 性能指示器移到侧边栏底部 -->
          <div class="sider-footer" v-if="!isQiankunEnv">
            <a-tooltip title="路由切换性能">
              <a-badge :count="routePerformanceScore" :color="getPerformanceColor()">
                <dashboard-outlined class="performance-icon" @click="showPerformanceModal = true" />
              </a-badge>
            </a-tooltip>
          </div>
        </a-layout-sider>
        
        <a-layout-content class="message-app-main">
          <div class="message-app-container">
            <KeepAliveWrapper 
              @component-mounted="handleComponentMounted"
              @component-unmounted="handleComponentUnmounted"
              @component-error="handleComponentError"
            >
              <router-view v-slot="{ Component, route }">
                <transition
                  name="page-transition"
                  mode="out-in"
                  @before-enter="handleBeforeEnter"
                  @after-enter="handleAfterEnter"
                >
                  <component 
                    :is="Component" 
                    :key="route.path"
                    v-if="Component"
                  />
                </transition>
              </router-view>
            </KeepAliveWrapper>
          </div>
        </a-layout-content>
      </a-layout>
    </a-config-provider>
    
    <!-- 路由性能模态框 -->
    <a-modal
      v-model:open="showPerformanceModal"
      title="路由性能统计"
      :footer="null"
      width="600px"
    >
      <div class="performance-stats">
        <a-table
          :columns="performanceColumns"
          :data-source="performanceData"
          size="small"
          :pagination="false"
        />
        
        <div class="performance-actions">
          <a-button @click="clearPerformanceData">清除数据</a-button>
          <a-button type="primary" @click="exportPerformanceData">导出数据</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter, useRoute } from 'vue-router';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { 
  MessageOutlined, 
  SendOutlined, 
  BellOutlined, 
  ApiOutlined,
  DashboardOutlined
} from '@ant-design/icons-vue';

// 导入组件
import KeepAliveWrapper from './components/KeepAliveWrapper.vue';

// 导入共享库
import { globalEventBus } from '@shared/communication/event-bus';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';
import { getRoutePerformanceData, clearRoutePerformanceData } from './router/index';

const store = useStore();
const router = useRouter();
const route = useRoute();
const locale = zhCN;

// 环境检测
const isQiankunEnv = computed(() => window.__POWERED_BY_QIANKUN__ || false);

// 页面过渡状态
const isPageTransitioning = ref(false);

// 导航状态
const selectedKeys = ref<string[]>([route.path]);
const isNavigating = ref(false);

// 侧边栏收起状态
const collapsed = ref(false);

// 性能监控状态
const showPerformanceModal = ref(false);
const performanceData = ref<any[]>([]);
const routePerformanceScore = computed(() => {
  if (performanceData.value.length === 0) return 0;
  const avgLoadTime = performanceData.value.reduce((sum, item) => sum + item.loadTime, 0) / performanceData.value.length;
  if (avgLoadTime < 100) return Math.floor(avgLoadTime / 10);
  return 10;
});

// 表格列配置
const performanceColumns = [
  { title: '路由', dataIndex: 'route', key: 'route' },
  { title: '加载时间(ms)', dataIndex: 'loadTime', key: 'loadTime' },
  { title: '时间戳', dataIndex: 'timestamp', key: 'timestamp' }
];

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
          store.commit('RESET_MESSAGES_STATE');
          break;;
        
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
  
  // 监听路由性能事件
  setupRoutePerformanceMonitoring();
});

/**
 * 设置路由性能监控
 */
const setupRoutePerformanceMonitoring = () => {
  // 监听路由变化性能
  router.afterEach((to, from) => {
    // 记录路由切换完成事件
    globalEventBus.emit({
      type: 'ROUTE_PERFORMANCE',
      source: 'vue-message-center',
      timestamp: new Date().toISOString(),
      id: `route-perf-${Date.now()}`,
      data: {
        from: from.path,
        to: to.path,
        timestamp: new Date().toISOString()
      }
    });
  });
};

onUnmounted(() => {
  globalEventBus.off(EVENT_TYPES.THEME_CHANGE);
  globalEventBus.off(EVENT_TYPES.USER_LOGOUT);
  globalEventBus.off(EVENT_TYPES.LANGUAGE_CHANGE);
  
  globalLogger.info('Vue Message Center App unmounted');
});

// 初始化性能数据
onMounted(() => {
  updatePerformanceData();
  
  // 定期更新性能数据
  setInterval(() => {
    updatePerformanceData();
  }, 5000);
});

/**
 * 组件挂载处理
 */
const handleComponentMounted = (componentName: string) => {
  globalLogger.info('组件已挂载', { component: componentName });
};

/**
 * 组件卸载处理
 */
const handleComponentUnmounted = (componentName: string) => {
  globalLogger.info('组件已卸载', { component: componentName });
};

/**
 * 组件错误处理
 */
const handleComponentError = (error: Error) => {
  globalLogger.error('组件错误', error);
};

/**
 * 页面过渡开始
 */
const handleBeforeEnter = () => {
  isPageTransitioning.value = true;
};

/**
 * 页面过渡结束
 */
const handleAfterEnter = () => {
  isPageTransitioning.value = false;
};

/**
 * 获取性能颜色
 */
const getPerformanceColor = () => {
  const score = routePerformanceScore.value;
  if (score <= 3) return 'green';
  if (score <= 6) return 'orange';
  return 'red';
};

/**
 * 处理菜单选择
 */
const handleMenuSelect = async ({ key }: { key: string }) => {
  if (isNavigating.value || key === route.path) {
    return;
  }
  
  isNavigating.value = true;
  
  try {
    await router.push(key);
    globalLogger.info('导航成功', { to: key, from: route.path });
  } catch (error) {
    globalLogger.error('导航失败', error, { to: key });
  } finally {
    setTimeout(() => {
      isNavigating.value = false;
    }, 300);
  }
};

/**
 * 更新性能数据
 */
const updatePerformanceData = () => {
  performanceData.value = getRoutePerformanceData();
};

/**
 * 清除性能数据
 */
const clearPerformanceData = () => {
  clearRoutePerformanceData();
  performanceData.value = [];
};

/**
 * 导出性能数据
 */
const exportPerformanceData = () => {
  const data = JSON.stringify(performanceData.value, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `route-performance-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

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

  store.commit('SET_MESSAGES', sampleMessages);
  globalLogger.info('Message center sample data initialized', { count: sampleMessages.length });
};

// 监听路由变化
watch(
  () => route.path,
  (newPath) => {
    selectedKeys.value = [newPath];
    updatePerformanceData();
  },
  { immediate: true }
);
</script>

<style>
.vue-message-app .message-app {
  height: 100vh;
}

.vue-message-app .message-app-layout {
  min-height: 100vh;
}

/* 侧边栏样式 */
.message-app-sider {
  background: #ffffff;
  border-right: 1px solid #e8e8e8;
  height: 100vh;
  position: relative;
  transition: all 0.2s;
}

.message-app-sider .ant-layout-sider-trigger {
  background: #f0f0f0;
  border-top: 1px solid #e8e8e8;
  color: #333333;
}

.message-app-sider .ant-layout-sider-trigger:hover {
  background: #1890ff;
  color: #ffffff;
}

.sider-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.sider-header h3 {
  color: #333333;
  margin: 0;
  font-size: 18px;
  text-align: center;
}

.sider-logo {
  color: #1890ff;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin: 0;
}

.sider-menu {
  border: none;
  background: transparent;
  padding: 16px 0;
}

.sider-menu .ant-menu-item {
  height: 48px;
  line-height: 48px;
  margin: 4px 16px;
  border-radius: 6px;
  padding-left: 24px;
  color: #333333;
}

.sider-menu .ant-menu-item .anticon {
  color: #666666;
}

.sider-menu .ant-menu-item:hover {
  background-color: #f5f5f5;
  color: #333333;
}

.sider-menu .ant-menu-item:hover .anticon {
  color: #1890ff;
}

.sider-menu .ant-menu-item-selected {
  background-color: #e6f7ff;
  color: #1890ff;
}

.sider-menu .ant-menu-item-selected .anticon {
  color: #1890ff;
}

.sider-footer {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
}

.performance-icon {
  color: #666666;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.3s;
}

.performance-icon:hover {
  color: #1890ff;
}

/* 内容区域样式 */
.vue-message-app .message-app-main {
  padding: 24px;
  background: #fff;
  min-height: 100vh;
  overflow: auto;
}

.vue-message-app .message-app-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 性能统计样式 */
.performance-stats {
  max-height: 400px;
  overflow-y: auto;
}

.performance-actions {
  margin-top: 16px;
  text-align: right;
}

.performance-actions .ant-btn {
  margin-left: 8px;
}

/* 消息相关样式 */
.vue-message-app .message-item {
  transition: all 0.3s ease;
}

.vue-message-app .message-item:hover {
  background-color: #f5f5f5;
}

.vue-message-app .message-unread {
  border-left: 4px solid #1890ff;
}

.vue-message-app .message-high-priority {
  border-left: 4px solid #ff4d4f;
}

/* 页面过渡动画 */
.page-transition-enter-active {
  transition: all 0.3s ease-out;
}

.page-transition-leave-active {
  transition: all 0.2s ease-in;
}

.page-transition-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-transition-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 在 qiankun 环境下优化过渡效果 */
.vue-message-app[data-qiankun] .page-transition-enter-active,
.vue-message-app[data-qiankun] .page-transition-leave-active {
  transition-duration: 0.2s; /* 减少过渡时间 */
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-app-sider {
    width: 200px !important;
    min-width: 200px !important;
    max-width: 200px !important;
  }
  
  .message-app-sider.ant-layout-sider-collapsed {
    width: 64px !important;
    min-width: 64px !important;
    max-width: 64px !important;
  }
  
  .vue-message-app .message-app-main {
    padding: 16px;
  }
  
  .sider-header h3 {
    font-size: 16px;
  }
  
  .sider-menu .ant-menu-item {
    height: 40px;
    line-height: 40px;
    margin: 2px 8px;
    padding-left: 16px;
  }
  
  /* 移动端优化过渡效果 */
  .page-transition-enter-from,
  .page-transition-leave-to {
    transform: translateY(20px); /* 垂直滑动更适合移动端 */
  }
}
</style>