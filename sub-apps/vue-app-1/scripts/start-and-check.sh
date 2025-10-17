#!/bin/bash

echo "🚀 启动Vue应用服务..."

# 进入应用目录
cd "$(dirname "$0")/.."

# 停止可能运行的服务
echo "🔄 停止现有服务..."
pkill -f "vue-message-center" 2>/dev/null || true
sleep 2

# 启动服务
echo "▶️ 启动开发服务器..."
npm run dev &
SERVER_PID=$!

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 8

# 检查服务状态
echo "🔍 检查服务状态..."
node scripts/health-check.js

# 如果健康检查失败，尝试重启
if [ $? -ne 0 ]; then
    echo "⚠️ 服务启动失败，尝试重启..."
    kill $SERVER_PID 2>/dev/null || true
    sleep 2
    npm run dev &
    sleep 8
    node scripts/health-check.js
fi

echo "✅ Vue应用服务启动完成"