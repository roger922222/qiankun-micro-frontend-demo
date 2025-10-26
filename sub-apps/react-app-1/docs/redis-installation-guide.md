# Redis缓存实现 - 安装和配置指南

## 📦 Redis安装步骤

### macOS系统

#### 使用Homebrew安装
```bash
# 更新Homebrew
brew update

# 安装Redis
brew install redis

# 启动Redis服务
brew services start redis

# 验证安装
redis-cli ping
# 应该返回: PONG
```

#### 验证Redis运行状态
```bash
# 检查服务状态
brew services list | grep redis

# 查看Redis版本
redis-server --version

# 连接测试
redis-cli
127.0.0.1:6379> info
127.0.0.1:6379> exit
```

### Linux系统 (Ubuntu/Debian)

#### 安装Redis
```bash
# 更新包列表
sudo apt-get update

# 安装Redis
sudo apt-get install redis-server

# 启动Redis服务
sudo systemctl start redis-server

# 设置开机自启
sudo systemctl enable redis-server

# 验证安装
redis-cli ping
```

#### 配置Redis
```bash
# 编辑配置文件
sudo nano /etc/redis/redis.conf

# 关键配置项：
# bind 127.0.0.1 ::1    # 绑定IP
# port 6379              # 端口
# maxmemory 256mb        # 最大内存
# maxmemory-policy allkeys-lru  # 内存淘汰策略

# 重启Redis
sudo systemctl restart redis-server
```

### Linux系统 (CentOS/RHEL)

#### 安装Redis
```bash
# 安装EPEL仓库
sudo yum install epel-release

# 安装Redis
sudo yum install redis

# 启动Redis
sudo systemctl start redis

# 设置开机自启
sudo systemctl enable redis

# 验证安装
redis-cli ping
```

### Windows系统

#### 使用Docker安装（推荐）
```bash
# 拉取Redis镜像
docker pull redis:latest

# 运行Redis容器
docker run -d --name redis-cache -p 6379:6379 redis:latest

# 验证容器运行
docker ps | grep redis

# 测试连接
docker exec -it redis-cache redis-cli ping
```

#### 直接安装Redis（Windows 10+）
```powershell
# 下载Redis for Windows
# 访问: https://github.com/microsoftarchive/redis/releases

# 解压到 C:\Redis
# 添加到系统PATH

# 启动Redis
redis-server.exe

# 测试连接（新终端）
redis-cli.exe ping
```

## 🔧 Redis配置优化

### 基础配置
```bash
# 编辑Redis配置文件
sudo nano /etc/redis/redis.conf

# 关键配置项
maxmemory 256mb                    # 设置最大内存
maxmemory-policy allkeys-lru       # 内存淘汰策略
timeout 300                        # 连接超时时间
tcp-keepalive 60                   # TCP保活时间

# 重启Redis应用配置
sudo systemctl restart redis-server
```

### 性能优化配置
```bash
# 高性能配置
save 900 1                         # 900秒内有1个key变化就保存
save 300 10                        # 300秒内有10个key变化就保存
save 60 10000                      # 60秒内有10000个key变化就保存

rdbcompression yes                 # 启用RDB压缩
rdbchecksum yes                    # 启用RDB校验

dbfilename dump.rdb                # RDB文件名
dir /var/lib/redis                 # 数据目录
```

### 安全配置
```bash
# 设置密码
requirepass your-strong-password

# 绑定特定IP
bind 127.0.0.1

# 禁用危险命令
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG "CONFIG_b6455f7d6a4488b3824a4e7b1b5f3c1d"
```

## 🚀 Node.js后端连接配置

### 环境变量配置
```bash
# 在项目根目录创建 .env 文件
touch .env

# 添加Redis配置
echo "REDIS_HOST=localhost" >> .env
echo "REDIS_PORT=6379" >> .env
echo "REDIS_PASSWORD=" >> .env
echo "REDIS_DB=0" >> .env
```

### 验证后端连接

#### 启动后端服务
```bash
cd /Users/bytedance/Downloads/qiankun-micro-frontend-demo/sub-apps/react-app-1/backend

# 安装依赖
npm install

# 启动服务
npm run dev
```

#### 检查连接日志
```bash
# 预期输出
✅ Redis连接成功
✅ 缓存管理器初始化成功
🚀 BFF服务器运行在端口 3002
🔍 健康检查: http://localhost:3002/health
🔍 Redis状态: http://localhost:3002/health/redis
```

#### 测试Redis连接
```bash
# 使用curl测试
curl http://localhost:3002/health/redis

# 预期响应
{"status":"healthy","redis":"connected","timestamp":"2025-10-21T11:29:55.490Z"}
```

## 📊 Redis监控和管理

