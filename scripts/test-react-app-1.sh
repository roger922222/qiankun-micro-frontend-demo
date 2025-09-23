#!/bin/bash

# 快速测试 react-app-1 配置

echo "🔍 测试 react-app-1 配置..."
echo "=========================="

# 检查目录结构
echo "📁 检查目录结构..."
if [ -d "sub-apps/react-app-1/src" ] && [ -d "sub-apps/react-app-1/backend" ]; then
    echo "✅ 目录结构正确"
else
    echo "❌ 目录结构错误"
    exit 1
fi

# 检查关键文件
echo "📄 检查关键文件..."
key_files=(
    "sub-apps/react-app-1/package.json"
    "sub-apps/react-app-1/backend/package.json"
    "sub-apps/react-app-1/vite.config.ts"
    "sub-apps/react-app-1/src/main.tsx"
    "sub-apps/react-app-1/src/main-qiankun.tsx"
    "sub-apps/react-app-1/backend/src/app.ts"
)

for file in "${key_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
        exit 1
    fi
done

# 检查端口配置
echo "🔌 检查端口配置..."
if grep -q "port.*3001" sub-apps/react-app-1/package.json && grep -q "3002" sub-apps/react-app-1/backend/src/app.ts; then
    echo "✅ 端口配置正确（前端:3001，后端:3002）"
else
    echo "❌ 端口配置错误"
    exit 1
fi

echo ""
echo "🎉 所有配置检查通过！"
echo ""
echo "📋 可用命令："
echo "  npm run start              # 启动 react-app-1 前后端服务"
echo "  npm run start:all          # 启动所有微前端应用"
echo "  npm run start:react-app-1  # 仅启动 react-app-1 前后端服务"
echo ""
echo "🌐 服务地址："
echo "  前端应用: http://localhost:3001"
echo "  后端API:  http://localhost:3002"