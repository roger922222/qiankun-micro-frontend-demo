#!/bin/bash

# qiankun微前端项目统一启动脚本
# 支持一键启动所有应用

set -e

echo "🚀 启动qiankun微前端项目..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 检查Node.js版本
check_node_version() {
    echo -e "${BLUE}检查Node.js版本...${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js未安装，请先安装Node.js 16+${NC}"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        echo -e "${RED}❌ Node.js版本过低，需要16+，当前版本: $(node -v)${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js版本检查通过: $(node -v)${NC}"
}

# 检查pnpm
check_pnpm() {
    echo -e "${BLUE}检查pnpm...${NC}"
    if ! command -v pnpm &> /dev/null; then
        echo -e "${YELLOW}⚠️  pnpm未安装，正在安装...${NC}"
        npm install -g pnpm
    fi
    echo -e "${GREEN}✅ pnpm可用: $(pnpm -v)${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${BLUE}安装项目依赖...${NC}"
    
    # 安装共享库依赖
    echo -e "${CYAN}📦 安装共享库依赖...${NC}"
    cd shared && pnpm install && cd ..
    
    # 安装主应用依赖
    echo -e "${CYAN}📦 安装主应用依赖...${NC}"
    cd main-app && pnpm install && cd ..
    
    # 安装React子应用依赖
    echo -e "${CYAN}📦 安装React子应用依赖...${NC}"
    for app in react-app-1 react-app-2 react-app-3 react-app-4 react-app-5; do
        if [ -d "sub-apps/$app" ]; then
            echo -e "${PURPLE}  - 安装 $app 依赖...${NC}"
            cd "sub-apps/$app" && pnpm install && cd ../..
        fi
    done
    
    # 安装Vue子应用依赖
    echo -e "${CYAN}📦 安装Vue子应用依赖...${NC}"
    for app in vue-app-1 vue-app-2 vue-app-3; do
        if [ -d "sub-apps/$app" ]; then
            echo -e "${PURPLE}  - 安装 $app 依赖...${NC}"
            cd "sub-apps/$app" && pnpm install && cd ../..
        fi
    done
    
    echo -e "${GREEN}✅ 所有依赖安装完成${NC}"
}

# 启动应用
start_applications() {
    echo -e "${BLUE}启动所有应用...${NC}"
    
    # 创建日志目录
    mkdir -p logs
    
    # 启动主应用
    echo -e "${CYAN}🚀 启动主应用 (端口: 3000)...${NC}"
    cd main-app
    pnpm run dev > ../logs/main-app.log 2>&1 &
    MAIN_PID=$!
    cd ..
    
    # 等待主应用启动
    sleep 3
    
    # 启动React子应用
    echo -e "${CYAN}🚀 启动React子应用...${NC}"
    
    # React App 1 - 用户管理 (端口: 3001)
    if [ -d "sub-apps/react-app-1" ]; then
        echo -e "${PURPLE}  - 启动用户管理系统 (端口: 3001)...${NC}"
        cd sub-apps/react-app-1
        pnpm run dev > ../../logs/react-app-1.log 2>&1 &
        cd ../..
        sleep 1
    fi
    
    # React App 2 - 商品管理 (端口: 3002)
    if [ -d "sub-apps/react-app-2" ]; then
        echo -e "${PURPLE}  - 启动商品管理系统 (端口: 3002)...${NC}"
        cd sub-apps/react-app-2
        pnpm run dev > ../../logs/react-app-2.log 2>&1 &
        cd ../..
        sleep 1
    fi
    
    # React App 3 - 订单管理 (端口: 3003)
    if [ -d "sub-apps/react-app-3" ]; then
        echo -e "${PURPLE}  - 启动订单管理系统 (端口: 3003)...${NC}"
        cd sub-apps/react-app-3
        pnpm run dev > ../../logs/react-app-3.log 2>&1 &
        cd ../..
        sleep 1
    fi
    
    # React App 4 - 数据看板 (端口: 3004)
    if [ -d "sub-apps/react-app-4" ]; then
        echo -e "${PURPLE}  - 启动数据看板 (端口: 3004)...${NC}"
        cd sub-apps/react-app-4
        pnpm run dev > ../../logs/react-app-4.log 2>&1 &
        cd ../..
        sleep 1
    fi
    
    # React App 5 - 设置中心 (端口: 3005)
    if [ -d "sub-apps/react-app-5" ]; then
        echo -e "${PURPLE}  - 启动设置中心 (端口: 3005)...${NC}"
        cd sub-apps/react-app-5
        pnpm run dev > ../../logs/react-app-5.log 2>&1 &
        cd ../..
        sleep 1
    fi
    
    # 启动Vue子应用
    echo -e "${CYAN}🚀 启动Vue子应用...${NC}"
    
    # Vue App 1 - 消息中心 (端口: 3006)
    if [ -d "sub-apps/vue-app-1" ]; then
        echo -e "${PURPLE}  - 启动消息中心 (端口: 3006)...${NC}"
        cd sub-apps/vue-app-1
        pnpm run dev > ../../logs/vue-app-1.log 2>&1 &
        cd ../..
        sleep 1
    fi
    
    # Vue App 2 - 文件管理 (端口: 3007)
    if [ -d "sub-apps/vue-app-2" ]; then
        echo -e "${PURPLE}  - 启动文件管理 (端口: 3007)...${NC}"
        cd sub-apps/vue-app-2
        pnpm run dev > ../../logs/vue-app-2.log 2>&1 &
        cd ../..
        sleep 1
    fi
    
    # Vue App 3 - 系统监控 (端口: 3008)
    if [ -d "sub-apps/vue-app-3" ]; then
        echo -e "${PURPLE}  - 启动系统监控 (端口: 3008)...${NC}"
        cd sub-apps/vue-app-3
        pnpm run dev > ../../logs/vue-app-3.log 2>&1 &
        cd ../..
        sleep 1
    fi
    
    echo -e "${GREEN}✅ 所有应用启动完成${NC}"
}

