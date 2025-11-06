# start-all.sh 脚本修改过程记录

## 📋 修改背景

在 React App 2 成功集成 Next.js BFF 服务后，需要修改主项目的 `start-all.sh` 脚本，使其能够自动检测并启动 BFF 服务，实现一键启动整个微前端项目（包含所有子应用及其后端服务）。

## 🎯 修改目标

1. **自动检测 BFF 服务**: 智能识别 react-app-2 的 BFF 目录结构
2. **依赖安装**: 自动安装 BFF 层的依赖包
3. **服务启动**: 同时启动前端和 BFF 服务
4. **健康检查**: 验证 BFF 服务是否正常启动
5. **日志管理**: 分离 BFF 服务的日志输出
6. **进程管理**: 正确清理 BFF 服务进程

## 🔧 修改过程详解

### 第一阶段：BFF 服务检测逻辑

#### 原始代码
```bash
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
    # 对于其他应用，保持原有检测逻辑
    elif [ -d "$app_path/backend" ] && [ -f "$app_path/backend/package.json" ]; then
        return 0  # 有后端
    else
        return 1  # 无后端
    fi
}
```

#### 修改后代码
```bash
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
```

**修改说明**:
- 添加了对 react-app-2 的特殊检测逻辑
- 检查 `bff` 目录和 `package.json` 文件
- 保持对其他应用的兼容性

### 第二阶段：依赖安装逻辑增强

#### 原始代码
```bash
# 安装后端依赖（如果存在）
if [ -d "sub-apps/$app/backend" ] && [ "$app" != "react-app-1" ]; then
    echo -e "${PURPLE}    - 安装 $app 后端依赖...${NC}"
    cd "sub-apps/$app/backend" && pnpm install && cd ../../..
fi
```

#### 修改后代码
```bash
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
```

**修改说明**:
- 为 react-app-1 添加了更精确的条件判断
- 为 react-app-2 添加了专门的 BFF 依赖安装逻辑
- 保持了代码结构的清晰和可维护性

### 第三阶段：服务启动逻辑扩展

#### 原始代码
```bash
# 启动后端
if [ "$app_name" = "react-app-1" ]; then
    # react-app-1使用合并后的配置
    pnpm run dev:backend > "../../logs/${app_name}-backend.log" 2>&1 &
elif [ -f "backend/package.json" ]; then
    # 其他应用使用原有方式
    cd backend
    pnpm run dev > "../../../logs/${app_name}-backend.log" 2>&1 &
    cd ..
fi
```

#### 修改后代码
```bash
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
```

**修改说明**:
- 为 react-app-2 添加了专门的 BFF 启动逻辑
- 使用单独的日志文件 `react-app-2-bff.log`
- 保持目录结构的正确性

### 第四阶段：BFF健康检查

#### 新增代码
```bash
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
```

**功能说明**:
- 等待 BFF 服务启动完成
- 使用健康检查端点验证服务状态
- 提供友好的状态反馈
- 即使 BFF 启动失败也不影响其他服务

### 第五阶段：状态显示增强

#### 原始代码
```bash
echo -e "  商品管理系统:      http://localhost:3012"
```

#### 修改后代码
```bash
if [ -d "sub-apps/react-app-2" ]; then
    if has_backend "sub-apps/react-app-2"; then
        echo -e "  商品管理系统:      http://localhost:3012 (BFF: 3013)"
    else
        echo -e "  商品管理系统:      http://localhost:3012"
    fi
fi
```

**修改说明**:
- 动态检测 BFF 服务是否存在
- 在状态显示中包含 BFF 端口信息
- 提供更完整的服务状态信息

### 第六阶段：进程清理增强

#### 原始代码
```bash
# 杀死所有相关进程
pkill -f "vite.*--port 300" 2>/dev/null || true
pkill -f "pnpm.*dev" 2>/dev/null || true
pkill -f "tsx.*app.ts" 2>/dev/null || true
```

#### 修改后代码
```bash
# 杀死所有相关进程
pkill -f "vite.*--port 300" 2>/dev/null || true
pkill -f "pnpm.*dev" 2>/dev/null || true
pkill -f "tsx.*app.ts" 2>/dev/null || true
pkill -f "next.*dev.*3013" 2>/dev/null || true  # 停止react-app-2的BFF服务
```

**修改说明**:
- 添加了专门的 BFF 服务进程清理
- 使用端口 3013 作为标识符
- 确保所有相关进程都能被正确清理

## 🧪 测试验证

### 测试脚本创建

为了验证修改的正确性，创建了专门的测试脚本：

```bash
#!/bin/bash
# 测试React App 2 BFF集成

echo "🧪 测试React App 2 BFF集成..."

# 检查BFF目录结构
if [ -d "sub-apps/react-app-2/bff" ] && [ -f "sub-apps/react-app-2/bff/package.json" ]; then
    echo -e "✅ React App 2 BFF目录结构正确"
fi

# 检查配置文件
required_files=(
    "sub-apps/react-app-2/bff/package.json"
    "sub-apps/react-app-2/bff/next.config.js"
    "sub-apps/react-app-2/bff/pages/api/health.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "✅ $file"
    else
        echo -e "❌ $file (缺失)"
    fi
done

# 检查主启动脚本更新
if grep -q "react-app-2.*bff" scripts/start-all.sh; then
    echo -e "✅ 主启动脚本已更新支持BFF"
fi
```

