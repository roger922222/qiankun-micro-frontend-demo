"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRoutes = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
exports.logRoutes = router;
// Mock操作日志数据
let operationLogs = [
    {
        id: '1',
        userId: '1',
        userName: 'admin',
        action: 'CREATE_USER',
        resource: 'user',
        details: { userId: '2', username: 'newuser' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: '2024-01-15T10:00:00Z'
    },
    {
        id: '2',
        userId: '1',
        userName: 'admin',
        action: 'UPDATE_USER',
        resource: 'user',
        details: { userId: '2', changes: { email: 'newemail@example.com' } },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: '2024-01-15T11:00:00Z'
    }
];
// 获取操作日志列表
router.get('/', async (req, res) => {
    try {
        const { page = 1, pageSize = 20, userId, action, startDate, endDate } = req.query;
        let logs = [...operationLogs];
        // 筛选条件
        if (userId) {
            logs = logs.filter(log => log.userId === userId);
        }
        if (action) {
            logs = logs.filter(log => log.action === action);
        }
        if (startDate) {
            logs = logs.filter(log => log.timestamp >= startDate);
        }
        if (endDate) {
            logs = logs.filter(log => log.timestamp <= endDate);
        }
        // 排序（最新的在前）
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // 分页
        const total = logs.length;
        const startIndex = (Number(page) - 1) * Number(pageSize);
        const endIndex = startIndex + Number(pageSize);
        const paginatedLogs = logs.slice(startIndex, endIndex);
        res.json({
            success: true,
            data: paginatedLogs,
            pagination: {
                page: Number(page),
                pageSize: Number(pageSize),
                total,
                totalPages: Math.ceil(total / Number(pageSize))
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});
// 获取操作日志详情
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const log = operationLogs.find(log => log.id === id);
        if (!log) {
            return res.status(404).json({
                success: false,
                message: '日志不存在'
            });
        }
        res.json({
            success: true,
            data: log
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});
//# sourceMappingURL=logs.js.map