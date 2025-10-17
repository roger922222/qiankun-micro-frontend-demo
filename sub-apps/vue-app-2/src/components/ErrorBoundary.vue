<template>
  <div class="error-boundary">
    <slot v-if="!hasError" />
    <div v-else class="error-content">
      <div class="error-icon">
        <ExclamationCircleOutlined />
      </div>
      <h3 class="error-title">组件加载出错</h3>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <a-button type="primary" @click="handleRetry">
          <ReloadOutlined />
          重试
        </a-button>
        <a-button @click="handleGoHome">
          <HomeOutlined />
          返回首页
        </a-button>
      </div>
      <a-collapse v-if="showDetails" class="error-details">
        <a-collapse-panel key="1" header="错误详情">
          <pre>{{ errorStack }}</pre>
        </a-collapse-panel>
      </a-collapse>
      <a-button 
        type="link" 
        size="small" 
        @click="showDetails = !showDetails"
        class="toggle-details"
      >
        {{ showDetails ? '隐藏' : '显示' }}错误详情
      </a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  ExclamationCircleOutlined,
  ReloadOutlined,
  HomeOutlined
} from '@ant-design/icons-vue';
import { globalLogger } from '@shared/utils/logger';

const router = useRouter();

const hasError = ref(false);
const errorMessage = ref('');
const errorStack = ref('');
const showDetails = ref(false);

// 捕获子组件错误
onErrorCaptured((error, instance, info) => {
  hasError.value = true;
  errorMessage.value = error.message || '未知错误';
  errorStack.value = error.stack || '无错误堆栈信息';
  
  globalLogger.error('ErrorBoundary 捕获到组件错误', error, {
    componentInfo: info,
    instance: instance?.$?.type?.name
  });
  
  // 检查是否是异步组件相关错误
  if (error.message.includes('locateNonHydratedAsyncRoot') || 
      error.message.includes('Cannot read properties of null')) {
    errorMessage.value = '异步组件加载失败，这可能是由于组件导出问题或微前端环境配置导致的';
  }
  
  return false; // 阻止错误继续向上传播
});

// 重试操作
const handleRetry = async () => {
  try {
    hasError.value = false;
    errorMessage.value = '';
    errorStack.value = '';
    showDetails.value = false;
    
    // 等待下一个 tick 后重新渲染
    await nextTick();
    
    globalLogger.info('ErrorBoundary 重试渲染');
  } catch (error) {
    globalLogger.error('ErrorBoundary 重试失败', error);
    hasError.value = true;
    errorMessage.value = '重试失败，请刷新页面';
  }
};

// 返回首页
const handleGoHome = () => {
  router.push('/files').catch(() => {
    window.location.href = '/file-management/files';
  });
};
</script>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ErrorBoundary'
});
</script>

<style scoped>
.error-boundary {
  width: 100% !important;
  height: 100% !important;
}

.error-content {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 400px !important;
  padding: 40px 20px !important;
  text-align: center !important;
}

.error-icon {
  font-size: 64px !important;
  color: #ff4d4f !important;
  margin-bottom: 24px !important;
}

.error-title {
  font-size: 24px !important;
  color: #262626 !important;
  margin-bottom: 16px !important;
  font-weight: 600 !important;
}

.error-message {
  font-size: 16px !important;
  color: #595959 !important;
  margin-bottom: 32px !important;
  max-width: 600px !important;
  line-height: 1.6 !important;
}

.error-actions {
  display: flex !important;
  gap: 16px !important;
  margin-bottom: 24px !important;
}

.error-details {
  max-width: 800px !important;
  width: 100% !important;
  margin-bottom: 16px !important;
}

.error-details pre {
  font-size: 12px !important;
  background: #f5f5f5 !important;
  padding: 12px !important;
  border-radius: 4px !important;
  overflow-x: auto !important;
  text-align: left !important;
  white-space: pre-wrap !important;
  word-break: break-all !important;
}

.toggle-details {
  color: #1890ff !important;
}
</style>