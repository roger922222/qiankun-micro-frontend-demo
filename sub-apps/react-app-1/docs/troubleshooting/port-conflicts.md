# 端口冲突问题详解

## 1. 问题背景

### 1.1 冲突情况
在qiankun微前端项目中，多个子应用的端口分配出现冲突：

| 应用 | 组件 | 原端口 | 冲突状态 |
|------|------|--------|----------|
| react-app-1 | 前端 | 3001 | ✅ 正常 |
| react-app-1 | 后端 | 3002 | ❌ 冲突 |
| react-app-2 | 前端 | 3002 | ❌ 冲突 |
| react-app-2 | 后端 | 3003 | ✅ 正常 |

### 1.2 冲突原因
- 项目初期缺乏统一的端口分配规划
- 各子应用独立开发时未考虑端口协调
- 没有建立端口管理机制

## 2. 端口分配规范

### 2.1 新的端口分配方案
```
主应用 (main-app):
- 开发服务器: 8080
- 生产环境: 80/443

子应用端口规则: 30XY
- X: 应用编号 (1-9)
- Y: 服务类型 (1=前端, 2=后端, 3=测试)

具体分配:
react-app-1: 前端3011, 后端3012, 测试3013
react-app-2: 前端3021, 后端3022, 测试3023
react-app-3: 前端3031, 后端3032, 测试3033
react-app-4: 前端3041, 后端3042, 测试3043
react-app-5: 前端3051, 后端3052, 测试3053
vue-app-1:   前端3061, 后端3062, 测试3063
vue-app-2:   前端3071, 后端3072, 测试3073
vue-app-3:   前端3081, 后端3082, 测试3083
```

### 2.2 端口预留
```
开发工具端口:
- Webpack Dev Server: 3100-3199
- 代理服务器: 3200-3299
- 测试服务器: 3300-3399
- 数据库服务: 3400-3499
- 监控工具: 3500-3599
```

## 3. 解决方案实施

### 3.1 react-app-1 端口调整

#### 当前配置 (保持不变)
```json
// react-app-1/package.json
{
  "scripts": {
    "dev": "vite --port 3001",
    "dev:backend": "PORT=3002 nodemon backend/src/server.ts"
  }
}
```

#### 环境变量配置
```bash
# react-app-1/.env.development
VITE_PORT=3001
BACKEND_PORT=3002
VITE_API_BASE_URL=http://localhost:3002
```

### 3.2 react-app-2 端口调整

#### 修改前端端口
```json
// react-app-2/package.json
{
  "scripts": {
    "dev": "vite --port 3012",
    "dev:backend": "PORT=3013 nodemon backend/src/server.ts"
  }
}
```

#### 更新代理配置
```typescript
// react-app-2/vite.config.ts
export default defineConfig({
  server: {
    port: 3012,
    proxy: {
      '/api': {
        target: 'http://localhost:3013',
        changeOrigin: true,
      },
    },
  },
});
```

#### 环境变量配置
```bash
# react-app-2/.env.development
VITE_PORT=3012
BACKEND_PORT=3013
VITE_API_BASE_URL=http://localhost:3013
```

### 3.3 主应用配置更新

#### qiankun注册配置
```typescript
// main-app/src/micro-apps.ts
const apps = [
  {
    name: 'react-app-1',
    entry: '//localhost:3001',
    container: '#subapp-viewport',
    activeRule: '/react-app-1',
  },
  {
    name: 'react-app-2', 
    entry: '//localhost:3012', // 更新端口
    container: '#subapp-viewport',
    activeRule: '/react-app-2',
  },
];
```

## 4. 端口冲突检测

### 4.1 启动前检测脚本
```bash
#!/bin/bash
# scripts/check-ports.sh

check_port() {
  local port=$1
  local service=$2
  
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ 端口 $port ($service) 已被占用"
    lsof -Pi :$port -sTCP:LISTEN
    return 1
  else
    echo "✅ 端口 $port ($service) 可用"
    return 0
  fi
}

echo "检查端口占用情况..."

# 检查主要端口
check_port 8080 "主应用"
check_port 3001 "react-app-1前端"
check_port 3002 "react-app-1后端"
check_port 3012 "react-app-2前端"
check_port 3013 "react-app-2后端"

echo "端口检查完成"
```

### 4.2 Node.js端口检测
```javascript
// scripts/port-checker.js
const net = require('net');

function checkPort(port, host = 'localhost') {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, host, () => {
      server.once('close', () => {
        resolve(true); // 端口可用
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false); // 端口被占用
    });
  });
}

async function checkPorts() {
  const ports = [
    { port: 8080, name: '主应用' },
    { port: 3001, name: 'react-app-1前端' },
    { port: 3002, name: 'react-app-1后端' },
    { port: 3012, name: 'react-app-2前端' },
    { port: 3013, name: 'react-app-2后端' },
  ];

  console.log('检查端口占用情况...\n');

  for (const { port, name } of ports) {
    const isAvailable = await checkPort(port);
    const status = isAvailable ? '✅ 可用' : '❌ 占用';
    console.log(`端口 ${port} (${name}): ${status}`);
  }
}

checkPorts();
```

