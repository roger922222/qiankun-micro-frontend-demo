#!/usr/bin/env node

/**
 * Qiankun Monorepo 启动脚本
 * 支持智能检测和启动所有微前端应用
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// 端口配置
const PORT_CONFIG = {
  mainApp: 3000,
  reactApp1: 3001,
  reactApp2: 3012,
  reactApp2Bff: 3002,
  reactApp3: 3003,
  reactApp4: 3004,
  reactApp5: 3005,
  vueApp1: 3006,
  vueApp2: 3007,
  vueApp3: 3008
};

// 应用配置
const APPS = [
  {
    name: 'main-app',
    displayName: '主应用',
    path: 'apps/main-app',
    port: PORT_CONFIG.mainApp,
    healthCheck: 'http://localhost:3000',
    color: colors.blue
  },
  {
    name: 'react-app-1',
    displayName: 'React用户管理',
    path: 'apps/sub-apps/react-app-1',
    port: PORT_CONFIG.reactApp1,
    healthCheck: 'http://localhost:3001',
    color: colors.green
  },
  {
    name: 'react-app-2',
    displayName: 'React商品管理',
    path: 'apps/sub-apps/react-app-2',
    port: PORT_CONFIG.reactApp2,
    healthCheck: 'http://localhost:3012',
    color: colors.cyan
  },
  {
    name: 'react-app-2-bff',
    displayName: 'React商品管理BFF',
    path: 'apps/react-app-2-bff',
    port: PORT_CONFIG.reactApp2Bff,
    healthCheck: 'http://localhost:3002/api/health',
    color: colors.purple,
    optional: true
  },
  {
    name: 'react-app-3',
    displayName: 'React订单管理',
    path: 'apps/sub-apps/react-app-3',
    port: PORT_CONFIG.reactApp3,
    healthCheck: 'http://localhost:3003',
    color: colors.yellow
  },
  {
    name: 'react-app-4',
    displayName: 'React数据看板',
    path: 'apps/sub-apps/react-app-4',
    port: PORT_CONFIG.reactApp4,
    healthCheck: 'http://localhost:3004',
    color: colors.white
  },
  {
    name: 'react-app-5',
    displayName: 'React设置中心',
    path: 'apps/sub-apps/react-app-5',
    port: PORT_CONFIG.reactApp5,
    healthCheck: 'http://localhost:3005',
    color: colors.bright
  },
  {
    name: 'vue-app-1',
    displayName: 'Vue消息中心',
    path: 'apps/sub-apps/vue-app-1',
    port: PORT_CONFIG.vueApp1,
    healthCheck: 'http://localhost:3006',
    color: colors.green
  },
  {
    name: 'vue-app-2',
    displayName: 'Vue文件管理',
    path: 'apps/sub-apps/vue-app-2',
    port: PORT_CONFIG.vueApp2,
    healthCheck: 'http://localhost:3007',
    color: colors.cyan
  },
  {
    name: 'vue-app-3',
    displayName: 'Vue系统监控',
    path: 'apps/sub-apps/vue-app-3',
    port: PORT_CONFIG.vueApp3,
    healthCheck: 'http://localhost:3008',
    color: colors.yellow
  }
];

// 工具函数
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  console.error(`${colors.red}❌ ${message}${colors.reset}`);
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function warn(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

// 检查端口是否被占用
function checkPort(port) {
  try {
    execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// 检查应用是否存在
function appExists(appPath) {
  return fs.existsSync(appPath) && fs.existsSync(path.join(appPath, 'package.json'));
}

// 健康检查
async function healthCheck(url, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // 继续尝试
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

// 启动应用
async function startApp(app) {
  const appPath = path.join(process.cwd(), app.path);
  
  if (!appExists(appPath)) {
    if (app.optional) {
      warn(`可选应用 ${app.displayName} 不存在，跳过启动`);
      return { success: true, skipped: true };
    }
    error(`应用 ${app.displayName} 不存在: ${appPath}`);
    return { success: false, error: 'App not found' };
  }
  
  if (checkPort(app.port)) {
    error(`端口 ${app.port} 已被占用，无法启动 ${app.displayName}`);
    return { success: false, error: 'Port occupied' };
  }
  
  log(`正在启动 ${app.displayName}...`, app.color);
  
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', 'dev'], {
      cwd: appPath,
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      
      // 检测启动成功标志
      if (output.includes('ready') || output.includes('started') || output.includes('running')) {
        log(`${app.displayName} 启动成功！`, app.color);
        resolve({ success: true, pid: child.pid });
      }
    });
    
    child.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      
      // 忽略非关键错误
      if (errorOutput.includes('warning') || errorOutput.includes('deprecation')) {
        return;
      }
      
      error(`${app.displayName} 错误: ${errorOutput}`);
    });
    
    child.on('error', (error) => {
      error(`启动 ${app.displayName} 失败: ${error.message}`);
      resolve({ success: false, error: error.message });
    });
    
    child.on('exit', (code) => {
      if (code !== 0) {
        error(`${app.displayName} 异常退出，代码: ${code}`);
        resolve({ success: false, error: `Exit code: ${code}` });
      }
    });
    
    // 设置超时
    setTimeout(() => {
      if (!output.includes('ready') && !output.includes('started')) {
        warn(`${app.displayName} 启动超时，但进程仍在运行`);
        resolve({ success: true, pid: child.pid, timeout: true });
      }
    }, 15000);
  });
}

// 主函数
async function main() {
  log('🚀 启动 Qiankun Monorepo 微前端架构...', colors.bright);
  log(`工作目录: ${process.cwd()}`, colors.blue);
  
  const startTime = Date.now();
  const results = [];
  
  // 检查必要的依赖
  try {
    execSync('npm --version', { stdio: 'ignore' });
  } catch (error) {
    error('未找到 npm，请确保 Node.js 和 npm 已正确安装');
    process.exit(1);
  }
  
  // 按优先级分组启动
  const priorityGroups = [
    // 第一优先级：主应用和BFF服务
    APPS.filter(app => app.name === 'main-app' || app.name === 'react-app-2-bff'),
    // 第二优先级：React应用
    APPS.filter(app => app.name.startsWith('react-app-') && app.name !== 'react-app-2-bff'),
    // 第三优先级：Vue应用
    APPS.filter(app => app.name.startsWith('vue-app-'))
  ];
  
  for (const group of priorityGroups) {
    log(`\n📦 启动应用组: ${group.map(app => app.displayName).join(', ')}`, colors.cyan);
    
    const groupPromises = group.map(async (app) => {
      const result = await startApp(app);
      results.push({ app, ...result });
      return result;
    });
    
    const groupResults = await Promise.allSettled(groupPromises);
    
    // 等待健康检查
    log('\n🔍 进行健康检查...', colors.blue);
    for (const result of groupResults) {
      if (result.status === 'fulfilled' && result.value.success) {
        const app = group.find(a => a.name === result.value.app?.name);
        if (app && app.healthCheck) {
          log(`检查 ${app.displayName} 健康状态...`, app.color);
          const isHealthy = await healthCheck(app.healthCheck);
          
          if (isHealthy) {
            success(`${app.displayName} 健康检查通过！`);
          } else {
            error(`${app.displayName} 健康检查失败`);
          }
        }
      }
    }
    
    // 组间延迟
    if (group !== priorityGroups[priorityGroups.length - 1]) {
      log('\n⏱️  等待3秒继续启动下一组...', colors.yellow);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // 输出总结
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n📊 启动完成！总耗时: ${totalTime}s`, colors.bright);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  
  log(`\n✅ 成功启动: ${successful.length} 个应用`);
  successful.forEach(r => {
    log(`  - ${r.app.displayName} (端口: ${r.app.port})`, colors.green);
  });
  
  if (failed.length > 0) {
    log(`\n❌ 启动失败: ${failed.length} 个应用`);
    failed.forEach(r => {
      log(`  - ${r.app.displayName}: ${r.error}`, colors.red);
    });
  }
  
  if (skipped.length > 0) {
    log(`\n⚠️  跳过启动: ${skipped.length} 个应用`);
    skipped.forEach(r => {
      log(`  - ${r.app.displayName} (可选应用)`, colors.yellow);
    });
  }
  
  // 访问信息
  log('\n🌐 应用访问地址:', colors.cyan);
  successful.forEach(r => {
    log(`  ${r.app.displayName}: ${r.app.healthCheck}`, r.app.color);
  });
  
  log('\n💡 提示:', colors.blue);
  log('  - 按 Ctrl+C 停止所有应用');
  log('  - 查看日志文件: logs/*.log');
  log('  - 使用 npm run docker:up 启动容器化版本');
  
  // 保持进程运行
  process.on('SIGINT', () => {
    log('\n🛑 正在停止所有应用...', colors.yellow);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('\n🛑 正在停止所有应用...', colors.yellow);
    process.exit(0);
  });
}

// 错误处理
process.on('unhandledRejection', (error) => {
  error(`未处理的Promise拒绝: ${error}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  error(`未捕获的异常: ${error.message}`);
  process.exit(1);
});

// 运行主函数
main().catch((error) => {
  error(`启动脚本执行失败: ${error.message}`);
  process.exit(1);
});