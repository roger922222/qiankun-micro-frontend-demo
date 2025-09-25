<template>
  <div class="message-center">
    <div class="message-center-header">
      <h2>消息中心</h2>
      <a-space>
        <a-button @click="markAllAsRead" :disabled="unreadCount === 0">
          全部标记为已读
        </a-button>
        <a-button type="primary" @click="showComposeModal = true">
          发送消息
        </a-button>
      </a-space>
    </div>

    <a-row :gutter="16">
      <a-col :span="8">
        <a-card title="消息列表" size="small">
          <template #extra>
            <a-badge :count="unreadCount" />
          </template>
          
          <a-list
            :data-source="messages"
            size="small"
            :pagination="false"
            style="max-height: 400px; overflow-y: auto"
          >
            <template #renderItem="{ item }">
              <a-list-item
                :class="{ 'message-unread': item.status === 'unread' }"
                @click="selectMessage(item)"
                style="cursor: pointer"
              >
                <a-list-item-meta>
                  <template #title>
                    <div style="display: flex; justify-content: space-between; align-items: center">
                      <span>{{ item.title }}</span>
                      <a-tag 
                        :color="getTypeColor(item.type)"
                        size="small"
                      >
                        {{ getTypeText(item.type) }}
                      </a-tag>
                    </div>
                  </template>
                  <template #description>
                    <div>
                      <div>{{ item.content.substring(0, 50) }}...</div>
                      <div style="margin-top: 4px; font-size: 11px; color: #999">
                        {{ formatTime(item.createdAt) }}
                      </div>
                    </div>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>

      <a-col :span="16">
        <a-card title="消息详情" size="small">
          <div v-if="selectedMessage">
            <div class="message-detail-header">
              <h3>{{ selectedMessage.title }}</h3>
              <a-space>
                <a-tag :color="getTypeColor(selectedMessage.type)">
                  {{ getTypeText(selectedMessage.type) }}
                </a-tag>
                <a-tag :color="selectedMessage.priority === 'high' ? 'red' : 'default'">
                  {{ getPriorityText(selectedMessage.priority) }}
                </a-tag>
                <a-button 
                  v-if="selectedMessage.status === 'unread'"
                  size="small"
                  @click="markAsRead(selectedMessage.id)"
                >
                  标记为已读
                </a-button>
                <a-button 
                  size="small" 
                  danger
                  @click="deleteMessage(selectedMessage.id)"
                >
                  删除
                </a-button>
              </a-space>
            </div>
            
            <a-divider />
            
            <div class="message-content">
              <p>{{ selectedMessage.content }}</p>
            </div>
            
            <div class="message-meta">
              <p><strong>发送者:</strong> {{ selectedMessage.sender }}</p>
              <p><strong>发送时间:</strong> {{ formatTime(selectedMessage.createdAt) }}</p>
              <p><strong>状态:</strong> 
                <a-tag :color="selectedMessage.status === 'read' ? 'green' : 'orange'">
                  {{ selectedMessage.status === 'read' ? '已读' : '未读' }}
                </a-tag>
              </p>
            </div>
          </div>
          
          <div v-else class="no-message-selected">
            <a-empty description="请选择一条消息查看详情" />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 发送消息模态框 -->
    <a-modal
      v-model:open="showComposeModal"
      title="发送消息"
      @ok="sendMessage"
      @cancel="resetComposeForm"
    >
      <a-form :model="composeForm" layout="vertical">
        <a-form-item label="标题" name="title">
          <a-input v-model:value="composeForm.title" placeholder="请输入消息标题" />
        </a-form-item>
        
        <a-form-item label="类型" name="type">
          <a-select v-model:value="composeForm.type" placeholder="选择消息类型">
            <a-select-option value="system">系统消息</a-select-option>
            <a-select-option value="user">用户消息</a-select-option>
            <a-select-option value="order">订单消息</a-select-option>
            <a-select-option value="notification">通知消息</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="优先级" name="priority">
          <a-select v-model:value="composeForm.priority" placeholder="选择优先级">
            <a-select-option value="low">低</a-select-option>
            <a-select-option value="normal">普通</a-select-option>
            <a-select-option value="high">高</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="内容" name="content">
          <a-textarea 
            v-model:value="composeForm.content" 
            :rows="4" 
            placeholder="请输入消息内容"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { message } from 'ant-design-vue';

const store = useStore();

// 响应式数据
const showComposeModal = ref(false);
const composeForm = ref({
  title: '',
  type: 'user',
  priority: 'normal',
  content: '',
  sender: 'vue-message-center'
});

// 计算属性
const messages = computed(() => store.state.messages.messages);
const selectedMessage = computed(() => store.state.messages.selectedMessage);
const unreadCount = computed(() => store.state.messages.unreadCount);

// 生命周期
onMounted(() => {
  store.dispatch('fetchMessages');
});

// 方法
const selectMessage = (msg: any) => {
  store.commit('SET_SELECTED_MESSAGE', msg);
  if (msg.status === 'unread') {
    store.dispatch('markAsRead', msg.id);
  }
};

const markAsRead = (messageId: string) => {
  store.dispatch('markAsRead', messageId);
  message.success('已标记为已读');
};

const markAllAsRead = () => {
  store.commit('MARK_ALL_AS_READ');
  message.success('已全部标记为已读');
};

const deleteMessage = (messageId: string) => {
  store.dispatch('deleteMessage', messageId);
  store.commit('SET_SELECTED_MESSAGE', null);
  message.success('消息已删除');
};

const sendMessage = async () => {
  if (!composeForm.value.title || !composeForm.value.content) {
    message.error('请填写标题和内容');
    return;
  }
  
  await store.dispatch('sendMessage', {
    ...composeForm.value,
    status: 'unread'
  });
  
  message.success('消息发送成功');
  resetComposeForm();
  showComposeModal.value = false;
};

const resetComposeForm = () => {
  composeForm.value = {
    title: '',
    type: 'user',
    priority: 'normal',
    content: '',
    sender: 'vue-message-center'
  };
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    system: 'blue',
    user: 'green',
    order: 'orange',
    notification: 'purple'
  };
  return colors[type] || 'default';
};

const getTypeText = (type: string) => {
  const texts: Record<string, string> = {
    system: '系统',
    user: '用户',
    order: '订单',
    notification: '通知'
  };
  return texts[type] || type;
};

const getPriorityText = (priority: string) => {
  const texts: Record<string, string> = {
    low: '低优先级',
    normal: '普通',
    high: '高优先级'
  };
  return texts[priority] || priority;
};

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleString('zh-CN');
};
</script>

<style scoped>
.message-center {
  padding: 16px;
}

.message-center-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.message-center-header h2 {
  margin: 0;
}

.message-unread {
  background-color: #f0f9ff;
  border-left: 3px solid #1890ff;
}

.message-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.message-detail-header h3 {
  margin: 0;
  flex: 1;
}

.message-content {
  margin: 16px 0;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  line-height: 1.6;
}

.message-meta {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.message-meta p {
  margin: 8px 0;
  color: #666;
}

.no-message-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}
</style>