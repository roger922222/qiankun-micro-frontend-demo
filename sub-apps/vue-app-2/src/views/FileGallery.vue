<template>
  <div class="vue-file-management file-gallery">
    <div class="gallery-header">
      <div class="header-left">
        <h2>文件预览</h2>
        <a-breadcrumb class="breadcrumb">
          <a-breadcrumb-item>
            <a href="javascript:void(0)" @click="navigateToFiles">文件管理</a>
          </a-breadcrumb-item>
          <a-breadcrumb-item>文件预览</a-breadcrumb-item>
        </a-breadcrumb>
      </div>
      
      <div class="header-right">
        <a-space>
          <a-select 
            v-model:value="filterType" 
            style="width: 120px"
            @change="handleFilterChange"
          >
            <a-select-option value="all">全部文件</a-select-option>
            <a-select-option value="image">图片</a-select-option>
            <a-select-option value="video">视频</a-select-option>
            <a-select-option value="audio">音频</a-select-option>
            <a-select-option value="document">文档</a-select-option>
          </a-select>
          
          <a-select 
            v-model:value="sortBy" 
            style="width: 120px"
            @change="handleSortChange"
          >
            <a-select-option value="name">按名称</a-select-option>
            <a-select-option value="date">按日期</a-select-option>
            <a-select-option value="size">按大小</a-select-option>
            <a-select-option value="type">按类型</a-select-option>
          </a-select>
          
          <a-button-group>
            <a-button 
              :type="viewMode === 'grid' ? 'primary' : 'default'"
              @click="setViewMode('grid')"
            >
              <AppstoreOutlined />
            </a-button>
            <a-button 
              :type="viewMode === 'list' ? 'primary' : 'default'"
              @click="setViewMode('list')"
            >
              <BarsOutlined />
            </a-button>
          </a-button-group>
        </a-space>
      </div>
    </div>

    <!-- 网格视图 -->
    <div class="gallery-grid" v-if="viewMode === 'grid'">
      <div class="file-grid">
        <div
          v-for="file in filteredFiles"
          :key="file.id"
          class="file-card"
          @click="openPreview(file)"
        >
          <div class="file-preview">
            <!-- 图片预览 -->
            <div v-if="isImageFile(file)" class="image-preview">
              <img 
                :src="getFilePreviewUrl(file)" 
                :alt="file.name"
                @error="handleImageError"
              />
            </div>
            
            <!-- 视频预览 -->
            <div v-else-if="isVideoFile(file)" class="video-preview">
              <video 
                :src="getFilePreviewUrl(file)"
                :poster="getVideoThumbnail(file)"
                preload="metadata"
              />
              <div class="play-overlay">
                <PlayCircleOutlined />
              </div>
            </div>
            
            <!-- 文档预览 -->
            <div v-else-if="isDocumentFile(file)" class="document-preview">
              <FileTextOutlined />
              <span class="file-ext">{{ getFileExtension(file.name) }}</span>
            </div>
            
            <!-- 音频预览 -->
            <div v-else-if="isAudioFile(file)" class="audio-preview">
              <SoundOutlined />
              <span class="file-ext">{{ getFileExtension(file.name) }}</span>
            </div>
            
            <!-- 其他文件 -->
            <div v-else class="other-preview">
              <FileOutlined />
              <span class="file-ext">{{ getFileExtension(file.name) }}</span>
            </div>
          </div>
          
          <div class="file-info">
            <div class="file-name" :title="file.name">{{ file.name }}</div>
            <div class="file-meta">
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <span class="file-date">{{ formatDate(file.updatedAt) }}</span>
            </div>
          </div>
          
          <div class="file-actions">
            <a-dropdown>
              <a-button type="text" size="small">
                <MoreOutlined />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="preview" @click="openPreview(file)">
                    <EyeOutlined />
                    预览
                  </a-menu-item>
                  <a-menu-item key="download" @click="downloadFile(file)">
                    <DownloadOutlined />
                    下载
                  </a-menu-item>
                  <a-menu-item key="share" @click="shareFile(file)">
                    <ShareAltOutlined />
                    分享
                  </a-menu-item>
                  <a-menu-item key="info" @click="showFileInfo(file)">
                    <InfoCircleOutlined />
                    详情
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div class="gallery-list" v-else>
      <a-table 
        :columns="tableColumns" 
        :data-source="filteredFiles"
        :pagination="{ pageSize: 20 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="file-name-cell">
              <div class="file-icon">
                <PictureOutlined v-if="isImageFile(record)" />
                <VideoCameraOutlined v-else-if="isVideoFile(record)" />
                <SoundOutlined v-else-if="isAudioFile(record)" />
                <FileTextOutlined v-else-if="isDocumentFile(record)" />
                <FileOutlined v-else />
              </div>
              <span class="file-name" @click="openPreview(record)">{{ record.name }}</span>
            </div>
          </template>
          
          <template v-else-if="column.key === 'size'">
            {{ formatFileSize(record.size) }}
          </template>
          
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDate(record.updatedAt) }}
          </template>
          
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="openPreview(record)">
                <EyeOutlined />
              </a-button>
              <a-button type="link" size="small" @click="downloadFile(record)">
                <DownloadOutlined />
              </a-button>
              <a-button type="link" size="small" @click="shareFile(record)">
                <ShareAltOutlined />
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 文件预览模态框 -->
    <a-modal
      v-model:open="previewVisible"
      :title="currentFile?.name"
      width="80%"
      :footer="null"
      class="file-preview-modal"
    >
      <div class="preview-content" v-if="currentFile">
        <!-- 图片预览 -->
        <div v-if="isImageFile(currentFile)" class="image-preview-large">
          <img 
            :src="getFilePreviewUrl(currentFile)" 
            :alt="currentFile.name"
            style="max-width: 100%; max-height: 70vh; object-fit: contain;"
          />
        </div>
        
        <!-- 视频预览 -->
        <div v-else-if="isVideoFile(currentFile)" class="video-preview-large">
          <video 
            :src="getFilePreviewUrl(currentFile)"
            controls
            style="max-width: 100%; max-height: 70vh;"
          />
        </div>
        
        <!-- 音频预览 -->
        <div v-else-if="isAudioFile(currentFile)" class="audio-preview-large">
          <audio :src="getFilePreviewUrl(currentFile)" controls style="width: 100%;" />
          <div class="audio-info">
            <SoundOutlined style="font-size: 48px; color: #1890ff;" />
            <h3>{{ currentFile.name }}</h3>
          </div>
        </div>
        
        <!-- 文档预览 -->
        <div v-else-if="isDocumentFile(currentFile)" class="document-preview-large">
          <div class="document-placeholder">
            <FileTextOutlined style="font-size: 48px; color: #1890ff;" />
            <h3>{{ currentFile.name }}</h3>
            <p>文档预览功能开发中...</p>
            <a-button type="primary" @click="downloadFile(currentFile)">
              <DownloadOutlined />
              下载文档
            </a-button>
          </div>
        </div>
        
        <!-- 其他文件 -->
        <div v-else class="other-preview-large">
          <div class="other-placeholder">
            <FileOutlined style="font-size: 48px; color: #8c8c8c;" />
            <h3>{{ currentFile.name }}</h3>
            <p>该文件类型暂不支持预览</p>
            <a-button type="primary" @click="downloadFile(currentFile)">
              <DownloadOutlined />
              下载文件
            </a-button>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 文件信息模态框 -->
    <a-modal
      v-model:open="infoVisible"
      title="文件详情"
      :footer="null"
      width="500px"
    >
      <div class="file-info-detail" v-if="currentFile">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="文件名">{{ currentFile.name }}</a-descriptions-item>
          <a-descriptions-item label="文件大小">{{ formatFileSize(currentFile.size) }}</a-descriptions-item>
          <a-descriptions-item label="文件类型">{{ getFileType(currentFile) }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatDate(currentFile.createdAt) }}</a-descriptions-item>
          <a-descriptions-item label="修改时间">{{ formatDate(currentFile.updatedAt) }}</a-descriptions-item>
          <a-descriptions-item label="文件路径">{{ getFilePath(currentFile) }}</a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useFileStore } from '../store/fileStore';
