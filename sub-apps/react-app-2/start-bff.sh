#!/bin/bash

# React App 2 BFF 启动脚本

echo "🚀 启动 React App 2 BFF 服务..."

# 检查端口是否被占用
if lsof -Pi :3013 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ 端口 3013 已被占用，请检查其他服务"
    exit 1
fi

# 安装依赖
echo "📦 安装 BFF 依赖..."
cd bff
npm install

# 启动 BFF 服务
echo "🚀 启动 BFF 服务..."
npm run dev &
BFF_PID=$!

# 等待服务启动
echo "⏳ 等待 BFF 服务启动..."
sleep 5

# 检查服务是否启动成功
if curl -s http://localhost:3013/api/health >/dev/null ; then
    echo "✅ BFF 服务启动成功！"
    echo "🌐 BFF API 地址: http://localhost:3013"
    echo "📊 健康检查: http://localhost:3013/api/health"
else
    echo "❌ BFF 服务启动失败"
    kill $BFF_PID 2>/dev/null
    exit 1
fi

# 保持脚本运行
echo "📝 BFF 服务正在运行，按 Ctrl+C 停止..."
wait $BFF_PID