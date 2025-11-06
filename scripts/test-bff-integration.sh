#!/bin/bash

# 测试React App 2 BFF集成脚本
# 这个脚本用于验证BFF服务是否正确集成

echo "🧪 测试React App 2 BFF集成..."
echo "=================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查BFF目录是否存在
if [ -d "sub-apps/react-app-2/bff" ] && [ -f "sub-apps/react-app-2/bff/package.json" ]; then
    echo -e "${GREEN}✅ React App 2 BFF目录结构正确${NC}"
else
    echo -e "${RED}❌ React App 2 BFF目录不存在${NC}"
    exit 1
fi

# 检查BFF配置文件
echo -e "${BLUE}检查BFF配置文件...${NC}"
required_files=(
    "sub-apps/react-app-2/bff/package.json"
    "sub-apps/react-app-2/bff/next.config.js"
    "sub-apps/react-app-2/bff/tsconfig.json"
    "sub-apps/react-app-2/bff/pages/api/health.ts"
    "sub-apps/react-app-2/bff/pages/api/products/index.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✓ $file${NC}"
    else
        echo -e "${RED}  ✗ $file (缺失)${NC}"
    fi
done

# 检查前端集成文件
echo -e "${BLUE}检查前端BFF集成...${NC}"
frontend_files=(
    "sub-apps/react-app-2/src/services/bffApi.ts"
    "sub-apps/react-app-2/src/services/productApi.ts"
    "sub-apps/react-app-2/src/types/index.ts"
)

for file in "${frontend_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✓ $file${NC}"
    else
        echo -e "${RED}  ✗ $file (缺失)${NC}"
    fi
done

# 检查启动脚本
echo -e "${BLUE}检查启动脚本...${NC}"
if [ -f "sub-apps/react-app-2/start-with-bff.sh" ]; then
    echo -e "${GREEN}  ✓ BFF启动脚本存在${NC}"
else
    echo -e "${RED}  ✗ BFF启动脚本缺失${NC}"
fi

# 检查环境配置
echo -e "${BLUE}检查环境配置...${NC}"
if [ -f "sub-apps/react-app-2/.env.local" ]; then
    echo -e "${GREEN}  ✓ 前端环境配置存在${NC}"
else
    echo -e "${YELLOW}  ⚠ 前端环境配置缺失 (将使用默认值)${NC}"
fi

if [ -f "sub-apps/react-app-2/bff/.env.local" ]; then
    echo -e "${GREEN}  ✓ BFF环境配置存在${NC}"
else
    echo -e "${YELLOW}  ⚠ BFF环境配置缺失 (将使用默认值)${NC}"
fi

# 检查主启动脚本是否已更新
echo -e "${BLUE}检查主启动脚本集成...${NC}"
if grep -q "react-app-2.*bff" scripts/start-all.sh; then
    echo -e "${GREEN}  ✓ 主启动脚本已更新支持BFF${NC}"
else
    echo -e "${RED}  ✗ 主启动脚本未更新${NC}"
fi

echo ""
echo -e "${BLUE}BFF服务端口配置:${NC}"
echo -e "  前端应用: http://localhost:3012"
echo -e "  BFF服务:  http://localhost:3013"
echo -e "  健康检查: http://localhost:3013/api/health"

echo ""
echo -e "${GREEN}🎉 React App 2 BFF集成验证完成！${NC}"
echo ""
echo -e "${YELLOW}使用说明:${NC}"
echo -e "1. 运行 ./scripts/start-all.sh 启动所有应用（包含BFF）"
echo -e "2. 或运行 cd sub-apps/react-app-2 && ./start-with-bff.sh 单独启动"
echo -e "3. 访问 http://localhost:3012 查看商品管理系统"
echo -e "4. 访问 http://localhost:3013/api/health 检查BFF服务状态"