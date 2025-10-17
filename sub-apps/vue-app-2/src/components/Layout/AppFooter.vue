<template>
  <a-layout-footer class="vue-file-management footer">
    <div class="footer-content">
      <div class="footer-info">
        <span>文件管理系统 v1.0.0</span>
        <a-divider type="vertical" />
        <span>总文件数: {{ totalFiles }}</span>
        <a-divider type="vertical" />
        <span>总大小: {{ formatFileSize(totalSize) }}</span>
      </div>
      
      <div class="footer-links">
        <a-space>
          <a href="#" @click.prevent="showHelp">帮助</a>
          <a href="#" @click.prevent="showAbout">关于</a>
        </a-space>
      </div>
    </div>
  </a-layout-footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useFileStore } from '../../store/fileStore';
import { globalLogger } from '@shared/utils/logger';

const fileStore = useFileStore();

const totalFiles = computed(() => fileStore.files.length);
const totalSize = computed(() => fileStore.totalSize);

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const showHelp = () => {
  globalLogger.info('Showing help');
  // TODO: 实现帮助功能
};

const showAbout = () => {
  globalLogger.info('Showing about');
  // TODO: 实现关于功能
};
</script>

<style scoped>
.vue-file-management.footer {
  background: #f0f2f5 !important;
  padding: 16px 24px !important;
  border-top: 1px solid #e8e8e8 !important;
}

.footer-content {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
}

.footer-info {
  color: #666 !important;
  font-size: 12px !important;
}

.footer-links a {
  color: #1890ff !important;
  text-decoration: none !important;
  font-size: 12px !important;
}

.footer-links a:hover {
  text-decoration: underline !important;
}

@media (max-width: 768px) {
  .footer-content {
    flex-direction: column !important;
    gap: 8px !important;
  }
}
</style>