import { message } from 'ant-design-vue';
import { globalLogger } from '@shared/utils/logger';
import {
  AppstoreOutlined,
  BarsOutlined,
  MoreOutlined,
  EyeOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  FileTextOutlined,
  FileOutlined
} from '@ant-design/icons-vue';

const router = useRouter();
const fileStore = useFileStore();

// 视图状态
const viewMode = ref<'grid' | 'list'>('grid');
const filterType = ref('all');
const sortBy = ref('name');
const previewVisible = ref(false);
const infoVisible = ref(false);
const currentFile = ref<any>(null);

// 表格列配置
const tableColumns = [
  {
    title: '文件名',
    key: 'name',
    dataIndex: 'name',
    sorter: true
  },
  {
    title: '大小',
    key: 'size',
    dataIndex: 'size',
    sorter: true,
    width: 120
  },
  {
    title: '修改时间',
    key: 'updatedAt',
    dataIndex: 'updatedAt',
    sorter: true,
    width: 180
  },
  {
    title: '操作',
    key: 'actions',
    width: 120
  }
];

// 计算属性
const filteredFiles = computed(() => {
  let files = fileStore.allFiles.filter(file => file.type === 'file');
  
  // 按类型过滤
  if (filterType.value !== 'all') {
    files = files.filter(file => {
      switch (filterType.value) {
        case 'image': return isImageFile(file);
        case 'video': return isVideoFile(file);
        case 'audio': return isAudioFile(file);
        case 'document': return isDocumentFile(file);
        default: return true;
      }
    });
  }
  
  // 排序
  files.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'date':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'size':
        return b.size - a.size;
      case 'type':
        return getFileExtension(a.name).localeCompare(getFileExtension(b.name));
      default:
        return 0;
    }
  });
  
  return files;
});

