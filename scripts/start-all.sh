#!/bin/bash

# qiankun微前端项目统一启动脚本
# 支持一键启动所有应用，智能检测后端服务

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
            
            # 安装后端依赖（如果存在）
            if [ "$app" = "react-app-1" ] && [ -d "sub-apps/$app/backend" ] && [ -f "sub-apps/$app/tsconfig.backend.json" ]; then
                echo -e "${PURPLE}    - 安装 $app 后端依赖...${NC}"
                cd "sub-apps/$app/backend" && pnpm install && cd ../../..
            elif [ "$app" = "react-app-2" ] && [ -d "sub-apps/$app/bff" ] && [ -f "sub-apps/$app/bff/package.json" ]; then
                echo -e "${PURPLE}    - 安装 $app BFF依赖...${NC}"
                cd "sub-apps/$app/bff" && pnpm install && cd ../../..
            elif [ -d "sub-apps/$app/backend" ] && [ "$app" != "react-app-1" ] && [ "$app" != "react-app-2" ]; then
                echo -e "${PURPLE}    - 安装 $app 后端依赖...${NC}"
                cd "sub-apps/$app/backend" && pnpm install && cd ../../..
            fi
        fi
    done
    
    # 安装Vue子应用依赖
    echo -e "${CYAN}📦 安装Vue子应用依赖...${NC}"
    for app in vue-app-1 vue-app-2 vue-app-3; do
        if [ -d "sub-apps/$app" ]; then
            echo -e "${PURPLE}  - 安装 $app 依赖...${NC}"
            cd "sub-apps/$app" && pnpm install && cd ../..
            
            # 安装后端依赖（如果存在）
            if [ -d "sub-apps/$app/backend" ]; then
                echo -e "${PURPLE}    - 安装 $app 后端依赖...${NC}"
                cd "sub-apps/$app/backend" && pnpm install && cd ../../..
            fi
        fi
    done
    
    echo -e "${GREEN}✅ 所有依赖安装完成${NC}"
}

# 检测应用是否有后端服务
has_backend() {
    local app_path="$1"
    # 对于react-app-1，检查是否有tsconfig.backend.json和backend目录
    if [ "$app_path" = "sub-apps/react-app-1" ]; then
        if [ -d "$app_path/backend" ] && [ -f "$app_path/tsconfig.backend.json" ]; then
            return 0  # 有后端
        else
            return 1  # 无后端
        fi
    # 对于react-app-2，检查是否有bff目录
    elif [ "$app_path" = "sub-apps/react-app-2" ]; then
        if [ -d "$app_path/bff" ] && [ -f "$app_path/bff/package.json" ]; then
            return 0  # 有BFF后端
        else
            return 1  # 无后端
        fi
    # 对于其他应用，保持原有检测逻辑
    elif [ -d "$app_path/backend" ] && [ -f "$app_path/backend/package.json" ]; then
        return 0  # 有后端
    else
        return 1  # 无后端
    fi
}

# 健康检查函数
check_service_health() {
    local port="$1"
    local service_name="$2"
    local max_attempts=10
    local attempt=1
    
    echo -e "${BLUE}检查 $service_name (端口: $port) 健康状态...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if lsof -i :$port > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name 启动成功${NC}"
            return 0
        fi
        echo -e "${YELLOW}⏳ 等待 $service_name 启动... (尝试 $attempt/$max_attempts)${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name 启动失败或超时${NC}"
    return 1
}

