<template>
  <div class="vue-message-push" v-if="isComponentReady">
    <div class="page-header">
      <h2>
        <send-outlined />
        消息推送管理
      </h2>
      <p>管理推送设置、查看推送历史、发送推送消息</p>
    </div>
    <a-tabs v-model:activeKey="activeTab" type="card" class="push-tabs">
      <!-- 推送设置 -->
      <a-tab-pane key="settings" tab="推送设置">
        <div class="tab-content">
          <a-card title="推送配置" size="small" class="config-card">
            <template #extra>
              <a-button type="primary" size="small" @click="savePushSettings">
                <template #icon><save-outlined /></template>
                保存设置
              </a-button>
            </template>

            <a-form :model="pushSettings" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="推送类型">
                    <a-select v-model:value="pushSettings.type" placeholder="选择推送类型">
                      <a-select-option value="scheduled">定时推送</a-select-option>
                      <a-select-option value="trigger">触发推送</a-select-option>
                      <a-select-option value="manual">手动推送</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="推送状态">
                    <a-switch 
                      v-model:checked="pushSettings.enabled" 
                      checked-children="启用" 
                      un-checked-children="禁用"
                    />
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item label="推送渠道">
                <a-checkbox-group v-model:value="pushSettings.channels">
                  <a-checkbox value="web">Web通知</a-checkbox>
                  <a-checkbox value="email">邮件</a-checkbox>
                  <a-checkbox value="sms">短信</a-checkbox>
                  <a-checkbox value="app">应用内</a-checkbox>
                </a-checkbox-group>
              </a-form-item>

              <a-form-item label="推送条件">
                <a-textarea 
                  v-model:value="pushSettings.conditions" 
                  :rows="3" 
                  placeholder="设置推送触发条件，如：用户登录、订单状态变更等"
                />
              </a-form-item>

              <a-form-item label="推送模板">
                <a-input v-model:value="pushSettings.template" placeholder="推送消息模板" />
              </a-form-item>
            </a-form>
          </a-card>

          <!-- 推送规则列表 -->
          <a-card title="推送规则" size="small" class="rules-card" style="margin-top: 16px;">
            <template #extra>
              <a-button type="primary" size="small" @click="showAddRuleModal">
                <template #icon><plus-outlined /></template>
                添加规则
              </a-button>
            </template>

            <a-table 
              :columns="ruleColumns" 
              :data-source="pushRules" 
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'enabled'">
                  <a-switch 
                    v-model:checked="record.enabled" 
                    size="small"
                    @change="updateRuleStatus(index, $event)"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a-space>
                    <a-button type="link" size="small" @click="editRule(index)">编辑</a-button>
                    <a-button type="link" size="small" danger @click="deleteRule(index)">删除</a-button>
                  </a-space>
                </template>
              </template>
            </a-table>
          </a-card>
        </div>
      </a-tab-pane>

      <!-- 推送历史 -->
      <a-tab-pane key="history" tab="推送历史">
        <div class="tab-content">
          <a-card title="推送统计" size="small" class="stats-card">
            <a-row :gutter="16">
              <a-col :span="6">
                <a-statistic title="今日推送" :value="pushStats.todayCount" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="成功率" :value="pushStats.successRate" suffix="%" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="总推送量" :value="pushStats.totalCount" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="活跃推送" :value="activePushes.length" />
              </a-col>
            </a-row>
          </a-card>

          <a-card title="推送记录" size="small" style="margin-top: 16px;">
            <template #extra>
              <a-space>
                <a-select v-model:value="historyFilter" placeholder="筛选状态" style="width: 120px;">
                  <a-select-option value="">全部</a-select-option>
                  <a-select-option value="sent">已发送</a-select-option>
                  <a-select-option value="failed">失败</a-select-option>
                  <a-select-option value="pending">待发送</a-select-option>
                </a-select>
                <a-button @click="refreshHistory">
                  <template #icon><reload-outlined /></template>
                  刷新
                </a-button>
              </a-space>
            </template>

            <a-table 
              :columns="historyColumns" 
              :data-source="filteredHistory" 
              :pagination="{ pageSize: 10 }"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="getStatusColor(record.status)">
                    {{ getStatusText(record.status) }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'sentAt'">
                  {{ formatDate(record.sentAt) }}
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a-space>
                    <a-button type="link" size="small" @click="viewPushDetail(record)">详情</a-button>
                    <a-button 
                      v-if="record.status === 'failed'" 
                      type="link" 
                      size="small" 
                      @click="retryPush(record)"
                    >
                      重试
                    </a-button>
                  </a-space>
                </template>
              </template>
            </a-table>
          </a-card>
        </div>
      </a-tab-pane>

      <!-- 手动推送 -->
      <a-tab-pane key="manual" tab="手动推送">
        <div class="tab-content">
          <a-card title="发送推送消息" size="small">
            <a-form :model="manualPush" layout="vertical" @finish="sendManualPush">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item 
                    label="推送标题" 
                    name="title"
                    :rules="[{ required: true, message: '请输入推送标题' }]"
                  >
                    <a-input v-model:value="manualPush.title" placeholder="输入推送标题" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="推送类型" name="type">
                    <a-select v-model:value="manualPush.type" placeholder="选择推送类型">
                      <a-select-option value="info">信息</a-select-option>
                      <a-select-option value="warning">警告</a-select-option>
                      <a-select-option value="error">错误</a-select-option>
                      <a-select-option value="success">成功</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-col>
              </a-row>

              <a-form-item 
                label="推送内容" 
                name="content"
                :rules="[{ required: true, message: '请输入推送内容' }]"
              >
                <a-textarea 
                  v-model:value="manualPush.content" 
                  :rows="4" 
                  placeholder="输入推送消息内容"
                />
              </a-form-item>

              <a-form-item label="推送目标" name="targetType">
                <a-radio-group v-model:value="manualPush.targetType">
                  <a-radio value="all">全部用户</a-radio>
                  <a-radio value="group">用户组</a-radio>
                  <a-radio value="user">指定用户</a-radio>
                </a-radio-group>
              </a-form-item>

              <a-form-item 
                v-if="manualPush.targetType !== 'all'" 
                label="目标ID" 
                name="targetIds"
              >
                <a-select
                  v-model:value="manualPush.targetIds"
                  mode="tags"
                  placeholder="输入用户ID或组ID"
                  style="width: 100%"
                />
              </a-form-item>

              <a-form-item label="推送渠道" name="channels">
                <a-checkbox-group v-model:value="manualPush.channels">
                  <a-checkbox value="web">Web通知</a-checkbox>
                  <a-checkbox value="email">邮件</a-checkbox>
                  <a-checkbox value="sms">短信</a-checkbox>
                  <a-checkbox value="app">应用内</a-checkbox>
                </a-checkbox-group>
              </a-form-item>

              <a-form-item label="定时发送">
                <a-switch v-model:checked="manualPush.scheduled" />
                <a-date-picker 
                  v-if="manualPush.scheduled"
                  v-model:value="manualPush.scheduledTime"
                  show-time
                  placeholder="选择发送时间"
                  style="margin-left: 16px;"
                />
              </a-form-item>

              <a-form-item>
                <a-space>
                  <a-button type="primary" html-type="submit" :loading="sending">
                    <template #icon><send-outlined /></template>
                    {{ manualPush.scheduled ? '定时发送' : '立即发送' }}
                  </a-button>
                  <a-button @click="previewPush">
                    <template #icon><eye-outlined /></template>
                    预览
                  </a-button>
                  <a-button @click="resetManualForm">
                    <template #icon><clear-outlined /></template>
                    重置
                  </a-button>
                </a-space>
              </a-form-item>
            </a-form>
          </a-card>

          <!-- 快速模板 -->
          <a-card title="快速模板" size="small" style="margin-top: 16px;">
            <a-row :gutter="16">
              <a-col :span="8" v-for="template in quickTemplates" :key="template.id">
                <a-card size="small" hoverable @click="useTemplate(template)">
                  <div class="template-item">
                    <h4>{{ template.title }}</h4>
                    <p>{{ template.description }}</p>
                    <a-tag :color="template.color">{{ template.type }}</a-tag>
                  </div>
                </a-card>
              </a-col>
            </a-row>
          </a-card>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 添加规则弹窗 -->
    <a-modal
      v-model:open="ruleModalVisible"
      title="添加推送规则"
      @ok="saveRule"
      @cancel="cancelRule"
    >
      <a-form :model="currentRule" layout="vertical">
        <a-form-item label="规则名称" name="name">
          <a-input v-model:value="currentRule.name" placeholder="输入规则名称" />
        </a-form-item>
        <a-form-item label="触发条件" name="condition">
          <a-textarea v-model:value="currentRule.condition" :rows="3" placeholder="描述触发条件" />
        </a-form-item>
        <a-form-item label="推送渠道" name="channels">
          <a-checkbox-group v-model:value="currentRule.channels">
            <a-checkbox value="web">Web通知</a-checkbox>
            <a-checkbox value="email">邮件</a-checkbox>
            <a-checkbox value="sms">短信</a-checkbox>
            <a-checkbox value="app">应用内</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 推送详情弹窗 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="推送详情"
      :footer="null"
      width="600px"
    >
      <div v-if="selectedPush">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="标题">{{ selectedPush.title }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(selectedPush.status)">
              {{ getStatusText(selectedPush.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="发送时间">{{ formatDate(selectedPush.sentAt) }}</a-descriptions-item>
          <a-descriptions-item label="目标类型">{{ selectedPush.targetType }}</a-descriptions-item>
          <a-descriptions-item label="内容" :span="2">{{ selectedPush.content }}</a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>
  </div>
  
  <!-- 加载状态 -->
  <div v-else class="loading-container">
    <a-spin size="large" />
    <p>正在初始化消息推送管理...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useStore } from 'vuex';
import { message } from 'ant-design-vue';
import type { Dayjs } from 'dayjs';
import {
  SendOutlined,
  SaveOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  ClearOutlined
} from '@ant-design/icons-vue';

const store = useStore();

// 响应式数据
const isComponentReady = ref(false);
const activeTab = ref('settings');
const sending = ref(false);
const historyFilter = ref('');
const ruleModalVisible = ref(false);
const detailModalVisible = ref(false);
const selectedPush = ref<any>(null);

// 推送设置
const pushSettings = reactive({
  type: 'manual',
  enabled: true,
  channels: ['web', 'app'],
  conditions: '',
  template: '您有新的消息：{content}'
});

// 推送规则
const pushRules = ref([
  {
    id: '1',
    name: '用户登录通知',
    condition: '用户首次登录时发送欢迎消息',
    channels: ['web', 'app'],
    enabled: true,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: '订单状态更新',
    condition: '订单状态发生变更时通知用户',
    channels: ['web', 'email', 'sms'],
    enabled: true,
    createdAt: '2024-01-10'
  }
]);

const currentRule = reactive({
  name: '',
  condition: '',
  channels: []
});

// 推送历史
const pushHistory = ref([
  {
    id: 'push_1',
    title: '系统维护通知',
    content: '系统将于今晚22:00-24:00进行维护',
    targetType: 'all',
    targetIds: [],
    status: 'sent',
    sentAt: '2024-01-15T10:30:00Z',
    channels: ['web', 'app']
  },
  {
    id: 'push_2',
    title: '新功能上线',
    content: '消息推送功能正式上线，欢迎体验！',
    targetType: 'group',
    targetIds: ['group_1', 'group_2'],
    status: 'sent',
    sentAt: '2024-01-14T15:20:00Z',
    channels: ['web', 'email']
  },
  {
    id: 'push_3',
    title: '重要通知',
    content: '请及时更新您的个人信息',
    targetType: 'user',
    targetIds: ['user_123'],
    status: 'failed',
    sentAt: '2024-01-14T09:15:00Z',
    channels: ['sms']
  }
]);

// 推送统计
const pushStats = reactive({
  todayCount: 15,
  successRate: 96.8,
  totalCount: 1250,
  failedCount: 40
});

// 活跃推送
const activePushes = ref([
  { id: 'active_1', title: '定时推送任务', nextRun: '2024-01-15T18:00:00Z' }
]);

// 手动推送表单
const manualPush = reactive({
  title: '',
  content: '',
  type: 'info',
  targetType: 'all',
  targetIds: [],
  channels: ['web'],
  scheduled: false,
  scheduledTime: null as Dayjs | null
});

// 快速模板
const quickTemplates = ref([
  {
    id: 'template_1',
    title: '系统通知',
    description: '系统维护、更新等通知',
    type: '系统',
    color: 'blue',
    content: '系统将进行维护，请注意保存您的工作。'
  },
  {
    id: 'template_2',
    title: '营销推广',
    description: '促销活动、新品推荐',
    type: '营销',
    color: 'green',
    content: '限时优惠活动开始了，快来参与吧！'
  },
  {
    id: 'template_3',
    title: '安全提醒',
    description: '安全警告、风险提示',
    type: '安全',
    color: 'red',
    content: '检测到异常登录，请及时检查账户安全。'
  }
]);

// 表格列定义
const ruleColumns = [
  { title: '规则名称', dataIndex: 'name', key: 'name' },
  { title: '触发条件', dataIndex: 'condition', key: 'condition', ellipsis: true },
  { title: '推送渠道', dataIndex: 'channels', key: 'channels' },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 80 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 120 },
  { title: '操作', key: 'actions', width: 120 }
];

const historyColumns = [
  { title: '标题', dataIndex: 'title', key: 'title' },
  { title: '目标类型', dataIndex: 'targetType', key: 'targetType', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 80 },
  { title: '发送时间', dataIndex: 'sentAt', key: 'sentAt', width: 150 },
  { title: '操作', key: 'actions', width: 120 }
];

// 计算属性
const filteredHistory = computed(() => {
  if (!historyFilter.value) return pushHistory.value;
  return pushHistory.value.filter(item => item.status === historyFilter.value);
});

// 方法
const savePushSettings = () => {
  // 保存推送设置到store
  store.dispatch('savePushSetting', pushSettings);
  message.success('推送设置保存成功');
};

const showAddRuleModal = () => {
  Object.assign(currentRule, { name: '', condition: '', channels: [] });
  ruleModalVisible.value = true;
};

const saveRule = () => {
  if (!currentRule.name || !currentRule.condition) {
    message.error('请填写完整的规则信息');
    return;
  }
  
  const newRule = {
    id: `rule_${Date.now()}`,
    ...currentRule,
    enabled: true,
    createdAt: new Date().toISOString().split('T')[0]
  };
  
  pushRules.value.push(newRule);
  ruleModalVisible.value = false;
  message.success('推送规则添加成功');
};

const cancelRule = () => {
  ruleModalVisible.value = false;
};

const editRule = (index: number) => {
  const rule = pushRules.value[index];
  Object.assign(currentRule, rule);
  ruleModalVisible.value = true;
};

const deleteRule = (index: number) => {
  pushRules.value.splice(index, 1);
  message.success('推送规则删除成功');
};

const updateRuleStatus = (index: number, enabled: boolean) => {
  pushRules.value[index].enabled = enabled;
  message.success(`推送规则已${enabled ? '启用' : '禁用'}`);
};

const refreshHistory = () => {
  message.success('推送历史已刷新');
};

const sendManualPush = async () => {
  if (!manualPush.title || !manualPush.content) {
    message.error('请填写推送标题和内容');
    return;
  }

  sending.value = true;
  
  try {
    // 模拟发送推送
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newPush = {
      id: `push_${Date.now()}`,
      title: manualPush.title,
      content: manualPush.content,
      targetType: manualPush.targetType,
      targetIds: manualPush.targetIds,
      status: 'sent',
      sentAt: new Date().toISOString(),
      channels: manualPush.channels
    };
    
    pushHistory.value.unshift(newPush);
    pushStats.todayCount++;
    pushStats.totalCount++;
    
    message.success('推送消息发送成功');
    resetManualForm();
  } catch (error) {
    message.error('推送消息发送失败');
  } finally {
    sending.value = false;
  }
};

const previewPush = () => {
  if (!manualPush.title || !manualPush.content) {
    message.error('请先填写推送标题和内容');
    return;
  }
  
  // 显示预览弹窗
  message.info(`预览：${manualPush.title} - ${manualPush.content}`);
};

const resetManualForm = () => {
  Object.assign(manualPush, {
    title: '',
    content: '',
    type: 'info',
    targetType: 'all',
    targetIds: [],
    channels: ['web'],
    scheduled: false,
    scheduledTime: null
  });
};

const useTemplate = (template: any) => {
  manualPush.title = template.title;
  manualPush.content = template.content;
  manualPush.type = template.type === '安全' ? 'error' : 'info';
  activeTab.value = 'manual';
  message.success('模板已应用');
};

const viewPushDetail = (record: any) => {
  selectedPush.value = record;
  detailModalVisible.value = true;
};

const retryPush = async (record: any) => {
  try {
    // 模拟重试推送
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const index = pushHistory.value.findIndex(item => item.id === record.id);
    if (index !== -1) {
      pushHistory.value[index].status = 'sent';
      pushHistory.value[index].sentAt = new Date().toISOString();
    }
    
    message.success('推送重试成功');
  } catch (error) {
    message.error('推送重试失败');
  }
};

const getStatusColor = (status: string) => {
  const colors = {
    sent: 'green',
    failed: 'red',
    pending: 'orange'
  };
  return colors[status as keyof typeof colors] || 'default';
};

const getStatusText = (status: string) => {
  const texts = {
    sent: '已发送',
    failed: '失败',
    pending: '待发送'
  };
  return texts[status as keyof typeof texts] || status;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN');
};

// 定义 emit
const emit = defineEmits<{
  'component-ready': [componentName: string];
  'component-error': [error: Error];
}>();

// 生命周期
onMounted(async () => {
  try {
    // 简化的组件初始化流程
    await store.dispatch('fetchPushMessages');
    isComponentReady.value = true;
    
    // 通知父组件组件已就绪
    emit('component-ready', 'MessagePush');
  } catch (error) {
    console.error('MessagePush 初始化失败:', error);
    // 降级处理：延迟后仍然显示组件
    setTimeout(() => {
      isComponentReady.value = true;
      emit('component-ready', 'MessagePush');
    }, 500);
  }
});


</script>