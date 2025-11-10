#!/bin/sh
# React App 2 全栈应用启动脚本

set -e

echo "🚀 启动 React App 2 全栈应用..."

# 启动BFF后端服务
echo "📦 启动BFF服务..."
cd backend
npm run start &
BFF_PID=$!
echo "BFF服务PID: $BFF_PID"

# 等待BFF服务启动
echo "⏳ 等待BFF服务启动..."
sleep 5

# 检查BFF服务是否启动成功
if curl -f http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ BFF服务启动成功"
else
    echo "❌ BFF服务启动失败"
    exit 1
fi

# 启动前端服务
echo "🌐 启动前端服务..."
cd ../frontend
npm run preview -- --port 3012 &
FRONTEND_PID=$!
echo "前端服务PID: $FRONTEND_PID"

# 等待前端服务启动
echo "⏳ 等待前端服务启动..."
sleep 3

# 检查前端服务是否启动成功
if curl -f http://localhost:3012 > /dev/null 2>&1; then
    echo "✅ 前端服务启动成功"
else
    echo "❌ 前端服务启动失败"
    exit 1
fi

echo "🎉 React App 2 全栈应用启动完成！"
echo "📊 服务状态："
echo "  - BFF服务: http://localhost:3002"
echo "  - 前端服务: http://localhost:3012"
echo "  - API文档: http://localhost:3002/api/docs"

# 捕获退出信号，优雅关闭服务
cleanup() {
    echo "🛑 正在关闭服务..."
    kill $BFF_PID $FRONTEND_PID 2>/dev/null || true
    wait $BFF_PID $FRONTEND_PID 2>/dev/null || true
    echo "✅ 服务已关闭"
    exit 0
}

trap cleanup INT TERM

# 等待子进程
wait