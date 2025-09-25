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

// 根状态
interface RootState {
  messages: MessagesState;
  settings: SettingsState;
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
    
    isEnglish: (state) => state.settings.language === 'en-US'
  }
});

export default store;