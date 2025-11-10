<template>
  <div class="vue-file-management file-manager">
    <div class="toolbar">
      <div class="toolbar-left">
        <a-breadcrumb class="breadcrumb">
          <a-breadcrumb-item 
            v-for="crumb in breadcrumbs" 
            :key="crumb.path"
            @click="navigateToPath(crumb.path)"
          >
            <a href="javascript:void(0)">{{ crumb.name }}</a>
          </a-breadcrumb-item>
        </a-breadcrumb>
      </div>
      
      <div class="toolbar-right">
        <a-input-search
          v-model:value="searchQuery"
          placeholder="搜索文件..."
          style="width: 200px; margin-right: 16px;"
          @search="handleSearch"
        />
        
        <a-space>
          <a-button type="primary" @click="showUploadModal">
            <UploadOutlined />
            上传文件
          </a-button>
          
          <a-button @click="createFolder">
            <FolderAddOutlined />
            新建文件夹
          </a-button>
          
          <a-dropdown>
            <a-button>
              <MoreOutlined />
            </a-button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="refresh" @click="refreshFiles">
                  <ReloadOutlined />
                  刷新
                </a-menu-item>
                <a-menu-item key="selectAll" @click="selectAll">
                  <CheckSquareOutlined />
                  全选
                </a-menu-item>
                <a-menu-item key="clearSelection" @click="clearSelection">
                  <BorderOutlined />
                  取消选择
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </a-space>
      </div>
    </div>

    <div class="file-list" v-if="displayItems.length > 0">
      <div class="file-grid">
        <div
          v-for="item in displayItems"
          :key="item.id"
          class="file-card"
          :class="{ 'file-selected': isSelected(item.id) }"
          @click="handleItemClick(item)"
          @dblclick="handleItemDoubleClick(item)"
        >
          <div class="file-icon">
            <FolderOutlined v-if="item.type === 'folder'" class="folder-icon" />
            <FileOutlined v-else class="file-icon" />
          </div>
          
          <div class="file-name">{{ item.name }}</div>
          
          <div class="file-meta">
            <div class="file-size" v-if="item.type === 'file'">
              {{ formatFileSize(item.size) }}
            </div>
            <div class="file-date">
              {{ formatDate(item.updatedAt) }}
            </div>
          </div>
          
          <div class="file-actions">
            <a-dropdown>
              <a-button type="text" size="small">
                <MoreOutlined />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="download" v-if="item.type === 'file'">
                    <DownloadOutlined />
                    下载
                  </a-menu-item>
                  <a-menu-item key="rename">
                    <EditOutlined />
                    重命名
                  </a-menu-item>
                  <a-menu-item key="delete" danger>
                    <DeleteOutlined />
                    删除
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <FolderOpenOutlined />
      <h3>文件夹为空</h3>
      <p>拖拽文件到此处或点击上传按钮添加文件</p>
      <a-button type="primary" @click="showUploadModal">
        <UploadOutlined />
        上传文件
      </a-button>
    </div>

    <!-- 上传模态框 -->
    <a-modal
      v-model:open="uploadModalVisible"
      title="上传文件"
      :footer="null"
      width="600px"
    >
      <a-upload-dragger
        v-model:fileList="fileList"
        multiple
        :before-upload="beforeUpload"
        @change="handleUploadChange"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持单个或批量上传</p>
      </a-upload-dragger>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useFileStore } from '../store/fileStore';
import {
  UploadOutlined,
  FolderAddOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileOutlined,
  MoreOutlined,
  ReloadOutlined,
  CheckSquareOutlined,
  BorderOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  InboxOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { globalLogger } from '@shared/utils/logger';

const fileStore = useFileStore();

const searchQuery = ref('');
const uploadModalVisible = ref(false);
const fileList = ref([]);

const breadcrumbs = computed(() => fileStore.getBreadcrumbs());
const displayItems = computed(() => {
  if (searchQuery.value) {
    return fileStore.searchItems(searchQuery.value);
  }
  return fileStore.allCurrentItems;
});

onMounted(() => {
  globalLogger.info('FileManager mounted');
});

const isSelected = (itemId: string) => {
  return fileStore.selectedItems.has(itemId);
};

const handleItemClick = (item: any) => {
  fileStore.toggleSelection(item.id);
};

const handleItemDoubleClick = (item: any) => {
  if (item.type === 'folder') {
    const newPath = fileStore.currentPath === '/' ? `/${item.name}` : `${fileStore.currentPath}/${item.name}`;
    fileStore.setCurrentPath(newPath);
  } else {
    // 预览文件
    message.info(`预览文件: ${item.name}`);
  }
};

const navigateToPath = (path: string) => {
  fileStore.setCurrentPath(path);
};

const handleSearch = (value: string) => {
  globalLogger.info('Searching files:', value);
};

const showUploadModal = () => {
  uploadModalVisible.value = true;
};

const createFolder = () => {
  const folderName = prompt('请输入文件夹名称:');
  if (folderName) {
    const newFolder = {
      id: `folder_${Date.now()}`,
      name: folderName,
      type: 'folder' as const,
      parentId: fileStore.currentPath === '/' ? null : fileStore.currentPath,
      size: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: ['read', 'write', 'delete']
    };
    fileStore.addFolder(newFolder);
    message.success(`文件夹 "${folderName}" 创建成功`);
  }
};

const refreshFiles = () => {
  message.info('刷新文件列表');
  globalLogger.info('Refreshing files');
};

const selectAll = () => {
  fileStore.selectAll();
};

const clearSelection = () => {
  fileStore.clearSelection();
};

const beforeUpload = () => {
  return false; // 阻止自动上传
};

const handleUploadChange = (info: any) => {
  globalLogger.info('Upload change:', info);
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
</script>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FileManager'
});
</script>