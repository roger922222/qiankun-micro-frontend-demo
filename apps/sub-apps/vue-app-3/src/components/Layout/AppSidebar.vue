<template>
  <a-layout-sider 
    class="vue-system-monitor sidebar"
    :collapsed="collapsed"
    :trigger="null"
    collapsible
    width="240"
  >
    <div class="sidebar-content">
      <div class="collapse-trigger" @click="toggleCollapse">
        <MenuUnfoldOutlined v-if="collapsed" />
        <MenuFoldOutlined v-else />
      </div>
      
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="inline"
        :inline-collapsed="collapsed"
        @click="handleMenuClick"
      >
        <a-menu-item key="/dashboard">
          <DashboardOutlined />
          <span>系统概览</span>
        </a-menu-item>
        
        <a-menu-item key="/performance">
          <LineChartOutlined />
          <span>性能监控</span>
        </a-menu-item>
        
        <a-menu-item key="/logs">
          <FileTextOutlined />
          <span>日志查看</span>
        </a-menu-item>
        
        <a-menu-item key="/alerts">
          <AlertOutlined />
          <span>告警管理</span>
          <a-badge v-if="alertCount > 0" :count="alertCount" size="small" />
        </a-menu-item>
        
        <a-menu-item key="/services">
          <CloudServerOutlined />
          <span>服务监控</span>
        </a-menu-item>
      </a-menu>
    </div>
  </a-layout-sider>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DashboardOutlined,
  LineChartOutlined,
  FileTextOutlined,
  AlertOutlined,
  CloudServerOutlined
} from '@ant-design/icons-vue';
import { globalLogger } from '@shared/utils/logger';

const router = useRouter();
const route = useRoute();

const collapsed = ref(false);
const selectedKeys = ref<string[]>([]);

// 模拟告警数量
const alertCount = computed(() => {
  // 这里可以从状态管理或API获取实际的告警数量
  return 3;
});

// 监听路由变化更新选中状态
watch(() => route.path, (newPath) => {
  selectedKeys.value = [newPath];
}, { immediate: true });

const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
  globalLogger.debug('Sidebar collapsed:', collapsed.value);
};

const handleMenuClick = ({ key }: { key: string }) => {
  globalLogger.info('Menu clicked:', key);
  router.push(key);
};
</script>

<style scoped>
.vue-system-monitor.sidebar {
  background: #fff !important;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1) !important;
}

.sidebar-content {
  height: 100% !important;
  position: relative !important;
}

.collapse-trigger {
  position: absolute !important;
  top: 16px !important;
  right: 16px !important;
  z-index: 1 !important;
  cursor: pointer !important;
  padding: 4px !important;
  border-radius: 4px !important;
  transition: all 0.3s ease !important;
}

.collapse-trigger:hover {
  background-color: #f5f5f5 !important;
}

.ant-menu {
  border-right: none !important;
  padding-top: 60px !important;
}

.ant-menu-item {
  margin: 4px 8px !important;
  border-radius: 6px !important;
  position: relative !important;
}

.ant-menu-item:hover {
  background-color: #e6f7ff !important;
}

.ant-menu-item-selected {
  background-color: #1890ff !important;
  color: #fff !important;
}

.ant-menu-item-selected .anticon {
  color: #fff !important;
}

.ant-badge {
  position: absolute !important;
  right: 16px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
}
</style>