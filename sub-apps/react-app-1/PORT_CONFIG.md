# React App 1 端口配置完成 ✅

## 📋 配置变更总结

### 端口分配
- **前端 (Vite dev server)**: `localhost:3001`
- **后端 (Express API)**: `localhost:3002`

### 配置更新
1. **后端端口**: 从默认改为 `3002`
   - 文件: `sub-apps/react-app-1/backend/src/app.ts`
   - 修改: `const PORT = process.env.PORT || 3002;`

2. **前端代理**: 配置 Vite 代理到后端
   - 文件: `sub-apps/react-app-1/vite.config.ts`
   - 配置: `proxy: { '/api': { target: 'http://localhost:3002' } }`

3. **CORS配置**: 更新允许的来源
   - 文件: `sub-apps/react-app-1/backend/src/app.ts`
   - 配置: `origin: ['http://localhost:3000', 'http://localhost:3001']`

## 🚀 启动命令

在根目录执行：
```bash
npm run start          # 启动 react-app-1 前后端服务
npm run start:all      # 启动所有微前端应用
```

## 🌐 服务地址
- **前端应用**: http://localhost:3001
- **后端API**: http://localhost:3002

## ✅ 端口冲突解决
- react-app-1: 前端3001，后端3002
- react-app-2: 前端3002（需要调整为3003避免冲突）

## 📁 相关文件
- `sub-apps/react-app-1/backend/src/app.ts`
- `sub-apps/react-app-1/vite.config.ts`
- `scripts/start-react-app-1-simple.sh`
- `package.json` (根目录)