### 4.3 自动端口分配
```javascript
// scripts/auto-port.js
const net = require('net');

async function findAvailablePort(startPort, endPort = startPort + 100) {
  for (let port = startPort; port <= endPort; port++) {
    const isAvailable = await checkPort(port);
    if (isAvailable) {
      return port;
    }
  }
  throw new Error(`无法在 ${startPort}-${endPort} 范围内找到可用端口`);
}

// 使用示例
findAvailablePort(3000).then(port => {
  console.log(`找到可用端口: ${port}`);
  process.env.PORT = port;
});
```

## 5. 启动脚本优化

### 5.1 统一启动脚本
```bash
#!/bin/bash
# scripts/start-all.sh

set -e

echo "🚀 启动qiankun微前端项目"

# 检查端口
echo "📋 检查端口占用..."
./scripts/check-ports.sh

# 启动主应用
echo "🏠 启动主应用 (端口8080)..."
cd main-app
npm run dev &
MAIN_PID=$!

# 等待主应用启动
sleep 3

# 启动react-app-1
echo "⚛️  启动react-app-1 (前端3001, 后端3002)..."
cd ../sub-apps/react-app-1
npm run dev:all &
APP1_PID=$!

# 启动react-app-2
echo "⚛️  启动react-app-2 (前端3012, 后端3013)..."
cd ../react-app-2
npm run dev:all &
APP2_PID=$!

# 保存进程ID
echo $MAIN_PID > .main.pid
echo $APP1_PID > .app1.pid
echo $APP2_PID > .app2.pid

echo "✅ 所有服务已启动"
echo "📱 主应用: http://localhost:8080"
echo "🔧 react-app-1: http://localhost:3001"
echo "🔧 react-app-2: http://localhost:3012"

# 等待用户输入停止
read -p "按Enter键停止所有服务..."

# 停止所有服务
kill $MAIN_PID $APP1_PID $APP2_PID 2>/dev/null || true
rm -f .*.pid

echo "🛑 所有服务已停止"
```

### 5.2 单独启动脚本
```bash
#!/bin/bash
# scripts/start-react-app-1.sh

echo "🚀 启动react-app-1"

# 检查端口
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
  echo "❌ 端口3001被占用，请先停止相关服务"
  exit 1
fi

if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null ; then
  echo "❌ 端口3002被占用，请先停止相关服务"
  exit 1
fi

cd sub-apps/react-app-1

echo "📦 安装依赖..."
npm install

echo "🔧 启动开发服务器..."
npm run dev:all

echo "✅ react-app-1已启动"
echo "🌐 前端: http://localhost:3001"
echo "🔌 后端: http://localhost:3002"
```

## 6. 配置文件管理

### 6.1 端口配置文件
```json
// config/ports.json
{
  "main-app": {
    "dev": 8080,
    "prod": 80
  },
  "sub-apps": {
    "react-app-1": {
      "frontend": 3001,
      "backend": 3002,
      "test": 3003
    },
    "react-app-2": {
      "frontend": 3012,
      "backend": 3013,
      "test": 3014
    },
    "react-app-3": {
      "frontend": 3021,
      "backend": 3022,
      "test": 3023
    }
  },
  "reserved": {
    "dev-tools": "3100-3199",
    "proxy": "3200-3299",
    "test": "3300-3399",
    "database": "3400-3499",
    "monitoring": "3500-3599"
  }
}
```

### 6.2 动态端口配置
```javascript
// config/port-manager.js
const fs = require('fs');
const path = require('path');

class PortManager {
  constructor() {
    this.configPath = path.join(__dirname, 'ports.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    } catch (error) {
      throw new Error(`无法加载端口配置: ${error.message}`);
    }
  }

  getPort(app, service) {
    const appConfig = this.config['sub-apps'][app];
    if (!appConfig) {
      throw new Error(`未找到应用 ${app} 的配置`);
    }
    
    const port = appConfig[service];
    if (!port) {
      throw new Error(`未找到应用 ${app} 的 ${service} 端口配置`);
    }
    
    return port;
  }

  getAllPorts() {
    const ports = [];
    
    // 主应用端口
    ports.push({
      app: 'main-app',
      service: 'dev',
      port: this.config['main-app'].dev
    });

    // 子应用端口
    Object.entries(this.config['sub-apps']).forEach(([app, config]) => {
      Object.entries(config).forEach(([service, port]) => {
        ports.push({ app, service, port });
      });
    });

    return ports;
  }

  validatePorts() {
    const ports = this.getAllPorts();
    const usedPorts = new Set();
    const conflicts = [];

    ports.forEach(({ app, service, port }) => {
      if (usedPorts.has(port)) {
        conflicts.push({ app, service, port });
      } else {
        usedPorts.add(port);
      }
    });

    return {
      isValid: conflicts.length === 0,
      conflicts
    };
  }
}

module.exports = PortManager;
```

## 7. 监控和告警

