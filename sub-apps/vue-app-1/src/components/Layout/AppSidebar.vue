<template>
  <a-layout-sider 
    v-model:collapsed="collapsed" 
    :trigger="null" 
    collapsible
    class="app-sidebar"
    width="240"
  >
    <div class="sidebar-logo">
      <div class="logo-icon">📧</div>
      <div v-if="!collapsed" class="logo-text">
        <div class="logo-title">消息中心</div>
        <div class="logo-subtitle">Vue App</div>
      </div>
    </div>
    
    <a-menu
      v-model:selectedKeys="selectedKeys"
      mode="inline"
      theme="dark"
      :inline-collapsed="collapsed"
      @click="handleMenuClick"
    >
      <a-menu-item key="/">
        <template #icon>
          <message-outlined />
        </template>
        <span>消息列表</span>
      </a-menu-item>
      
      <a-menu-item key="/notifications">
        <template #icon>
          <bell-outlined />
        </template>
        <span>通知中心</span>
      </a-menu-item>
      
      <a-menu-item key="/push">
        <template #icon>
          <send-outlined />
        </template>
        <span>消息推送</span>
      </a-menu-item>
      
      <a-menu-item key="/communication-demo">
        <template #icon>
          <api-outlined />
        </template>
        <span>通信演示</span>
      </a-menu-item>
      
      <a-menu-divider />
      
      <a-sub-menu key="cross-app">
        <template #icon>
          <appstore-outlined />
        </template>
        <template #title>跨应用导航</template>
        
        <a-menu-item key="main-app" @click="navigateToApp('main', '/communication-demo')">
          <template #icon>
            <home-outlined />
          </template>
          主应用演示
        </a-menu-item>
        
        <a-menu-item key="react-app-1" @click="navigateToApp('react-app-1')">
          <template #icon>
            <user-outlined />
          </template>
          用户管理
        </a-menu-item>
        
        <a-menu-item key="react-app-2" @click="navigateToApp('react-app-2')">
          <template #icon>
            <shopping-outlined />
          </template>
          商品管理
        </a-menu-item>
        
        <a-menu-item key="vue-app-2" @click="navigateToApp('vue-app-2')">
          <template #icon>
            <folder-outlined />
          </template>
          文件管理
        </a-menu-item>
      </a-sub-menu>
    </a-menu>
    
    <!-- 折叠按钮 -->
    <div class="sidebar-trigger" @click="toggleCollapsed">
      <menu-unfold-outlined v-if="collapsed" />
      <menu-fold-outlined v-else />
    </div>
  </a-layout-sider>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  MessageOutlined,
  BellOutlined,
  SendOutlined,
  ApiOutlined,
  AppstoreOutlined,
  HomeOutlined,
  UserOutlined,
  ShoppingOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons-vue';

// 导入跨应用导航
import { globalRouteManager } from '@shared/communication/navigation';

const route = useRoute();
const router = useRouter();

// 响应式数据
const collapsed = ref(false);
const selectedKeys = ref([route.path]);

// 监听路由变化
watch(() => route.path, (newPath) => {
  selectedKeys.value = [newPath];
});

// 方法
const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

const handleMenuClick = ({ key }: { key: string }) => {
  if (key.startsWith('/')) {
    router.push(key);
  }
};

const navigateToApp = (appName: string, path: string = '/') => {
  globalRouteManager.navigateToApp(appName, path, {
    from: 'vue-app-1',
    timestamp: new Date().toISOString(),
    reason: '侧边栏导航'
  });
};
</script>

<style scoped>
.app-sidebar {
  position: relative;
  background: #001529;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  margin-bottom: 1px;
}

.logo-icon {
  font-size: 24px;
  margin-right: 12px;
}

.logo-text {
  color: #fff;
}

.logo-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 12px;
  opacity: 0.7;
  line-height: 1.2;
}

.sidebar-trigger {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  color: #fff;
  transition: all 0.3s;
}

.sidebar-trigger:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>