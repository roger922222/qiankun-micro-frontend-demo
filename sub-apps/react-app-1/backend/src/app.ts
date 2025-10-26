import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'reflect-metadata';
import { errorHandler } from './middleware/error';
import { userRoutes } from './routes/users';
import { roleRoutes } from './routes/roles';
import { permissionRoutes } from './routes/permissions';
import { logRoutes } from './routes/logs';
import { initializeDatabase } from './config/database';
// import { authMiddleware } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3002;

// 安全中间件
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: '请求过于频繁，请稍后再试',
});
app.use('/api', limiter);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API路由
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/logs', logRoutes);

// 错误处理中间件
app.use(errorHandler);

// 404处理
app.use('*', (_req, res) => {
  res.status(404).json({ message: 'API 不存在' });
});

if (require.main === module) {
  // 初始化数据库连接（可选）
  initializeDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 BFF服务器运行在端口 ${PORT}`);
        console.log(`📊 API文档: http://localhost:${PORT}/api-docs`);
      });
    })
    .catch((error) => {
      console.log('⚠️  数据库连接失败，使用内存存储模式');
      console.log(`🚀 BFF服务器运行在端口 ${PORT}`);
      console.log(`📊 API文档: http://localhost:${PORT}/api-docs`);
      app.listen(PORT, () => {
        console.log(`✅ 服务器启动成功（内存模式）`);
      });
    });
}

export default app;