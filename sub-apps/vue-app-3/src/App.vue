<template>
  <div id="app" class="monitor-app">
    <a-config-provider :locale="locale">
      <a-layout class="monitor-app-layout">
        <AppHeader />
        
        <a-layout>
          <AppSidebar />
          
          <a-layout class="monitor-app-content">
            <a-layout-content class="monitor-app-main">
              <div class="monitor-app-container">
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
import { onMounted, onUnmounted, reactive } from 'vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';

// 导入布局组件
import AppHeader from './components/Layout/AppHeader.vue';
import AppSidebar from './components/Layout/AppSidebar.vue';
import AppFooter from './components/Layout/AppFooter.vue';

// 导入共享库
import { globalEventBus } from '@shared/communication/event-bus';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';

// 使用Composition API管理状态
const monitorState = reactive({
  systemMetrics: {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0
  },
  alerts: [],
  logs: [],
  services: [],
  theme: 'light',
  language: 'zh-CN'
});

const locale = zhCN;

onMounted(() => {
  globalLogger.info('Vue System Monitor App mounted');

  // 监听全局事件
  const handleGlobalEvent = (event: any) => {
    globalLogger.info('Received global event', event);
    
    switch (event.type) {
      case EVENT_TYPES.THEME_CHANGE:
        document.documentElement.setAttribute('data-theme', event.data.theme);
        monitorState.theme = event.data.theme;
        break;
        
      case EVENT_TYPES.USER_LOGOUT:
        resetMonitorState();
        break;
        
      case EVENT_TYPES.LANGUAGE_CHANGE:
        monitorState.language = event.data.language;
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
    source: 'vue-system-monitor',
    timestamp: new Date().toISOString(),
    id: `app-ready-${Date.now()}`,
    data: {
      appName: 'vue-system-monitor',
      version: '1.0.0',
      features: ['system-monitoring', 'performance-metrics', 'log-analysis']
    }
  });

  // 初始化示例数据
  initializeSampleData();
  
  // 启动实时数据更新
  startRealTimeUpdates();
});

onUnmounted(() => {
  globalEventBus.off(EVENT_TYPES.THEME_CHANGE);
  globalEventBus.off(EVENT_TYPES.USER_LOGOUT);
  globalEventBus.off(EVENT_TYPES.LANGUAGE_CHANGE);
  
  globalLogger.info('Vue System Monitor App unmounted');
});

/**
 * 初始化示例数据
 */
const initializeSampleData = () => {
  // 初始化系统指标
  monitorState.systemMetrics = {
    cpu: Math.random() * 100,
    memory: Math.random() * 100,
    disk: Math.random() * 100,
    network: Math.random() * 100
  };

  // 初始化告警数据
  monitorState.alerts = [
    {
      id: 'alert_1',
      level: 'warning',
      message: 'CPU使用率较高',
      timestamp: new Date().toISOString(),
      resolved: false
    },
    {
      id: 'alert_2',
      level: 'info',
      message: '系统正常运行',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      resolved: true
    }
  ];

  // 初始化日志数据
  monitorState.logs = [
    {
      id: 'log_1',
      level: 'info',
      message: '用户登录成功',
      timestamp: new Date().toISOString(),
      source: 'auth-service'
    },
    {
      id: 'log_2',
      level: 'error',
      message: '数据库连接超时',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      source: 'database'
    },
    {
      id: 'log_3',
      level: 'warn',
      message: 'API响应时间较长',
      timestamp: new Date(Date.now() - 180000).toISOString(),
      source: 'api-gateway'
    }
  ];

  // 初始化服务状态
  monitorState.services = [
    {
      id: 'service_1',
      name: '用户服务',
      status: 'running',
      uptime: '99.9%',
      responseTime: '120ms'
    },
    {
      id: 'service_2',
      name: '订单服务',
      status: 'running',
      uptime: '99.8%',
      responseTime: '85ms'
    },
    {
      id: 'service_3',
      name: '支付服务',
      status: 'warning',
      uptime: '98.5%',
      responseTime: '250ms'
    }
  ];

  globalLogger.info('System monitor sample data initialized');
};

/**
 * 重置监控状态
 */
const resetMonitorState = () => {
  monitorState.systemMetrics = {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0
  };
  monitorState.alerts = [];
  monitorState.logs = [];
  monitorState.services = [];
};

/**
 * 启动实时数据更新
 */
const startRealTimeUpdates = () => {
  // 模拟实时数据更新
  setInterval(() => {
    monitorState.systemMetrics.cpu = Math.random() * 100;
    monitorState.systemMetrics.memory = Math.random() * 100;
    monitorState.systemMetrics.disk = Math.random() * 100;
    monitorState.systemMetrics.network = Math.random() * 100;
  }, 5000);
};

// 导出状态供子组件使用
defineExpose({
  monitorState
});
</script>

<style scoped>
.monitor-app {
  height: 100vh;
}

.monitor-app-layout {
  min-height: 100vh;
}

.monitor-app-content {
  background: #f0f2f5;
}

.monitor-app-main {
  margin: 24px;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.monitor-app-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 监控相关样式 */
.metric-card {
  transition: all 0.3s ease;
  border-radius: 8px;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.status-running {
  color: #52c41a;
}

.status-warning {
  color: #faad14;
}

.status-error {
  color: #ff4d4f;
}

.alert-warning {
  border-left: 4px solid #faad14;
}

.alert-error {
  border-left: 4px solid #ff4d4f;
}

.alert-info {
  border-left: 4px solid #1890ff;
}

/* 实时数据动画 */
.realtime-data {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .monitor-app-main {
    margin: 16px;
    padding: 16px;
  }
}
</style>