onMounted(() => {
  globalLogger.info('FileGallery component mounted');
});

// 文件类型检测
const isImageFile = (file: any) => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const ext = getFileExtension(file.name);
  return imageExtensions.includes(ext);
};

const isVideoFile = (file: any) => {
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
  const ext = getFileExtension(file.name);
  return videoExtensions.includes(ext);
};

const isAudioFile = (file: any) => {
  const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma'];
  const ext = getFileExtension(file.name);
  return audioExtensions.includes(ext);
};

const isDocumentFile = (file: any) => {
  const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'];
  const ext = getFileExtension(file.name);
  return docExtensions.includes(ext);
};

// 工具函数
const getFileExtension = (filename: string) => {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
};

const getFileType = (file: any) => {
  if (isImageFile(file)) return '图片文件';
  if (isVideoFile(file)) return '视频文件';
  if (isAudioFile(file)) return '音频文件';
  if (isDocumentFile(file)) return '文档文件';
  return '其他文件';
};

const getFilePath = (file: any) => {
  // 这里应该根据实际的文件路径结构来生成
  return file.parentId ? `${file.parentId}/${file.name}` : `/${file.name}`;
};

const getFilePreviewUrl = (file: any) => {
  // 在实际项目中，这里应该返回真实的文件预览URL
  return `https://via.placeholder.com/400x300/1890ff/white?text=${encodeURIComponent(file.name)}`;
};

