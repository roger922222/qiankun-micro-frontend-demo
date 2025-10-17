<template>
  <div class="vue-file-management error-page">
    <a-result
      status="404"
      title="404"
      sub-title="抱歉，您访问的页面不存在。"
    >
      <template #extra>
        <a-button type="primary" @click="goHome">
          返回首页
        </a-button>
      </template>
    </a-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
  router.push('/files');
};
</script>

<style scoped>
.vue-file-management.error-page {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  min-height: 400px !important;
}
</style>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ErrorPage'
});
</script>