<!--
  错误页面组件
  用于路由加载失败时的降级显示
-->
<template>
  <div class="error-page">
    <a-result
      status="error"
      title="页面加载失败"
      :sub-title="errorMessage"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="retryLoad">
            重新加载
          </a-button>
          <a-button @click="goHome">
            返回首页
          </a-button>
          <a-button @click="goBack">
            返回上一页
          </a-button>
        </a-space>
      </template>
    </a-result>
    
    <!-- 错误详情（仅开发环境显示） -->
    <div v-if="showDetails && isDevelopment" class="error-details">
      <a-collapse>
        <a-collapse-panel key="1" header="错误详情">
          <pre>{{ errorDetails }}</pre>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { globalLogger } from '@shared/utils/logger';

interface Props {
  error?: Error;
  message?: string;
}

const props = withDefaults(defineProps<Props>(), {
  message: '页面加载时发生了未知错误'
});

const router = useRouter();
const route = useRoute();

const showDetails = ref(false);
const retryCount = ref(0);
const maxRetries = 3;

// 计算属性
const isDevelopment = computed(() => process.env.NODE_ENV === 'development');
const errorMessage = computed(() => {
  if (props.error?.message) {
    return props.error.message;
  }
  return props.message;
});

const errorDetails = computed(() => {
  if (!props.error) return '无详细错误信息';
  
  return {
    message: props.error.message,
    stack: props.error.stack,
    route: route.path,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    retryCount: retryCount.value
  };
});

/**
 * 重新加载当前页面
 */
const retryLoad = () => {
  if (retryCount.value >= maxRetries) {
    globalLogger.warn('重试次数已达上限', { route: route.path, retryCount: retryCount.value });
    return;
  }
  
  retryCount.value++;
  
  globalLogger.info('重新加载页面', { 
    route: route.path, 
    retryCount: retryCount.value 
  });
  
  // 强制刷新路由
  router.replace({
    path: route.path,
    query: { ...route.query, _retry: Date.now() }
  });
};

/**
 * 返回首页
 */
const goHome = () => {
  globalLogger.info('返回首页', { from: route.path });
  router.push('/');
};

/**
 * 返回上一页
 */
const goBack = () => {
  globalLogger.info('返回上一页', { from: route.path });
  
  if (window.history.length > 1) {
    router.back();
  } else {
    // 如果没有历史记录，返回首页
    goHome();
  }
};

/**
 * 切换错误详情显示
 */
const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

onMounted(() => {
  // 记录错误页面访问
  globalLogger.error('错误页面加载', props.error || new Error(props.message), {
    route: route.path,
    query: route.query,
    timestamp: new Date().toISOString()
  });
  
  // 在开发环境下自动显示错误详情
  if (isDevelopment.value) {
    showDetails.value = true;
  }
});
</script>

<style scoped>
.error-page {
  padding: 50px 20px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.error-details {
  margin-top: 24px;
  width: 100%;
  max-width: 800px;
}

.error-details pre {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-page {
    padding: 30px 16px;
  }
  
  .error-details {
    margin-top: 16px;
  }
}
</style>