const getVideoThumbnail = (file: any) => {
  // 在实际项目中，这里应该返回视频缩略图URL
  return `https://via.placeholder.com/400x300/52c41a/white?text=Video`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

// 事件处理
const handleFilterChange = (value: string) => {
  globalLogger.info('Filter changed:', value);
};

const handleSortChange = (value: string) => {
  globalLogger.info('Sort changed:', value);
};

const setViewMode = (mode: 'grid' | 'list') => {
  viewMode.value = mode;
};

const navigateToFiles = () => {
  router.push('/files');
};

const openPreview = (file: any) => {
  currentFile.value = file;
  previewVisible.value = true;
  globalLogger.info('Opening file preview:', file.name);
};

const downloadFile = (file: any) => {
  // 在实际项目中，这里应该触发文件下载
  message.success(`开始下载 ${file.name}`);
  globalLogger.info('Downloading file:', file.name);
};

const shareFile = (file: any) => {
  // 在实际项目中，这里应该生成分享链接
  message.success(`已生成 ${file.name} 的分享链接`);
  globalLogger.info('Sharing file:', file.name);
};

const showFileInfo = (file: any) => {
  currentFile.value = file;
  infoVisible.value = true;
};

const handleImageError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  img.src = 'https://via.placeholder.com/200x150/f0f0f0/999?text=Image+Error';
};
</script>

<style scoped>
.vue-file-management.file-gallery {
  padding: 24px !important;
  background: #f5f5f5 !important;
  min-height: 100vh !important;
}

.gallery-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 24px !important;
  background: white !important;
  padding: 16px 24px !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.header-left h2 {
  margin: 0 0 8px 0 !important;
  color: #1890ff !important;
}

.breadcrumb {
  margin: 0 !important;
}

.gallery-grid {
  background: white !important;
  padding: 24px !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.file-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
  gap: 16px !important;
}

.file-card {
  border: 1px solid #d9d9d9 !important;
  border-radius: 6px !important;
  overflow: hidden !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  background: white !important;
}

.file-card:hover {
  border-color: #1890ff !important;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15) !important;
}

.file-preview {
  height: 150px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: #fafafa !important;
  position: relative !important;
}

.image-preview img {
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: cover !important;
}

.video-preview {
  position: relative !important;
  width: 100% !important;
  height: 100% !important;
}

.video-preview video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

.play-overlay {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 32px !important;
  color: white !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5) !important;
}

.document-preview,
.audio-preview,
.other-preview {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  font-size: 32px !important;
  color: #1890ff !important;
}

.file-ext {
  font-size: 12px !important;
  margin-top: 8px !important;
  color: #8c8c8c !important;
}

.file-info {
  padding: 12px !important;
}

.file-name {
  font-weight: 500 !important;
  color: #262626 !important;
  margin-bottom: 4px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.file-meta {
  display: flex !important;
  justify-content: space-between !important;
  font-size: 12px !important;
  color: #8c8c8c !important;
}

.file-actions {
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  opacity: 0 !important;
  transition: opacity 0.3s ease !important;
}

.file-card:hover .file-actions {
  opacity: 1 !important;
}

.gallery-list {
  background: white !important;
  padding: 24px !important;
  border-radius: 6px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.file-name-cell {
  display: flex !important;
  align-items: center !important;
}

.file-name-cell .file-icon {
  margin-right: 8px !important;
  font-size: 16px !important;
  color: #1890ff !important;
}

.file-name-cell .file-name {
  cursor: pointer !important;
  color: #1890ff !important;
}

.file-name-cell .file-name:hover {
  text-decoration: underline !important;
}

.preview-content {
  text-align: center !important;
}

.audio-info,
.document-placeholder,
.other-placeholder {
  text-align: center !important;
  padding: 40px !important;
}

.audio-info h3,
.document-placeholder h3,
.other-placeholder h3 {
  margin: 16px 0 8px 0 !important;
  color: #262626 !important;
}

.document-placeholder p,
.other-placeholder p {
  color: #8c8c8c !important;
  margin-bottom: 16px !important;
}

.file-preview-modal :deep(.ant-modal-body) {
  padding: 24px !important;
}
</style>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FileGallery'
});
</script>