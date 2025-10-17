# qiankun微前端vue-message-center网络请求失败解决方案

## 1. 项目概述
### 1.1 项目背景
vue-message-center是基于Vue 3 + Vite构建的微前端子应用，需要在qiankun微前端框架中正常运行。当前遇到网络请求失败错误，qiankun无法通过HTTP请求获取子应用的入口文件。

### 1.2 核心问题
qiankun在LOADING_SOURCE_CODE阶段出现"Failed to fetch"错误，无法访问http://localhost:3006上的Vue子应用服务。

### 1.3 解决方案概述
通过修复Vite配置、确保服务正常启动、添加健康检查机制，解决网络请求失败问题。

## 2. 功能列表

### 2.1 功能需求 (Functional Requirements)
| 编号 | 模块 | 需求 | 详细 |
|------|------------|------|------|
| FR1 | 服务启动 | 确保Vue应用服务正常启动并运行在端口3006 | 修复服务启动问题，确保持续运行 |
| FR2 | Vite配置优化 | 优化Vite配置以支持开发模式和qiankun集成 | 分离开发模式和构建模式配置 |
| FR3 | 网络访问验证 | 验证主应用能够正常访问子应用服务 | 确保HTTP请求能够成功获取资源 |
| FR4 | CORS配置 | 配置正确的跨域资源共享设置 | 确保主应用能够跨域访问子应用资源 |
| FR5 | 错误处理 | 添加详细的错误处理和日志记录 | 提供清晰的错误信息便于调试 |
| FR6 | 服务监控 | 添加服务健康检查和自动重启机制 | 确保服务稳定性和可用性 |

## 3. 用例列表 (Test Cases)

### 3.1 正常用例
| 编号 | 关联需求 | 用例名称 | 用例描述 | 前置条件 | 执行步骤 | 预期结果 |
|------|----------|----------|----------|----------|----------|----------|
| TC1  | FR1 | 服务启动验证 | 验证Vue应用服务能够正常启动 | 已安装依赖 | 1.执行npm run dev 2.检查端口3006 | 服务正常启动，端口被占用 |
| TC2  | FR2 | Vite配置测试 | 测试优化后的Vite配置 | 服务正常启动 | 1.访问localhost:3006 2.检查资源加载 | 页面正常显示，资源加载成功 |
| TC3  | FR3 | 网络访问测试 | 测试主应用访问子应用 | 主应用和子应用都运行 | 1.主应用加载子应用 2.检查网络请求 | 网络请求成功，无Failed to fetch错误 |
| TC4  | FR4 | CORS配置验证 | 验证跨域访问配置 | 服务正常运行 | 1.跨域访问资源 2.检查响应头 | 无CORS错误，正确的响应头 |
| TC5  | FR5 | 错误处理测试 | 测试错误处理机制 | 模拟网络错误 | 1.断开网络 2.尝试访问 | 显示清晰的错误信息 |
| TC6  | FR6 | 健康检查测试 | 测试服务健康检查 | 服务运行中 | 1.访问健康检查端点 2.检查响应 | 返回服务状态信息 |

### 3.2 异常用例
| 编号 | 关联需求 | 用例名称 | 异常场景 | 触发条件 | 处理方式 | 预期结果 |
|------|----------|----------|----------|----------|----------|----------|
| TC_E1 | FR1 | 服务启动失败 | Vue应用服务无法启动 | 端口被占用或配置错误 | 检查端口占用，修复配置 | 服务成功启动 |
| TC_E2 | FR2 | Vite配置错误 | Vite配置导致服务异常 | 配置语法错误 | 修正配置文件 | 配置正确，服务正常 |
| TC_E3 | FR3 | 网络请求超时 | 网络请求超时失败 | 网络延迟或服务响应慢 | 增加超时时间，优化响应 | 请求正常完成 |
| TC_E4 | FR4 | CORS错误 | 跨域访问被阻止 | CORS配置不正确 | 修正CORS配置 | 跨域访问正常 |
| TC_E5 | FR5 | 错误信息不清晰 | 错误信息难以理解 | 错误处理逻辑不完善 | 改进错误处理 | 错误信息清晰明确 |
| TC_E6 | FR6 | 服务意外停止 | 服务运行中意外停止 | 内存不足或代码异常 | 自动重启服务 | 服务自动恢复运行 |

## 4. 技术架构

