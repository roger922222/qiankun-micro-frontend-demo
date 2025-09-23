#!/bin/bash

# 启动 react-app-1 前后端服务的脚本
# 支持用户管理系统的独立启动

set -e

echo "🚀 启动 react-app-1 用户管理系统..."
echo "==================================="

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

# 检查依赖是否安装
check_dependencies() {
    echo -e "${BLUE}检查依赖安装状态...${NC}"
    
    # 检查前端依赖
    if [ ! -d "sub-apps/react-app-1/node_modules" ]; then
        echo -e "${YELLOW}⚠️  react-app-1 前端依赖未安装，正在安装...${NC}"
        cd sub-apps/react-app-1 && npm install && cd ../..
    fi
    
    # 检查后端依赖
    if [ ! -d "sub-apps/react-app-1/backend/node_modules" ]; then
        echo -e "${YELLOW}⚠️  react-app-1 后端依赖未安装，正在安装...${NC}"
        cd sub-apps/react-app-1/backend && npm install && cd ../../..
    fi
    
    echo -e "${GREEN}✅ 依赖检查完成${NC}"
}

# 创建日志目录
setup_logs() {
    echo -e "${BLUE}设置日志目录...${NC}"
    mkdir -p logs
    echo -e "${GREEN}✅ 日志目录已创建${NC}"
}

# 启动服务
start_services() {
    echo -e "${BLUE}启动服务...${NC}"
    
    # 启动后端服务 (端口: 3002)
    echo -e "${CYAN}🚀 启动后端服务 (端口: 3002)...${NC}"
    cd sub-apps/react-app-1/backend
    npm run dev > ../../../logs/react-app-1-backend.log 2>&1 &
    BACKEND_PID=$!
    cd ../../..
    
    # 等待后端服务启动
    sleep 3
    
    # 启动前端服务 (端口: 3001)
    echo -e "${CYAN}🚀 启动前端服务 (端口: 3001)...${NC}"
    cd sub-apps/react-app-1
    npm run dev > ../../../logs/react-app-1-frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ../..
    
    echo -e "${GREEN}✅ 服务启动完成${NC}"
}

# 显示状态
show_status() {
    echo ""
    echo -e "${BLUE}服务状态概览:${NC}"
    echo "=================================="
    echo -e "${GREEN}🌐 前端应用:${NC}        http://localhost:3001"
    echo -e "${GREEN}🖥️  后端API:${NC}        http://localhost:3002"
    echo ""
    echo -e "${YELLOW}📋 功能模块:${NC}"
    echo -e "  用户管理:          ✨ 完整CRUD操作"
    echo -e "  角色管理:          ✨ 权限分配"
    echo -e "  权限管理:          ✨ 权限控制"
    echo -e "  操作日志:          ✨ 审计追踪"
    echo -e "  导入导出:          ✨ Excel支持"
    echo ""
    echo -e "${GREEN}🎯 访问前端应用开始体验用户管理系统!${NC}"
    echo -e "${BLUE}📝 日志文件位置: ./logs/${NC}"
    echo ""
}

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 正在停止服务...${NC}"
    
    # 杀死所有相关进程
    pkill -f "react-app-1.*npm" 2>/dev/null || true
    pkill -f "react-app-1.*vite" 2>/dev/null || true
    pkill -f "react-app-1.*node" 2>/dev/null || true
    
    echo -e "${GREEN}✅ 服务已停止${NC}"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 主函数
main() {
    echo -e "${BLUE}react-app-1 用户管理系统启动器${NC}"
    echo -e "${BLUE}============================${NC}"
    
    # 检查环境
    check_node_version
    check_dependencies
    setup_logs
    
    # 启动服务
    start_services
    
    # 等待服务启动完成
    echo -e "${YELLOW}⏳ 等待服务启动完成...${NC}"
    sleep 5
    
    # 显示状态
    show_status
    
    # 保持脚本运行
    echo -e "${BLUE}按 Ctrl+C 停止服务${NC}"
    while true; do
        sleep 1
    done
}

# 执行主函数
main "$@"