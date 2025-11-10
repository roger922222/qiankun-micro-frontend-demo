<!--
  组件缓存包装器
  支持动态缓存控制和性能优化
-->
<template>
  <div class="keep-alive-wrapper">
    <keep-alive :include="cachedComponents" :max="maxCacheSize">
      <component 
        :is="currentComponent" 
        :key="componentKey"
        v-bind="componentProps"
        @component-ready="handleComponentReady"
        @component-error="handleComponentError"
      />
    </keep-alive>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="component-loading">
      <a-spin size="large" tip="加载中...">
        <div class="loading-placeholder"></div>
      </a-spin>
    </div>
    
    <!-- 错误状态 -->
    <div v-if="hasError" class="component-error">
      <a-result
        status="error"
        title="组件加载失败"
        :sub-title="errorMessage"
      >
        <template #extra>
          <a-button type="primary" @click="retryLoad">
            重新加载
          </a-button>
          <a-button @click="goHome">
            返回首页
          </a-button>
        </template>
      </a-result>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { globalLogger } from '@shared/utils/logger';

interface Props {
  component?: any;
  componentProps?: Record<string, any>;
  cacheKey?: string;
  forceRefresh?: boolean;
  maxCacheSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  componentProps: () => ({}),
  cacheKey: '',
  forceRefresh: false,
  maxCacheSize: 10
});

const emit = defineEmits<{
  componentMounted: [componentName: string];
  componentUnmounted: [componentName: string];
  componentError: [error: Error];
}>();

const route = useRoute();
const router = useRouter();

// 组件状态
const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref('');
const componentLoadTime = ref(0);

// 缓存管理
const cachedComponents = ref<string[]>([]);
const cacheStats = ref<Map<string, { hits: number; lastAccess: number }>>(new Map());

// 当前组件
const currentComponent = computed(() => {
  return props.component || route.matched[route.matched.length - 1]?.components?.default;
});

// 组件key，用于强制刷新
const componentKey = computed(() => {
  if (props.forceRefresh) {
    return `${route.path}-${Date.now()}`;
  }
  return props.cacheKey || route.path;
});

/**
 * 更新缓存组件列表
 */
const updateCachedComponents = () => {
  const routeName = route.name as string;
  const shouldCache = route.meta?.keepAlive !== false;
  
  if (shouldCache && routeName) {
    if (!cachedComponents.value.includes(routeName)) {
      // 检查缓存大小限制
      if (cachedComponents.value.length >= props.maxCacheSize) {
        // 移除最久未访问的组件
        const oldestComponent = findOldestCachedComponent();
        if (oldestComponent) {
          removeCachedComponent(oldestComponent);
        }
      }
      
      cachedComponents.value.push(routeName);
      updateCacheStats(routeName);
      
      globalLogger.info('组件已加入缓存', {
        component: routeName,
        cacheSize: cachedComponents.value.length
      });
    } else {
      // 更新访问统计
      updateCacheStats(routeName);
    }
  }
};

/**
 * 查找最久未访问的缓存组件
 */
const findOldestCachedComponent = (): string | null => {
  let oldestComponent: string | null = null;
  let oldestTime = Date.now();
  
  cacheStats.value.forEach((stats, componentName) => {
    if (stats.lastAccess < oldestTime) {
      oldestTime = stats.lastAccess;
      oldestComponent = componentName;
    }
  });
  
  return oldestComponent;
};

/**
 * 移除缓存组件
 */
const removeCachedComponent = (componentName: string) => {
  const index = cachedComponents.value.indexOf(componentName);
  if (index > -1) {
    cachedComponents.value.splice(index, 1);
    cacheStats.value.delete(componentName);
    
    globalLogger.info('组件已从缓存中移除', {
      component: componentName,
      reason: 'cache_limit_exceeded'
    });
    
    emit('componentUnmounted', componentName);
  }
};

/**
 * 更新缓存统计
 */
const updateCacheStats = (componentName: string) => {
  const stats = cacheStats.value.get(componentName) || { hits: 0, lastAccess: 0 };
  stats.hits++;
  stats.lastAccess = Date.now();
  cacheStats.value.set(componentName, stats);
};

/**
 * 清理指定组件缓存
 */
const clearComponentCache = (componentName?: string) => {
  if (componentName) {
    removeCachedComponent(componentName);
  } else {
    // 清理所有缓存
    cachedComponents.value.forEach(name => {
      emit('componentUnmounted', name);
    });
    cachedComponents.value.length = 0;
    cacheStats.value.clear();
    
    globalLogger.info('已清理所有组件缓存');
  }
};

/**
 * 获取缓存统计信息
 */
const getCacheStats = () => {
  return {
    cached: cachedComponents.value.slice(),
    stats: Object.fromEntries(cacheStats.value),
    size: cachedComponents.value.length,
    maxSize: props.maxCacheSize
  };
};

/**
 * 组件就绪处理
 */
const handleComponentReady = (componentName: string) => {
  isLoading.value = false;
  hasError.value = false;
  componentLoadTime.value = performance.now();
  
  emit('componentMounted', componentName);
  
  globalLogger.info('组件加载完成', {
    component: componentName,
    route: route.path
  });
};

/**
 * 组件错误处理
 */
const handleComponentError = (error: Error) => {
  isLoading.value = false;
  hasError.value = true;
  errorMessage.value = error.message || '未知错误';
  
  emit('componentError', error);
  
  globalLogger.error('组件加载失败', error, {
    route: route.path,
    component: route.name
  });
};

/**
 * 重新加载组件
 */
const retryLoad = () => {
  hasError.value = false;
  isLoading.value = true;
  
  // 清除当前组件缓存并重新加载
  if (route.name) {
    clearComponentCache(route.name as string);
  }
  
  // 强制重新加载路由
  router.replace({
    path: route.path,
    query: { ...route.query, _t: Date.now() }
  });
};

/**
 * 返回首页
 */
const goHome = () => {
  router.push('/');
};

// 监听路由变化
watch(
  () => route.path,
  () => {
    updateCachedComponents();
  },
  { immediate: true }
);

// 监听组件变化
watch(
  () => currentComponent.value,
  (newComponent) => {
    if (newComponent) {
      isLoading.value = true;
      
      // 添加自动检测机制：如果组件在合理时间内没有触发 component-ready 事件，自动设置为完成
      setTimeout(() => {
        if (isLoading.value) {
          globalLogger.warn('组件加载超时，自动设置为完成状态', {
            component: route.name,
            route: route.path
          });
          isLoading.value = false;
        }
      }, 1000); // 1秒超时
    }
  }
);

onMounted(() => {
  globalLogger.info('KeepAliveWrapper 组件已挂载');
  updateCachedComponents();
});

onUnmounted(() => {
  globalLogger.info('KeepAliveWrapper 组件已卸载');
});

// 暴露方法供外部调用
defineExpose({
  clearComponentCache,
  getCacheStats,
  retryLoad
});
</script>

<style scoped>
.keep-alive-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.component-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.loading-placeholder {
  width: 100px;
  height: 100px;
}

.component-error {
  padding: 50px 20px;
}

/* 过渡动画 */
.component-enter-active,
.component-leave-active {
  transition: all 0.3s ease;
}

.component-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.component-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>