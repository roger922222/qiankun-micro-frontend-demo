<template>
  <a-layout-footer class="app-footer">
    <div class="footer-content">
      <div class="footer-main">
        <a-space split="|" size="middle">
          <span>© 2024 Vue消息中心</span>
          <span>微前端通信演示</span>
          <a href="https://github.com/vuejs/vue" target="_blank">
            <github-outlined /> Vue.js
          </a>
        </a-space>
      </div>
      
      <div class="footer-links">
        <a-space split="|" size="small">
          <a href="/docs" target="_blank">文档</a>
          <a href="/api" target="_blank">API</a>
          <a href="/support" target="_blank">支持</a>
        </a-space>
      </div>
    </div>
  </a-layout-footer>
</template>

<script setup lang="ts">
import { GithubOutlined } from '@ant-design/icons-vue';
</script>

<style scoped>
.app-footer {
  background: #f0f2f5;
  border-top: 1px solid #e8e8e8;
  padding: 16px 24px;
  text-align: center;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  font-size: 14px;
  color: #666;
}

.footer-main {
  display: flex;
  align-items: center;
}

.footer-links {
  display: flex;
  align-items: center;
}

.footer-links a {
  color: #666;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-links a:hover {
  color: #1890ff;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .footer-content {
    flex-direction: column;
    gap: 8px;
  }
}

/* 暗色主题 */
[data-theme="dark"] .app-footer {
  background: #141414;
  border-top-color: #303030;
  color: #ccc;
}

[data-theme="dark"] .footer-content {
  color: #ccc;
}

[data-theme="dark"] .footer-links a {
  color: #ccc;
}

[data-theme="dark"] .footer-links a:hover {
  color: #1890ff;
}
</style>