#!/bin/bash

# React App 2 完整启动脚本（包含BFF）

echo "🚀 启动 React App 2（包含BFF服务）..."

# 启动BFF服务
echo "📡 启动 BFF 服务..."
cd bff
npm install
npm run dev &
BFF_PID=$!
cd ..

# 等待BFF服务启动
echo "⏳ 等待 BFF 服务启动..."
sleep 5

# 检查BFF服务是否启动成功
if curl -s http://localhost:3013/api/health >/dev/null ; then
    echo "✅ BFF 服务启动成功！"
else
    echo "❌ BFF 服务启动失败，继续启动前端..."
fi

# 启动前端应用
echo "🌐 启动前端应用..."
npm install
npm run dev &
FRONTEND_PID=$!

echo "✅ React App 2 启动完成！"
echo "🌐 前端地址: http://localhost:3012"
echo "📡 BFF API: http://localhost:3013"
echo "📊 BFF 健康检查: http://localhost:3013/api/health"
echo ""
echo "📝 按 Ctrl+C 停止所有服务"

# 捕获Ctrl+C并停止所有服务
trap 'kill $BFF_PID $FRONTEND_PID 2>/dev/null; exit' INT

# 等待任意子进程退出
wait