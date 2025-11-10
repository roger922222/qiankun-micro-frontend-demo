<template>
  <div class="alert-manager-container">
    <div class="alert-header">
      <h2>告警管理</h2>
      <div class="alert-controls">
        <a-select v-model:value="alertLevel" style="width: 120px; margin-right: 16px">
          <a-select-option value="all">全部级别</a-select-option>
          <a-select-option value="critical">严重</a-select-option>
          <a-select-option value="warning">警告</a-select-option>
          <a-select-option value="info">信息</a-select-option>
        </a-select>
        
        <a-select v-model:value="alertStatus" style="width: 120px; margin-right: 16px">
          <a-select-option value="all">全部状态</a-select-option>
          <a-select-option value="active">活跃</a-select-option>
          <a-select-option value="acknowledged">已确认</a-select-option>
          <a-select-option value="resolved">已解决</a-select-option>
        </a-select>
        
        <a-button type="primary" @click="refreshAlerts">
          <ReloadOutlined />
          刷新
        </a-button>
      </div>
    </div>

    <!-- 告警统计卡片 -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="活跃告警"
            :value="activeAlertCount"
            :value-style="{ color: '#ff4d4f' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="严重告警"
            :value="criticalAlertCount"
            :value-style="{ color: '#fa541c' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="今日新增"
            :value="todayAlertCount"
            :value-style="{ color: '#1890ff' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="已解决"
            :value="resolvedAlertCount"
            :value-style="{ color: '#52c41a' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 告警列表 -->
    <a-card title="告警列表">
      <a-table
        :columns="columns"
        :data-source="filteredAlerts"
        :loading="loading"
        :pagination="paginationConfig"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'level'">
            <a-badge
              :status="getAlertLevelStatus(record.level)"
              :text="getAlertLevelText(record.level)"
            />
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getAlertStatusColor(record.status)">
              {{ getAlertStatusText(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button 
                v-if="record.status === 'active'"
                type="link" 
                size="small"
                @click="acknowledgeAlert(record)"
              >
                确认
              </a-button>
              <a-button 
                v-if="record.status !== 'resolved'"
                type="link" 
                size="small"
                @click="resolveAlert(record)"
              >
                解决
              </a-button>
              <a-button type="link" size="small" @click="viewAlertDetail(record)">
                详情
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 告警详情模态框 -->
    <a-modal
      v-model:open="detailVisible"
      title="告警详情"
      :footer="null"
      width="600px"
    >
      <div class="alert-detail" v-if="currentAlert">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="告警名称">
            {{ currentAlert.name }}
          </a-descriptions-item>
          <a-descriptions-item label="告警级别">
            <a-badge
              :status="getAlertLevelStatus(currentAlert.level)"
              :text="getAlertLevelText(currentAlert.level)"
            />
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getAlertStatusColor(currentAlert.status)">
              {{ getAlertStatusText(currentAlert.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="描述">
            {{ currentAlert.description }}
          </a-descriptions-item>
          <a-descriptions-item label="触发时间">
            {{ formatTime(currentAlert.triggeredAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="持续时间">
            {{ getDuration(currentAlert.triggeredAt) }}
          </a-descriptions-item>
          <a-descriptions-item label="来源">
            {{ currentAlert.source }}
          </a-descriptions-item>
          <a-descriptions-item label="标签">
            <a-space>
              <a-tag v-for="tag in currentAlert.tags" :key="tag">
                {{ tag }}
              </a-tag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="详情" v-if="currentAlert.details">
            <pre>{{ JSON.stringify(currentAlert.details, null, 2) }}</pre>
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { globalLogger } from '@shared/utils/logger';
import {
  ReloadOutlined
} from '@ant-design/icons-vue';

// 告警接口
interface AlertItem {
  id: string;
  name: string;
  level: 'critical' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
  description: string;
  triggeredAt: string;
  source: string;
  tags: string[];
  details?: any;
}

// 响应式数据
const alerts = ref<AlertItem[]>([]);
const loading = ref(false);
const alertLevel = ref('all');
const alertStatus = ref('all');
const detailVisible = ref(false);
const currentAlert = ref<AlertItem | null>(null);

// 分页配置
const paginationConfig = reactive({
  pageSize: 10,
  current: 1,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: number[]) => 
    `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
});

// 表格列配置
const columns = [
  {
    title: '告警名称',
    dataIndex: 'name',
    key: 'name',
    width: 200
  },
  {
    title: '级别',
    dataIndex: 'level',
    key: 'level',
    width: 100
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true
  },
  {
    title: '触发时间',
    dataIndex: 'triggeredAt',
    key: 'triggeredAt',
    width: 180
  },
  {
    title: '来源',
    dataIndex: 'source',
    key: 'source',
    width: 150
  },
  {
    title: '操作',
    key: 'actions',
    width: 150
  }
];

// 计算属性 - 统计
const activeAlertCount = computed(() => {
  return alerts.value.filter(alert => alert.status === 'active').length;
});

const criticalAlertCount = computed(() => {
  return alerts.value.filter(alert => alert.level === 'critical').length;
});

const todayAlertCount = computed(() => {
  const today = new Date().toDateString();
  return alerts.value.filter(alert => 
    new Date(alert.triggeredAt).toDateString() === today
  ).length;
});

const resolvedAlertCount = computed(() => {
  return alerts.value.filter(alert => alert.status === 'resolved').length;
});

// 计算属性 - 过滤告警
const filteredAlerts = computed(() => {
  let filtered = alerts.value;

  // 按级别过滤
  if (alertLevel.value !== 'all') {
    filtered = filtered.filter(alert => alert.level === alertLevel.value);
  }

  // 按状态过滤
  if (alertStatus.value !== 'all') {
    filtered = filtered.filter(alert => alert.status === alertStatus.value);
  }

  return filtered;
});

// 获取告警级别状态
const getAlertLevelStatus = (level: string) => {
  switch (level) {
    case 'critical': return 'error';
    case 'warning': return 'warning';
    case 'info': return 'processing';
    default: return 'default';
  }
};

// 获取告警级别文本
const getAlertLevelText = (level: string) => {
  switch (level) {
    case 'critical': return '严重';
    case 'warning': return '警告';
    case 'info': return '信息';
    default: return level;
  }
};

// 获取告警状态颜色
const getAlertStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'red';
    case 'acknowledged': return 'orange';
    case 'resolved': return 'green';
    default: return 'default';
  }
};

// 获取告警状态文本
const getAlertStatusText = (status: string) => {
  switch (status) {
    case 'active': return '活跃';
    case 'acknowledged': return '已确认';
    case 'resolved': return '已解决';
    default: return status;
  }
};

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
};

// 获取持续时间
const getDuration = (triggeredAt: string) => {
  const now = new Date();
  const triggered = new Date(triggeredAt);
  const diff = now.getTime() - triggered.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天${hours % 24}小时`;
  if (hours > 0) return `${hours}小时${minutes % 60}分钟`;
  return `${minutes}分钟`;
};

// 确认告警
const acknowledgeAlert = (alert: AlertItem) => {
  alert.status = 'acknowledged';
  message.success(`告警 "${alert.name}" 已确认`);
  globalLogger.info('Alert acknowledged:', alert.id);
};

// 解决告警
const resolveAlert = (alert: AlertItem) => {
  alert.status = 'resolved';
  message.success(`告警 "${alert.name}" 已解决`);
  globalLogger.info('Alert resolved:', alert.id);
};

// 查看告警详情
const viewAlertDetail = (alert: AlertItem) => {
  currentAlert.value = alert;
  detailVisible.value = true;
  globalLogger.info('Viewing alert detail:', alert.id);
};

// 刷新告警数据
const refreshAlerts = async () => {
  loading.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 生成模拟数据
    generateMockAlerts();
    
    message.success('告警数据已刷新');
    globalLogger.info('Alerts refreshed successfully');
  } catch (error) {
    message.error('刷新告警数据失败');
    globalLogger.error('Failed to refresh alerts:', error);
  } finally {
    loading.value = false;
  }
};

// 生成模拟告警数据
const generateMockAlerts = () => {
  const mockAlerts: AlertItem[] = [
    {
      id: 'alert-1',
      name: 'CPU使用率过高',
      level: 'critical',
      status: 'active',
      description: 'CPU使用率超过90%，当前使用率为95%',
      triggeredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      source: 'system-monitor',
      tags: ['cpu', 'performance', 'critical'],
      details: { current: 95, threshold: 90, duration: '5分钟' }
    },
    {
      id: 'alert-2',
      name: '内存使用率警告',
      level: 'warning',
      status: 'active',
      description: '内存使用率超过80%，当前使用率为85%',
      triggeredAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      source: 'memory-monitor',
      tags: ['memory', 'performance'],
      details: { current: 85, threshold: 80 }
    },
    {
      id: 'alert-3',
      name: '磁盘空间不足',
      level: 'warning',
      status: 'acknowledged',
      description: '磁盘使用率超过85%，当前使用率为88%',
      triggeredAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      source: 'disk-monitor',
      tags: ['disk', 'storage'],
      details: { current: 88, threshold: 85 }
    },
    {
      id: 'alert-4',
      name: '网络连接异常',
      level: 'critical',
      status: 'resolved',
      description: '网络连接中断，无法访问外部服务',
      triggeredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      source: 'network-monitor',
      tags: ['network', 'connectivity'],
      details: { error: 'Connection timeout', retryCount: 3 }
    },
    {
      id: 'alert-5',
      name: '服务健康检查',
      level: 'info',
      status: 'active',
      description: '服务健康检查通过，系统运行正常',
      triggeredAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      source: 'health-check',
      tags: ['health', 'system'],
      details: { status: 'healthy', responseTime: 120 }
    }
  ];
  
  alerts.value = mockAlerts;
  paginationConfig.total = mockAlerts.length;
};

// 生命周期
onMounted(() => {
  globalLogger.info('AlertManager component mounted');
  generateMockAlerts();
});
</script>

<style scoped>
.alert-manager-container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.alert-header h2 {
  margin: 0;
  color: #262626;
  font-size: 20px;
  font-weight: 500;
}

.alert-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.alert-detail pre {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .alert-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .alert-controls {
    flex-wrap: wrap;
    width: 100%;
  }
  
  .alert-controls > * {
    flex: 1;
    min-width: 150px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .alert-manager-container {
    background: #141414;
  }
  
  .alert-header {
    background: #1f1f1f;
    color: #ffffff;
  }
  
  .alert-header h2 {
    color: #ffffff;
  }
  
  .alert-detail pre {
    background: #262626;
    color: #ffffff;
  }
}
</style>