<template>
  <a-layout-sider 
    class="vue-file-management sidebar"
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
        <a-menu-item key="/files">
          <FolderOutlined />
          <span>文件管理</span>
        </a-menu-item>
        
        <a-menu-item key="/upload">
          <UploadOutlined />
          <span>文件上传</span>
        </a-menu-item>
        
        <a-menu-item key="/gallery">
          <PictureOutlined />
          <span>文件预览</span>
        </a-menu-item>
        
        <a-menu-item key="/settings">
          <SettingOutlined />
          <span>设置</span>
        </a-menu-item>
      </a-menu>
    </div>
  </a-layout-sider>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  FolderOutlined,
  UploadOutlined,
  PictureOutlined,
  SettingOutlined
} from '@ant-design/icons-vue';
import { globalLogger } from '@shared/utils/logger';

const router = useRouter();
const route = useRoute();

const collapsed = ref(false);
const selectedKeys = ref<string[]>([]);

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
.vue-file-management.sidebar {
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
</style>