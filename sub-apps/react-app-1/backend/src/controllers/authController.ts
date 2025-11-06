import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { jwtManager, generateTokens } from '../utils/jwt-manager';
import { UserService } from '../services/userService';
import { ValidationError } from '../middleware/error';
import { redisManager } from '../config/redis';
import crypto from 'crypto';

const userService = new UserService();

/**
 * 认证控制器
 */
export class AuthController {
  /**
   * 用户登录
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, rememberMe = false } = req.body;

      // 1. 验证用户凭据
      const user = await userService.getUserByUsername(username);
      if (!user) {
        // 记录登录失败
        await this.logLoginAttempt(username, false, req.ip, '用户不存在');
        
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // 2. 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // 记录登录失败
        await this.logLoginAttempt(username, false, req.ip, '密码错误');
        
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // 3. 检查用户状态
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '账户已被禁用',
          code: 'ACCOUNT_DISABLED'
        });
      }

      // 4. 生成会话ID
      const sessionId = crypto.randomBytes(32).toString('hex');

      // 5. 生成令牌
      const payload = {
        userId: user.id,
        username: user.username,
        roles: user.roles.map((role: any) => role.code),
        permissions: user.permissions || []
      };

      const { accessToken, refreshToken } = await generateTokens(payload);

      // 6. 存储会话信息
      await this.createSession(sessionId, user.id, req.ip, req.get('User-Agent'));

      // 7. 记录登录成功
      await this.logLoginAttempt(username, true, req.ip, '登录成功');

      // 8. 更新最后登录时间
      await userService.updateUserLastLogin(user.id);

      // 9. 设置安全Cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7天或1天
      };

      res.cookie('refreshToken', refreshToken, cookieOptions);

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            nickname: user.nickname,
            roles: user.roles,
            permissions: user.permissions
          }
        },
        message: '登录成功'
      });

    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        success: false,
        message: '登录失败',
        code: 'LOGIN_ERROR'
      });
    }
  }

  /**
   * 刷新访问令牌
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: '未提供刷新令牌',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      // 1. 验证刷新令牌
      const decoded = await jwtManager.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: '无效的刷新令牌',
          code: 'INVALID_REFRESH_TOKEN'
        });
      }

      // 2. 检查会话是否仍然有效
      const isSessionValid = await this.isSessionValid(decoded.sessionId);
      if (!isSessionValid) {
        return res.status(401).json({
          success: false,
          message: '会话已失效',
          code: 'INVALID_SESSION'
        });
      }

      // 3. 获取用户信息
      const user = await userService.getUserById(decoded.userId);
      if (!user || user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: '用户不存在或已被禁用',
          code: 'USER_NOT_FOUND_OR_DISABLED'
        });
      }

      // 4. 生成新的访问令牌
      const payload = {
        userId: user.id,
        username: user.username,
        roles: user.roles.map((role: any) => role.code),
        permissions: user.permissions || []
      };

      const newAccessToken = await jwtManager.generateAccessToken(payload);

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          expiresIn: 15 * 60 // 15分钟
        },
        message: '令牌刷新成功'
      });

    } catch (error) {
      console.error('刷新令牌错误:', error);
      res.status(500).json({
        success: false,
        message: '刷新令牌失败',
        code: 'REFRESH_ERROR'
      });
    }
  }

  /**
   * 用户登出
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = (req as any).user?.userId;

      if (refreshToken) {
        // 1. 验证刷新令牌
        const decoded = await jwtManager.verifyRefreshToken(refreshToken);
        if (decoded) {
          // 2. 撤销令牌
          await jwtManager.revokeToken(decoded.sessionId);
        }
      }

      // 3. 如果有用户信息，撤销用户的所有令牌
      if (userId) {
        await jwtManager.revokeAllUserTokens(userId);
      }

      // 4. 清除Cookie
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: '登出成功'
      });

    } catch (error) {
      console.error('登出错误:', error);
      res.status(500).json({
        success: false,
        message: '登出失败',
        code: 'LOGOUT_ERROR'
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未认证用户',
          code: 'UNAUTHORIZED'
        });
      }

      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户信息失败',
        code: 'ME_ERROR'
      });
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未认证用户',
          code: 'UNAUTHORIZED'
        });
      }

      // 1. 验证新密码强度
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({
          success: false,
          message: '新密码不符合安全要求',
          code: 'WEAK_PASSWORD'
        });
      }

      // 2. 获取用户信息
      const user = await userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
          code: 'USER_NOT_FOUND'
        });
      }

      // 3. 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: '当前密码错误',
          code: 'INVALID_CURRENT_PASSWORD'
        });
      }

      // 4. 检查新密码是否与当前密码相同
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: '新密码不能与当前密码相同',
          code: 'SAME_PASSWORD'
        });
      }

      // 5. 更新密码
      await userService.updateUser(userId, { password: newPassword });

      // 6. 撤销所有令牌（强制重新登录）
      await jwtManager.revokeAllUserTokens(userId);

      res.json({
        success: true,
        message: '密码修改成功，请重新登录'
      });

    } catch (error) {
      console.error('修改密码错误:', error);
      res.status(500).json({
        success: false,
        message: '修改密码失败',
        code: 'CHANGE_PASSWORD_ERROR'
      });
    }
  }

  /**
   * 创建会话
   */
  private async createSession(sessionId: string, userId: string, ip: string, userAgent?: string): Promise<void> {
    const redis = redisManager.getClient();
    if (!redis) return;

    const sessionKey = `session:${sessionId}`;
    const sessionData = {
      userId,
      ip,
      userAgent: userAgent || '',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // 会话有效期：24小时
    await redis.setex(sessionKey, 24 * 60 * 60, JSON.stringify(sessionData));
  }

  /**
   * 检查会话是否有效
   */
  private async isSessionValid(sessionId: string): Promise<boolean> {
    const redis = redisManager.getClient();
    if (!redis) return true; // Redis不可用时允许通过

    const sessionKey = `session:${sessionId}`;
    const exists = await redis.exists(sessionKey);
    return exists === 1;
  }

  /**
   * 记录登录尝试
   */
  private async logLoginAttempt(username: string, success: boolean, ip: string, reason: string): Promise<void> {
    const redis = redisManager.getClient();
    if (!redis) return;

    const logKey = `login_attempts:${ip}`;
    const logData = {
      username,
      success,
      reason,
      timestamp: new Date().toISOString()
    };

    // 记录登录尝试（保留最近100次）
    await redis.lpush(logKey, JSON.stringify(logData));
    await redis.ltrim(logKey, 0, 99);
    await redis.expire(logKey, 7 * 24 * 60 * 60); // 7天过期

    // 记录失败次数（用于速率限制）
    if (!success) {
      const failKey = `login_failures:${ip}`;
      const failures = await redis.incr(failKey);
      await redis.expire(failKey, 5 * 60); // 5分钟过期
    }
  }
}

/**
 * 检查密码强度
 */
function isStrongPassword(password: string): boolean {
  // 至少8个字符，包含大小写字母、数字和特殊字符
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
}

export const authController = new AuthController();

export default AuthController;