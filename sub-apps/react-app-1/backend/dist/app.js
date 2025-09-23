"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const error_1 = require("./middleware/error");
const users_1 = require("./routes/users");
const roles_1 = require("./routes/roles");
const permissions_1 = require("./routes/permissions");
const logs_1 = require("./routes/logs");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
// 安全中间件
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// 限流中间件
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: '请求过于频繁，请稍后再试',
});
app.use('/api', limiter);
// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API路由
app.use('/api/users', users_1.userRoutes);
app.use('/api/roles', roles_1.roleRoutes);
app.use('/api/permissions', permissions_1.permissionRoutes);
app.use('/api/logs', logs_1.logRoutes);
// 错误处理中间件
app.use(error_1.errorHandler);
// 404处理
app.use('*', (req, res) => {
    res.status(404).json({ message: 'API 不存在' });
});
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 BFF服务器运行在端口 ${PORT}`);
        console.log(`📊 API文档: http://localhost:${PORT}/api-docs`);
    });
}
exports.default = app;
//# sourceMappingURL=app.js.map