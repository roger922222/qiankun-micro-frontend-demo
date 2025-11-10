# BFF服务Dockerfile
FROM node:18-alpine AS base

# 安装依赖
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 复制包文件
COPY package*.json ./
COPY tsconfig.json ./

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
FROM base AS prod
ENV NODE_ENV=production

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3002
ENV PORT=3002

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/api/health || exit 1

CMD ["node", "server.js"]