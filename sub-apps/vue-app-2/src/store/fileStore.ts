/**
 * 文件管理 Pinia Store
 * 管理文件和文件夹的状态
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  size: number;
  mimeType?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
}

export const useFileStore = defineStore('fileStore', () => {
  // 状态
  const files = ref<FileItem[]>([]);
  const folders = ref<FileItem[]>([]);
  const currentPath = ref<string>('/');
  const selectedItems = ref<Set<string>>(new Set());
  const uploadProgress = ref<Map<string, number>>(new Map());
  const theme = ref<string>('light');
  const language = ref<string>('zh-CN');

  // 计算属性
  const currentFiles = computed(() => {
    const currentFolderId = getCurrentFolderId();
    return files.value.filter(file => file.parentId === currentFolderId);
  });

  const currentFolders = computed(() => {
    const currentFolderId = getCurrentFolderId();
    return folders.value.filter(folder => folder.parentId === currentFolderId);
  });

  const allCurrentItems = computed(() => {
    return [...currentFolders.value, ...currentFiles.value];
  });

  const selectedCount = computed(() => selectedItems.value.size);

  const totalSize = computed(() => {
    return files.value.reduce((total, file) => total + file.size, 0);
  });

  // 辅助函数
  function getCurrentFolderId(): string | null {
    if (currentPath.value === '/') return null;
    
    const pathParts = currentPath.value.split('/').filter(Boolean);
    const currentFolderName = pathParts[pathParts.length - 1];
    const folder = folders.value.find(f => f.name === currentFolderName);
    return folder?.id || null;
  }

  // Actions
  function setFiles(newFiles: FileItem[]) {
    files.value = newFiles;
  }

  function setFolders(newFolders: FileItem[]) {
    folders.value = newFolders;
  }

  function addFile(file: FileItem) {
    files.value.push(file);
  }

  function addFolder(folder: FileItem) {
    folders.value.push(folder);
  }

  function removeFile(fileId: string) {
    const index = files.value.findIndex(f => f.id === fileId);
    if (index > -1) {
      files.value.splice(index, 1);
    }
  }

  function removeFolder(folderId: string) {
    const index = folders.value.findIndex(f => f.id === folderId);
    if (index > -1) {
      folders.value.splice(index, 1);
    }
    // 同时删除该文件夹下的所有文件和子文件夹
    files.value = files.value.filter(f => f.parentId !== folderId);
    folders.value = folders.value.filter(f => f.parentId !== folderId);
  }

  function updateFile(fileId: string, updates: Partial<FileItem>) {
    const file = files.value.find(f => f.id === fileId);
    if (file) {
      Object.assign(file, updates);
    }
  }

  function updateFolder(folderId: string, updates: Partial<FileItem>) {
    const folder = folders.value.find(f => f.id === folderId);
    if (folder) {
      Object.assign(folder, updates);
    }
  }

  function setCurrentPath(path: string) {
    currentPath.value = path;
    // 切换路径时清空选择
    selectedItems.value.clear();
  }

  function selectItem(itemId: string) {
    selectedItems.value.add(itemId);
  }

  function unselectItem(itemId: string) {
    selectedItems.value.delete(itemId);
  }

  function toggleSelection(itemId: string) {
    if (selectedItems.value.has(itemId)) {
      selectedItems.value.delete(itemId);
    } else {
      selectedItems.value.add(itemId);
    }
  }

  function selectAll() {
    allCurrentItems.value.forEach(item => {
      selectedItems.value.add(item.id);
    });
  }

  function clearSelection() {
    selectedItems.value.clear();
  }

  function setUploadProgress(fileId: string, progress: number) {
    uploadProgress.value.set(fileId, progress);
  }

  function removeUploadProgress(fileId: string) {
    uploadProgress.value.delete(fileId);
  }

  function setTheme(newTheme: string) {
    theme.value = newTheme;
  }

  function setLanguage(newLanguage: string) {
    language.value = newLanguage;
  }

  function reset() {
    files.value = [];
    folders.value = [];
    currentPath.value = '/';
    selectedItems.value.clear();
    uploadProgress.value.clear();
  }

  // 搜索功能
  function searchItems(query: string) {
    const lowerQuery = query.toLowerCase();
    return allCurrentItems.value.filter(item => 
      item.name.toLowerCase().includes(lowerQuery)
    );
  }

  // 获取面包屑路径
  function getBreadcrumbs() {
    if (currentPath.value === '/') {
      return [{ name: '根目录', path: '/' }];
    }

    const parts = currentPath.value.split('/').filter(Boolean);
    const breadcrumbs = [{ name: '根目录', path: '/' }];
    
    let currentPathBuild = '';
    parts.forEach(part => {
      currentPathBuild += '/' + part;
      breadcrumbs.push({
        name: part,
        path: currentPathBuild
      });
    });

    return breadcrumbs;
  }

  return {
    // 状态
    files,
    folders,
    currentPath,
    selectedItems,
    uploadProgress,
    theme,
    language,
    
    // 计算属性
    currentFiles,
    currentFolders,
    allCurrentItems,
    selectedCount,
    totalSize,
    
    // Actions
    setFiles,
    setFolders,
    addFile,
    addFolder,
    removeFile,
    removeFolder,
    updateFile,
    updateFolder,
    setCurrentPath,
    selectItem,
    unselectItem,
    toggleSelection,
    selectAll,
    clearSelection,
    setUploadProgress,
    removeUploadProgress,
    setTheme,
    setLanguage,
    reset,
    searchItems,
    getBreadcrumbs
  };
});