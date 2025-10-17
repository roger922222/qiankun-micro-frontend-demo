<template>
  <div class="vue-file-management file-upload">
    <div class="upload-header">
      <h2>文件上传</h2>
      <p>支持拖拽上传，多文件上传，以及上传进度监控</p>
    </div>

    <div class="upload-container">
      <!-- 主上传区域 -->
      <a-upload-dragger
        v-model:fileList="fileList"
        name="files"
        multiple
        :action="uploadAction"
        :before-upload="beforeUpload"
        :custom-request="customUpload"
        @change="handleUploadChange"
        @drop="handleDrop"
        class="upload-dragger"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">
          支持单个或批量上传。严禁上传公司数据或其他敏感信息。
        </p>
      </a-upload-dragger>

      <!-- 上传配置 -->
      <div class="upload-config">
        <a-card title="上传设置" size="small">
          <a-form layout="vertical" :model="uploadConfig">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="目标文件夹">
                  <a-select 
                    v-model:value="uploadConfig.targetFolder" 
                    placeholder="选择目标文件夹"
                  >
                    <a-select-option value="/">根目录</a-select-option>
                    <a-select-option value="/documents">文档</a-select-option>
                    <a-select-option value="/images">图片</a-select-option>
                    <a-select-option value="/videos">视频</a-select-option>
                    <a-select-option value="/others">其他</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="文件重命名策略">
                  <a-select 
                    v-model:value="uploadConfig.renameStrategy"
                    placeholder="选择重命名策略"
                  >
                    <a-select-option value="keep">保持原名</a-select-option>
                    <a-select-option value="timestamp">时间戳前缀</a-select-option>
                    <a-select-option value="uuid">UUID重命名</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item>
                  <a-checkbox v-model:checked="uploadConfig.autoExtract">
                    自动解压ZIP文件
                  </a-checkbox>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item>
                  <a-checkbox v-model:checked="uploadConfig.overwrite">
                    覆盖同名文件
                  </a-checkbox>
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </a-card>
      </div>
    </div>

    <!-- 上传队列 -->
    <div class="upload-queue" v-if="uploadQueue.length > 0">
      <a-card title="上传队列" size="small">
        <div class="queue-header">
          <a-space>
            <a-button 
              type="primary" 
              :loading="isUploading"
              @click="startUpload"
              :disabled="uploadQueue.length === 0"
            >
              <UploadOutlined />
              开始上传 ({{ uploadQueue.length }})
            </a-button>
            <a-button @click="clearQueue" :disabled="isUploading">
              <DeleteOutlined />
              清空队列
            </a-button>
            <a-button @click="pauseUpload" v-if="isUploading">
              <PauseCircleOutlined />
              暂停上传
            </a-button>
          </a-space>
        </div>

        <div class="upload-list">
          <div 
            v-for="(item, index) in uploadQueue" 
            :key="item.uid"
            class="upload-item"
            :class="{ 'upload-error': item.status === 'error' }"
          >
            <div class="file-info">
              <div class="file-icon">
                <FileOutlined v-if="!isImageFile(item.name)" />
                <PictureOutlined v-else />
              </div>
              <div class="file-details">
                <div class="file-name">{{ item.name }}</div>
                <div class="file-size">{{ formatFileSize(item.size) }}</div>
              </div>
            </div>

            <div class="upload-progress">
              <a-progress 
                :percent="item.percent || 0" 
                :status="getProgressStatus(item.status)"
                size="small"
              />
              <div class="upload-status">
                <span v-if="item.status === 'uploading'">上传中...</span>
                <span v-else-if="item.status === 'done'" class="success">上传完成</span>
                <span v-else-if="item.status === 'error'" class="error">上传失败</span>
                <span v-else>等待上传</span>
              </div>
            </div>

            <div class="upload-actions">
              <a-button 
                type="text" 
                size="small" 
                @click="removeFromQueue(index)"
                :disabled="item.status === 'uploading'"
              >
                <DeleteOutlined />
              </a-button>
              <a-button 
                type="text" 
                size="small" 
                @click="retryUpload(index)"
                v-if="item.status === 'error'"
              >
                <ReloadOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 上传统计 -->
    <div class="upload-stats" v-if="showStats">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-statistic title="总文件数" :value="uploadStats.total" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="已完成" :value="uploadStats.completed" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="失败" :value="uploadStats.failed" />
        </a-col>
        <a-col :span="6">
          <a-statistic 
            title="上传速度" 
            :value="uploadStats.speed" 
            suffix="KB/s" 
          />
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useFileStore } from '../store/fileStore';
import { message } from 'ant-design-vue';
import { globalLogger } from '@shared/utils/logger';
import {
  InboxOutlined,
  UploadOutlined,
  DeleteOutlined,
  PauseCircleOutlined,
  FileOutlined,
  PictureOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue';

const router = useRouter();
const fileStore = useFileStore();

// 上传配置
const uploadConfig = reactive({
  targetFolder: '/',
  renameStrategy: 'keep',
  autoExtract: false,
  overwrite: false
});

// 上传状态
const fileList = ref([]);
const uploadQueue = ref([]);
const isUploading = ref(false);
const uploadAction = '/api/upload'; // 实际项目中应该是真实的上传接口

// 上传统计
const uploadStats = reactive({
  total: 0,
  completed: 0,
  failed: 0,
  speed: 0
});

const showStats = computed(() => uploadStats.total > 0);

onMounted(() => {
  globalLogger.info('FileUpload component mounted');
});

// 上传前检查
const beforeUpload = (file: any) => {
  // 文件大小检查 (100MB)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    message.error(`文件 ${file.name} 超过100MB限制`);
    return false;
  }

  // 文件类型检查
  const allowedTypes = [
    'image/', 'video/', 'audio/', 'text/', 'application/pdf',
    'application/msword', 'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument',
    'application/zip', 'application/x-rar-compressed'
  ];
  
  const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
  if (!isAllowed) {
    message.warning(`文件类型 ${file.type} 可能不被支持`);
  }

  // 添加到上传队列而不是立即上传
  addToQueue(file);
  return false; // 阻止自动上传
};