### 4.1 整体架构
```
qiankun微前端网络访问架构
├── 主应用 (Main App)
│   ├── qiankun配置
│   ├── 自定义fetch函数
│   └── 错误处理机制
├── 网络层 (Network Layer)
│   ├── HTTP请求
│   ├── CORS处理
│   └── 错误重试机制
├── Vue子应用 (Vue Sub App)
│   ├── Vite开发服务器
│   ├── 静态资源服务
│   └── 健康检查端点
└── 监控层 (Monitoring Layer)
    ├── 服务状态监控
    ├── 网络请求监控
    └── 错误日志收集
```

### 4.2 核心组件
| 组件类型 | 组件名称 | 描述 | 配置要求 |
|----------|----------|------|----------|
| 开发服务器 | Vite Dev Server | Vue应用开发服务器 | 端口3006，CORS启用 |
| 网络客户端 | qiankun fetch | 主应用网络请求客户端 | 错误处理，重试机制 |
| 健康检查 | Health Check | 服务状态检查端点 | 返回服务运行状态 |
| 错误处理 | Error Handler | 网络错误处理机制 | 详细错误信息和日志 |

### 4.3 技术选型
| 技术栈 | 版本 | 作用 | 配置要求 |
|--------|------|------|----------|
| Vite | ^4.4.5 | 开发服务器 | 开发模式优化配置 |
| Vue | ^3.3.4 | 前端框架 | 支持微前端集成 |
| qiankun | latest | 微前端框架 | 自定义fetch配置 |
| Node.js | 16+ | 运行环境 | 支持ES模块 |

## 5. 核心设计

### 5.1 数据模型和关系
```typescript
// 服务状态接口
interface ServiceStatus {
  name: string;
  port: number;
  status: 'running' | 'stopped' | 'error';
  lastCheck: string;
  error?: string;
}

// 网络请求配置
interface FetchConfig {
  url: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}
```

### 5.2 前端设计

#### 步骤1: 修复Vite配置
```typescript
// sub-apps/vue-app-1/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isProduction = command === 'build';
  
  return {
    plugins: [vue()],
    
    // 根据环境分离配置
    build: isProduction ? {
      target: 'esnext',
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
    } : undefined,
    
    // 开发服务器配置
    server: {
      port: 3006,
      host: '0.0.0.0', // 允许外部访问
      cors: true,
      strictPort: true, // 端口被占用时报错而不是自动切换
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    },
    
    // 路径解析
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, '../../shared')
      }
    }
  };
});
```

#### 步骤2: 添加健康检查端点
```typescript
// sub-apps/vue-app-1/src/health.ts
export function setupHealthCheck(app: any) {
  // 添加健康检查路由
  app.config.globalProperties.$healthCheck = {
    status: 'running',
    timestamp: new Date().toISOString(),
    port: 3006,
    name: 'vue-message-center'
  };
  
  // 监听健康检查请求
  if (typeof window !== 'undefined') {
    (window as any).__VUE_APP_HEALTH__ = {
      status: 'running',
      timestamp: new Date().toISOString(),
      port: 3006,
      name: 'vue-message-center'
    };
  }
}
```

#### 步骤3: 优化启动脚本
```json
// sub-apps/vue-app-1/package.json
{
  "scripts": {
    "dev": "vite --port 3006 --host 0.0.0.0",
    "dev:debug": "vite --port 3006 --host 0.0.0.0 --debug",
    "build": "vite build",
    "preview": "vite preview --port 3006",
    "health": "node scripts/health-check.js"
  }
}
```

#### 步骤4: 创建健康检查脚本
```javascript
// sub-apps/vue-app-1/scripts/health-check.js
const http = require('http');

function checkHealth() {
  const options = {
    hostname: 'localhost',
    port: 3006,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Vue应用健康检查通过 - 状态码: ${res.statusCode}`);
    console.log(`🌐 服务地址: http://localhost:3006`);
    console.log(`⏰ 检查时间: ${new Date().toISOString()}`);
    process.exit(0);
  });

  req.on('error', (err) => {
    console.error(`❌ Vue应用健康检查失败: ${err.message}`);
    console.log(`💡 请确保运行: npm run dev`);
    process.exit(1);
  });

  req.on('timeout', () => {
    console.error('❌ Vue应用健康检查超时');
    req.destroy();
    process.exit(1);
  });

  req.end();
}

