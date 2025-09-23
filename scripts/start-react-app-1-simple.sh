#!/bin/bash

# 启动 react-app-1 用户管理系统（前端+后端）的简单脚本

echo "🚀 启动 react-app-1 用户管理系统..."
echo "==================================="

# 检查依赖
echo "📦 检查依赖安装状态..."
if [ ! -d "sub-apps/react-app-1/node_modules" ]; then
    echo "正在安装前端依赖..."
    cd sub-apps/react-app-1 && npm install && cd ../..
fi

if [ ! -d "sub-apps/react-app-1/backend/node_modules" ]; then
    echo "正在安装后端依赖..."
    cd sub-apps/react-app-1/backend && npm install && cd ../../..
fi

# 创建日志目录
mkdir -p logs

# 启动后端服务
echo "🖥️  启动后端服务 (端口: 3002)..."
cd sub-apps/react-app-1/backend
npm run dev > ../../../logs/react-app-1-backend.log 2>&1 &
BACKEND_PID=$!
cd ../../..

# 等待后端启动
sleep 5

# 启动前端服务
echo "🌐 启动前端服务 (端口: 3001)..."
cd sub-apps/react-app-1
npm run dev > ../../../logs/react-app-1-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

echo ""
echo "✅ 服务启动完成！"
echo "==================================="
echo "🌐 前端应用: http://localhost:3001"
echo "🖥️  后端API: http://localhost:3002"
echo "📝 日志文件: ./logs/"
echo ""
echo "按 Ctrl+C 停止服务"

# 捕获Ctrl+C停止服务
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# 保持脚本运行
wait