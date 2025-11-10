/**
 * Vue应用导航集成 - 简化版本
 * 为Vue应用提供导航系统集成功能，避免直接依赖Vue类型
 */

import { createMicroAppNavigation, type MicroAppNavigationConfig, type MicroAppNavigationAPI } from './micro-app-integration';

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

/**
 * 创建Vue导航实例
 */
export function createVueNavigation(config: MicroAppNavigationConfig) {
  return createMicroAppNavigation(config);
}

// ==================== Vue 2 兼容性支持 ====================

/**
 * Vue 2 Mixin - 微应用导航
 */
export const MicroAppNavigationMixin = {
  data() {
    return {
      navigationAPI: null as MicroAppNavigationAPI | null,
      currentRoute: null as any,
      receivedParameters: null as any,
      isNavigating: false
    };
  },

  methods: {
    initializeNavigation(config: MicroAppNavigationConfig) {
      (this as any).navigationAPI = createMicroAppNavigation(config);
      
      // 监听参数接收
      (this as any).navigationAPI.onParameterReceived((params: any, context: any) => {
        (this as any).receivedParameters = { params, context };
      });
      
      this.updateCurrentRoute();
    },

    updateCurrentRoute() {
      if ((this as any).navigationAPI) {
        (this as any).currentRoute = (this as any).navigationAPI.getCurrentRoute();
      }
    },

    async navigateTo(target: string, params?: any, context?: any): Promise<boolean> {
      if (!(this as any).navigationAPI) return false;
      
      (this as any).isNavigating = true;
      try {
        const result = await (this as any).navigationAPI.navigateTo(target, params, context);
        this.updateCurrentRoute();
        return result;
      } finally {
        (this as any).isNavigating = false;
      }
    },

    async navigateToApp(appName: string, path: string, params?: any): Promise<boolean> {
      if (!(this as any).navigationAPI) return false;
      
      (this as any).isNavigating = true;
      try {
        const result = await (this as any).navigationAPI.navigateToApp(appName, path, params);
        this.updateCurrentRoute();
        return result;
      } finally {
        (this as any).isNavigating = false;
      }
    },

    async goBack(): Promise<boolean> {
      if (!(this as any).navigationAPI) return false;
      
      (this as any).isNavigating = true;
      try {
        const result = await (this as any).navigationAPI.goBack();
        this.updateCurrentRoute();
        return result;
      } finally {
        (this as any).isNavigating = false;
      }
    },

    async goBackToApp(appName: string): Promise<boolean> {
      if (!(this as any).navigationAPI) return false;
      
      (this as any).isNavigating = true;
      try {
        const result = await (this as any).navigationAPI.goBackToApp(appName);
        this.updateCurrentRoute();
        return result;
      } finally {
        (this as any).isNavigating = false;
      }
    },

    clearReceivedParameters() {
      if ((this as any).navigationAPI) {
        (this as any).navigationAPI.clearReceivedParameters();
        (this as any).receivedParameters = null;
      }
    }
  },

  beforeDestroy() {
    if ((this as any).navigationAPI) {
      (this as any).navigationAPI.destroy();
    }
  }
};

// ==================== 导出类型 ====================

export type {
  MicroAppNavigationConfig,
  MicroAppNavigationAPI
};