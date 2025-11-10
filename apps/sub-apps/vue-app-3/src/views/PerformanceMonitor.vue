<template>
  <div class="system-monitor-performance">
    <div class="performance-header">
      <h2>性能监控</h2>
      <div class="performance-controls">
        <a-select v-model:value="selectedMetric" style="width: 200px">
          <a-select-option value="cpu">CPU 使用率</a-select-option>
          <a-select-option value="memory">内存使用率</a-select-option>
          <a-select-option value="disk">磁盘使用率</a-select-option>
          <a-select-option value="network">网络流量</a-select-option>
        </a-select>
        <a-range-picker v-model:value="timeRange" style="margin-left: 16px" />
        <a-button type="primary" @click="refreshData" style="margin-left: 16px">
          <ReloadOutlined />
          刷新
        </a-button>
      </div>
    </div>

    <div class="performance-content">
      <!-- 实时指标卡片 -->
      <a-row :gutter="16" style="margin-bottom: 24px">
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="CPU 使用率"
              :value="metrics.cpu.current"
              :precision="2"
              suffix="%"
              :value-style="{ color: getMetricColor('cpu', metrics.cpu.current) }"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="内存使用率"
              :value="metrics.memory.current"
              :precision="2"
              suffix="%"
              :value-style="{ color: getMetricColor('memory', metrics.memory.current) }"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="磁盘使用率"
              :value="metrics.disk.current"
              :precision="2"
              suffix="%"
              :value-style="{ color: getMetricColor('disk', metrics.disk.current) }"
            />
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="网络流量"
              :value="metrics.network.current"
              :precision="2"
              suffix="MB/s"
              :value-style="{ color: getMetricColor('network', metrics.network.current) }"
            />
          </a-card>
        </a-col>
      </a-row>

      <!-- 性能图表 -->
      <a-card title="性能趋势图" style="margin-bottom: 24px">
        <div ref="chartContainer" style="height: 400px;"></div>
      </a-card>

      <!-- 性能详情表格 -->
      <a-card title="性能详情">
        <a-table
          :columns="columns"
          :data-source="performanceData"
          :pagination="{ pageSize: 10 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-badge
                :status="getStatusType(record.status)"
                :text="record.status"
              />
            </template>
            <template v-else-if="column.key === 'value'">
              <span :style="{ color: getMetricColor(record.metric, record.value) }">
                {{ record.value }}%
              </span>
            </template>
            <template v-else-if="column.key === 'trend'">
              <a-icon :type="getTrendIcon(record.trend)" />
              <span :style="{ color: getTrendColor(record.trend) }">
                {{ record.trend }}%
              </span>
            </template>
          </template>
        </a-table>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import { globalLogger } from '@shared/utils/logger';
import {
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined
} from '@ant-design/icons-vue';

// 响应式数据
const selectedMetric = ref('cpu');
const timeRange = ref([]);
const chartContainer = ref<HTMLElement>();
const performanceData = ref([]);

// 性能指标数据
const metrics = reactive({
  cpu: {
    current: 45.2,
    history: [] as number[],
    threshold: 80
  },
  memory: {
    current: 62.8,
    history: [] as number[],
    threshold: 85
  },
  disk: {
    current: 78.5,
    history: [] as number[],
    threshold: 90
  },
  network: {
    current: 23.6,
    history: [] as number[],
    threshold: 100
  }
});

// 表格列配置
const columns = [
  {
    title: '指标名称',
    dataIndex: 'name',
    key: 'name',
    width: 150
  },
  {
    title: '当前值',
    dataIndex: 'value',
    key: 'value',
    width: 120
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100
  },
  {
    title: '趋势',
    dataIndex: 'trend',
    key: 'trend',
    width: 120
  },
  {
    title: '阈值',
    dataIndex: 'threshold',
    key: 'threshold',
    width: 100
  },
  {
    title: '最后更新',
    dataIndex: 'lastUpdate',
    key: 'lastUpdate',
    width: 180
  }
];

// 模拟性能数据
let updateInterval: NodeJS.Timeout;

