# Vue微前端生命周期函数导出错误问题记录

## 1. 问题概述

### 1.1 错误信息
```
Uncaught QiankunError2: application 'vue-message-center' died in status LOADING_SOURCE_CODE: [qiankun]: You need to export lifecycle functions in vue-message-center entry
    at getLifecyclesFromExports (qiankun.js?v=7aaab43a:7199:9)
    at _callee17$ (qiankun.js?v=7aaab43a:7297:37)
    at qiankun.js?v=7aaab43a:321:23
    at Generator.<anonymous> (qiankun.js?v=7aaab43a:117:60)
    at Generator.next (qiankun.js?v=7aaab43a:58:25)
    at asyncGeneratorStep (chunk-XZH4DLET.js?v=c1f17181:33:17)
    at _next (chunk-XZH4DLET.js?v=c1f17181:45:9)
```

### 1.2 问题描述
- **应用名称**: vue-message-center (vue-app-1)
- **错误类型**: QiankunError2
- **错误阶段**: LOADING_SOURCE_CODE
- **核心问题**: qiankun无法找到Vue子应用导出的生命周期函数

### 1.3 影响范围
- Vue子应用无法在qiankun微前端框架中正常加载
- 应用停留在加载阶段，无法完成挂载
- 用户无法访问Vue消息中心功能

## 2. 错误原因分析

### 2.1 qiankun生命周期函数要求
qiankun要求每个微前端子应用必须导出以下三个生命周期函数：

```typescript
// 必须导出的生命周期函数
export async function bootstrap(props?: any): Promise<void>
export async function mount(props?: any): Promise<void>
export async function unmount(props?: any): Promise<void>
```

### 2.2 常见导出问题

#### 2.2.1 未正确导出生命周期函数
```typescript
// ❌ 错误：没有导出生命周期函数
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#app');
```

#### 2.2.2 导出方式不正确
```typescript
// ❌ 错误：使用默认导出
export default {
  bootstrap,
  mount,
  unmount
};

// ❌ 错误：函数未声明为async
export function bootstrap() {
  console.log('bootstrap');
}
```

#### 2.2.3 Webpack/Vite打包配置问题
```javascript
// ❌ 错误：libraryTarget配置不正确
module.exports = {
  output: {
    library: 'vueApp',
    libraryTarget: 'var' // 应该是 'umd'
  }
};
```

### 2.3 Vue特有问题

#### 2.3.1 Vue应用实例管理
Vue 3的createApp API与React的渲染方式不同，需要正确管理应用实例：

```typescript
// ❌ 错误：没有保存应用实例引用
export async function mount(props) {
  const app = createApp(App);
  app.mount(props.container);
  // 问题：无法在unmount时访问app实例
}
```

#### 2.3.2 路由基础路径配置
```typescript
// ❌ 错误：没有使用qiankun传递的routerBase
const router = createRouter({
  history: createWebHistory('/message-center'), // 硬编码路径
  routes
});
```

## 3. 解决方案

### 3.1 标准Vue生命周期函数实现

```typescript
/**
 * Vue微前端标准生命周期函数实现
 * 文件路径: src/main.ts
 */
import { createApp, App as VueApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createStore } from 'vuex';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';

import App from './App.vue';
import routes from './router';
import store from './store';
import './styles/index.css';

// 全局变量管理应用实例
let app: VueApp<Element> | null = null;
let router: any = null;

/**
 * 渲染函数 - 创建和挂载Vue应用
 */
function render(props: any = {}) {
  const { container, routerBase } = props;
  
  // 创建路由实例，使用动态base路径
  router = createRouter({
    history: createWebHistory(routerBase || '/message-center'),
    routes
  });

  // 创建Vue应用实例
  app = createApp(App);
  
  // 注册插件
  app.use(router);
  app.use(store);
  app.use(Antd);
  
  // 挂载到指定容器
  const domElement = container ? container.querySelector('#app') : '#app';
  app.mount(domElement);
  
  return app;
}

/**
 * qiankun生命周期 - 启动阶段
 * 在应用首次加载时调用，用于执行一次性初始化操作
 */
export async function bootstrap() {
  console.log('[vue-message-center] Bootstrap - 应用启动');
}

/**
 * qiankun生命周期 - 挂载阶段
 * 在应用需要被激活时调用
 */
export async function mount(props: any) {
  console.log('[vue-message-center] Mount - 应用挂载', props);
  render(props);
}

/**
 * qiankun生命周期 - 卸载阶段
 * 在应用需要被销毁时调用
 */
export async function unmount(props: any) {
  console.log('[vue-message-center] Unmount - 应用卸载');
  
  if (app) {
    app.unmount();
    app = null;
    router = null;
  }
}

/**
 * 独立运行模式
 * 当不在qiankun环境中时，直接渲染应用
 */
if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

// TypeScript类型声明
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}

// 动态设置publicPath（如果使用webpack）
if (window.__POWERED_BY_QIANKUN__) {
  // eslint-disable-next-line no-undef
  __webpack_public_path__ = window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__;
}
```

### 3.2 Vite配置优化

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  
  // 微前端相关配置
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'vueMessageCenter',
      formats: ['umd'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  },
  
  // 开发服务器配置
  server: {
    port: 3006,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  },
  
  // 路径解析
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, '../../shared')
    }
  }
});
```

### 3.3 主应用配置

```typescript
// 主应用中注册Vue子应用
import { registerMicroApps, start } from 'qiankun';

registerMicroApps([
  {
    name: 'vue-message-center',
    entry: '//localhost:3006',
    container: '#micro-app-container',
    activeRule: '/message-center',
    props: {
      routerBase: '/message-center'
    }
  }
]);