# 启动应用（智能检测前后端）
start_app() {
    local app_name="$1"
    local app_path="$2"
    local frontend_port="$3"
    local backend_port="$4"
    local display_name="$5"
    
    if [ -d "$app_path" ]; then
        if has_backend "$app_path"; then
            echo -e "${PURPLE}  - 启动 $display_name (前端: $frontend_port, 后端: $backend_port)...${NC}"
            cd "$app_path"
            # 启动前端
            pnpm run dev > "../../logs/${app_name}-frontend.log" 2>&1 &
            # 启动后端
            if [ "$app_name" = "react-app-1" ]; then
                # react-app-1使用合并后的配置
                pnpm run dev:backend > "../../logs/${app_name}-backend.log" 2>&1 &
            elif [ "$app_name" = "react-app-2" ]; then
                # react-app-2使用BFF配置
                cd bff
                pnpm run dev > "../../../logs/${app_name}-bff.log" 2>&1 &
                cd ..
            elif [ -f "backend/package.json" ]; then
                # 其他应用使用原有方式
                cd backend
                pnpm run dev > "../../../logs/${app_name}-backend.log" 2>&1 &
                cd ..
            fi
            cd ../..
            sleep 3
        else
            echo -e "${PURPLE}  - 启动 $display_name (前端: $frontend_port)...${NC}"
            cd "$app_path"
            pnpm run dev > "../../logs/${app_name}-frontend.log" 2>&1 &
            cd ../..
            sleep 1
        fi
    fi
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
    
    # React App 1 - 用户管理 (前端: 3001, 后端: 3002)
    start_app "react-app-1" "sub-apps/react-app-1" "3001" "3002" "用户管理系统"
    
    # React App 2 - 商品管理 (前端: 3012, BFF: 3013)
    start_app "react-app-2" "sub-apps/react-app-2" "3012" "3013" "商品管理系统"
    
    # 等待React App 2的BFF服务启动
    if has_backend "sub-apps/react-app-2"; then
        echo -e "${BLUE}⏳ 等待React App 2 BFF服务启动...${NC}"
        sleep 5
        # 检查BFF健康状态
        if curl -s http://localhost:3013/api/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ React App 2 BFF服务启动成功${NC}"
        else
            echo -e "${YELLOW}⚠️  React App 2 BFF服务可能未完全启动，继续启动其他应用...${NC}"
        fi
    fi
    
    # React App 3 - 订单管理 (前端: 3003)
    start_app "react-app-3" "sub-apps/react-app-3" "3003" "" "订单管理系统"
    
    # React App 4 - 数据看板 (前端: 3004)
    start_app "react-app-4" "sub-apps/react-app-4" "3004" "" "数据看板"
    
    # React App 5 - 设置中心 (前端: 3005)
    start_app "react-app-5" "sub-apps/react-app-5" "3005" "" "设置中心"
    
    # 启动Vue子应用
    echo -e "${CYAN}🚀 启动Vue子应用...${NC}"
    
    # Vue App 1 - 消息中心 (前端: 3006)
    start_app "vue-app-1" "sub-apps/vue-app-1" "3006" "" "消息中心"
    
    # Vue App 2 - 文件管理 (前端: 3007)
    start_app "vue-app-2" "sub-apps/vue-app-2" "3007" "" "文件管理"
    
    # Vue App 3 - 系统监控 (前端: 3008)
    start_app "vue-app-3" "sub-apps/vue-app-3" "3008" "" "系统监控"
    
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
    
    # 检查并显示每个应用的状态
    if [ -d "sub-apps/react-app-1" ]; then
        if has_backend "sub-apps/react-app-1"; then
            echo -e "  用户管理系统:      http://localhost:3001 (API: 3002)"
        else
            echo -e "  用户管理系统:      http://localhost:3001"
        fi
    fi
    
    if [ -d "sub-apps/react-app-2" ]; then
        if has_backend "sub-apps/react-app-2"; then
            echo -e "  商品管理系统:      http://localhost:3012 (BFF: 3013)"
        else
            echo -e "  商品管理系统:      http://localhost:3012"
        fi
    fi
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
    echo -e "${PURPLE}📊 前端日志: *-frontend.log, 后端日志: *-backend.log${NC}"
    echo ""
}

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 正在停止所有应用...${NC}"
    
    # 杀死所有相关进程
    pkill -f "vite.*--port 300" 2>/dev/null || true
    pkill -f "pnpm.*dev" 2>/dev/null || true
    pkill -f "tsx.*app.ts" 2>/dev/null || true
    pkill -f "next.*dev.*3013" 2>/dev/null || true  # 停止react-app-2的BFF服务
    
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