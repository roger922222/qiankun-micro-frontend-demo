<template>
  <div class="vue-system-monitor dashboard">
    <div class="dashboard-header">
      <h2>系统概览</h2>
      <a-space>
        <a-button @click="refreshData">
          <ReloadOutlined />
          刷新数据
        </a-button>
        <a-select v-model:value="timeRange" style="width: 120px">
          <a-select-option value="1h">最近1小时</a-select-option>
          <a-select-option value="6h">最近6小时</a-select-option>
          <a-select-option value="24h">最近24小时</a-select-option>
          <a-select-option value="7d">最近7天</a-select-option>
        </a-select>
      </a-space>
    </div>

    <a-row :gutter="[16, 16]">
      <!-- 系统指标卡片 -->
      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="metric-card">
          <div class="metric-content">
            <div class="metric-value">{{ systemMetrics.cpu.toFixed(1) }}%</div>
            <div class="metric-label">CPU 使用率</div>
            <a-progress 
              :percent="systemMetrics.cpu" 
              :stroke-color="getProgressColor(systemMetrics.cpu)"
              size="small"
            />
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="metric-card">
          <div class="metric-content">
            <div class="metric-value">{{ systemMetrics.memory.toFixed(1) }}%</div>
            <div class="metric-label">内存使用率</div>
            <a-progress 
              :percent="systemMetrics.memory" 
              :stroke-color="getProgressColor(systemMetrics.memory)"
              size="small"
            />
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="metric-card">
          <div class="metric-content">
            <div class="metric-value">{{ systemMetrics.disk.toFixed(1) }}%</div>
            <div class="metric-label">磁盘使用率</div>
            <a-progress 
              :percent="systemMetrics.disk" 
              :stroke-color="getProgressColor(systemMetrics.disk)"
              size="small"
            />
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="metric-card">
          <div class="metric-content">
            <div class="metric-value">{{ systemMetrics.network.toFixed(1) }}MB/s</div>
            <div class="metric-label">网络流量</div>
            <div class="metric-trend">
              <ArrowUpOutlined style="color: #52c41a;" />
              +12.5%
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" style="margin-top: 16px;">
      <!-- 服务状态 -->
      <a-col :xs="24" :lg="12">
        <a-card title="服务状态" :bordered="false">
          <div class="service-list">
            <div 
              v-for="service in services" 
              :key="service.id"
              class="service-item"
            >
              <div class="service-info">
                <div class="service-name">{{ service.name }}</div>
                <div class="service-metrics">
                  <span>运行时间: {{ service.uptime }}</span>
                  <span>响应时间: {{ service.responseTime }}</span>
                </div>
              </div>
              <div class="service-status">
                <a-badge 
                  :status="getServiceStatusType(service.status)" 
                  :text="getServiceStatusText(service.status)"
                />
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- 最新告警 -->
      <a-col :xs="24" :lg="12">
        <a-card title="最新告警" :bordered="false">
          <div class="alert-list">
            <div 
              v-for="alert in recentAlerts" 
              :key="alert.id"
              class="alert-item"
              :class="`alert-${alert.level}`"
            >
              <div class="alert-content">
                <div class="alert-message">{{ alert.message }}</div>
                <div class="alert-time">{{ formatTime(alert.timestamp) }}</div>
              </div>
              <div class="alert-status">
                <a-tag 
                  :color="getAlertColor(alert.level)"
                  size="small"
                >
                  {{ getAlertLevelText(alert.level) }}
                </a-tag>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 图表区域 -->
    <a-row :gutter="[16, 16]" style="margin-top: 16px;">
      <a-col :span="24">
        <a-card title="系统性能趋势" :bordered="false">
          <div class="chart-container">
            <div class="chart-placeholder">
              <LineChartOutlined style="font-size: 48px; color: #d9d9d9;" />
              <p>性能趋势图表</p>
              <p style="color: #999; font-size: 12px;">集成图表库后显示实时数据</p>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { 
  ReloadOutlined, 
  ArrowUpOutlined,
  LineChartOutlined 
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { globalLogger } from '@shared/utils/logger';

// 响应式数据
const timeRange = ref('1h');
const systemMetrics = ref({
  cpu: 45.2,
  memory: 68.5,
  disk: 32.1,
  network: 15.8
});

const services = ref([
  {
    id: 'service_1',
    name: '用户服务',
    status: 'running',
    uptime: '99.9%',
    responseTime: '120ms'
  },
  {
    id: 'service_2',
    name: '订单服务',
    status: 'running',
    uptime: '99.8%',
    responseTime: '85ms'
  },
  {
    id: 'service_3',
    name: '支付服务',
    status: 'warning',
    uptime: '98.5%',
    responseTime: '250ms'
  }
]);

const recentAlerts = ref([
  {
    id: 'alert_1',
    level: 'warning',
    message: 'CPU使用率较高，建议检查系统负载',
    timestamp: new Date().toISOString(),
    resolved: false
  },
  {
    id: 'alert_2',
    level: 'info',
    message: '系统备份已完成',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    resolved: true
  },
  {
    id: 'alert_3',
    level: 'error',
    message: '数据库连接异常',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    resolved: false
  }
]);

let updateTimer: NodeJS.Timeout | null = null;

onMounted(() => {
  globalLogger.info('SystemDashboard mounted');
  startRealTimeUpdates();
});

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
});