// 添加到上传队列
const addToQueue = (file: any) => {
  const queueItem = {
    uid: file.uid || `${Date.now()}_${Math.random()}`,
    name: file.name,
    size: file.size,
    type: file.type,
    file: file,
    status: 'ready',
    percent: 0
  };
  
  uploadQueue.value.push(queueItem);
  uploadStats.total++;
  
  globalLogger.info('File added to queue:', queueItem.name);
};

// 自定义上传
const customUpload = async (options: any) => {
  const { file, onProgress, onSuccess, onError } = options;
  
  try {
    // 模拟上传过程
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetFolder', uploadConfig.targetFolder);
    formData.append('renameStrategy', uploadConfig.renameStrategy);
    formData.append('autoExtract', uploadConfig.autoExtract.toString());
    formData.append('overwrite', uploadConfig.overwrite.toString());

    // 模拟上传进度
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress > 100) progress = 100;
      
      onProgress({ percent: progress });
      
      if (progress >= 100) {
        clearInterval(interval);
        // 模拟上传成功
        setTimeout(() => {
          onSuccess({
            url: `/uploads/${file.name}`,
            name: file.name
          });
          
          // 添加到文件存储
          const newFile = {
            id: `file_${Date.now()}`,
            name: file.name,
            type: 'file' as const,
            size: file.size,
            parentId: uploadConfig.targetFolder === '/' ? null : uploadConfig.targetFolder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            permissions: ['read', 'write', 'delete']
          };
          
          fileStore.addFile(newFile);
          uploadStats.completed++;
          
        }, 500);
      }
    }, 200);
    
  } catch (error) {
    globalLogger.error('Upload error:', error);
    onError(error);
    uploadStats.failed++;
  }
};

// 处理上传变化
const handleUploadChange = (info: any) => {
  const { file, fileList: newFileList } = info;
  
  if (file.status === 'done') {
    message.success(`${file.name} 上传成功`);
  } else if (file.status === 'error') {
    message.error(`${file.name} 上传失败`);
  }
  
  fileList.value = newFileList;
};

// 处理拖拽
const handleDrop = (e: DragEvent) => {
  globalLogger.info('Files dropped:', e.dataTransfer?.files?.length);
};

