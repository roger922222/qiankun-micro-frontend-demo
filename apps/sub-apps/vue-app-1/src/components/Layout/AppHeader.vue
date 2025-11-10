<template>
  <a-layout-header class="app-header">
    <div class="header-content">
      <div class="header-left">
        <h2 class="app-title">Vue消息中心</h2>
      </div>
      
      <div class="header-right">
        <a-space>
          <!-- 通知按钮 -->
          <a-badge :count="unreadCount" :offset="[10, 0]">
            <a-button 
              type="text" 
              shape="circle" 
              @click="$router.push('/notifications')"
            >
              <template #icon>
                <bell-outlined />
              </template>
            </a-button>
          </a-badge>
          
          <!-- 主题切换 -->
          <a-switch 
            v-model:checked="isDarkMode"
            @change="toggleTheme"
            checked-children="🌙"
            un-checked-children="☀️"
          />
          
          <!-- 用户菜单 -->
          <a-dropdown>
            <a-button type="text">
              <template #icon>
                <user-outlined />
              </template>
              Vue用户
              <down-outlined />
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="profile">
                  <user-outlined />
                  个人资料
                </a-menu-item>
                <a-menu-item key="settings">
                  <setting-outlined />
                  设置
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout">
                  <logout-outlined />
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
import { computed } from 'vue';
import { useStore } from 'vuex';
import { 
  BellOutlined, 
  UserOutlined, 
  DownOutlined,
  SettingOutlined,
  LogoutOutlined
} from '@ant-design/icons-vue';

const store = useStore();

// 计算属性
const unreadCount = computed(() => store.state.messages.unreadCount);
const isDarkMode = computed({
  get: () => store.state.settings.theme === 'dark',
  set: (value) => store.dispatch('updateTheme', value ? 'dark' : 'light')
});

// 方法
const toggleTheme = (dark: boolean) => {
  const theme = dark ? 'dark' : 'light';
  store.dispatch('updateTheme', theme);
  
  // 应用主题到文档
  document.documentElement.setAttribute('data-theme', theme);
};
</script>

<style scoped>
.app-header {
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-left {
  display: flex;
  align-items: center;
}

.app-title {
  margin: 0;
  color: #1890ff;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
}

/* 暗色主题 */
[data-theme="dark"] .app-header {
  background: #001529;
  border-bottom-color: #303030;
}

[data-theme="dark"] .app-title {
  color: #fff;
}
</style>