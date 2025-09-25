<template>
  <div class="notifications">
    <div class="notifications-header">
      <h2>通知中心</h2>
      <a-space>
        <a-switch 
          v-model:checked="notificationEnabled"
          @change="updateNotificationSetting"
          checked-children="开启"
          un-checked-children="关闭"
        />
        <span>桌面通知</span>
      </a-space>
    </div>

    <a-row :gutter="16">
      <a-col :span="24">
        <a-card title="通知设置">
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="通知方式">
                  <a-checkbox-group v-model:value="notificationMethods">
                    <a-checkbox value="browser">浏览器通知</a-checkbox>
                    <a-checkbox value="sound">声音提醒</a-checkbox>
                    <a-checkbox value="popup">弹窗提醒</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
              </a-col>
              
              <a-col :span="12">
                <a-form-item label="通知类型">
                  <a-checkbox-group v-model:value="notificationTypes">
                    <a-checkbox value="system">系统通知</a-checkbox>
                    <a-checkbox value="user">用户消息</a-checkbox>
                    <a-checkbox value="order">订单更新</a-checkbox>
                    <a-checkbox value="promotion">促销活动</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
              </a-col>
            </a-row>
            
            <a-form-item>
              <a-button type="primary" @click="saveSettings">
                保存设置
              </a-button>
              <a-button style="margin-left: 8px" @click="testNotification">
                测试通知
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="24">
        <a-card title="通知历史">
          <a-table 
            :columns="columns" 
            :data-source="notificationHistory"
            :pagination="{ pageSize: 10 }"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'type'">
                <a-tag :color="getTypeColor(record.type)">
                  {{ getTypeText(record.type) }}
                </a-tag>
              </template>
              
              <template v-if="column.key === 'status'">
                <a-tag :color="record.status === 'sent' ? 'green' : 'red'">
                  {{ record.status === 'sent' ? '已发送' : '发送失败' }}
                </a-tag>
              </template>
              
              <template v-if="column.key === 'time'">
                {{ formatTime(record.time) }}
              </template>
              
              <template v-if="column.key === 'action'">
                <a-button 
                  size="small" 
                  @click="resendNotification(record)"
                  :disabled="record.status === 'sent'"
                >
                  重新发送
                </a-button>
              </template>
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { message } from 'ant-design-vue';

const store = useStore();

// 响应式数据
const notificationEnabled = ref(true);
const notificationMethods = ref(['browser', 'popup']);
const notificationTypes = ref(['system', 'user', 'order']);
const notificationHistory = ref([
  {
    id: 1,
    title: '系统维护通知',
    content: '系统将于今晚22:00-24:00进行维护',
    type: 'system',
    status: 'sent',
    time: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    title: '新订单提醒',
    content: '您有一个新的订单需要处理',
    type: 'order',
    status: 'sent',
    time: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 3,
    title: '用户消息',
    content: '张三给您发送了一条消息',
    type: 'user',
    status: 'failed',
    time: new Date(Date.now() - 10800000).toISOString()
  }
]);

// 表格列配置
const columns = [
  {
    title: '标题',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: '内容',
    dataIndex: 'content',
    key: 'content',
    ellipsis: true
  },
  {
    title: '类型',
    key: 'type',
  },
  {
    title: '状态',
    key: 'status',
  },
  {
    title: '时间',
    key: 'time',
  },
  {
    title: '操作',
    key: 'action',
  }
];

// 方法
const updateNotificationSetting = (enabled: boolean) => {
  store.commit('SET_NOTIFICATION_ENABLED', enabled);
  message.success(enabled ? '通知已开启' : '通知已关闭');
};

const saveSettings = () => {
  // 保存通知设置到localStorage或发送到服务器
  localStorage.setItem('notification-methods', JSON.stringify(notificationMethods.value));
  localStorage.setItem('notification-types', JSON.stringify(notificationTypes.value));
  message.success('设置已保存');
};

const testNotification = () => {
  if (!notificationEnabled.value) {
    message.warning('请先开启通知功能');
    return;
  }
  
  // 测试浏览器通知
  if (notificationMethods.value.includes('browser')) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('测试通知', {
          body: '这是一个来自Vue消息中心的测试通知',
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('测试通知', {
              body: '这是一个来自Vue消息中心的测试通知',
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  }
  
  // 添加到通知历史
  notificationHistory.value.unshift({
    id: Date.now(),
    title: '测试通知',
    content: '这是一个测试通知',
    type: 'system',
    status: 'sent',
    time: new Date().toISOString()
  });
  
  message.success('测试通知已发送');
};

const resendNotification = (notification: any) => {
  // 重新发送通知逻辑
  const index = notificationHistory.value.findIndex(n => n.id === notification.id);
  if (index !== -1) {
    notificationHistory.value[index].status = 'sent';
    notificationHistory.value[index].time = new Date().toISOString();
  }
  message.success('通知已重新发送');
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    system: 'blue',
    user: 'green',
    order: 'orange',
    promotion: 'purple'
  };
  return colors[type] || 'default';
};

const getTypeText = (type: string) => {
  const texts: Record<string, string> = {
    system: '系统',
    user: '用户',
    order: '订单',
    promotion: '促销'
  };
  return texts[type] || type;
};

const formatTime = (timeString: string) => {
  return new Date(timeString).toLocaleString('zh-CN');
};

// 生命周期
onMounted(() => {
  // 加载保存的设置
  const savedMethods = localStorage.getItem('notification-methods');
  const savedTypes = localStorage.getItem('notification-types');
  
  if (savedMethods) {
    notificationMethods.value = JSON.parse(savedMethods);
  }
  
  if (savedTypes) {
    notificationTypes.value = JSON.parse(savedTypes);
  }
  
  // 请求通知权限
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
</script>

<style scoped>
.notifications {
  padding: 16px;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.notifications-header h2 {
  margin: 0;
}

.ant-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>