start({
  prefetch: false,
  sandbox: {
    strictStyleIsolation: false,
    experimentalStyleIsolation: true
  }
});
```

## 4. 最佳实践

### 4.1 错误处理

```typescript
export async function mount(props: any) {
  try {
    console.log('[vue-message-center] Mount - 开始挂载', props);
    render(props);
    console.log('[vue-message-center] Mount - 挂载成功');
  } catch (error) {
    console.error('[vue-message-center] Mount - 挂载失败:', error);
    throw error;
  }
}

export async function unmount(props: any) {
  try {
    console.log('[vue-message-center] Unmount - 开始卸载');
    
    if (app) {
      app.unmount();
      app = null;
      router = null;
    }
    
    console.log('[vue-message-center] Unmount - 卸载成功');
  } catch (error) {
    console.error('[vue-message-center] Unmount - 卸载失败:', error);
    throw error;
  }
}
```

### 4.2 状态清理

```typescript
export async function unmount(props: any) {
  console.log('[vue-message-center] Unmount - 应用卸载');
  
  // 1. 卸载Vue应用实例
  if (app) {
    app.unmount();
    app = null;
  }
  
  // 2. 清理路由实例
  if (router) {
    router = null;
  }
  
  // 3. 清理全局事件监听器
  window.removeEventListener('message', messageHandler);
  
  // 4. 清理定时器
  if (window.vueAppTimers) {
    window.vueAppTimers.forEach(timer => clearInterval(timer));
    window.vueAppTimers = [];
  }
  
  // 5. 清理Vuex store订阅
  if (store && store.unsubscribe) {
    store.unsubscribe();
  }
}
```

### 4.3 开发调试技巧

```typescript
// 调试辅助函数
function debugLifecycle(stage: string, props?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`[vue-message-center] ${stage}`);
    console.log('Props:', props);
    console.log('App instance:', app);
    console.log('Router instance:', router);
    console.log('Container:', props?.container);
    console.groupEnd();
  }
}

export async function bootstrap() {
  debugLifecycle('Bootstrap');
  // 启动逻辑
}

export async function mount(props: any) {
  debugLifecycle('Mount', props);
  render(props);
}

export async function unmount(props: any) {
  debugLifecycle('Unmount', props);
  // 卸载逻辑
}
```

### 4.4 类型安全

```typescript
// 定义Props接口
interface QiankunProps {
  container?: HTMLElement;
  routerBase?: string;
  [key: string]: any;
}

// 使用类型化的生命周期函数
export async function bootstrap(): Promise<void> {
  console.log('[vue-message-center] Bootstrap');
}

export async function mount(props: QiankunProps): Promise<void> {
  console.log('[vue-message-center] Mount', props);
  render(props);
}

export async function unmount(props: QiankunProps): Promise<void> {
  console.log('[vue-message-center] Unmount');
  
  if (app) {
    app.unmount();
    app = null;
    router = null;
  }
}
```

## 5. 常见问题排查

### 5.1 检查清单

- [ ] 是否正确导出了bootstrap、mount、unmount三个函数
- [ ] 生命周期函数是否声明为async
- [ ] 是否使用了正确的导出语法（export而不是export default）
- [ ] Vite/Webpack配置是否正确设置了UMD格式
- [ ] 开发服务器是否启用了CORS
- [ ] 应用实例是否正确保存和清理

### 5.2 调试方法

```typescript
// 1. 检查全局导出
console.log('Window exports:', {
  bootstrap: window.bootstrap,
  mount: window.mount,
  unmount: window.unmount
});

// 2. 检查模块导出
import * as lifecycle from './main.ts';
console.log('Module exports:', lifecycle);

// 3. 手动测试生命周期
async function testLifecycle() {
  try {
    await bootstrap();
    await mount({ container: document.getElementById('app') });
    await unmount({});
    console.log('生命周期测试通过');
  } catch (error) {
    console.error('生命周期测试失败:', error);
  }
}
```

### 5.3 网络请求检查

```bash
# 检查子应用资源是否可访问
curl -I http://localhost:3006/src/main.ts

# 检查CORS头部
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:3006/src/main.ts
```

## 6. 预防措施

### 6.1 开发规范
1. **统一模板**: 使用标准的Vue微前端模板
2. **代码审查**: 重点检查生命周期函数的导出
3. **自动化测试**: 编写生命周期函数的单元测试
4. **文档维护**: 保持最佳实践文档的更新

### 6.2 工具集成
```json
{
  "scripts": {
    "lint:lifecycle": "eslint src/main.ts --rule 'no-unused-vars: error'",
    "test:lifecycle": "jest src/main.test.ts",
    "build:check": "npm run build && node scripts/check-exports.js"
  }
}
```

### 6.3 CI/CD检查
```yaml
# .github/workflows/check-lifecycle.yml
name: Check Lifecycle Functions
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Check lifecycle exports
        run: |
          if ! grep -q "export async function bootstrap" sub-apps/vue-app-1/src/main.ts; then
            echo "Missing bootstrap function export"
            exit 1
          fi
```

## 7. 相关资源

### 7.1 官方文档
- [qiankun官方文档](https://qiankun.umijs.org/)
- [Vue 3官方文档](https://vuejs.org/)
- [Vite官方文档](https://vitejs.dev/)

### 7.2 参考示例
- [qiankun Vue示例](https://github.com/umijs/qiankun/tree/master/examples)
- 项目中的React应用实现：`sub-apps/react-app-1/src/main-qiankun.tsx`

### 7.3 社区资源
- [微前端实践指南](https://micro-frontends.org/)
- [qiankun最佳实践](https://github.com/umijs/qiankun/issues)

---

**文档版本**: 1.0  
**创建日期**: 2025-09-27
**最后更新**: 2025-09-27  
**维护人员**: Roger