const startRealTimeUpdates = () => {
  updateTimer = setInterval(() => {
    // 模拟实时数据更新
    systemMetrics.value.cpu = Math.random() * 30 + 30; // 30-60%
    systemMetrics.value.memory = Math.random() * 20 + 60; // 60-80%
    systemMetrics.value.disk = Math.random() * 10 + 30; // 30-40%
    systemMetrics.value.network = Math.random() * 10 + 10; // 10-20MB/s
  }, 5000);
};

const refreshData = () => {
  message.info('正在刷新数据...');
  globalLogger.info('Refreshing dashboard data');
  // TODO: 实际的数据刷新逻辑
};

const getProgressColor = (value: number) => {
  if (value < 50) return '#52c41a';
  if (value < 80) return '#faad14';
  return '#ff4d4f';
};

const getServiceStatusType = (status: string) => {
  switch (status) {
    case 'running': return 'success';
    case 'warning': return 'warning';
    case 'error': return 'error';
    default: return 'default';
  }
};

const getServiceStatusText = (status: string) => {
  switch (status) {
    case 'running': return '正常运行';
    case 'warning': return '警告';
    case 'error': return '错误';
    default: return '未知';
  }
};

const getAlertColor = (level: string) => {
  switch (level) {
    case 'error': return 'red';
    case 'warning': return 'orange';
    case 'info': return 'blue';
    default: return 'default';
  }
};

const getAlertLevelText = (level: string) => {
  switch (level) {
    case 'error': return '错误';
    case 'warning': return '警告';
    case 'info': return '信息';
    default: return '未知';
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};
</script>

<style scoped>
.vue-system-monitor.dashboard {
  padding: 0 !important;
}

.dashboard-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 24px !important;
}

.dashboard-header h2 {
  margin: 0 !important;
  color: #333 !important;
}

.metric-card {
  height: 120px !important;
}

.metric-content {
  text-align: center !important;
}

.metric-value {
  font-size: 28px !important;
  font-weight: bold !important;
  color: #1890ff !important;
  margin-bottom: 8px !important;
}

.metric-label {
  color: #666 !important;
  font-size: 14px !important;
  margin-bottom: 12px !important;
}

.metric-trend {
  margin-top: 8px !important;
  font-size: 12px !important;
}

.service-list {
  max-height: 300px !important;
  overflow-y: auto !important;
}

.service-item {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 12px 0 !important;
  border-bottom: 1px solid #f0f0f0 !important;
}

.service-item:last-child {
  border-bottom: none !important;
}

.service-name {
  font-weight: 600 !important;
  color: #333 !important;
  margin-bottom: 4px !important;
}

.service-metrics {
  display: flex !important;
  gap: 16px !important;
  font-size: 12px !important;
  color: #666 !important;
}

.alert-list {
  max-height: 300px !important;
  overflow-y: auto !important;
}

.alert-item {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  padding: 12px !important;
  border-radius: 6px !important;
  margin-bottom: 8px !important;
}

.alert-message {
  font-size: 14px !important;
  color: #333 !important;
  margin-bottom: 4px !important;
}

.alert-time {
  font-size: 12px !important;
  color: #999 !important;
}

.chart-container {
  height: 300px !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

.chart-placeholder {
  text-align: center !important;
  color: #999 !important;
}
</style>