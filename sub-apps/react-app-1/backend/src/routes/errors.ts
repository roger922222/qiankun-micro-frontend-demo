import { Router } from 'express';
import { errorController } from '../controllers/errorController';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { rateLimitConfig } from '../middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// 错误统计相关API的限流配置
const errorStatsRateLimiter = rateLimit({
  ...rateLimitConfig.strict,
  keyGenerator: (req) => `${req.ip}:error-stats`,
  max: 50 // 每分钟最多50次请求
});

/**
 * @swagger
 * /api/errors/stats:
 *   get:
 *     summary: 获取错误统计信息
 *     tags: [Error Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 错误统计信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                     issues:
 *                       type: array
 *                     summary:
 *                       type: object
 */
router.get('/stats',
  authMiddleware,
  requirePermission('SYSTEM_MONITOR'),
  errorStatsRateLimiter,
  (req, res) => errorController.getErrorStats(req, res)
);

/**
 * @swagger
 * /api/errors/trend:
 *   get:
 *     summary: 获取错误趋势
 *     tags: [Error Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: hours
 *         schema:
 *           type: integer
 *           default: 24
 *         description: 时间范围（小时）
 *     responses:
 *       200:
 *         description: 错误趋势数据
 */
router.get('/trend',
  authMiddleware,
  requirePermission('SYSTEM_MONITOR'),
  errorStatsRateLimiter,
  (req, res) => errorController.getErrorTrend(req, res)
);

/**
 * @swagger
 * /api/errors/details:
 *   get:
 *     summary: 获取错误详情
 *     tags: [Error Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: integer
 *         description: 错误码
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 错误类别
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: 错误级别
 *       - in: query
 *         name: startTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间
 *       - in: query
 *         name: endTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
 *     responses:
 *       200:
 *         description: 错误详情列表
 */
router.get('/details',
  authMiddleware,
  requirePermission('SYSTEM_MONITOR'),
  errorStatsRateLimiter,
  (req, res) => errorController.getErrorDetails(req, res)
);

/**
 * @swagger
 * /api/errors/report:
 *   get:
 *     summary: 获取错误报告
 *     tags: [Error Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 错误报告（纯文本格式）
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/report',
  authMiddleware,
  requirePermission('SYSTEM_MONITOR'),
  errorStatsRateLimiter,
  (req, res) => errorController.getErrorReport(req, res)
);

/**
 * @swagger
 * /api/errors/analysis:
 *   get:
 *     summary: 获取错误分析
 *     tags: [Error Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 错误分析报告
 */
router.get('/analysis',
  authMiddleware,
  requirePermission('SYSTEM_MONITOR'),
  errorStatsRateLimiter,
  (req, res) => errorController.getErrorAnalysis(req, res)
);

/**
 * @swagger
 * /api/errors/cleanup:
 *   post:
 *     summary: 清理错误日志
 *     tags: [Error Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: 清理多少天前的日志
 *     responses:
 *       200:
 *         description: 清理成功
 */
router.post('/cleanup',
  authMiddleware,
  requirePermission('SYSTEM_ADMIN'),
  errorStatsRateLimiter,
  (req, res) => errorController.cleanupErrors(req, res)
);

export default router;