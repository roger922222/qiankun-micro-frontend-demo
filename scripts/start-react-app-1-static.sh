#!/bin/bash

# 启动 react-app-1 的静态文件服务器
cd /Users/bytedance/Downloads/qiankun-micro-frontend-demo/sub-apps/react-app-1/dist
python3 -m http.server 3001 &
echo "Static server started on port 3001"
echo "PID: $!"

# 等待服务器启动
sleep 2

# 测试访问
curl -I http://localhost:3001/
echo "Server test completed"