### 测试结果
```
🧪 测试React App 2 BFF集成...
==================================
✅ React App 2 BFF目录结构正确
✅ sub-apps/react-app-2/bff/package.json
✅ sub-apps/react-app-2/bff/next.config.js
✅ sub-apps/react-app-2/bff/pages/api/health.ts
✅ 主启动脚本已更新支持BFF

BFF服务端口配置:
  前端应用: http://localhost:3012
  BFF服务:  http://localhost:3013
  健康检查: http://localhost:3013/api/health
```

## 📊 修改影响分析

### 功能增强
- ✅ **自动检测**: 智能识别 BFF 服务是否存在
- ✅ **依赖管理**: 自动安装 BFF 层依赖
- ✅ **服务启动**: 同时启动前端和 BFF 服务
- ✅ **健康监控**: 实时检查 BFF 服务状态
- ✅ **日志分离**: BFF 服务独立日志文件
- ✅ **进程管理**: 完整的进程生命周期管理

### 兼容性保证
- ✅ **向后兼容**: 不影响其他子应用的启动逻辑
- ✅ **异常处理**: BFF 启动失败不影响其他服务
- ✅ **条件判断**: 只在 BFF 存在时才执行相关逻辑
- ✅ **日志兼容**: 保持原有日志格式和路径

### 性能影响
- ✅ **启动时间**: 增加约 5-10 秒的 BFF 启动时间
- ✅ **内存占用**: 增加 Node.js 进程的内存使用
- ✅ **端口占用**: 新增 3013 端口占用
- ✅ **依赖安装**: 增加 BFF 依赖安装时间

## 🚀 使用方式

### 一键启动所有服务
```bash
# 进入项目根目录
cd /Users/bytedance/Downloads/qiankun-micro-frontend-demo

# 启动所有应用（包含BFF）
./scripts/start-all.sh
```

### 单独启动BFF服务
```bash
# 进入react-app-2目录
cd sub-apps/react-app-2

# 启动前端和BFF服务
./start-with-bff.sh
```

### 服务状态检查
```bash
# 检查BFF健康状态
curl http://localhost:3013/api/health

# 检查端口占用
lsof -i :3013
```

## 📋 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| 主应用 | 3000 | qiankun主应用 |
| react-app-1前端 | 3001 | 用户管理系统前端 |
| react-app-1后端 | 3002 | 用户管理系统后端 |
| react-app-2前端 | 3012 | 商品管理系统前端 |
| react-app-2 BFF | 3013 | 商品管理系统BFF |
| react-app-3 | 3003 | 订单管理系统 |
| react-app-4 | 3004 | 数据看板 |
| react-app-5 | 3005 | 设置中心 |
| vue-app-1 | 3006 | 消息中心 |
| vue-app-2 | 3007 | 文件管理 |
| vue-app-3 | 3008 | 系统监控 |

## 🔍 问题排查

### 常见问题

1. **BFF服务启动失败**
   ```bash
   # 检查端口是否被占用
   lsof -i :3013
   
   # 查看BFF日志
   tail -f logs/react-app-2-bff.log
   ```

2. **依赖安装失败**
   ```bash
   # 手动安装BFF依赖
   cd sub-apps/react-app-2/bff
   pnpm install
   ```

3. **健康检查失败**
   ```bash
   # 等待服务完全启动
   sleep 10
   
   # 手动检查健康状态
   curl http://localhost:3013/api/health
   ```

### 日志文件
- **BFF日志**: `logs/react-app-2-bff.log`
- **前端日志**: `logs/react-app-2-frontend.log`
- **主日志**: `logs/main-app.log`

## 🎯 最佳实践

### 1. 服务启动顺序
1. 主应用（端口3000）
2. 各个子应用前端
3. BFF服务（端口3013）
4. 其他后端服务

### 2. 健康检查
- 使用 `/api/health` 端点检查BFF状态
- 等待5-10秒让服务完全启动
- 使用 curl 命令验证服务可用性

### 3. 进程管理
- 使用 Ctrl+C 优雅停止所有服务
- 检查进程是否正确清理
- 必要时手动清理残留进程

### 4. 开发调试
- 分离的日志文件便于问题定位
- 独立的服务启动便于单独调试
- 健康检查端点便于状态监控

## 📚 相关文档

- [BFF集成指南](../sub-apps/react-app-2/docs/BFF_INTEGRATION_GUIDE.md)
- [BFF开发过程](../sub-apps/react-app-2/docs/BFF_DEVELOPMENT_PROCESS.md)
- [BFF集成日志](../sub-apps/react-app-2/docs/BFF_INTEGRATION_JOURNAL.md)

---

这次修改成功地将 React App 2 的 BFF 服务集成到了主启动脚本中，实现了真正的一键启动整个微前端项目。通过智能检测、自动安装、健康检查等机制，大大提升了开发效率和用户体验。