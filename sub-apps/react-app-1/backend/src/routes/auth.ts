import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate, validationSchemas } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { rateLimitConfig } from '../middleware/validation';

const router = Router();

// 登录限流中间件
const loginLimiter = rateLimit({
  ...rateLimitConfig.auth,
  keyGenerator: (req) => {
    // 使用IP地址和用户名组合作为限流键
    return `${req.ip}:${req.body.username || 'unknown'}`;
  }
});

// 通用限流中间件
const apiLimiter = rateLimit(rateLimitConfig.api);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *               rememberMe:
 *                 type: boolean
 *                 description: 记住我
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 用户名或密码错误
 *       429:
 *         description: 请求过于频繁
 */
router.post('/login', 
  loginLimiter,
  validate(validationSchemas.auth.login),
  (req, res) => authController.login(req, res)
);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *       401:
 *         description: 刷新令牌无效
 */
router.post('/refresh',
  apiLimiter,
  validate(validationSchemas.auth.refresh),
  (req, res) => authController.refresh(req, res)
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌（可选）
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未认证
 */
router.post('/logout',
  authMiddleware,
  (req, res) => authController.logout(req, res)
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取用户信息成功
 *       401:
 *         description: 未认证
 */
router.get('/me',
  authMiddleware,
  (req, res) => authController.me(req, res)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: 修改密码
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: 当前密码
 *               newPassword:
 *                 type: string
 *                 description: 新密码（至少8位，包含大小写字母、数字和特殊字符）
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       400:
 *         description: 密码不符合要求或当前密码错误
 *       401:
 *         description: 未认证
 */
router.post('/change-password',
  authMiddleware,
  apiLimiter,
  (req, res) => authController.changePassword(req, res)
);

export default router;