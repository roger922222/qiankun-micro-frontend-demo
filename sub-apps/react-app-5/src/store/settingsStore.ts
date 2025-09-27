/**
 * 设置中心状态管理 - 使用Valtio
 */

import { proxy } from 'valtio';

// 定义用户信息接口
export interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  department?: string;
  position?: string;
}

// 定义通知设置接口
export interface NotificationSettings {
  email: {
    system: boolean;
    marketing: boolean;
    security: boolean;
  };
  push: {
    desktop: boolean;
    mobile: boolean;
    browser: boolean;
  };
  schedule: {
    startTime: string;
    endTime: string;
    enabled: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  categories: {
    updates: boolean;
    reminders: boolean;
    alerts: boolean;
    promotions: boolean;
  };
}

// 定义安全设置接口
export interface SecuritySettings {
  password: {
    lastChanged: string;
    requireStrong: boolean;
    expiryDays: number;
  };
  twoFactor: {
    enabled: boolean;
    method: 'sms' | 'email' | 'app';
    backupCodes: string[];
  };
  sessions: {
    current: string;
    active: number;
    maxSessions: number;
  };
  loginSecurity: {
    allowMultipleDevices: boolean;
    sessionTimeout: number;
    requireVerification: boolean;
  };
  devices: {
    trusted: Array<{
      id: string;
      name: string;
      lastUsed: string;
      location: string;
    }>;
  };
}

// 定义语言设置接口
export interface LanguageSettings {
  locale: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
  };
  rtl: boolean;
  fallbackLocale: string;
}

// 定义用户偏好设置接口
export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

// 定义系统配置接口
export interface SystemConfig {
  siteName: string;
  version: string;
  apiUrl: string;
  cdnUrl: string;
  features: {
    darkMode: boolean;
    multiLanguage: boolean;
    notifications: boolean;
  };
}

// 定义设置状态接口
export interface SettingsState {
  user: UserInfo;
  preferences: UserPreferences;
  system: SystemConfig;
  notifications: NotificationSettings;
  security: SecuritySettings;
  languageSettings: LanguageSettings;
  theme: 'light' | 'dark';
  language: string;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

// 重置函数
const resetStore = () => {
  settingsStore.user = {
    id: '',
    name: '',
    email: '',
    avatar: '',
    phone: '',
    department: '',
    position: ''
  };
  settingsStore.preferences = {
    theme: 'light',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  };
  settingsStore.system = {
    siteName: '',
    version: '',
    apiUrl: '',
    cdnUrl: '',
    features: {
      darkMode: true,
      multiLanguage: true,
      notifications: true
    }
  };
  settingsStore.notifications = {
    email: {
      system: true,
      marketing: false,
      security: true
    },
    push: {
      desktop: true,
      mobile: true,
      browser: false
    },
    schedule: {
      startTime: '09:00',
      endTime: '18:00',
      enabled: false
    },
    frequency: 'immediate',
    categories: {
      updates: true,
      reminders: true,
      alerts: true,
      promotions: false
    }
  };
  settingsStore.security = {
    password: {
      lastChanged: new Date().toISOString(),
      requireStrong: true,
      expiryDays: 90
    },
    twoFactor: {
      enabled: false,
      method: 'app',
      backupCodes: []
    },
    sessions: {
      current: 'session-' + Date.now(),
      active: 1,
      maxSessions: 5
    },
    loginSecurity: {
      allowMultipleDevices: true,
      sessionTimeout: 30,
      requireVerification: false
    },
    devices: {
      trusted: []
    }
  };
  settingsStore.languageSettings = {
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: '¥'
    },
    rtl: false,
    fallbackLocale: 'en-US'
  };
  settingsStore.theme = 'light';
  settingsStore.language = 'zh-CN';
  settingsStore.loading = false;
  settingsStore.error = null;
};

