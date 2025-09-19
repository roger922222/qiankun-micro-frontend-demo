<template>
  <div id="app" class="file-app">
    <a-config-provider :locale="locale">
      <a-layout class="file-app-layout">
        <AppHeader />
        
        <a-layout>
          <AppSidebar />
          
          <a-layout class="file-app-content">
            <a-layout-content class="file-app-main">
              <div class="file-app-container">
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
import { useFileStore } from './store/fileStore';
import zhCN from 'ant-design-vue/es/locale/zh_CN';

// 导入布局组件
import AppHeader from './components/Layout/AppHeader.vue';
import AppSidebar from './components/Layout/AppSidebar.vue';
import AppFooter from './components/Layout/AppFooter.vue';

// 导入共享库
import { globalEventBus } from '@shared/communication/event-bus';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';

const fileStore = useFileStore();
const locale = zhCN;

onMounted(() => {
  globalLogger.info('Vue File Management App mounted');

  // 监听全局事件
  const handleGlobalEvent = (event: any) => {
    globalLogger.info('Received global event', event);
    
    switch (event.type) {
      case EVENT_TYPES.THEME_CHANGE:
        document.documentElement.setAttribute('data-theme', event.data.theme);
        fileStore.setTheme(event.data.theme);
        break;
        
      case EVENT_TYPES.USER_LOGOUT:
        fileStore.reset();
        break;
        
      case EVENT_TYPES.LANGUAGE_CHANGE:
        fileStore.setLanguage(event.data.language);
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
    source: 'vue-file-management',
    timestamp: new Date().toISOString(),
    id: `app-ready-${Date.now()}`,
    data: {
      appName: 'vue-file-management',
      version: '1.0.0',
      features: ['file-upload', 'file-management', 'folder-organization']
    }
  });

  // 初始化示例数据
  initializeSampleData();
});

onUnmounted(() => {
  globalEventBus.off(EVENT_TYPES.THEME_CHANGE);
  globalEventBus.off(EVENT_TYPES.USER_LOGOUT);
  globalEventBus.off(EVENT_TYPES.LANGUAGE_CHANGE);
  
  globalLogger.info('Vue File Management App unmounted');
});

/**
 * 初始化示例数据
 */
const initializeSampleData = () => {
  const sampleFolders = [
    {
      id: 'folder_1',
      name: '文档',
      type: 'folder',
      parentId: null,
      size: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: ['read', 'write', 'delete']
    },
    {
      id: 'folder_2',
      name: '图片',
      type: 'folder',
      parentId: null,
      size: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: ['read', 'write', 'delete']
    }
  ];

  const sampleFiles = [
    {
      id: 'file_1',
      name: '项目需求文档.docx',
      type: 'file',
      parentId: 'folder_1',
      size: 1024000,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      url: '/files/project-requirements.docx',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      permissions: ['read', 'write']
    },
    {
      id: 'file_2',
      name: '系统架构图.png',
      type: 'file',
      parentId: 'folder_2',
      size: 512000,
      mimeType: 'image/png',
      url: '/files/architecture-diagram.png',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 172800000).toISOString(),
      permissions: ['read', 'write']
    },
    {
      id: 'file_3',
      name: 'README.md',
      type: 'file',
      parentId: null,
      size: 2048,
      mimeType: 'text/markdown',
      url: '/files/readme.md',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: new Date(Date.now() - 259200000).toISOString(),
      permissions: ['read', 'write', 'delete']
    }
  ];

  fileStore.setFolders(sampleFolders);
  fileStore.setFiles(sampleFiles);
  
  globalLogger.info('File management sample data initialized', {
    folders: sampleFolders.length,
    files: sampleFiles.length
  });
};
</script>

<style scoped>
.file-app {
  height: 100vh;
}

.file-app-layout {
  min-height: 100vh;
}

.file-app-content {
  background: #f0f2f5;
}

.file-app-main {
  margin: 24px;
  padding: 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.file-app-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 文件相关样式 */
.file-item {
  transition: all 0.3s ease;
  cursor: pointer;
}

.file-item:hover {
  background-color: #f5f5f5;
}

.file-selected {
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
}

.folder-icon {
  color: #faad14;
}

.file-icon {
  color: #1890ff;
}

/* 拖拽样式 */
.drag-over {
  border: 2px dashed #1890ff;
  background-color: #f0f9ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-app-main {
    margin: 16px;
    padding: 16px;
  }
}
</style>