const generateMockData = () => {
  const now = new Date();
  
  // 生成表格数据
  performanceData.value = [
    {
      id: '1',
      name: 'CPU 使用率',
      value: metrics.cpu.current,
      status: metrics.cpu.current > metrics.cpu.threshold ? 'warning' : 'normal',
      trend: Math.random() * 10 - 5,
      threshold: metrics.cpu.threshold,
      lastUpdate: now.toLocaleString(),
      metric: 'cpu'
    },
    {
      id: '2',
      name: '内存使用率',
      value: metrics.memory.current,
      status: metrics.memory.current > metrics.memory.threshold ? 'warning' : 'normal',
      trend: Math.random() * 8 - 4,
      threshold: metrics.memory.threshold,
      lastUpdate: now.toLocaleString(),
      metric: 'memory'
    },
    {
      id: '3',
      name: '磁盘使用率',
      value: metrics.disk.current,
      status: metrics.disk.current > metrics.disk.threshold ? 'critical' : 'normal',
      trend: Math.random() * 6 - 3,
      threshold: metrics.disk.threshold,
      lastUpdate: now.toLocaleString(),
      metric: 'disk'
    },
    {
      id: '4',
      name: '网络流量',
      value: metrics.network.current,
      status: 'normal',
      trend: Math.random() * 12 - 6,
      threshold: metrics.network.threshold,
      lastUpdate: now.toLocaleString(),
      metric: 'network'
    }
  ];
};

// 获取状态类型
const getStatusType = (status: string) => {
  switch (status) {
    case 'normal': return 'success';
    case 'warning': return 'warning';
    case 'critical': return 'error';
    default: return 'default';
  }
};

// 获取指标颜色
const getMetricColor = (metric: string, value: number) => {
  const threshold = metrics[metric].threshold;
  if (value > threshold * 0.9) return '#ff4d4f'; // 红色
  if (value > threshold * 0.7) return '#faad14'; // 橙色
  return '#52c41a'; // 绿色
};

// 获取趋势图标
const getTrendIcon = (trend: number) => {
  if (trend > 2) return 'rise';
  if (trend < -2) return 'fall';
  return 'minus';
};

// 获取趋势颜色
const getTrendColor = (trend: number) => {
  if (trend > 0) return '#ff4d4f'; // 红色 - 上升
  if (trend < 0) return '#52c41a'; // 绿色 - 下降
  return '#8c8c8c'; // 灰色 - 平稳
};

// 刷新数据
const refreshData = () => {
  globalLogger.info('Refreshing performance data');
  
  // 模拟数据更新
  Object.keys(metrics).forEach(key => {
    const metric = metrics[key];
    const baseValue = metric.current;
    const variation = (Math.random() - 0.5) * 10; // ±5% 变化
    metric.current = Math.max(0, Math.min(100, baseValue + variation));
  });
  
  generateMockData();
  message.success('性能数据已刷新');
};

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return;
  
  // 这里应该集成实际的图表库，如 ECharts
  // 现在先用占位符
  chartContainer.value.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
      <div style="text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <div>性能趋势图表</div>
        <div style="font-size: 12px; margin-top: 8px;">(集成 ECharts 或其他图表库)</div>
      </div>
    </div>
  `;
};

// 生命周期
onMounted(() => {
  globalLogger.info('PerformanceMonitor component mounted');
  
  // 初始化数据
  generateMockData();
  initChart();
  
  // 定时更新数据
  updateInterval = setInterval(() => {
    refreshData();
  }, 30000); // 30秒更新一次
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  globalLogger.info('PerformanceMonitor component unmounted');
});
</script>

<style scoped>
.system-monitor-performance {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.performance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.performance-header h2 {
  margin: 0;
  color: #262626;
  font-size: 20px;
  font-weight: 500;
}

.performance-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.performance-content {
  background: transparent;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .performance-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .performance-controls {
    flex-wrap: wrap;
    width: 100%;
  }
  
  .performance-controls > * {
    flex: 1;
    min-width: 200px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .system-monitor-performance {
    background: #141414;
  }
  
  .performance-header {
    background: #1f1f1f;
    color: #ffffff;
  }
  
  .performance-header h2 {
    color: #ffffff;
  }
}
</style>