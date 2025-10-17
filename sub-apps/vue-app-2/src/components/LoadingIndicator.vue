<template>
  <div class="loading-indicator">
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">{{ message }}</p>
      <div v-if="showProgress" class="loading-progress">
        <a-progress 
          :percent="progress" 
          :show-info="false" 
          stroke-color="#1890ff"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Props {
  message?: string;
  showProgress?: boolean;
  autoProgress?: boolean;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  message: '正在加载...',
  showProgress: false,
  autoProgress: false,
  duration: 3000
});

const progress = ref(0);
let progressTimer: number | null = null;

onMounted(() => {
  if (props.autoProgress && props.showProgress) {
    startAutoProgress();
  }
});

onUnmounted(() => {
  if (progressTimer) {
    clearInterval(progressTimer);
  }
});

const startAutoProgress = () => {
  const increment = 100 / (props.duration / 100);
  
  progressTimer = window.setInterval(() => {
    if (progress.value < 90) {
      progress.value += increment;
    }
  }, 100);
};

// 暴露方法给父组件
defineExpose({
  setProgress: (value: number) => {
    progress.value = Math.min(Math.max(value, 0), 100);
  },
  complete: () => {
    progress.value = 100;
    if (progressTimer) {
      clearInterval(progressTimer);
    }
  }
});
</script>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'LoadingIndicator'
});
</script>

<style scoped>
.loading-indicator {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 200px !important;
  padding: 40px 20px !important;
}

.loading-content {
  text-align: center !important;
  max-width: 300px !important;
}

.loading-spinner {
  position: relative !important;
  width: 60px !important;
  height: 60px !important;
  margin: 0 auto 20px !important;
}

.spinner-ring {
  position: absolute !important;
  width: 100% !important;
  height: 100% !important;
  border: 3px solid transparent !important;
  border-radius: 50% !important;
  animation: spin 1.5s linear infinite !important;
}

.spinner-ring:nth-child(1) {
  border-top-color: #1890ff !important;
  animation-delay: 0s !important;
}

.spinner-ring:nth-child(2) {
  border-right-color: #52c41a !important;
  animation-delay: 0.5s !important;
  width: 80% !important;
  height: 80% !important;
  top: 10% !important;
  left: 10% !important;
}

.spinner-ring:nth-child(3) {
  border-bottom-color: #faad14 !important;
  animation-delay: 1s !important;
  width: 60% !important;
  height: 60% !important;
  top: 20% !important;
  left: 20% !important;
}

@keyframes spin {
  0% {
    transform: rotate(0deg) !important;
  }
  100% {
    transform: rotate(360deg) !important;
  }
}

.loading-text {
  color: #666 !important;
  font-size: 14px !important;
  margin-bottom: 16px !important;
  line-height: 1.5 !important;
}

.loading-progress {
  max-width: 200px !important;
  margin: 0 auto !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .loading-indicator {
    min-height: 150px !important;
    padding: 20px 10px !important;
  }
  
  .loading-spinner {
    width: 40px !important;
    height: 40px !important;
    margin-bottom: 16px !important;
  }
  
  .loading-text {
    font-size: 12px !important;
  }
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .loading-text {
    color: #d9d9d9 !important;
  }
}
</style>