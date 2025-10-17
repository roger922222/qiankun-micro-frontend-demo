<template>
  <div class="vue-file-management file-settings">
    <div class="settings-header">
      <h2>文件设置</h2>
      <p>配置文件管理系统的各项参数和偏好设置</p>
    </div>

    <div class="settings-content">
      <a-row :gutter="24">
        <!-- 左侧设置菜单 -->
        <a-col :span="6">
          <a-menu
            v-model:selectedKeys="selectedKeys"
            mode="vertical"
            class="settings-menu"
          >
            <a-menu-item key="general">
              <SettingOutlined />
              常规设置
            </a-menu-item>
            <a-menu-item key="storage">
              <DatabaseOutlined />
              存储设置
            </a-menu-item>
            <a-menu-item key="upload">
              <UploadOutlined />
              上传设置
            </a-menu-item>
            <a-menu-item key="preview">
              <EyeOutlined />
              预览设置
            </a-menu-item>
            <a-menu-item key="security">
              <SafetyOutlined />
              安全设置
            </a-menu-item>
            <a-menu-item key="performance">
              <ThunderboltOutlined />
              性能设置
            </a-menu-item>
            <a-menu-item key="about">
              <InfoCircleOutlined />
              关于
            </a-menu-item>
          </a-menu>
        </a-col>

        <!-- 右侧设置内容 -->
        <a-col :span="18">
          <div class="settings-panel">
            <!-- 常规设置 -->
            <div v-show="selectedKeys[0] === 'general'" class="setting-section">
              <a-card title="常规设置" :bordered="false">
                <a-form :model="generalSettings" layout="vertical">
                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="默认视图模式">
                        <a-select v-model:value="generalSettings.defaultViewMode">
                          <a-select-option value="grid">网格视图</a-select-option>
                          <a-select-option value="list">列表视图</a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="每页显示数量">
                        <a-select v-model:value="generalSettings.pageSize">
                          <a-select-option value="20">20</a-select-option>
                          <a-select-option value="50">50</a-select-option>
                          <a-select-option value="100">100</a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-col>
                  </a-row>
                  
                  <a-row :gutter="16">
                    <a-col :span="12">
                      <a-form-item label="默认排序方式">
                        <a-select v-model:value="generalSettings.defaultSort">
                          <a-select-option value="name">按名称</a-select-option>
                          <a-select-option value="date">按日期</a-select-option>
                          <a-select-option value="size">按大小</a-select-option>
                          <a-select-option value="type">按类型</a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-col>
                    <a-col :span="12">
                      <a-form-item label="语言设置">
                        <a-select v-model:value="generalSettings.language">
                          <a-select-option value="zh-CN">简体中文</a-select-option>
                          <a-select-option value="en-US">English</a-select-option>
                        </a-select>
                      </a-form-item>
                    </a-col>
                  </a-row>

                  <a-form-item>
                    <a-checkbox v-model:checked="generalSettings.showHiddenFiles">
                      显示隐藏文件
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="generalSettings.confirmDelete">
                      删除文件前确认
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="generalSettings.autoRefresh">
                      自动刷新文件列表
                    </a-checkbox>
                  </a-form-item>
                </a-form>
              </a-card>
            </div>

            <!-- 存储设置 -->
            <div v-show="selectedKeys[0] === 'storage'" class="setting-section">
              <a-card title="存储设置" :bordered="false">
                <a-form :model="storageSettings" layout="vertical">
                  <a-form-item label="默认存储位置">
                    <a-input v-model:value="storageSettings.defaultPath" placeholder="/默认存储路径" />
                  </a-form-item>
                  
                  <a-form-item label="存储配额限制 (GB)">
                    <a-input-number 
                      v-model:value="storageSettings.quotaLimit" 
                      :min="1" 
                      :max="1000"
                      style="width: 200px"
                    />
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="storageSettings.enableQuota">
                      启用存储配额限制
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="storageSettings.autoCleanup">
                      自动清理临时文件
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item label="临时文件保留天数">
                    <a-input-number 
                      v-model:value="storageSettings.tempFileRetentionDays" 
                      :min="1" 
                      :max="365"
                      style="width: 200px"
                    />
                  </a-form-item>

                  <!-- 存储使用情况 -->
                  <a-divider>存储使用情况</a-divider>
                  <div class="storage-usage">
                    <a-progress 
                      :percent="storageUsage.percentage" 
                      :status="storageUsage.percentage > 80 ? 'exception' : 'normal'"
                    />
                    <div class="storage-info">
                      <span>已使用: {{ formatFileSize(storageUsage.used) }}</span>
                      <span>总容量: {{ formatFileSize(storageUsage.total) }}</span>
                    </div>
                  </div>
                </a-form>
              </a-card>
            </div>

            <!-- 上传设置 -->
            <div v-show="selectedKeys[0] === 'upload'" class="setting-section">
              <a-card title="上传设置" :bordered="false">
                <a-form :model="uploadSettings" layout="vertical">
                  <a-form-item label="单文件大小限制 (MB)">
                    <a-input-number 
                      v-model:value="uploadSettings.maxFileSize" 
                      :min="1" 
                      :max="1024"
                      style="width: 200px"
                    />
                  </a-form-item>
                  
                  <a-form-item label="并发上传数量">
                    <a-input-number 
                      v-model:value="uploadSettings.concurrentUploads" 
                      :min="1" 
                      :max="10"
                      style="width: 200px"
                    />
                  </a-form-item>
                  
                  <a-form-item label="允许的文件类型">
                    <a-select 
                      v-model:value="uploadSettings.allowedTypes" 
                      mode="multiple"
                      placeholder="选择允许的文件类型"
                      style="width: 100%"
                    >
                      <a-select-option value="image">图片文件</a-select-option>
                      <a-select-option value="video">视频文件</a-select-option>
                      <a-select-option value="audio">音频文件</a-select-option>
                      <a-select-option value="document">文档文件</a-select-option>
                      <a-select-option value="archive">压缩文件</a-select-option>
                      <a-select-option value="other">其他文件</a-select-option>
                    </a-select>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="uploadSettings.autoRename">
                      自动重命名重复文件
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="uploadSettings.generateThumbnail">
                      自动生成缩略图
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="uploadSettings.virusScan">
                      上传时进行病毒扫描
                    </a-checkbox>
                  </a-form-item>
                </a-form>
              </a-card>
            </div>

            <!-- 预览设置 -->
            <div v-show="selectedKeys[0] === 'preview'" class="setting-section">
              <a-card title="预览设置" :bordered="false">
                <a-form :model="previewSettings" layout="vertical">
                  <a-form-item label="图片预览质量">
                    <a-radio-group v-model:value="previewSettings.imageQuality">
                      <a-radio value="low">低质量 (快速加载)</a-radio>
                      <a-radio value="medium">中等质量</a-radio>
                      <a-radio value="high">高质量</a-radio>
                    </a-radio-group>
                  </a-form-item>
                  
                  <a-form-item label="视频预览方式">
                    <a-radio-group v-model:value="previewSettings.videoPreview">
                      <a-radio value="thumbnail">仅显示缩略图</a-radio>
                      <a-radio value="preview">显示预览播放器</a-radio>
                    </a-radio-group>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="previewSettings.enableLazyLoad">
                      启用懒加载
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="previewSettings.cachePreview">
                      缓存预览文件
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item label="预览缓存大小 (MB)">
                    <a-input-number 
                      v-model:value="previewSettings.cacheSize" 
                      :min="10" 
                      :max="1000"
                      style="width: 200px"
                    />
                  </a-form-item>
                </a-form>
              </a-card>
            </div>

            <!-- 安全设置 -->
            <div v-show="selectedKeys[0] === 'security'" class="setting-section">
              <a-card title="安全设置" :bordered="false">
                <a-form :model="securitySettings" layout="vertical">
                  <a-form-item>
                    <a-checkbox v-model:checked="securitySettings.enableEncryption">
                      启用文件加密存储
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="securitySettings.enableAccessLog">
                      启用访问日志记录
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="securitySettings.requireAuth">
                      访问文件需要身份验证
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item label="会话超时时间 (分钟)">
                    <a-input-number 
                      v-model:value="securitySettings.sessionTimeout" 
                      :min="5" 
                      :max="1440"
                      style="width: 200px"
                    />
                  </a-form-item>
                  
                  <a-form-item label="密码复杂度要求">
                    <a-select v-model:value="securitySettings.passwordComplexity">
                      <a-select-option value="low">低 (6位以上)</a-select-option>
                      <a-select-option value="medium">中 (8位+数字字母)</a-select-option>
                      <a-select-option value="high">高 (12位+特殊字符)</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-form>
              </a-card>
            </div>

            <!-- 性能设置 -->
            <div v-show="selectedKeys[0] === 'performance'" class="setting-section">
              <a-card title="性能设置" :bordered="false">
                <a-form :model="performanceSettings" layout="vertical">
                  <a-form-item>
                    <a-checkbox v-model:checked="performanceSettings.enableCache">
                      启用文件列表缓存
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="performanceSettings.enableCompression">
                      启用数据压缩传输
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item>
                    <a-checkbox v-model:checked="performanceSettings.enableCDN">
                      启用CDN加速
                    </a-checkbox>
                  </a-form-item>
                  
                  <a-form-item label="缓存过期时间 (分钟)">
                    <a-input-number 
                      v-model:value="performanceSettings.cacheExpiry" 
                      :min="1" 
                      :max="1440"
                      style="width: 200px"
                    />
                  </a-form-item>
                  
                  <a-form-item label="最大并发连接数">
                    <a-input-number 
                      v-model:value="performanceSettings.maxConnections" 
                      :min="1" 
                      :max="100"
                      style="width: 200px"
                    />
                  </a-form-item>
                </a-form>
              </a-card>
            </div>

            <!-- 关于 -->
            <div v-show="selectedKeys[0] === 'about'" class="setting-section">
              <a-card title="关于文件管理系统" :bordered="false">
                <div class="about-content">
                  <div class="app-info">
                    <h3>Vue 文件管理系统</h3>
                    <p>版本: 1.0.0</p>
                    <p>构建时间: {{ buildTime }}</p>
                    <p>技术栈: Vue 3 + TypeScript + Ant Design Vue</p>
                  </div>
                  
                  <a-divider />
                  
                  <div class="system-info">
                    <h4>系统信息</h4>
                    <a-descriptions :column="1" size="small">
                      <a-descriptions-item label="浏览器">{{ browserInfo }}</a-descriptions-item>
                      <a-descriptions-item label="屏幕分辨率">{{ screenResolution }}</a-descriptions-item>
                      <a-descriptions-item label="时区">{{ timezone }}</a-descriptions-item>
                      <a-descriptions-item label="在线状态">{{ onlineStatus ? '在线' : '离线' }}</a-descriptions-item>
                    </a-descriptions>
                  </div>
                  
                  <a-divider />
                  
                  <div class="actions">
                    <a-space>
                      <a-button type="primary" @click="checkUpdate">
                        检查更新
                      </a-button>
                      <a-button @click="clearCache">
                        清除缓存
                      </a-button>
                      <a-button @click="exportSettings">
                        导出设置
                      </a-button>
                      <a-button @click="importSettings">
                        导入设置
                      </a-button>
                    </a-space>
                  </div>
                </div>
              </a-card>
            </div>

            <!-- 保存按钮 -->
            <div class="settings-actions">
              <a-space>
                <a-button type="primary" @click="saveSettings">
                  保存设置
                </a-button>
                <a-button @click="resetSettings">
                  重置为默认值
                </a-button>
              </a-space>
            </div>
          </div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { globalLogger } from '@shared/utils/logger';
