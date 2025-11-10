# React App 2 全栈应用 - Dockerfile
# 前端 + BFF服务一体化部署

FROM node:18-alpine AS base

# 安装系统依赖
RUN apk add --no-cache libc6-compat curl

# 设置工作目录
WORKDIR /app

# 复制根package.json
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 前端构建阶段
FROM base AS frontend-builder
WORKDIR /app/frontend

# 复制前端文件
COPY frontend/package*.json ./
COPY frontend/ ./

# 安装前端依赖并构建
RUN npm ci && npm run build

# 后端构建阶段  
FROM base AS backend-builder
WORKDIR /app/backend

# 复制后端文件
COPY backend/package*.json ./
COPY backend/ ./

# 安装后端依赖并构建
RUN npm ci && npm run build

# 生产阶段
FROM node:18-alpine AS prod

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# 复制前端构建产物
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/package.json ./frontend/

# 复制后端构建产物
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/package.json ./backend/
COPY --from=backend-builder --chown=nextjs:nodejs /app/backend/node_modules ./backend/node_modules

# 复制启动脚本
COPY docker/start-fullstack.sh ./start.sh
RUN chmod +x ./start.sh

# 设置用户
USER nextjs

# 暴露端口
EXPOSE 3002 3012

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/api/health || exit 1

# 启动应用
CMD ["./start.sh"]