### 7.1 端口监控脚本
```bash
#!/bin/bash
# scripts/monitor-ports.sh

PORTS=(8080 3001 3002 3012 3013)
LOG_FILE="logs/port-monitor.log"

mkdir -p logs

while true; do
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  for port in "${PORTS[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
      status="ACTIVE"
    else
      status="INACTIVE"
    fi
    
    echo "[$timestamp] Port $port: $status" >> $LOG_FILE
    
    if [ "$status" = "INACTIVE" ]; then
      echo "⚠️  警告: 端口 $port 服务已停止" | tee -a $LOG_FILE
    fi
  done
  
  sleep 30
done
```

### 7.2 健康检查
```javascript
// scripts/health-check.js
const http = require('http');

const services = [
  { name: '主应用', url: 'http://localhost:8080' },
  { name: 'react-app-1前端', url: 'http://localhost:3001' },
  { name: 'react-app-1后端', url: 'http://localhost:3002/api/health' },
  { name: 'react-app-2前端', url: 'http://localhost:3012' },
  { name: 'react-app-2后端', url: 'http://localhost:3013/api/health' },
];

async function checkService(service) {
  return new Promise((resolve) => {
    const url = new URL(service.url);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      resolve({
        ...service,
        status: res.statusCode < 400 ? 'healthy' : 'unhealthy',
        statusCode: res.statusCode,
      });
    });

    req.on('error', () => {
      resolve({
        ...service,
        status: 'error',
        statusCode: null,
      });
    });

    req.on('timeout', () => {
      resolve({
        ...service,
        status: 'timeout',
        statusCode: null,
      });
    });

    req.end();
  });
}

async function healthCheck() {
  console.log('🏥 执行健康检查...\n');

  const results = await Promise.all(services.map(checkService));

  results.forEach(({ name, status, statusCode, url }) => {
    const icon = status === 'healthy' ? '✅' : '❌';
    const statusText = statusCode ? `(${statusCode})` : '';
    console.log(`${icon} ${name}: ${status} ${statusText}`);
    console.log(`   ${url}\n`);
  });

  const healthyCount = results.filter(r => r.status === 'healthy').length;
  console.log(`📊 健康状态: ${healthyCount}/${results.length} 服务正常`);

  return results;
}

// 如果直接运行此脚本
if (require.main === module) {
  healthCheck();
}

module.exports = { healthCheck };
```

## 8. 故障恢复

### 8.1 自动重启脚本
```bash
#!/bin/bash
# scripts/auto-restart.sh

SERVICE_NAME="react-app-1"
FRONTEND_PORT=3001
BACKEND_PORT=3002
MAX_RETRIES=3

check_and_restart() {
  local port=$1
  local service_type=$2
  local retry_count=0

  while [ $retry_count -lt $MAX_RETRIES ]; do
    if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "⚠️  检测到 $service_type (端口$port) 服务停止，尝试重启..."
      
      cd sub-apps/react-app-1
      
      if [ "$service_type" = "frontend" ]; then
        npm run dev &
      else
        npm run dev:backend &
      fi
      
      sleep 10
      
      if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ $service_type 服务重启成功"
        break
      else
        retry_count=$((retry_count + 1))
        echo "❌ $service_type 服务重启失败，重试 $retry_count/$MAX_RETRIES"
      fi
    fi
    
    sleep 30
  done
  
  if [ $retry_count -eq $MAX_RETRIES ]; then
    echo "🚨 $service_type 服务重启失败，已达到最大重试次数"
    # 发送告警通知
  fi
}

echo "🔄 启动自动重启监控..."

while true; do
  check_and_restart $FRONTEND_PORT "frontend"
  check_and_restart $BACKEND_PORT "backend"
  sleep 60
done
```

### 8.2 端口清理脚本
```bash
#!/bin/bash
# scripts/cleanup-ports.sh

PORTS=(3001 3002 3012 3013)

echo "🧹 清理端口占用..."

for port in "${PORTS[@]}"; do
  echo "检查端口 $port..."
  
  pids=$(lsof -ti:$port 2>/dev/null)
  
  if [ -n "$pids" ]; then
    echo "发现端口 $port 被以下进程占用:"
    lsof -i:$port
    
    read -p "是否终止这些进程? (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
      echo $pids | xargs kill -9
      echo "✅ 端口 $port 已清理"
    else
      echo "⏭️  跳过端口 $port"
    fi
  else
    echo "✅ 端口 $port 未被占用"
  fi
  
  echo ""
done

echo "🎉 端口清理完成"
```

## 9. 最佳实践

### 9.1 端口管理原则
1. **统一规划**: 项目开始前制定端口分配方案
2. **文档记录**: 维护端口分配表和使用说明
3. **自动检测**: 启动前自动检查端口冲突
4. **环境隔离**: 不同环境使用不同端口范围
5. **监控告警**: 实时监控端口状态

### 9.2 开发流程建议
1. **新应用**: 按规范分配端口，更新配置文档
2. **端口变更**: 需要团队评审和通知
3. **冲突解决**: 优先调整新应用端口
4. **测试验证**: 端口变更后进行完整测试

### 9.3 运维建议
1. **定期检查**: 定期检查端口使用情况
2. **清理僵尸进程**: 及时清理无用的端口占用
3. **备份配置**: 重要配置文件要有备份
4. **故障预案**: 制定端口冲突的应急处理方案