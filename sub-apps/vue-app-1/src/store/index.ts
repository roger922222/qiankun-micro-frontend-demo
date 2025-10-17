/**
 * Vue消息中心Vuex Store配置
 */

import { createStore } from 'vuex';

// 消息模块状态类型
interface Message {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'user' | 'order' | 'notification';
  status: 'read' | 'unread';
  sender: string;
  createdAt: string;
  priority: 'low' | 'normal' | 'high';
}

// 消息模块状态
interface MessagesState {
  messages: Message[];
  unreadCount: number;
  selectedMessage: Message | null;
}

// 设置模块状态
interface SettingsState {
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  notificationEnabled: boolean;
}

// 推送设置类型
interface PushSetting {
  id: string;
  name: string;
  type: 'scheduled' | 'trigger' | 'manual';
  conditions: string;
  channels: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 推送记录类型
interface PushRecord {
  id: string;
  title: string;
  content: string;
  targetType: 'all' | 'group' | 'user';
  targetIds: string[];
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
  channels: string[];
}

// 推送统计类型
interface PushStatistics {
  todayCount: number;
  successRate: number;
  totalCount: number;
  failedCount: number;
}

// 推送模块状态
interface PushState {
  settings: PushSetting[];
  history: PushRecord[];
  statistics: PushStatistics;
  activePushes: any[];
}

// 用户偏好类型
interface NotificationPreferences {
  enablePush: boolean;
  enableEmail: boolean;
  enableSMS: boolean;
  quietHours: { start: string; end: string };
}

interface DisplayPreferences {
  pageSize: number;
  theme: 'light' | 'dark';
  language: 'zh-CN' | 'en-US';
  sidebar: { collapsed: boolean };
}

interface PrivacyPreferences {
  shareData: boolean;
  analytics: boolean;
  marketing: boolean;
}

// 用户偏好模块状态
interface PreferencesState {
  notifications: NotificationPreferences;
  display: DisplayPreferences;
  privacy: PrivacyPreferences;
}

// 根状态
interface RootState {
  messages: MessagesState;
  settings: SettingsState;
  push: PushState;
  preferences: PreferencesState;
}

const store = createStore<RootState>({
  state: {
    messages: {
      messages: [],
      unreadCount: 0,
      selectedMessage: null
    },
    settings: {
      theme: 'light',
      language: 'zh-CN',
      notificationEnabled: true
    },
    push: {
      settings: [],
      history: [],
      statistics: {
        todayCount: 0,
        successRate: 0,
        totalCount: 0,
        failedCount: 0
      },
      activePushes: []
    },
    preferences: {
      notifications: {
        enablePush: true,
        enableEmail: true,
        enableSMS: false,
        quietHours: { start: '22:00', end: '08:00' }
      },
      display: {
        pageSize: 10,
        theme: 'light',
        language: 'zh-CN',
        sidebar: { collapsed: false }
      },
      privacy: {
        shareData: false,
        analytics: true,
        marketing: false
      }
    }
  },
  
  mutations: {
    // 消息相关mutations
    SET_MESSAGES(state, messages: Message[]) {
      state.messages.messages = messages;
      state.messages.unreadCount = messages.filter(msg => msg.status === 'unread').length;
    },
    
    ADD_MESSAGE(state, message: Message) {
      state.messages.messages.unshift(message);
      if (message.status === 'unread') {
        state.messages.unreadCount++;
      }
    },
    
    UPDATE_MESSAGE(state, { id, updates }: { id: string; updates: Partial<Message> }) {
      const messageIndex = state.messages.messages.findIndex(msg => msg.id === id);
      if (messageIndex !== -1) {
        const oldMessage = state.messages.messages[messageIndex];
        const newMessage = { ...oldMessage, ...updates };
        state.messages.messages.splice(messageIndex, 1, newMessage);
        
        // 更新未读数量
        if (oldMessage.status === 'unread' && newMessage.status === 'read') {
          state.messages.unreadCount--;
        } else if (oldMessage.status === 'read' && newMessage.status === 'unread') {
          state.messages.unreadCount++;
        }
      }
    },
    
    DELETE_MESSAGE(state, id: string) {
      const messageIndex = state.messages.messages.findIndex(msg => msg.id === id);
      if (messageIndex !== -1) {
        const message = state.messages.messages[messageIndex];
        state.messages.messages.splice(messageIndex, 1);
        if (message.status === 'unread') {
          state.messages.unreadCount--;
        }
      }
    },
    
    SET_SELECTED_MESSAGE(state, message: Message | null) {
      state.messages.selectedMessage = message;
    },
    
    MARK_ALL_AS_READ(state) {
      state.messages.messages.forEach(message => {
        message.status = 'read';
      });
      state.messages.unreadCount = 0;
    },
    
    RESET_MESSAGES_STATE(state) {
      state.messages.messages = [];
      state.messages.unreadCount = 0;
      state.messages.selectedMessage = null;
    },
    
    // 设置相关mutations
    SET_THEME(state, theme: 'light' | 'dark') {
      state.settings.theme = theme;
    },
    
    SET_LANGUAGE(state, language: 'zh-CN' | 'en-US') {
      state.settings.language = language;
    },
    
    SET_NOTIFICATION_ENABLED(state, enabled: boolean) {
      state.settings.notificationEnabled = enabled;
    },
    
    // 推送相关mutations
    SET_PUSH_SETTINGS(state, settings: PushSetting[]) {
      state.push.settings = settings;
    },
    
    ADD_PUSH_SETTING(state, setting: PushSetting) {
      state.push.settings.push(setting);
    },
    
    UPDATE_PUSH_SETTING(state, { id, updates }: { id: string; updates: Partial<PushSetting> }) {
      const index = state.push.settings.findIndex(s => s.id === id);
      if (index !== -1) {
        state.push.settings[index] = { ...state.push.settings[index], ...updates };
      }
    },
    
    DELETE_PUSH_SETTING(state, id: string) {
      const index = state.push.settings.findIndex(s => s.id === id);
      if (index !== -1) {
        state.push.settings.splice(index, 1);
      }
    },
    
    SET_PUSH_HISTORY(state, history: PushRecord[]) {
      state.push.history = history;
    },
    
    ADD_PUSH_RECORD(state, record: PushRecord) {
      state.push.history.unshift(record);
    },
    
    UPDATE_PUSH_STATISTICS(state, stats: PushStatistics) {
      state.push.statistics = stats;
    },
    
    SET_ACTIVE_PUSHES(state, pushes: any[]) {
      state.push.activePushes = pushes;
    },
    
    // 用户偏好相关mutations
    SET_NOTIFICATION_PREFERENCES(state, preferences: NotificationPreferences) {
      state.preferences.notifications = preferences;
    },
    
    SET_DISPLAY_PREFERENCES(state, preferences: DisplayPreferences) {
      state.preferences.display = preferences;
    },
    
    SET_PRIVACY_PREFERENCES(state, preferences: PrivacyPreferences) {
      state.preferences.privacy = preferences;
    },
    
    UPDATE_NOTIFICATION_PREFERENCE(state, { key, value }: { key: keyof NotificationPreferences; value: any }) {
      (state.preferences.notifications as any)[key] = value;
    },
    
    UPDATE_DISPLAY_PREFERENCE(state, { key, value }: { key: keyof DisplayPreferences; value: any }) {
      (state.preferences.display as any)[key] = value;
    },
    
    UPDATE_PRIVACY_PREFERENCE(state, { key, value }: { key: keyof PrivacyPreferences; value: any }) {
      (state.preferences.privacy as any)[key] = value;
    }
  },
  
  actions: {
    // 消息相关actions
    async fetchMessages({ commit }) {
      // 模拟API调用
      const messages: Message[] = [
        {
          id: 'msg_1',
          title: '系统通知',
          content: '欢迎使用微前端消息中心！',
          type: 'system',
          status: 'unread',
          sender: 'system',
          createdAt: new Date().toISOString(),
          priority: 'normal'
        },
        {
          id: 'msg_2',
          title: '订单更新',
          content: '您的订单 ORD-2024-001 已发货',
          type: 'order',
          status: 'read',
          sender: 'order-system',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          priority: 'high'
        }
      ];
      
      commit('SET_MESSAGES', messages);
      return messages;
    },
    
    async sendMessage({ commit }, messageData: Omit<Message, 'id' | 'createdAt'>) {
      const message: Message = {
        ...messageData,
        id: `msg_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      commit('ADD_MESSAGE', message);
      return message;
    },
    
    async markAsRead({ commit }, messageId: string) {
      commit('UPDATE_MESSAGE', {
        id: messageId,
        updates: { status: 'read' }
      });
    },
    
    async deleteMessage({ commit }, messageId: string) {
      commit('DELETE_MESSAGE', messageId);
    },
    
    // 设置相关actions
    async updateTheme({ commit }, theme: 'light' | 'dark') {
      commit('SET_THEME', theme);
      // 可以在这里保存到localStorage
      localStorage.setItem('vue-message-center-theme', theme);
    },
    
    async updateLanguage({ commit }, language: 'zh-CN' | 'en-US') {
      commit('SET_LANGUAGE', language);
      localStorage.setItem('vue-message-center-language', language);
    },
    
    // 推送相关actions
    async fetchPushSettings({ commit }) {
      // 模拟API调用
      const settings: PushSetting[] = [
        {
          id: 'setting_1',
          name: '用户登录通知',
          type: 'trigger',
          conditions: '用户首次登录时发送欢迎消息',
          channels: ['web', 'app'],
          enabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      commit('SET_PUSH_SETTINGS', settings);
      return settings;
    },
    
    async savePushSetting({ commit }, setting: Omit<PushSetting, 'id' | 'createdAt' | 'updatedAt'>) {
      const newSetting: PushSetting = {
        ...setting,
        id: `setting_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      commit('ADD_PUSH_SETTING', newSetting);
      return newSetting;
    },
    
    async updatePushSetting({ commit }, { id, updates }: { id: string; updates: Partial<PushSetting> }) {
      const updatedSetting = { ...updates, updatedAt: new Date().toISOString() };
      commit('UPDATE_PUSH_SETTING', { id, updates: updatedSetting });
    },
    
    async deletePushSetting({ commit }, id: string) {
      commit('DELETE_PUSH_SETTING', id);
    },
    
    async fetchPushHistory({ commit }) {
      // 模拟API调用
      const history: PushRecord[] = [
        {
          id: 'push_1',
          title: '系统维护通知',
          content: '系统将于今晚22:00-24:00进行维护',
          targetType: 'all',
          targetIds: [],
          status: 'sent',
          sentAt: new Date().toISOString(),
          channels: ['web', 'app']
        }
      ];
      commit('SET_PUSH_HISTORY', history);
      return history;
    },
    
    async sendPush({ commit }, pushData: Omit<PushRecord, 'id' | 'sentAt' | 'status'>) {
      const record: PushRecord = {
        ...pushData,
        id: `push_${Date.now()}`,
        status: 'sent',
        sentAt: new Date().toISOString()
      };
      commit('ADD_PUSH_RECORD', record);
      return record;
    },
    
    async fetchPushStats({ commit }) {
      // 模拟API调用
      const stats: PushStatistics = {
        todayCount: 15,
        successRate: 96.8,
        totalCount: 1250,
        failedCount: 40
      };
      commit('UPDATE_PUSH_STATISTICS', stats);
      return stats;
    },
    
    // 用户偏好相关actions
    async updateNotificationPreferences({ commit }, preferences: Partial<NotificationPreferences>) {
      commit('UPDATE_NOTIFICATION_PREFERENCE', preferences);
      localStorage.setItem('vue-message-center-notification-prefs', JSON.stringify(preferences));
    },
    
    async updateDisplayPreferences({ commit }, preferences: Partial<DisplayPreferences>) {
      commit('UPDATE_DISPLAY_PREFERENCE', preferences);
      localStorage.setItem('vue-message-center-display-prefs', JSON.stringify(preferences));
    },
    
    async updatePrivacyPreferences({ commit }, preferences: Partial<PrivacyPreferences>) {
      commit('UPDATE_PRIVACY_PREFERENCE', preferences);
      localStorage.setItem('vue-message-center-privacy-prefs', JSON.stringify(preferences));
    },
    
    // 初始化偏好设置
    async loadPreferences({ commit }) {
      try {
        const notificationPrefs = localStorage.getItem('vue-message-center-notification-prefs');
        const displayPrefs = localStorage.getItem('vue-message-center-display-prefs');
        const privacyPrefs = localStorage.getItem('vue-message-center-privacy-prefs');
        
        if (notificationPrefs) {
          commit('SET_NOTIFICATION_PREFERENCES', JSON.parse(notificationPrefs));
        }
        if (displayPrefs) {
          commit('SET_DISPLAY_PREFERENCES', JSON.parse(displayPrefs));
        }
        if (privacyPrefs) {
          commit('SET_PRIVACY_PREFERENCES', JSON.parse(privacyPrefs));
        }
      } catch (error) {
        console.warn('Failed to load preferences from localStorage:', error);
      }
    }
  },
  
  getters: {
    // 消息相关getters
    unreadMessages: (state) => state.messages.messages.filter(msg => msg.status === 'unread'),
    
    messagesByType: (state) => (type: string) => 
      state.messages.messages.filter(msg => msg.type === type),
    
    highPriorityMessages: (state) => 
      state.messages.messages.filter(msg => msg.priority === 'high'),
    
    // 设置相关getters
    isDarkMode: (state) => state.settings.theme === 'dark',
    
    isEnglish: (state) => state.settings.language === 'en-US',
    
    // 推送相关getters
    enabledPushSettings: (state) => state.push.settings.filter(s => s.enabled),
    
    recentPushHistory: (state) => state.push.history.slice(0, 10),
    
    failedPushes: (state) => state.push.history.filter(p => p.status === 'failed'),
    
    pushSuccessRate: (state) => {
      const total = state.push.statistics.totalCount;
      const failed = state.push.statistics.failedCount;
      return total > 0 ? ((total - failed) / total * 100).toFixed(1) : 0;
    },
    
    // 用户偏好相关getters
    isNotificationEnabled: (state) => state.preferences.notifications.enablePush,
    
    currentTheme: (state) => state.preferences.display.theme,
    
    isInQuietHours: (state) => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const { start, end } = state.preferences.notifications.quietHours;
      const startTime = parseInt(start.split(':')[0]) * 60 + parseInt(start.split(':')[1]);
      const endTime = parseInt(end.split(':')[0]) * 60 + parseInt(end.split(':')[1]);
      
      if (startTime <= endTime) {
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        return currentTime >= startTime || currentTime <= endTime;
      }
    },
    
    sidebarCollapsed: (state) => state.preferences.display.sidebar.collapsed
  }
});

export default store;