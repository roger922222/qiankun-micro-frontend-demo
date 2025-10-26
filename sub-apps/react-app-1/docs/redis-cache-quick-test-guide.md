# Redis缓存验证和测试快速指南

## 🚀 快速开始

### 1. 启动Redis服务

**macOS**: 
```bash
brew services start redis
```

**Linux**:
```bash
sudo systemctl start redis-server
```

**Docker**:
```bash
docker run -d --name redis-cache -p 6379:6379 redis:latest
```

### 2. 启动后端服务

```bash
cd /Users/bytedance/Downloads/qiankun-micro-frontend-demo/sub-apps/react-app-1/backend
npm run dev
```

### 3. 验证Redis连接

**浏览器访问**：
```
http://localhost:3002/health/redis
```

**预期结果**：
```json
{
  "status": "healthy",
  "redis": "connected",
  "timestamp": "2025-10-21T11:29:55.490Z"
}
```

## 🧪 缓存功能测试

### 测试1：用户列表缓存

**首次访问**（缓存未命中）：
```
http://localhost:3002/api/users
```

**响应头**：
```
X-Cache: MISS
X-Cache-Key: cache:users:list:{}
```

**再次访问**（缓存命中）：
```
X-Cache: HIT
X-Cache-Key: cache:users:list:{}
```

### 测试2：用户详情缓存

**访问用户详情**：
```
http://localhost:3002/api/users/1
```

**验证缓存**：
```bash
# 第一次访问
curl -I http://localhost:3002/api/users/1

# 第二次访问（应该命中缓存）
curl -I http://localhost:3002/api/users/1
```

### 测试3：缓存清理测试

**创建用户**（触发缓存清理）：
```bash
curl -X POST http://localhost:3002/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456"}'
```

**验证缓存清理**：
```bash
# 再次访问用户列表，应该返回MISS
curl -I http://localhost:3002/api/users
```

## 📊 性能监控

### 查看缓存指标

**浏览器访问**：
```
http://localhost:3002/api/cache/metrics
```

**预期响应**：
```json
{
  "success": true,
  "data": {
    "metrics": {
      "hits": 150,
      "misses": 20,
      "hitRate": 88.2,
      "totalRequests": 170
    }
  }
}
```

### 重置监控指标

```bash
curl -X POST http://localhost:3002/api/cache/metrics/reset
```

## 🔍 使用Chrome开发者工具

### 步骤：
1. 打开Chrome浏览器
2. 访问 `http://localhost:3002/api/users`
3. 按F12打开开发者工具
4. 切换到Network标签
5. 查看响应头中的`X-Cache`字段
6. 多次刷新页面观察缓存状态变化

### 查看响应头：
```
General:
  Request URL: http://localhost:3002/api/users
  
Response Headers:
  X-Cache: HIT
  X-Cache-Key: cache:users:list:{}
  X-Cache-Health: healthy
```

## 🐛 常见问题排查

### Redis连接失败

**症状**：访问 `/health/redis` 返回 disconnected

**解决**：
```bash
# 检查Redis是否运行
redis-cli ping

# 如果未运行，启动Redis
brew services start redis  # macOS
sudo systemctl start redis-server  # Linux
```

### 缓存不生效

**症状**：每次请求都返回 `X-Cache: MISS`

**排查**：
1. 确认Redis连接正常
2. 检查控制台是否有缓存相关日志
3. 验证缓存键生成是否正确

### 性能没有改善

**检查点**：
1. 缓存命中率是否 > 80%
2. 响应时间是否减少50%+
3. 数据库查询是否减少

## 📈 预期性能提升

- **响应时间**: 减少50-80%
- **数据库负载**: 降低60-80%
- **缓存命中率**: >85%
- **并发处理能力**: 提升3-5倍

## 🔗 相关端点

| 端点 | 用途 | 状态 |
|-----|------|------|
| `/health` | 基础健康检查 | ✅ |
| `/health/redis` | Redis连接状态 | ✅ |
| `/api/cache/metrics` | 缓存性能指标 | ✅ |
| `/api/users` | 用户列表（带缓存） | ✅ |
| `/api/users/:id` | 用户详情（带缓存） | ✅ |

## 📋 验证清单

- [ ] Redis连接成功
- [ ] 用户列表缓存生效
- [ ] 用户详情缓存生效
- [ ] 缓存清理机制正常
- [ ] 性能监控指标正确
- [ ] 命中率达到80%+

---

**快速验证命令**：
```bash
# 一键验证脚本
echo "=== Redis连接检查 ===" && \
curl -s http://localhost:3002/health/redis | jq && \
echo "\n=== 缓存功能测试 ===" && \
curl -s -I http://localhost:3002/api/users | grep X-Cache && \
echo "\n=== 性能指标 ===" && \
curl -s http://localhost:3002/api/cache/metrics | jq '.data.metrics.hitRate'
```