# 显示应用状态
show_status() {
    echo ""
    echo -e "${BLUE}应用状态概览:${NC}"
    echo "=================================="
    echo -e "${GREEN}🌐 主应用:${NC}          http://localhost:3000"
    echo ""
    echo -e "${YELLOW}📱 React子应用:${NC}"
    echo -e "  用户管理系统:      http://localhost:3001"
    echo -e "  商品管理系统:      http://localhost:3002"
    echo -e "  订单管理系统:      http://localhost:3003"
    echo -e "  数据看板:          http://localhost:3004"
    echo -e "  设置中心:          http://localhost:3005"
    echo ""
    echo -e "${CYAN}🎨 Vue子应用:${NC}"
    echo -e "  消息中心:          http://localhost:3006"
    echo -e "  文件管理:          http://localhost:3007"
    echo -e "  系统监控:          http://localhost:3008"
    echo ""
    echo -e "${PURPLE}📋 状态管理方案:${NC}"
    echo -e "  React App 1:       Redux Toolkit"
    echo -e "  React App 2:       Zustand"
    echo -e "  React App 3:       Context API"
    echo -e "  React App 4:       MobX"
    echo -e "  React App 5:       Valtio"
    echo -e "  Vue App 1:         Vuex"
    echo -e "  Vue App 2:         Pinia"
    echo -e "  Vue App 3:         Composition API"
    echo ""
    echo -e "${GREEN}🎯 访问主应用开始体验微前端架构!${NC}"
    echo -e "${BLUE}📝 日志文件位置: ./logs/${NC}"
    echo ""
}

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 正在停止所有应用...${NC}"
    
    # 杀死所有相关进程
    pkill -f "vite.*--port 300" 2>/dev/null || true
    pkill -f "pnpm.*dev" 2>/dev/null || true
    
    echo -e "${GREEN}✅ 所有应用已停止${NC}"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    echo -e "${BLUE}qiankun微前端项目启动器${NC}"
    echo -e "${BLUE}========================${NC}"
    
    # 检查环境
    check_node_version
    check_pnpm
    
    # 询问是否安装依赖
    read -p "是否需要安装/更新依赖? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_dependencies
    fi
    
    # 启动应用
    start_applications
    
    # 等待应用启动完成
    echo -e "${YELLOW}⏳ 等待应用启动完成...${NC}"
    sleep 5
    
    # 显示状态
    show_status
    
    # 保持脚本运行
    echo -e "${BLUE}按 Ctrl+C 停止所有应用${NC}"
    while true; do
        sleep 1
    done
}

# 执行主函数
main "$@"