checkHealth();
```

#### 步骤5: 增强主应用错误处理
```typescript
// 在main-app/src/micro-apps/setup.ts中增强fetch函数
fetch: (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString();
  globalLogger.info(`🌐 正在获取微应用资源: ${url}`);
  
  // 设置超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
  
  const fetchInit = {
    ...init,
    signal: controller.signal,
    headers: {
      ...init?.headers,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  };
  
  return window.fetch(input, fetchInit)
    .then(response => {
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      globalLogger.info(`✅ 成功获取微应用资源: ${url}`);
      return response;
    })
    .catch(error => {
      clearTimeout(timeoutId);
      
      // 详细的错误分析
      let errorMessage = `❌ 获取微应用资源失败: ${url}\n`;
      
      if (error.name === 'AbortError') {
        errorMessage += '原因: 请求超时 (>10秒)\n';
        errorMessage += '建议: 检查子应用服务是否正常启动';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += '原因: 网络连接失败\n';
        errorMessage += '可能原因:\n';
        errorMessage += '  1. 子应用服务未启动\n';
        errorMessage += '  2. 端口3006未监听\n';
        errorMessage += '  3. CORS配置问题\n';
        errorMessage += '  4. 防火墙阻止连接\n';
        errorMessage += '解决方案:\n';
        errorMessage += '  1. 运行: cd sub-apps/vue-app-1 && npm run dev\n';
        errorMessage += '  2. 检查: npm run health\n';
        errorMessage += '  3. 验证: http://localhost:3006';
      } else {
        errorMessage += `原因: ${error.message}`;
      }
      
      globalLogger.error(errorMessage, error);
      throw new Error(errorMessage);
    });
}
```

### 5.3 修复步骤详细说明

#### 立即修复步骤
```bash
# 1. 停止可能运行的服务
pkill -f "vite --port 3006" || true

# 2. 进入Vue应用目录
cd sub-apps/vue-app-1

# 3. 安装依赖（如果需要）
npm install

# 4. 创建健康检查脚本目录
mkdir -p scripts

# 5. 启动Vue应用服务
npm run dev

# 6. 在新终端中验证服务状态
npm run health
```

#### 验证修复效果
```bash
# 1. 检查端口占用
netstat -an | grep :3006

# 2. 测试HTTP访问
node -e "
const http = require('http');
http.get('http://localhost:3006', (res) => {
  console.log('✅ 服务正常，状态码:', res.statusCode);
}).on('error', (err) => {
  console.error('❌ 服务异常:', err.message);
});
"

# 3. 在主应用中测试加载
# 启动主应用并访问 /message-center 路由
```

### 5.4 故障排除指南

#### 问题1: 端口被占用
```bash
# 查找占用端口的进程
lsof -i :3006

# 终止进程
kill -9 <PID>

# 或使用不同端口
npm run dev -- --port 3007
```

#### 问题2: 权限问题
```bash
# 检查文件权限
ls -la package.json vite.config.ts

# 修复权限
chmod +x package.json
chmod +x vite.config.ts
```

#### 问题3: 依赖问题
```bash
# 清理依赖
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 或使用yarn
yarn install
```

#### 问题4: Vite配置问题
```bash
# 验证配置语法
node -c vite.config.ts

# 使用默认配置启动
npx vite --port 3006
```

### 5.5 监控和维护

#### 自动健康检查脚本
```bash
#!/bin/bash
# scripts/monitor.sh

while true; do
  if ! curl -f http://localhost:3006 > /dev/null 2>&1; then
    echo "❌ 服务异常，尝试重启..."
    pkill -f "vite --port 3006"
    sleep 2
    cd sub-apps/vue-app-1
    npm run dev &
    sleep 5
  else
    echo "✅ 服务正常 - $(date)"
  fi
  sleep 30
done
```

#### 日志记录增强
```typescript
// 在main.ts中添加详细日志
console.log('🚀 Vue Message Center 启动信息:');
console.log('📍 端口:', 3006);
console.log('🌍 环境:', process.env.NODE_ENV);
console.log('⏰ 启动时间:', new Date().toISOString());
console.log('🔗 访问地址: http://localhost:3006');
```

通过以上完整的解决方案，应该能够彻底解决vue-message-center应用的网络请求失败问题，确保qiankun能够正常加载Vue子应用。