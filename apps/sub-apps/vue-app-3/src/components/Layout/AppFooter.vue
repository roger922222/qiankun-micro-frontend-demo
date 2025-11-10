<template>
  <a-layout-footer class="vue-system-monitor footer">
    <div class="footer-content">
      <div class="footer-info">
        <span>系统监控 v1.0.0</span>
        <a-divider type="vertical" />
        <span>运行时间: {{ uptime }}</span>
        <a-divider type="vertical" />
        <span>活跃服务: {{ activeServices }}</span>
      </div>
      
      <div class="footer-status">
        <a-space>
          <div class="status-indicator">
            <span class="status-dot status-running"></span>
            <span>系统正常</span>
          </div>
          
          <div class="cpu-usage">
            CPU: {{ cpuUsage }}%
          </div>
          
          <div class="memory-usage">
            内存: {{ memoryUsage }}%
          </div>
        </a-space>
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
import { ref, onMounted, onUnmounted } from 'vue';
import { globalLogger } from '@shared/utils/logger';

const uptime = ref<string>('0天0小时0分钟');
const activeServices = ref<number>(5);
const cpuUsage = ref<number>(0);
const memoryUsage = ref<number>(0);

let statusTimer: NodeJS.Timeout | null = null;
const startTime = Date.now();

onMounted(() => {
  updateStatus();
  statusTimer = setInterval(updateStatus, 5000);
});

onUnmounted(() => {
  if (statusTimer) {
    clearInterval(statusTimer);
  }
});

const updateStatus = () => {
  // 计算运行时间
  const now = Date.now();
  const diff = now - startTime;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  uptime.value = `${days}天${hours}小时${minutes}分钟`;
  
  // 模拟系统指标更新
  cpuUsage.value = Math.floor(Math.random() * 30) + 20; // 20-50%
  memoryUsage.value = Math.floor(Math.random() * 20) + 60; // 60-80%
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
.vue-system-monitor.footer {
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

.footer-status {
  flex: 1 !important;
  display: flex !important;
  justify-content: center !important;
}

.status-indicator {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  font-size: 12px !important;
  color: #666 !important;
}

.status-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
}

.status-running {
  background-color: #52c41a !important;
}

.cpu-usage,
.memory-usage {
  font-size: 12px !important;
  color: #666 !important;
  font-family: monospace !important;
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
  
  .footer-status {
    order: -1 !important;
  }
}
</style>