/**
 * Vue应用导航集成
 * 为Vue应用提供导航系统集成功能
 */

import { createMicroAppNavigation, type MicroAppNavigationConfig, type MicroAppNavigationAPI } from './micro-app-integration';
import type { RouteInfo, NavigationContext } from './index';

// Vue类型声明（避免直接依赖Vue）
type Ref<T> = { value: T };
type VueApp = any;

// ==================== Vue Composition API ====================

/**
 * Vue组合式API - 微应用导航
 */
export function useMicroAppNavigation(config: MicroAppNavigationConfig) {
  const navigationAPI: MicroAppNavigationAPI = createMicroAppNavigation(config);
  const currentRoute: Ref<RouteInfo | null> = ref(null);
  const receivedParameters: Ref<any> = ref(null);
  const isNavigating: Ref<boolean> = ref(false);

  // 更新当前路由信息
  const updateCurrentRoute = () => {
    currentRoute.value = navigationAPI.getCurrentRoute();
  };

  // 监听参数接收
  const unsubscribeParameters = navigationAPI.onParameterReceived((params, context) => {
    receivedParameters.value = { params, context };
  });

  // 导航方法
  const navigateTo = async (target: string, params?: any, context?: NavigationContext) => {
    isNavigating.value = true;
    try {
      const result = await navigationAPI.navigateTo(target, params, context);
      updateCurrentRoute();
      return result;
    } finally {
      isNavigating.value = false;
    }
  };

  const navigateToApp = async (appName: string, path: string, params?: any) => {
    isNavigating.value = true;
    try {
      const result = await navigationAPI.navigateToApp(appName, path, params);
      updateCurrentRoute();
      return result;
    } finally {
      isNavigating.value = false;
    }
  };

  const goBack = async () => {
    isNavigating.value = true;
    try {
      const result = await navigationAPI.goBack();
      updateCurrentRoute();
      return result;
    } finally {
      isNavigating.value = false;
    }
  };

  const goBackToApp = async (appName: string) => {
    isNavigating.value = true;
    try {
      const result = await navigationAPI.goBackToApp(appName);
      updateCurrentRoute();
      return result;
    } finally {
      isNavigating.value = false;
    }
  };

  // 参数处理方法
  const clearReceivedParameters = () => {
    navigationAPI.clearReceivedParameters();
    receivedParameters.value = null;
  };

  // 生命周期
  onMounted(() => {
    updateCurrentRoute();
  });

  onUnmounted(() => {
    unsubscribeParameters();
    navigationAPI.destroy();
  });

  return {
    // 导航方法
    navigateTo,
    navigateToApp,
    goBack,
    goBackToApp,
    
    // 状态信息
    currentRoute,
    receivedParameters,
    isNavigating,
    
    // 工具方法
    clearReceivedParameters,
    updateCurrentRoute,
    
    // 原始API（用于高级用法）
    navigationAPI
  };
}

/**
 * Vue组合式API - 跨应用导航
 */
export function useCrossAppNavigation(config: MicroAppNavigationConfig) {
  const { navigateToApp, goBackToApp, currentRoute, isNavigating } = useMicroAppNavigation(config);

  // 常用的跨应用导航方法
  const goToUserManagement = (params?: any) => {
    return navigateToApp('react-app-1', '/users', params);
  };

  const goToProductManagement = (params?: any) => {
    return navigateToApp('react-app-2', '/products', params);
  };

  const goToOrderManagement = (params?: any) => {
    return navigateToApp('react-app-3', '/orders', params);
  };

  const goToDashboard = (params?: any) => {
    return navigateToApp('react-app-4', '/dashboard', params);
  };

  const goToSettings = (params?: any) => {
    return navigateToApp('react-app-5', '/settings', params);
  };

  const goToMessageCenter = (params?: any) => {
    return navigateToApp('vue-app-1', '/messages', params);
  };

  const goToFileManagement = (params?: any) => {
    return navigateToApp('vue-app-2', '/files', params);
  };

  const goToSystemMonitor = (params?: any) => {
    return navigateToApp('vue-app-3', '/monitor', params);
  };

  const goToMainApp = () => {
    return navigateToApp('main', '/dashboard');
  };

  return {
    // 导航到具体应用
    goToUserManagement,
    goToProductManagement,
    goToOrderManagement,
    goToDashboard,
    goToSettings,
    goToMessageCenter,
    goToFileManagement,
    goToSystemMonitor,
    goToMainApp,
    
    // 返回到具体应用
    goBackToApp,
    
    // 状态信息
    currentRoute,
    isNavigating,
    
    // 通用导航方法
    navigateToApp
  };
}

