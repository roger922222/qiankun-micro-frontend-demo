<template>
  <div class="communication-demo">
    <a-alert
      message="Vue子应用通信演示"
      description="这是在Vue子应用中的通信功能演示，展示了如何在Vue应用中使用各种通信功能。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-row :gutter="[16, 16]">
      <!-- 事件发送 -->
      <a-col :span="12">
        <a-card title="发送事件" size="small">
          <template #extra>
            <send-outlined />
          </template>
          
          <a-form 
            :model="eventForm" 
            @finish="handleSendEvent" 
            layout="vertical" 
            size="small"
          >
            <a-form-item 
              label="事件类型" 
              name="eventType"
              :rules="[{ required: true, message: '请选择事件类型' }]"
            >
              <a-select placeholder="选择事件类型" size="small">
                <a-select-option value="USER_LOGIN">用户登录</a-select-option>
                <a-select-option value="USER_LOGOUT">用户登出</a-select-option>
                <a-select-option value="MESSAGE_SENT">消息发送</a-select-option>
                <a-select-option value="MESSAGE_READ">消息已读</a-select-option>
                <a-select-option value="NOTIFICATION_CREATED">通知创建</a-select-option>
              </a-select>
            </a-form-item>
            
            <a-form-item label="事件数据" name="eventData">
              <a-textarea 
                :rows="3" 
                placeholder='{"messageId": 123, "content": "Hello"}'
                size="small"
              />
            </a-form-item>
            
            <a-form-item>
              <a-button type="primary" html-type="submit" size="small">
                <template #icon><send-outlined /></template>
                发送事件
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <!-- 状态管理 -->
      <a-col :span="12">
        <a-card title="状态管理" size="small">
          <template #extra>
            <global-outlined />
          </template>
          
          <a-space direction="vertical" style="width: 100%">
            <div>
              <strong>当前消息状态:</strong>
              <div style="margin-top: 8px">
                <pre style="
                  background: #f5f5f5; 
                  padding: 8px; 
                  border-radius: 4px;
                  font-size: 11px;
                  max-height: 120px;
                  overflow: auto;
                ">{{ JSON.stringify(globalState.messages || {}, null, 2) }}</pre>
              </div>
            </div>
            
            <a-button 
              type="primary" 
              size="small" 
              @click="handleUpdateState"
              style="width: 100%"
            >
              <template #icon><sync-outlined /></template>
              更新消息状态
            </a-button>
          </a-space>
        </a-card>
      </a-col>

      <!-- 跨应用导航 -->
      <a-col :span="12">
        <a-card title="跨应用导航" size="small">
          <template #extra>
            <link-outlined />
          </template>
          
          <a-space direction="vertical" style="width: 100%">
            <a-button 
              size="small" 
              @click="handleNavigation('react-app-1')"
              style="width: 100%"
            >
              用户管理
            </a-button>
            <a-button 
              size="small" 
              @click="handleNavigation('react-app-2')"
              style="width: 100%"
            >
              商品管理
            </a-button>
            <a-button 
              size="small" 
              @click="handleNavigation('vue-app-2')"
              style="width: 100%"
            >
              文件管理
            </a-button>
            <a-button 
              size="small" 
              @click="handleNavigation('main', '/communication-demo')"
              style="width: 100%"
            >
              返回演示页面
            </a-button>
          </a-space>
        </a-card>
      </a-col>

      <!-- 实时通信 -->
      <a-col :span="12">
        <a-card title="实时通信" size="small">
          <template #extra>
            <message-outlined />
          </template>
          
          <a-space direction="vertical" style="width: 100%">
            <a-button 
              type="primary" 
              size="small" 
              @click="handleSendNotification"
              style="width: 100%"
            >
              <template #icon><bell-outlined /></template>
              发送通知
            </a-button>
            
            <div>
              <strong>统计信息:</strong>
              <a-row :gutter="8" style="margin-top: 8px">
                <a-col :span="12">
                  <a-statistic 
                    title="接收事件" 
                    :value="eventHistory.length"
                    :value-style="{ fontSize: '14px' }"
                  />
                </a-col>
                <a-col :span="12">
                  <a-statistic 
                    title="消息数量" 
                    :value="messageCount"
                    :value-style="{ fontSize: '14px' }"
                  />
                </a-col>
              </a-row>
            </div>
          </a-space>
        </a-card>
      </a-col>

      <!-- 事件历史 -->
      <a-col :span="24">
        <a-card title="最近事件" size="small">
          <template #extra>
            <a-badge :count="eventHistory.length" />
          </template>
          
          <div style="max-height: 200px; overflow-y: auto">
            <a-timeline size="small">
              <a-timeline-item 
                v-for="(event, index) in eventHistory.slice(0, 5)" 
                :key="index"
              >
                <div>
                  <a-tag color="blue" style="font-size: 11px">{{ event.type }}</a-tag>
                  <span style="color: #999; font-size: 11px">{{ event.source }}</span>
                </div>
                <div style="margin-top: 2px">
                  <span style="font-size: 10px">{{ JSON.stringify(event.data) }}</span>
                </div>
              </a-timeline-item>
            </a-timeline>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useStore } from 'vuex';
