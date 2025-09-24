# 构建部署指南

## 1. 构建流程

### 1.1 开发环境构建
```bash
# 启动开发服务器
npm run dev:all

# 分别启动前后端
npm run dev          # 前端开发服务器 (端口3001)
npm run dev:backend  # 后端开发服务器 (端口3002)
```

### 1.2 生产环境构建
```bash
# 构建前端和后端
npm run build:all

# 分别构建
npm run build         # 构建前端到 dist/
npm run build:backend # 构建后端到 backend/dist/
```

### 1.3 构建输出结构
```
react-app-1/
├── dist/                    # 前端构建输出
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   ├── index-[hash].css
│   │   └── vendor-[hash].js
│   └── favicon.ico
└── backend/
    └── dist/                # 后端构建输出
        ├── server.js
        ├── controllers/
        ├── services/
        └── routes/
```

## 2. 构建配置

### 2.1 前端构建配置 (Vite)

#### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  
  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },

  // 开发服务器配置
  server: {
    port: 3001,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },

  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'es2015',
    
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          utils: ['lodash', 'dayjs'],
        },
      },
    },
    
    // 资源处理
    assetsDir: 'assets',
    assetsInlineLimit: 4096,
  },

  // 预览服务器配置
  preview: {
    port: 4173,
    host: true,
  },
});
```

#### 环境变量配置
```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3002
VITE_APP_TITLE=用户管理系统 (开发)
VITE_APP_VERSION=1.0.0-dev

# .env.production
VITE_API_BASE_URL=https://api.example.com
VITE_APP_TITLE=用户管理系统
VITE_APP_VERSION=1.0.0
```

### 2.2 后端构建配置 (TypeScript)

#### tsconfig.backend.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    
    // 输出配置
    "outDir": "./backend/dist",
    "rootDir": "./backend/src",
    "removeComments": true,
    "sourceMap": true,
    
    // 路径映射
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  },
  "include": [
    "backend/src/**/*",
    "shared/**/*"
  ],
  "exclude": [
    "backend/dist",
    "backend/node_modules",
    "src/**/*"
  ]
}
```

#### 构建脚本
```json
// package.json
{
  "scripts": {
    "build:backend": "tsc -p tsconfig.backend.json",
    "build:backend:watch": "tsc -p tsconfig.backend.json --watch",
    "build:backend:clean": "rm -rf backend/dist && npm run build:backend"
  }
}
```

## 3. 部署方案

### 3.1 静态文件部署 (前端)

#### Nginx配置
```nginx
# /etc/nginx/sites-available/react-app-1
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/react-app-1/dist;
    index index.html;

    # 处理SPA路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
    }

    # API代理
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
}
```

#### Apache配置
```apache
# .htaccess
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# 静态资源缓存
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

### 3.2 Node.js应用部署 (后端)

#### PM2配置
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'react-app-1-backend',
    script: './backend/dist/server.js',
    cwd: '/var/www/react-app-1',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3002,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
  }],
};
```

#### 部署脚本
```bash
#!/bin/bash
# deploy.sh

set -e

APP_NAME="react-app-1"
APP_DIR="/var/www/$APP_NAME"
BACKUP_DIR="/var/backups/$APP_NAME"

echo "开始部署 $APP_NAME..."

# 创建备份
echo "创建备份..."
mkdir -p $BACKUP_DIR
cp -r $APP_DIR $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)

# 拉取最新代码
echo "拉取最新代码..."
cd $APP_DIR
git pull origin main

# 安装依赖
echo "安装依赖..."
npm ci --production

# 构建应用
echo "构建应用..."
npm run build:all

# 重启后端服务
echo "重启后端服务..."
pm2 restart $APP_NAME-backend

# 重新加载Nginx
echo "重新加载Nginx..."
sudo nginx -t && sudo nginx -s reload

echo "部署完成！"
```

### 3.3 Docker部署

#### Dockerfile (前端)
```dockerfile
# Dockerfile.frontend
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Dockerfile (后端)
```dockerfile
# Dockerfile.backend
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci

COPY backend/ ./backend/
COPY shared/ ./shared/
RUN npm run build:backend

FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared ./shared

