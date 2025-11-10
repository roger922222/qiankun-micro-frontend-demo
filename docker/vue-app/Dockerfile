# Vue应用Dockerfile
ARG APP_NAME
ARG APP_PORT

FROM node:18-alpine AS base

# 安装依赖
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制包文件
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY index.html ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 开发阶段
FROM base AS dev
ENV NODE_ENV=development
ENV VITE_APP_NAME=${APP_NAME}
ENV VITE_APP_PORT=${APP_PORT}
COPY . .
RUN npm install --include=dev
EXPOSE ${APP_PORT}
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
COPY docker/nginx/conf.d/vue-app.conf /etc/nginx/conf.d/default.conf

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE ${APP_PORT}
CMD ["nginx", "-g", "daemon off;"]