import { message } from 'ant-design-vue';
import {
  SendOutlined,
  GlobalOutlined,
  LinkOutlined,
  BellOutlined,
  SyncOutlined,
  MessageOutlined
} from '@ant-design/icons-vue';

// 导入通信功能
import { globalEventBus } from '@shared/communication/event-bus';
import { globalStateManager } from '@shared/communication/global-state';
import { globalRouteManager } from '@shared/communication/navigation';
import { globalNotificationService } from '@shared/communication/realtime';
import { EVENT_TYPES } from '@shared/types/events';

const store = useStore();

// 响应式数据
const eventHistory = ref<any[]>([]);
const globalState = ref<any>({});
const eventForm = reactive({
  eventType: '',
  eventData: ''
});

// 计算属性
const messageCount = computed(() => {
  return store.state.messages?.messages?.length || 0;
});

// 生命周期
onMounted(() => {
  // 监听事件
  const handleEvent = (event: any) => {
    eventHistory.value = [event, ...eventHistory.value.slice(0, 9)];
  };

  // 监听状态变化
  const handleStateChange = (newState: any) => {
    globalState.value = newState;
  };

  globalEventBus.onAny(handleEvent);
  const unsubscribeState = globalStateManager.subscribe(handleStateChange);

  // 初始化状态
  globalState.value = globalStateManager.getState();

  // 发送应用就绪事件
  globalEventBus.emit({
    type: EVENT_TYPES.APP_READY,
    source: 'vue-app-1-demo',
    data: { message: 'Vue消息中心应用通信演示组件已就绪' },
    timestamp: new Date().toISOString(),
    id: `vue-demo-ready-${Date.now()}`
  });

  // 清理函数
  const cleanup = () => {
    globalEventBus.offAny(handleEvent);
    unsubscribeState(); // 使用subscribe方法返回的取消订阅函数
  };

  onUnmounted(cleanup);
});

// 方法
const handleSendEvent = async () => {
  try {
    await globalEventBus.emit({
      type: eventForm.eventType,
      source: 'vue-app-1',
      data: eventForm.eventData ? JSON.parse(eventForm.eventData) : {},
      timestamp: new Date().toISOString(),
      id: `vue-app-1-${Date.now()}`
    });
    message.success('事件发送成功');
    eventForm.eventType = '';
    eventForm.eventData = '';
  } catch (error) {
    message.error('事件发送失败: ' + (error as Error).message);
  }
};

const handleUpdateState = () => {
  const stateUpdate = {
    messageCenter: {
      lastAction: 'Vue演示状态更新',
      timestamp: new Date().toISOString(),
      unreadCount: Math.floor(Math.random() * 10),
      activeConversations: Math.floor(Math.random() * 5) + 1
    }
  };
  
  globalStateManager.setState(stateUpdate);
  message.success('状态更新成功');
};

const handleNavigation = (appName: string, path: string = '/') => {
  globalRouteManager.navigateToApp(appName, path, {
    from: 'vue-app-1',
    timestamp: new Date().toISOString(),
    reason: 'Vue演示导航'
  });
};

const handleSendNotification = () => {
  globalNotificationService.show({
    title: '来自Vue消息中心',
    message: '这是一个来自Vue消息中心应用的通知消息',
    type: 'info',
    duration: 5000
  });
};
</script>

<style scoped>
.communication-demo {
  padding: 16px;
}

.ant-card {
  height: 100%;
}

.ant-statistic {
  text-align: center;
}

.ant-timeline {
  margin-top: 8px;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>