EXPOSE 3002
CMD ["node", "backend/dist/server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
    networks:
      - app-network
    restart: unless-stopped

networks:
  app-network:
    driver: bridge
```

## 4. CI/CD流程

### 4.1 GitHub Actions

#### .github/workflows/deploy.yml
```yaml
name: Deploy React App 1

on:
  push:
    branches: [ main ]
    paths: [ 'sub-apps/react-app-1/**' ]
  pull_request:
    branches: [ main ]
    paths: [ 'sub-apps/react-app-1/**' ]

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: sub-apps/react-app-1

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: sub-apps/react-app-1/package-lock.json

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run tests
      run: npm run test

    - name: Build application
      run: npm run build:all

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    defaults:
      run:
        working-directory: sub-apps/react-app-1

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build for production
      run: npm run build:all
      env:
        VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}

    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/react-app-1
          git pull origin main
          npm ci --production
          npm run build:all
          pm2 restart react-app-1-backend
          sudo nginx -s reload
```

### 4.2 GitLab CI

#### .gitlab-ci.yml
```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"
  APP_PATH: "sub-apps/react-app-1"

cache:
  paths:
    - $APP_PATH/node_modules/

test:
  stage: test
  image: node:$NODE_VERSION
  before_script:
    - cd $APP_PATH
    - npm ci
  script:
    - npm run lint
    - npm run test
    - npm run build:all
  only:
    changes:
      - sub-apps/react-app-1/**/*

build:
  stage: build
  image: node:$NODE_VERSION
  before_script:
    - cd $APP_PATH
    - npm ci
  script:
    - npm run build:all
  artifacts:
    paths:
      - $APP_PATH/dist/
      - $APP_PATH/backend/dist/
    expire_in: 1 hour
  only:
    - main

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
  script:
    - scp -r $APP_PATH/dist/ $SERVER_USER@$SERVER_HOST:/var/www/react-app-1/
    - scp -r $APP_PATH/backend/dist/ $SERVER_USER@$SERVER_HOST:/var/www/react-app-1/backend/
    - ssh $SERVER_USER@$SERVER_HOST "cd /var/www/react-app-1 && pm2 restart react-app-1-backend && sudo nginx -s reload"
  only:
    - main
```

## 5. 监控和日志

### 5.1 应用监控

#### 健康检查端点
```typescript
// backend/src/routes/health.ts
import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
  });
});

router.get('/ready', (req, res) => {
  // 检查数据库连接、外部服务等
  res.json({
    status: 'ready',
    checks: {
      database: 'ok',
      // 其他检查项
    },
  });
});

export default router;
```

#### PM2监控
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs react-app-1-backend

# 查看监控面板
pm2 monit

# 重启应用
pm2 restart react-app-1-backend

# 查看详细信息
pm2 show react-app-1-backend
```

### 5.2 日志管理

#### 日志配置
```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'react-app-1-backend' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

#### 日志轮转
```bash
# /etc/logrotate.d/react-app-1
/var/www/react-app-1/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 6. 性能优化

### 6.1 构建优化
```typescript
// vite.config.ts 生产环境优化
export default defineConfig({
  build: {
    // 启用gzip压缩
    rollupOptions: {
      output: {
        // 代码分割优化
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('antd')) {
              return 'antd';
            }
            if (id.includes('lodash') || id.includes('dayjs')) {
              return 'utils';
            }
            return 'vendor';
          }
        },
      },
    },
    
    // 压缩配置
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
```

### 6.2 服务器优化
```nginx
# Nginx性能优化
server {
    # 启用gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # 启用Brotli压缩 (如果支持)
    brotli on;
    brotli_comp_level 6;
    brotli_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        application/xml+rss
        text/javascript;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
    }
}
```

## 7. 故障排查

### 7.1 常见部署问题

#### 构建失败
```bash
# 检查Node.js版本
node --version

# 清理依赖重新安装
rm -rf node_modules package-lock.json
npm install

# 检查TypeScript配置
npx tsc --noEmit
```

#### 服务启动失败
```bash
# 检查端口占用
lsof -i :3002

# 检查PM2状态
pm2 status
pm2 logs react-app-1-backend --lines 100

# 检查系统资源
free -h
df -h
```

#### 前端访问404
```bash
# 检查Nginx配置
sudo nginx -t

# 检查文件权限
ls -la /var/www/react-app-1/dist/

# 检查Nginx日志
sudo tail -f /var/log/nginx/error.log
```

### 7.2 回滚方案
```bash
#!/bin/bash
# rollback.sh

BACKUP_DIR="/var/backups/react-app-1"
LATEST_BACKUP=$(ls -t $BACKUP_DIR | head -n1)

echo "回滚到备份: $LATEST_BACKUP"

# 停止服务
pm2 stop react-app-1-backend

# 恢复文件
cp -r $BACKUP_DIR/$LATEST_BACKUP/* /var/www/react-app-1/

# 重启服务
pm2 start react-app-1-backend
sudo nginx -s reload

echo "回滚完成！"
```