<template>
  <div class="log-viewer-container">
    <div class="log-header">
      <h2>系统日志</h2>
      <div class="log-controls">
        <a-select v-model:value="logLevel" style="width: 120px; margin-right: 16px">
          <a-select-option value="all">全部级别</a-select-option>
          <a-select-option value="info">信息</a-select-option>
          <a-select-option value="warn">警告</a-select-option>
          <a-select-option value="error">错误</a-select-option>
          <a-select-option value="debug">调试</a-select-option>
        </a-select>
        
        <a-range-picker v-model:value="timeRange" style="margin-right: 16px" />
        
        <a-input-search
          v-model:value="searchKeyword"
          placeholder="搜索日志内容"
          style="width: 200px; margin-right: 16px"
          @search="handleSearch"
        />
        
        <a-button type="primary" @click="refreshLogs">
          <ReloadOutlined />
          刷新
        </a-button>
      </div>
    </div>

    <div class="log-content">
      <a-list
        :data-source="filteredLogs"
        :loading="loading"
        :pagination="paginationConfig"
      >
        <template #renderItem="{ item }">
          <a-list-item :class="['log-item', `log-${item.level}`]">
            <div class="log-time">{{ formatTime(item.timestamp) }}</div>
            <div class="log-level">
              <a-tag :color="getLogLevelColor(item.level)">
                {{ item.level.toUpperCase() }}
              </a-tag>
            </div>
            <div class="log-message">{{ item.message }}</div>
            <div class="log-source">{{ item.source }}</div>
            <div class="log-actions">
              <a-button type="link" size="small" @click="viewLogDetail(item)">
                详情
              </a-button>
            </div>
          </a-list-item>
        </template>
      </a-list>
    </div>

    <!-- 日志详情模态框 -->
    <a-modal
      v-model:open="detailVisible"
      title="日志详情"
      :footer="null"
      width="600px"
    >
      <div class="log-detail" v-if="currentLog">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="时间">
            {{ formatTime(currentLog.timestamp) }}
          </a-descriptions-item>
          <a-descriptions-item label="级别">
            <a-tag :color="getLogLevelColor(currentLog.level)">
              {{ currentLog.level.toUpperCase() }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="来源">
            {{ currentLog.source }}
          </a-descriptions-item>
          <a-descriptions-item label="消息">
            {{ currentLog.message }}
          </a-descriptions-item>
          <a-descriptions-item label="详情" v-if="currentLog.details">
            <pre>{{ JSON.stringify(currentLog.details, null, 2) }}</pre>
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

// 日志接口
interface LogItem {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  details?: any;
}

// 响应式数据
const logs = ref<LogItem[]>([]);
const loading = ref(false);
const logLevel = ref('all');
const searchKeyword = ref('');
const timeRange = ref([]);
const detailVisible = ref(false);
const currentLog = ref<LogItem | null>(null);

// 分页配置
const paginationConfig = reactive({
  pageSize: 20,
  current: 1,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number, range: number[]) => 
    `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
});

// 模拟日志数据
const mockLogs: LogItem[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    level: 'info',
    message: '系统启动成功，所有服务正常运行',
    source: 'system',
    details: { pid: 1234, uptime: 3600 }
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    level: 'warn',
    message: '内存使用率较高，当前使用率: 78%',
    source: 'memory-monitor',
    details: { current: 78, threshold: 80 }
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    level: 'error',
    message: '数据库连接超时',
    source: 'database',
    details: { error: 'Connection timeout after 30s', retryCount: 3 }
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
    level: 'info',
    message: 'API请求成功: GET /api/system/status',
    source: 'api',
    details: { status: 200, responseTime: 45 }
  },
  {
    id: '5',
    timestamp: new Date().toISOString(),
    level: 'debug',
    message: '缓存清理完成，清理了 127 个过期缓存项',
    source: 'cache-manager'
  }
];

// 计算属性 - 过滤日志
const filteredLogs = computed(() => {
  let filtered = logs.value;

  // 按级别过滤
  if (logLevel.value !== 'all') {
    filtered = filtered.filter(log => log.level === logLevel.value);
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    filtered = filtered.filter(log => 
      log.message.toLowerCase().includes(keyword) ||
      log.source.toLowerCase().includes(keyword)
    );
  }

  // 按时间范围过滤
  if (timeRange.value && timeRange.value.length === 2) {
    const [start, end] = timeRange.value;
    filtered = filtered.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= start && logTime <= end;
    });
  }

  return filtered;
});

// 获取日志级别颜色
const getLogLevelColor = (level: string) => {
  switch (level) {
    case 'error': return 'red';
    case 'warn': return 'orange';
    case 'info': return 'blue';
    case 'debug': return 'green';
    default: return 'default';
  }
};

// 格式化时间
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN');
};

// 搜索处理
const handleSearch = () => {
  globalLogger.info('Searching logs with keyword:', searchKeyword.value);
};

// 刷新日志
const refreshLogs = async () => {
  loading.value = true;
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 生成更多模拟数据
    const newLogs = generateMockLogs();
    logs.value = [...newLogs, ...mockLogs];
    
    paginationConfig.total = logs.value.length;
    message.success('日志数据已刷新');
    globalLogger.info('Logs refreshed successfully');
  } catch (error) {
    message.error('刷新日志失败');
    globalLogger.error('Failed to refresh logs:', error);
  } finally {
    loading.value = false;
  }
};

// 查看日志详情
const viewLogDetail = (log: LogItem) => {
  currentLog.value = log;
  detailVisible.value = true;
  globalLogger.info('Viewing log detail:', log.id);
};

// 生成模拟日志数据
const generateMockLogs = (): LogItem[] => {
  const levels: LogItem['level'][] = ['info', 'warn', 'error', 'debug'];
  const sources = ['system', 'api', 'database', 'cache', 'memory-monitor', 'network'];
  const messages = [
    '系统状态检查完成',
    'API响应时间超过阈值',
    '缓存命中率: 85%',
    '磁盘空间不足警告',
    '网络连接已恢复',
    '配置文件已更新',
    '定时任务执行成功',
    '安全扫描完成'
  ];

  const logs: LogItem[] = [];
  const now = Date.now();

  for (let i = 0; i < 20; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    logs.push({
      id: `log-${now}-${i}`,
      timestamp: new Date(now - Math.random() * 1000 * 60 * 60).toISOString(),
      level,
      message,
      source,
      details: Math.random() > 0.5 ? { random: Math.random() } : undefined
    });
  }

  return logs;
};

// 生命周期
onMounted(() => {
  globalLogger.info('LogViewer component mounted');
  refreshLogs();
});
</script>

<style scoped>
.log-viewer-container {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  background: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.log-header h2 {
  margin: 0;
  color: #262626;
  font-size: 20px;
  font-weight: 500;
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.log-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.log-item {
  display: grid;
  grid-template-columns: 180px 100px 1fr 150px 80px;
  gap: 16px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.3s;
}

.log-item:hover {
  background-color: #fafafa;
}

.log-item.log-error {
  background-color: #fff1f0;
  border-left: 3px solid #ff4d4f;
}

.log-item.log-warn {
  background-color: #fffbe6;
  border-left: 3px solid #faad14;
}

.log-item.log-info {
  background-color: #f0f9ff;
  border-left: 3px solid #1890ff;
}

.log-item.log-debug {
  background-color: #f6ffed;
  border-left: 3px solid #52c41a;
}

.log-time {
  font-size: 12px;
  color: #8c8c8c;
  font-family: 'Courier New', monospace;
}

.log-level {
  text-align: center;
}

.log-message {
  font-size: 14px;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.log-source {
  font-size: 12px;
  color: #595959;
  font-family: 'Courier New', monospace;
}

.log-actions {
  text-align: right;
}

.log-detail pre {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .log-item {
    grid-template-columns: 150px 80px 1fr 120px 60px;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .log-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .log-controls {
    flex-wrap: wrap;
    width: 100%;
  }
  
  .log-controls > * {
    flex: 1;
    min-width: 150px;
  }
  
  .log-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .log-time,
  .log-level,
  .log-source,
  .log-actions {
    text-align: left;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .log-viewer-container {
    background: #141414;
  }
  
  .log-header {
    background: #1f1f1f;
    color: #ffffff;
  }
  
  .log-header h2 {
    color: #ffffff;
  }
  
  .log-content {
    background: #1f1f1f;
    color: #ffffff;
  }
  
  .log-item {
    border-bottom-color: #303030;
  }
  
  .log-item:hover {
    background-color: #262626;
  }
  
  .log-message {
    color: #ffffff;
  }
  
  .log-detail pre {
    background: #262626;
    color: #ffffff;
  }
}
</style>