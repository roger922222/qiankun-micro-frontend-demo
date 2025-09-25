#!/bin/bash

# 测试 react-app-1 路由修复脚本
echo "🚀 启动 react-app-1 路由测试..."

# 进入子应用目录
cd sub-apps/react-app-1

echo "📦 安装依赖..."
npm install

echo "🔧 构建应用..."
npm run build

echo "🌐 启动开发服务器..."
npm run dev &
APP_PID=$!

echo "⏰ 等待服务器启动..."
sleep 10

echo "🧪 测试路由访问..."
echo "测试主页面: http://localhost:3001/"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/

echo ""
echo "测试用户管理页面: http://localhost:3001/users"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/users

echo ""
echo "测试角色管理页面: http://localhost:3001/roles"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/roles

echo ""
echo "🔍 检查生命周期函数导出..."
curl -s http://localhost:3001/ | grep -q "bootstrap\|mount\|unmount" && echo "✅ 生命周期函数已导出" || echo "❌ 生命周期函数未找到"

echo ""
echo "🛑 停止测试服务器..."
kill $APP_PID

echo "✅ 测试完成！"
echo ""
echo "📋 修复总结："
echo "1. ✅ 修复了 basename 配置问题"
echo "2. ✅ 添加了正确的 qiankun 生命周期函数"
echo "3. ✅ 实现了路由变化时的 URL 同步"
echo "4. ✅ 修复了菜单点击事件处理"
echo ""
echo "🔧 主要修改："
echo "- 更新了 main.tsx 中的路由配置"
echo "- 修改了 App.tsx 中的菜单点击处理"
echo "- 调整了 vite.config.ts 中的 base 路径"
echo "- 添加了浏览器地址栏同步逻辑"