import {
  SettingOutlined,
  DatabaseOutlined,
  UploadOutlined,
  EyeOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined
} from '@ant-design/icons-vue';

// 当前选中的设置项
const selectedKeys = ref(['general']);

// 各项设置
const generalSettings = reactive({
  defaultViewMode: 'grid',
  pageSize: '20',
  defaultSort: 'name',
  language: 'zh-CN',
  showHiddenFiles: false,
  confirmDelete: true,
  autoRefresh: true
});

const storageSettings = reactive({
  defaultPath: '/files',
  quotaLimit: 100,
  enableQuota: false,
  autoCleanup: true,
  tempFileRetentionDays: 7
});

const uploadSettings = reactive({
  maxFileSize: 100,
  concurrentUploads: 3,
  allowedTypes: ['image', 'document', 'video', 'audio'],
  autoRename: true,
  generateThumbnail: true,
  virusScan: false
});

const previewSettings = reactive({
  imageQuality: 'medium',
  videoPreview: 'thumbnail',
  enableLazyLoad: true,
  cachePreview: true,
  cacheSize: 100
});

const securitySettings = reactive({
  enableEncryption: false,
  enableAccessLog: true,
  requireAuth: false,
  sessionTimeout: 30,
  passwordComplexity: 'medium'
});