// 创建设置状态代理
export const settingsStore = proxy<SettingsState>({
  user: {
    id: '',
    name: '',
    email: '',
    avatar: '',
    phone: '',
    department: '',
    position: ''
  },
  preferences: {
    theme: 'light',
    language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  },
  system: {
    siteName: '',
    version: '',
    apiUrl: '',
    cdnUrl: '',
    features: {
      darkMode: true,
      multiLanguage: true,
      notifications: true
    }
  },
  notifications: {
    email: {
      system: true,
      marketing: false,
      security: true
    },
    push: {
      desktop: true,
      mobile: true,
      browser: false
    },
    schedule: {
      startTime: '09:00',
      endTime: '18:00',
      enabled: false
    },
    frequency: 'immediate',
    categories: {
      updates: true,
      reminders: true,
      alerts: true,
      promotions: false
    }
  },
  security: {
    password: {
      lastChanged: new Date().toISOString(),
      requireStrong: true,
      expiryDays: 90
    },
    twoFactor: {
      enabled: false,
      method: 'app',
      backupCodes: []
    },
    sessions: {
      current: 'session-' + Date.now(),
      active: 1,
      maxSessions: 5
    },
    loginSecurity: {
      allowMultipleDevices: true,
      sessionTimeout: 30,
      requireVerification: false
    },
    devices: {
      trusted: []
    }
  },
  languageSettings: {
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: '¥'
    },
    rtl: false,
    fallbackLocale: 'en-US'
  },
  theme: 'light',
  language: 'zh-CN',
  loading: false,
  error: null,
  reset: resetStore
});

// 设置状态操作方法
export const settingsActions = {
  // 更新用户信息
  updateUser: (userInfo: Partial<UserInfo>) => {
    Object.assign(settingsStore.user, userInfo);
  },

  // 更新用户偏好设置
  updatePreferences: (preferences: Partial<UserPreferences>) => {
    Object.assign(settingsStore.preferences, preferences);
    
    // 同步主题和语言到根级别
    if (preferences.theme) {
      settingsStore.theme = preferences.theme;
    }
    if (preferences.language) {
      settingsStore.language = preferences.language;
    }
  },

  // 更新系统配置
  updateSystem: (systemConfig: Partial<SystemConfig>) => {
    Object.assign(settingsStore.system, systemConfig);
  },

  // 更新通知设置
  updateNotifications: (notifications: Partial<NotificationSettings>) => {
    Object.assign(settingsStore.notifications, notifications);
  },

  // 更新安全设置
  updateSecurity: (security: Partial<SecuritySettings>) => {
    Object.assign(settingsStore.security, security);
  },

  // 更新语言设置
  updateLanguageSettings: (languageSettings: Partial<LanguageSettings>) => {
    Object.assign(settingsStore.languageSettings, languageSettings);
  },

  // 设置主题
  setTheme: (theme: 'light' | 'dark') => {
    settingsStore.theme = theme;
    settingsStore.preferences.theme = theme;
  },

  // 设置语言
  setLanguage: (language: string) => {
    settingsStore.language = language;
    settingsStore.preferences.language = language;
    settingsStore.languageSettings.locale = language;
  },

  // 设置加载状态
  setLoading: (loading: boolean) => {
    settingsStore.loading = loading;
  },

  // 设置错误信息
  setError: (error: string | null) => {
    settingsStore.error = error;
  },

  // 重置所有设置
  reset: resetStore,

  // 保存设置到本地存储
  saveToStorage: () => {
    try {
      const settingsData = {
        user: settingsStore.user,
        preferences: settingsStore.preferences,
        system: settingsStore.system,
        notifications: settingsStore.notifications,
        security: settingsStore.security,
        languageSettings: settingsStore.languageSettings
      };
      localStorage.setItem('react-settings-store', JSON.stringify(settingsData));
    } catch (error) {
      console.error('Failed to save settings to storage:', error);
      settingsStore.error = '保存设置失败';
    }
  },

  // 从本地存储加载设置
  loadFromStorage: () => {
    try {
      const savedSettings = localStorage.getItem('react-settings-store');
      if (savedSettings) {
        const settingsData = JSON.parse(savedSettings);
        if (settingsData.user) {
          Object.assign(settingsStore.user, settingsData.user);
        }
        if (settingsData.preferences) {
          Object.assign(settingsStore.preferences, settingsData.preferences);
          settingsStore.theme = settingsData.preferences.theme || 'light';
          settingsStore.language = settingsData.preferences.language || 'zh-CN';
        }
        if (settingsData.system) {
          Object.assign(settingsStore.system, settingsData.system);
        }
        if (settingsData.notifications) {
          Object.assign(settingsStore.notifications, settingsData.notifications);
        }
        if (settingsData.security) {
          Object.assign(settingsStore.security, settingsData.security);
        }
        if (settingsData.languageSettings) {
          Object.assign(settingsStore.languageSettings, settingsData.languageSettings);
        }
      }
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
      settingsStore.error = '加载设置失败';
    }
  }
};

// 导出默认状态管理对象
export default settingsStore;