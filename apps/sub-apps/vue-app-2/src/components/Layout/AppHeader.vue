<template>
  <a-layout-header class="vue-file-management header">
    <div class="header-content">
      <div class="logo">
        <FolderOutlined />
        <span>文件管理系统</span>
      </div>
      
      <div class="header-actions">
        <a-space>
          <a-tooltip title="刷新">
            <a-button type="text" @click="handleRefresh">
              <ReloadOutlined />
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
              用户
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
import { 
  FolderOutlined, 
  ReloadOutlined, 
  SettingOutlined, 
  UserOutlined, 
  DownOutlined,
  LogoutOutlined 
} from '@ant-design/icons-vue';
import { globalLogger } from '@shared/utils/logger';

const handleRefresh = () => {
  globalLogger.info('Refreshing file management app');
  window.location.reload();
};

const showSettings = () => {
  globalLogger.info('Opening settings');
  // TODO: 实现设置功能
};
</script>

<style scoped>
.vue-file-management.header {
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

.header-actions .ant-btn {
  color: #666 !important;
}

.header-actions .ant-btn:hover {
  color: #1890ff !important;
}
</style>