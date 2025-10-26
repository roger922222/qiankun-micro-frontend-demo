<template>
  <div class="service-monitor-container">
    <div class="service-header">
      <h2>服务监控</h2>
      <div class="service-controls">
        <a-select v-model:value="serviceStatus" style="width: 120px; margin-right: 16px">
          <a-select-option value="all">全部状态</a-select-option>
          <a-select-option value="running">运行中</a-select-option>
          <a-select-option value="stopped">已停止</a-select-option>
          <a-select-option value="error">异常</a-select-option>
        </a-select>
        
        <a-button type="primary" @click="refreshServices">
          <ReloadOutlined />
          刷新
        </a-button>
      </div>
    </div>

    <!-- 服务统计卡片 -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="总服务数"
            :value="totalServices"
            :value-style="{ color: '#1890ff' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="运行中"
            :value="runningServices"
            :value-style="{ color: '#52c41a' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="已停止"
            :value="stoppedServices"
            :value-style="{ color: '#8c8c8c' }"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="异常服务"
            :value="errorServices"
            :value-style="{ color: '#ff4d4f' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 服务列表 -->
    <a-card title="服务列表">
      <a-table
        :columns="columns"
        :data-source="filteredServices"
        :loading="loading"
        :pagination="paginationConfig"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-badge
              :status="getServiceStatus(record.status)"
              :text="getServiceStatusText(record.status)"
            />
          </template>
          <template v-else-if="column.key === 'uptime'">
            <span>{{ formatUptime(record.startTime) }}</span>
          </template>
          <template v-else-if="column.key === 'cpu'">
            <a-progress
              :percent="record.cpu"
              :stroke-color="getCpuColor(record.cpu)"
              size="small"
            />
          </template>
          <template v-else-if="column.key === 'memory'">
            <a-progress
              :percent="record.memory"
              :stroke-color="getMemoryColor(record.memory)"
              size="small"
            />
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button 
                v-if="record.status === 'stopped'"
                type="link" 
                size="small"
                @click="startService(record)"
              >
                启动
              </a-button>
              <a-button 
                v-if="record.status === 'running'"
                type="link" 
                size="small"
                @click="stopService(record)"
              >
                停止
              </a-button>
              <a-button type="link" size="small" @click="restartService(record)">
                重启
              </a-button>
              <a-button type="link" size="small" @click="viewServiceDetail(record)">
                详情
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 服务详情模态框 -->
    <a-modal
      v-model:open="detailVisible"
      title="服务详情"
      :footer="null"
      width="700px"
    >
      <div class="service-detail" v-if="currentService">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="服务名称">
            {{ currentService.name }}
          </a-descriptions-item>
          <a-descriptions-item label="服务ID">
            {{ currentService.id }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-badge
              :status="getServiceStatus(currentService.status)"
              :text="getServiceStatusText(currentService.status)"
            />
          </a-descriptions-item>
          <a-descriptions-item label="启动时间">
            {{ formatTime(currentService.startTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="运行时长">
            {{ formatUptime(currentService.startTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="版本">
            {{ currentService.version }}
          </a-descriptions-item>
          <a-descriptions-item label="CPU使用率">
            <a-progress
              :percent="currentService.cpu"
              :stroke-color="getCpuColor(currentService.cpu)"
            />
          </a-descriptions-item>
          <a-descriptions-item label="内存使用率">
            <a-progress
              :percent="currentService.memory"
              :stroke-color="getMemoryColor(currentService.memory)"
            />
          </a-descriptions-item>
          <a-descriptions-item label="端口">
            {{ currentService.port }}
          </a-descriptions-item>
          <a-descriptions-item label="进程ID">
            {{ currentService.pid }}
          </a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">
            {{ currentService.description }}
          </a-descriptions-item>
          <a-descriptions-item label="标签" :span="2">
            <a-space>
              <a-tag v-for="tag in currentService.tags" :key="tag">
                {{ tag }}
              </a-tag>
            </a-space>
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

// 服务接口
interface ServiceItem {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  startTime: string;
  version: string;
  description: string;
  port: number;
  pid: number;
  cpu: number;
  memory: number;
  tags: string[];
}

// 响应式数据
const services = ref<ServiceItem[]>([]);
const loading = ref(false);
const serviceStatus = ref('all');
const detailVisible = ref(false);
const currentService = ref<ServiceItem | null>(null);

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
    title: '服务名称',
    dataIndex: 'name',
    key: 'name',
    width: 150
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100
  },
  {
    title: '运行时长',
    dataIndex: 'startTime',
    key: 'uptime',
    width: 120
  },
  {
    title: 'CPU使用率',
    dataIndex: 'cpu',
    key: 'cpu',
    width: 150
  },
  {
    title: '内存使用率',
    dataIndex: 'memory',
    key: 'memory',
    width: 150
  },
  {
    title: '端口',
    dataIndex: 'port',
    key: 'port',
    width: 80
  },
  {
    title: '版本',
    dataIndex: 'version',
    key: 'version',
    width: 100
  },
  {
    title: '操作',
    key: 'actions',
    width: 200
  }
];

// 计算属性 - 统计
const totalServices = computed(() => services.value.length);

const runningServices = computed(() => {
  return services.value.filter(service => service.status === 'running').length;
});

const stoppedServices = computed(() => {
  return services.value.filter(service => service.status === 'stopped').length;
});

const errorServices = computed(() => {
  return services.value.filter(service => service.status === 'error').length;
});

// 计算属性 - 过滤服务
const filteredServices = computed(() => {
  if (serviceStatus.value === 'all') {
    return services.value;
  }
  return services.value.filter(service => service.status === serviceStatus.value);
});

// 获取服务状态
const getServiceStatus = (status: string) => {
  switch (status) {
    case 'running': return 'success';
    case 'stopped': return 'default';
    case 'error': return 'error';
    default: return 'default';
  }
};

// 获取服务状态文本
const getServiceStatusText = (status: string) => {
  switch (status) {
    case 'running': return '运行中';
    case 'stopped': return '已停止';
    case 'error': return '异常';
    default: return status;
  }
};

// 格式化运行时长
const formatUptime = (startTime: string) => {
  const now = new Date();
  const start = new Date(startTime);
  const diff = now.getTime() - start.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天${hours % 24}小时`;
  if (hours > 0) return `${hours}小时`;
  
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}分钟`;
};

// 格式化时间
const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleString('zh-CN');
};

// CPU使用率颜色
const getCpuColor = (cpu: number) => {
  if (cpu > 80) return '#ff4d4f';
  if (cpu > 60) return '#faad14';
  return '#52c41a';
};

// 内存使用率颜色
const getMemoryColor = (memory: number) => {
  if (memory > 85) return '#ff4d4f';
  if (memory > 70) return '#faad14';
  return '#52c41a';
};

// 服务操作
const startService = (service: ServiceItem) => {
  service.status = 'running';
  service.startTime = new Date().toISOString();
  message.success(`服务 "${service.name}" 已启动`);
  globalLogger.info('Service started:', service.id);
};

const stopService = (service: ServiceItem) => {
  service.status = 'stopped';
  message.success(`服务 "${service.name}" 已停止`);
  globalLogger.info('Service stopped:', service.id);
};

const restartService = (service: ServiceItem) => {
  service.status = 'running';
  service.startTime = new Date().toISOString();
  message.success(`服务 "${service.name}" 已重启`);
  globalLogger.info('Service restarted:', service.id);
};

const viewServiceDetail = (service: ServiceItem) => {
  currentService.value = service;
  detailVisible.value = true;
  globalLogger.info('Viewing service detail:', service.id);
};

// 刷新服务数据
const refreshServices = async () => {
  loading.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 生成模拟数据
    generateMockServices();
    
    message.success('服务数据已刷新');
    globalLogger.info('Services refreshed successfully');
  } catch (error) {
    message.error('刷新服务数据失败');
    globalLogger.error('Failed to refresh services:', error);
  } finally {
    loading.value = false;
  }
};

// 生成模拟服务数据
const generateMockServices = () => {
  const mockServices: ServiceItem[] = [
    {
      id: 'service-1',
      name: 'Web服务器',
      status: 'running',
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      version: '2.4.41',
      description: 'Apache Web服务器，提供HTTP服务',
      port: 80,
      pid: 1234,
      cpu: 15.2,
      memory: 45.8,
      tags: ['web', 'http', 'apache']
    },
    {
      id: 'service-2',
      name: '数据库服务',
      status: 'running',
      startTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      version: '8.0.25',
      description: 'MySQL数据库服务，存储应用数据',
      port: 3306,
      pid: 5678,
      cpu: 25.6,
      memory: 68.3,
      tags: ['database', 'mysql', 'data']
    },
    {
      id: 'service-3',
      name: '缓存服务',
      status: 'running',
      startTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      version: '6.2.6',
      description: 'Redis缓存服务，提供高速缓存',
      port: 6379,
      pid: 9012,
      cpu: 8.4,
      memory: 32.1,
      tags: ['cache', 'redis', 'performance']
    },
    {
      id: 'service-4',
      name: '消息队列',
      status: 'stopped',
      startTime: '',
      version: '3.8.0',
      description: 'RabbitMQ消息队列服务，处理异步任务',
      port: 5672,
      pid: 0,
      cpu: 0,
      memory: 0,
      tags: ['queue', 'rabbitmq', 'async']
    },
    {
      id: 'service-5',
      name: '监控服务',
      status: 'error',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      version: '1.0.0',
      description: '系统监控服务，收集性能指标',
      port: 8080,
      pid: 3456,
      cpu: 5.2,
      memory: 28.7,
      tags: ['monitor', 'metrics', 'system']
    }
  ];
  
  services.value = mockServices;
};

// 生命周期
onMounted(() => {
  globalLogger.info('ServiceMonitor component mounted');
  generateMockServices();
});
</script>

<style scoped>
.service-monitor-container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.service-header h2 {
  margin: 0;
  color: #262626;
  font-size: 20px;
  font-weight: 500;
}

.service-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.service-detail pre {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .service-controls {
    flex-wrap: wrap;
    width: 100%;
  }
  
  .service-controls > * {
    flex: 1;
    min-width: 150px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .service-monitor-container {
    background: #141414;
  }
  
  .service-header {
    background: #1f1f1f;
    color: #ffffff;
  }
  
  .service-header h2 {
    color: #ffffff;
  }
  
  .service-detail pre {
    background: #262626;
    color: #ffffff;
  }
}
</style>