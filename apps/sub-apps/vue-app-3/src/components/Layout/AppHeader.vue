<template>
  <a-layout-header class="vue-system-monitor header">
    <div class="header-content">
      <div class="logo">
        <DashboardOutlined />
        <span>系统监控</span>
      </div>
      
      <div class="header-status">
        <a-space>
          <div class="status-item">
            <span class="status-label">系统状态:</span>
            <a-badge status="processing" text="正常运行" />
          </div>
          
          <div class="status-item">
            <span class="status-label">最后更新:</span>
            <span class="status-value">{{ lastUpdateTime }}</span>
          </div>
        </a-space>
      </div>
      
      <div class="header-actions">
        <a-space>
          <a-tooltip title="刷新数据">
            <a-button type="text" @click="handleRefresh">
              <ReloadOutlined />
            </a-button>
          </a-tooltip>
          
          <a-tooltip title="全屏">
            <a-button type="text" @click="toggleFullscreen">
              <FullscreenOutlined />
            </a-button>
          </a-tooltip>
          
          <a-tooltip title="设置">
            <a-button type="text" @click="showSettings">
              <SettingOutlined />
            </a-button>
          </a-tooltip>
          
          <a-dropdown>
            <a-button type="text">
              <UserOutlined />
              管理员
              <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile">
                  <UserOutlined />
                  个人信息
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </div>
  </a-layout-header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  DashboardOutlined, 
  ReloadOutlined, 
  FullscreenOutlined,
  SettingOutlined, 
  UserOutlined, 
  DownOutlined,
  LogoutOutlined 
} from '@ant-design/icons-vue';
import { globalLogger } from '@shared/utils/logger';

const lastUpdateTime = ref<string>('');

let updateTimer: NodeJS.Timeout | null = null;

onMounted(() => {
  updateTime();
  updateTimer = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
});

const updateTime = () => {
  const now = new Date();
  lastUpdateTime.value = now.toLocaleTimeString();
};

const handleRefresh = () => {
  globalLogger.info('Refreshing system monitor data');
  // TODO: 实现数据刷新
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

const showSettings = () => {
  globalLogger.info('Opening settings');
  // TODO: 实现设置功能
};
</script>

<style scoped>
.vue-system-monitor.header {
  background: #fff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  padding: 0 24px !important;
  height: 64px !important;
  line-height: 64px !important;
}

.header-content {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  height: 100% !important;
}

.logo {
  display: flex !important;
  align-items: center !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #1890ff !important;
}

.logo .anticon {
  margin-right: 8px !important;
  font-size: 20px !important;
}

.header-status {
  flex: 1 !important;
  display: flex !important;
  justify-content: center !important;
}

.status-item {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.status-label {
  color: #666 !important;
  font-size: 12px !important;
}

.status-value {
  color: #333 !important;
  font-size: 12px !important;
  font-family: monospace !important;
}

.header-actions .ant-btn {
  color: #666 !important;
}

.header-actions .ant-btn:hover {
  color: #1890ff !important;
}

@media (max-width: 768px) {
  .header-status {
    display: none !important;
  }
}
</style>