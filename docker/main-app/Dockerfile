# 主应用Dockerfile
FROM node:18-alpine AS base

# 安装依赖
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制包文件
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 开发阶段
FROM base AS dev
ENV NODE_ENV=development
COPY . .
RUN npm install --include=dev
CMD ["npm", "run", "dev"]

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY . .
RUN npm install --include=dev
RUN npm run build

# 生产阶段
FROM nginx:alpine AS prod

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY docker/nginx/conf.d/default.conf /etc/nginx/conf.d/

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]