### 使用redis-cli监控
```bash
# 连接Redis
redis-cli

# 查看基本信息
127.0.0.1:6379> info
127.0.0.1:6379> info memory
127.0.0.1:6379> info stats

# 查看当前连接
127.0.0.1:6379> client list

# 查看数据库大小
127.0.0.1:6379> dbsize

# 查看所有键
127.0.0.1:6379> keys *

# 退出
127.0.0.1:6379> exit
```

### 监控内存使用
```bash
# 查看内存使用情况
redis-cli info memory

# 输出示例
used_memory:1048576
used_memory_human:1.00M
used_memory_rss:2097152
used_memory_peak:2097152
maxmemory:268435456
maxmemory_human:256.00M
```

### 性能监控
```bash
# 实时监控命令
redis-cli monitor

# 查看慢查询
redis-cli slowlog get 10

# 查看统计信息
redis-cli info stats
```

## 🔍 故障排除

### Redis连接失败

#### 症状
```
⚠️ Redis连接失败，缓存功能将不可用: Error: connect ECONNREFUSED 127.0.0.1:6379
```

#### 解决方案
```bash
# 1. 检查Redis是否运行
redis-cli ping

# 2. 检查服务状态（Linux）
sudo systemctl status redis-server

# 3. 检查端口监听
netstat -an | grep 6379
lsof -i :6379

# 4. 检查防火墙
sudo iptables -L | grep 6379

# 5. 重启Redis服务
sudo systemctl restart redis-server
```

### 内存不足

#### 症状
```
OOM command not allowed when used memory > 'maxmemory'
```

#### 解决方案
```bash
# 1. 增加内存限制
redis-cli config set maxmemory 512mb

# 2. 清理缓存
redis-cli flushall

# 3. 优化内存淘汰策略
redis-cli config set maxmemory-policy allkeys-lru
```

### 连接数过多

#### 症状
```
Error: max number of clients reached
```

#### 解决方案
```bash
# 1. 查看当前连接数
redis-cli info clients

# 2. 增加最大连接数
redis-cli config set maxclients 10000

# 3. 关闭空闲连接
redis-cli client kill type normal
```

## 🧪 验证安装成功

### 完整验证流程
```bash
#!/bin/bash
echo "=== Redis安装验证 ==="

# 1. 检查Redis服务
echo "1. 检查Redis服务状态..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis服务运行正常"
else
    echo "❌ Redis服务未运行"
    exit 1
fi

# 2. 检查端口
echo "2. 检查端口监听..."
if netstat -an | grep -q ":6379"; then
    echo "✅ Redis端口正常监听"
else
    echo "❌ Redis端口未监听"
    exit 1
fi

# 3. 测试基本操作
echo "3. 测试基本操作..."
redis-cli set test_key "test_value" > /dev/null
if redis-cli get test_key | grep -q "test_value"; then
    echo "✅ Redis基本操作正常"
    redis-cli del test_key > /dev/null
else
    echo "❌ Redis基本操作失败"
    exit 1
fi

# 4. 测试后端连接
echo "4. 测试后端连接..."
if curl -s http://localhost:3002/health/redis | grep -q "connected"; then
    echo "✅ 后端Redis连接正常"
else
    echo "❌ 后端Redis连接失败"
    exit 1
fi

echo "🎉 Redis安装验证完成！"
```

### 性能基准测试
```bash
# 使用redis-benchmark测试性能
redis-benchmark -q -n 100000

# 预期输出
PING_INLINE: 50000.00 requests per second
PING_BULK: 50000.00 requests per second
SET: 45000.00 requests per second
GET: 50000.00 requests per second
```

## 📋 配置检查清单

### 基础配置
- [ ] Redis服务已安装
- [ ] Redis服务正在运行
- [ ] 端口6379正常监听
- [ ] 可以通过redis-cli连接
- [ ] 基本命令测试通过

### 后端集成
- [ ] 环境变量配置正确
- [ ] 后端服务启动成功
- [ ] Redis连接日志显示成功
- [ ] 健康检查API返回connected
- [ ] 缓存功能正常工作

### 性能优化
- [ ] 内存限制设置合理
- [ ] 内存淘汰策略配置
- [ ] 连接超时时间设置
- [ ] TCP保活参数配置
- [ ] 持久化策略配置

### 安全配置
- [ ] 密码认证（生产环境）
- [ ] IP绑定限制（生产环境）
- [ ] 危险命令禁用（生产环境）
- [ ] 防火墙规则设置（生产环境）

## 🔗 相关资源

- [Redis官方文档](https://redis.io/documentation)
- [Redis配置指南](https://redis.io/docs/manual/config/)
- [Redis性能优化](https://redis.io/docs/manual/optimization/)
- [Redis安全指南](https://redis.io/docs/manual/security/)

---

**安装完成后，请继续查看[Redis缓存实现指南](redis-cache-implementation-guide.md)进行后端集成配置！**