// 开始上传队列
const startUpload = async () => {
  if (uploadQueue.value.length === 0) return;
  
  isUploading.value = true;
  
  for (const item of uploadQueue.value) {
    if (item.status === 'ready' || item.status === 'error') {
      try {
        item.status = 'uploading';
        await uploadSingleFile(item);
        item.status = 'done';
        item.percent = 100;
      } catch (error) {
        item.status = 'error';
        globalLogger.error('Upload failed:', error);
      }
    }
  }
  
  isUploading.value = false;
  message.success('批量上传完成');
};

// 上传单个文件
const uploadSingleFile = (item: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 模拟上传过程
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 100) progress = 100;
      
      item.percent = progress;
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          // 添加到文件存储
          const newFile = {
            id: `file_${Date.now()}_${Math.random()}`,
            name: item.name,
            type: 'file' as const,
            size: item.size,
            parentId: uploadConfig.targetFolder === '/' ? null : uploadConfig.targetFolder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            permissions: ['read', 'write', 'delete']
          };
          
          fileStore.addFile(newFile);
          uploadStats.completed++;
          resolve();
        }, 300);
      }
    }, 150);
  });
};

// 暂停上传
const pauseUpload = () => {
  isUploading.value = false;
  message.info('上传已暂停');
};

// 清空队列
const clearQueue = () => {
  uploadQueue.value = [];
  uploadStats.total = 0;
  uploadStats.completed = 0;
  uploadStats.failed = 0;
};

// 从队列中移除
const removeFromQueue = (index: number) => {
  uploadQueue.value.splice(index, 1);
  uploadStats.total--;
};

// 重试上传
const retryUpload = (index: number) => {
  const item = uploadQueue.value[index];
  item.status = 'ready';
  item.percent = 0;
};

// 获取进度条状态
const getProgressStatus = (status: string) => {
  switch (status) {
    case 'done': return 'success';
    case 'error': return 'exception';
    case 'uploading': return 'active';
    default: return 'normal';
  }
};

// 检查是否为图片文件
const isImageFile = (filename: string) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return imageExtensions.includes(ext);
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
.vue-file-management.file-upload {
  padding: 24px !important;
  background: #f5f5f5 !important;
  min-height: 100vh !important;
}

.upload-header {
  text-align: center !important;
  margin-bottom: 32px !important;
}

.upload-header h2 {
  color: #1890ff !important;
  margin-bottom: 8px !important;
}

.upload-header p {
  color: #666 !important;
  font-size: 14px !important;
}

.upload-container {
  max-width: 800px !important;
  margin: 0 auto !important;
}

.upload-dragger {
  margin-bottom: 24px !important;
}

.upload-config {
  margin-bottom: 24px !important;
}

.upload-queue {
  margin-bottom: 24px !important;
}

.queue-header {
  margin-bottom: 16px !important;
}

.upload-list {
  max-height: 400px !important;
  overflow-y: auto !important;
}

.upload-item {
  display: flex !important;
  align-items: center !important;
  padding: 12px !important;
  border: 1px solid #d9d9d9 !important;
  border-radius: 6px !important;
  margin-bottom: 8px !important;
  background: white !important;
}

.upload-item.upload-error {
  border-color: #ff4d4f !important;
  background: #fff2f0 !important;
}

.file-info {
  display: flex !important;
  align-items: center !important;
  flex: 1 !important;
  min-width: 0 !important;
}

.file-icon {
  margin-right: 12px !important;
  font-size: 16px !important;
  color: #1890ff !important;
}

.file-details {
  flex: 1 !important;
  min-width: 0 !important;
}

.file-name {
  font-weight: 500 !important;
  color: #262626 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.file-size {
  font-size: 12px !important;
  color: #8c8c8c !important;
}

.upload-progress {
  flex: 1 !important;
  margin: 0 16px !important;
}

.upload-status {
  font-size: 12px !important;
  margin-top: 4px !important;
}

.upload-status .success {
  color: #52c41a !important;
}

.upload-status .error {
  color: #ff4d4f !important;
}

.upload-actions {
  display: flex !important;
  gap: 4px !important;
}

.upload-stats {
  max-width: 800px !important;
  margin: 0 auto !important;
  background: white !important;
  padding: 24px !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}
</style>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FileUpload'
});
</script>