/**
 * Vue组合式API - 导航参数
 */
export function useNavigationParameters(config: MicroAppNavigationConfig) {
  const { receivedParameters, clearReceivedParameters } = useMicroAppNavigation(config);
  const parameterHistory: Ref<any[]> = ref([]);

  // 监听参数变化
  const unwatchParameters = ref(() => {});
  
  onMounted(() => {
    // 这里可以添加参数变化的监听逻辑
    // Vue 3的响应式系统会自动处理
  });

  // 记录参数历史
  const addToParameterHistory = (params: any) => {
    parameterHistory.value.push({
      ...params,
      timestamp: Date.now()
    });
  };

  // 获取最新参数
  const getLatestParameters = () => {
    return receivedParameters.value?.params || null;
  };

  // 获取参数上下文
  const getParameterContext = () => {
    return receivedParameters.value?.context || null;
  };

  // 清空参数历史
  const clearParameterHistory = () => {
    parameterHistory.value = [];
    clearReceivedParameters();
  };

  return {
    // 当前参数
    currentParameters: getLatestParameters(),
    parameterContext: getParameterContext(),
    
    // 参数历史
    parameterHistory,
    
    // 工具方法
    getLatestParameters,
    getParameterContext,
    clearReceivedParameters,
    clearParameterHistory,
    addToParameterHistory
  };
}

// ==================== Vue 2 兼容性支持 ====================

/**
 * Vue 2 Mixin - 微应用导航
 */
export const MicroAppNavigationMixin = {
  data() {
    return {
      navigationAPI: null as MicroAppNavigationAPI | null,
      currentRoute: null as RouteInfo | null,
      receivedParameters: null as any,
      isNavigating: false
    };
  },

  methods: {
    initializeNavigation(config: MicroAppNavigationConfig) {
      this.navigationAPI = createMicroAppNavigation(config);
      
      // 监听参数接收
      this.navigationAPI.onParameterReceived((params: any, context: NavigationContext) => {
        this.receivedParameters = { params, context };
      });
      
      this.updateCurrentRoute();
    },

    updateCurrentRoute() {
      if (this.navigationAPI) {
        this.currentRoute = this.navigationAPI.getCurrentRoute();
      }
    },

    async navigateTo(target: string, params?: any, context?: NavigationContext) {
      if (!this.navigationAPI) return false;
      
      this.isNavigating = true;
      try {
        const result = await this.navigationAPI.navigateTo(target, params, context);
        this.updateCurrentRoute();
        return result;
      } finally {
        this.isNavigating = false;
      }
    },

    async navigateToApp(appName: string, path: string, params?: any) {
      if (!this.navigationAPI) return false;
      
      this.isNavigating = true;
      try {
        const result = await this.navigationAPI.navigateToApp(appName, path, params);
        this.updateCurrentRoute();
        return result;
      } finally {
        this.isNavigating = false;
      }
    },

    async goBack() {
      if (!this.navigationAPI) return false;
      
      this.isNavigating = true;
      try {
        const result = await this.navigationAPI.goBack();
        this.updateCurrentRoute();
        return result;
      } finally {
        this.isNavigating = false;
      }
    },

    async goBackToApp(appName: string) {
      if (!this.navigationAPI) return false;
      
      this.isNavigating = true;
      try {
        const result = await this.navigationAPI.goBackToApp(appName);
        this.updateCurrentRoute();
        return result;
      } finally {
        this.isNavigating = false;
      }
    },

    clearReceivedParameters() {
      if (this.navigationAPI) {
        this.navigationAPI.clearReceivedParameters();
        this.receivedParameters = null;
      }
    }
  },

  beforeDestroy() {
    if (this.navigationAPI) {
      this.navigationAPI.destroy();
    }
  }
};

// ==================== 全局配置函数 ====================

/**
 * 为Vue应用全局配置导航系统
 */
export function configureVueNavigation(app: any, config: MicroAppNavigationConfig) {
  const navigationAPI = createMicroAppNavigation(config);
  
  // Vue 3
  if (app.config && app.config.globalProperties) {
    app.config.globalProperties.$navigation = navigationAPI;
    app.provide('navigation', navigationAPI);
  }
  // Vue 2
  else if (app.prototype) {
    app.prototype.$navigation = navigationAPI;
  }
  
  return navigationAPI;
}

// ==================== 导出类型 ====================

export type {
  MicroAppNavigationConfig,
  MicroAppNavigationAPI
};