const performanceSettings = reactive({
  enableCache: true,
  enableCompression: true,
  enableCDN: false,
  cacheExpiry: 60,
  maxConnections: 10
});

// 存储使用情况
const storageUsage = reactive({
  used: 2.5 * 1024 * 1024 * 1024, // 2.5GB
  total: 10 * 1024 * 1024 * 1024, // 10GB
  percentage: 25
});

// 系统信息
const buildTime = '2024-01-15 10:30:00';
const browserInfo = computed(() => navigator.userAgent.split(' ').slice(-2).join(' '));
const screenResolution = computed(() => `${screen.width}x${screen.height}`);
const timezone = computed(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
const onlineStatus = ref(navigator.onLine);

onMounted(() => {
  globalLogger.info('FileSettings component mounted');
  loadSettings();
  
  // 监听在线状态变化
  window.addEventListener('online', () => onlineStatus.value = true);
  window.addEventListener('offline', () => onlineStatus.value = false);
});

// 加载设置
const loadSettings = () => {
  try {
    const savedSettings = localStorage.getItem('vue-file-management-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      Object.assign(generalSettings, settings.general || {});
      Object.assign(storageSettings, settings.storage || {});
      Object.assign(uploadSettings, settings.upload || {});
      Object.assign(previewSettings, settings.preview || {});
      Object.assign(securitySettings, settings.security || {});
      Object.assign(performanceSettings, settings.performance || {});
    }
  } catch (error) {
    globalLogger.error('Failed to load settings:', error);
  }
};

// 保存设置
const saveSettings = () => {
  try {
    const settings = {
      general: { ...generalSettings },
      storage: { ...storageSettings },
      upload: { ...uploadSettings },
      preview: { ...previewSettings },
      security: { ...securitySettings },
      performance: { ...performanceSettings }
    };
    
    localStorage.setItem('vue-file-management-settings', JSON.stringify(settings));
    message.success('设置保存成功');
    globalLogger.info('Settings saved successfully');
  } catch (error) {
    message.error('设置保存失败');
    globalLogger.error('Failed to save settings:', error);
  }
};

// 重置设置
const resetSettings = () => {
  Object.assign(generalSettings, {
    defaultViewMode: 'grid',
    pageSize: '20',
    defaultSort: 'name',
    language: 'zh-CN',
    showHiddenFiles: false,
    confirmDelete: true,
    autoRefresh: true
  });
  
  Object.assign(storageSettings, {
    defaultPath: '/files',
    quotaLimit: 100,
    enableQuota: false,
    autoCleanup: true,
    tempFileRetentionDays: 7
  });
  
  Object.assign(uploadSettings, {
    maxFileSize: 100,
    concurrentUploads: 3,
    allowedTypes: ['image', 'document', 'video', 'audio'],
    autoRename: true,
    generateThumbnail: true,
    virusScan: false
  });
  
  Object.assign(previewSettings, {
    imageQuality: 'medium',
    videoPreview: 'thumbnail',
    enableLazyLoad: true,
    cachePreview: true,
    cacheSize: 100
  });
  
  Object.assign(securitySettings, {
    enableEncryption: false,
    enableAccessLog: true,
    requireAuth: false,
    sessionTimeout: 30,
    passwordComplexity: 'medium'
  });
  
  Object.assign(performanceSettings, {
    enableCache: true,
    enableCompression: true,
    enableCDN: false,
    cacheExpiry: 60,
    maxConnections: 10
  });
  
  message.success('设置已重置为默认值');
};

// 检查更新
const checkUpdate = () => {
  message.info('当前已是最新版本');
};

// 清除缓存
const clearCache = () => {
  try {
    // 清除相关缓存
    sessionStorage.clear();
    const keys = Object.keys(localStorage).filter(key => key.startsWith('vue-file-management'));
    keys.forEach(key => {
      if (key !== 'vue-file-management-settings') {
        localStorage.removeItem(key);
      }
    });
    message.success('缓存清除成功');
  } catch (error) {
    message.error('缓存清除失败');
  }
};

// 导出设置
const exportSettings = () => {
  try {
    const settings = {
      general: { ...generalSettings },
      storage: { ...storageSettings },
      upload: { ...uploadSettings },
      preview: { ...previewSettings },
      security: { ...securitySettings },
      performance: { ...performanceSettings }
    };
    
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'file-management-settings.json';
    link.click();
    
    URL.revokeObjectURL(url);
    message.success('设置导出成功');
  } catch (error) {
    message.error('设置导出失败');
  }
};

// 导入设置
const importSettings = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const settings = JSON.parse(e.target.result);
          Object.assign(generalSettings, settings.general || {});
          Object.assign(storageSettings, settings.storage || {});
          Object.assign(uploadSettings, settings.upload || {});
          Object.assign(previewSettings, settings.preview || {});
          Object.assign(securitySettings, settings.security || {});
          Object.assign(performanceSettings, settings.performance || {});
          message.success('设置导入成功');
        } catch (error) {
          message.error('设置文件格式错误');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.vue-file-management.file-settings {
  padding: 24px !important;
  background: #f5f5f5 !important;
  min-height: 100vh !important;
}

.settings-header {
  text-align: center !important;
  margin-bottom: 32px !important;
}

.settings-header h2 {
  color: #1890ff !important;
  margin-bottom: 8px !important;
}

.settings-header p {
  color: #666 !important;
  font-size: 14px !important;
}

.settings-content {
  max-width: 1200px !important;
  margin: 0 auto !important;
}

.settings-menu {
  background: white !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.settings-panel {
  background: white !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
  padding: 24px !important;
}

.setting-section {
  margin-bottom: 24px !important;
}

.storage-usage {
  margin-top: 16px !important;
}

.storage-info {
  display: flex !important;
  justify-content: space-between !important;
  margin-top: 8px !important;
  font-size: 12px !important;
  color: #8c8c8c !important;
}

.about-content {
  text-align: center !important;
}

.app-info h3 {
  color: #1890ff !important;
  margin-bottom: 16px !important;
}

.app-info p {
  margin: 4px 0 !important;
  color: #666 !important;
}

.system-info {
  text-align: left !important;
}

.system-info h4 {
  color: #262626 !important;
  margin-bottom: 12px !important;
}

.actions {
  margin-top: 24px !important;
}

.settings-actions {
  margin-top: 32px !important;
  padding-top: 24px !important;
  border-top: 1px solid #f0f0f0 !important;
  text-align: center !important;
}
</style>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FileSettings'
});
</script>