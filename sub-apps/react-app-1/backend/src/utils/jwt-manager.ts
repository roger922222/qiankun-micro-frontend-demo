import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import crypto from 'crypto';
import { redisManager } from './redis';

export interface JWTPayload {
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface JWTConfig {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
  algorithm: jwt.Algorithm;
}

// JWT配置 - 使用强密钥和合理的过期时间
const JWT_CONFIG: JWTConfig = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || crypto.randomBytes(64).toString('hex'),
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex'),
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m', // 15分钟
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d', // 7天
  issuer: process.env.JWT_ISSUER || 'react-user-management',
  audience: process.env.JWT_AUDIENCE || 'user-management-app',
  algorithm: 'HS256'
};

/**
 * JWT令牌管理器
 */
export class JWTManager {
  private static instance: JWTManager;
  private accessTokenSecret: string;
  private refreshTokenSecret: string;

  private constructor() {
    this.accessTokenSecret = JWT_CONFIG.accessTokenSecret;
    this.refreshTokenSecret = JWT_CONFIG.refreshTokenSecret;
    
    // 验证密钥强度
    this.validateKeyStrength();
  }

  static getInstance(): JWTManager {
    if (!JWTManager.instance) {
      JWTManager.instance = new JWTManager();
    }
    return JWTManager.instance;
  }

  /**
   * 验证密钥强度
   */
  private validateKeyStrength(): void {
    if (this.accessTokenSecret.length < 32) {
      throw new Error('访问令牌密钥长度必须至少为32个字符');
    }
    if (this.refreshTokenSecret.length < 32) {
      throw new Error('刷新令牌密钥长度必须至少为32个字符');
    }
    
    // 检查密钥复杂度
    const complexityCheck = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!complexityCheck.test(this.accessTokenSecret)) {
      console.warn('⚠️  警告：访问令牌密钥复杂度较低，建议包含大小写字母、数字和特殊字符');
    }
    if (!complexityCheck.test(this.refreshTokenSecret)) {
      console.warn('⚠️  警告：刷新令牌密钥复杂度较低，建议包含大小写字母、数字和特殊字符');
    }
  }

  /**
   * 生成访问令牌
   */
  async generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const tokenPayload: JWTPayload = {
      ...payload,
      sessionId
    };

    const token = jwt.sign(
      tokenPayload,
      this.accessTokenSecret,
      {
        expiresIn: JWT_CONFIG.accessTokenExpiry,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        algorithm: JWT_CONFIG.algorithm
      }
    );

    // 将令牌信息存储到Redis，用于撤销管理
    await this.storeTokenInfo(sessionId, tokenPayload.userId, 'access');

    return token;
  }

  /**
   * 生成刷新令牌
   */
  async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    const token = jwt.sign(
      { userId, sessionId, type: 'refresh' },
      this.refreshTokenSecret,
      {
        expiresIn: JWT_CONFIG.refreshTokenExpiry,
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        algorithm: JWT_CONFIG.algorithm
      }
    );

    // 存储刷新令牌信息
    await this.storeTokenInfo(sessionId, userId, 'refresh');

    return token;
  }

  /**
   * 验证访问令牌
   */
  async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        algorithms: [JWT_CONFIG.algorithm]
      }) as JWTPayload;

      // 检查令牌是否在黑名单中
      const isBlacklisted = await this.isTokenBlacklisted(decoded.sessionId);
      if (isBlacklisted) {
        return null;
      }

      // 检查令牌是否存在于Redis中（防止伪造）
      const exists = await this.tokenExists(decoded.sessionId, 'access');
      if (!exists) {
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('访问令牌已过期');
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.log('无效的访问令牌');
      }
      return null;
    }
  }

  /**
   * 验证刷新令牌
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string; sessionId: string } | null> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: JWT_CONFIG.issuer,
        audience: JWT_CONFIG.audience,
        algorithms: [JWT_CONFIG.algorithm]
      }) as any;

      if (decoded.type !== 'refresh') {
        return null;
      }

      // 检查刷新令牌是否存在于Redis中
      const exists = await this.tokenExists(decoded.sessionId, 'refresh');
      if (!exists) {
        return null;
      }

      return { userId: decoded.userId, sessionId: decoded.sessionId };
    } catch (error) {
      console.error('刷新令牌验证失败:', error);
      return null;
    }
  }

  /**
   * 撤销令牌（登出）
   */
  async revokeToken(sessionId: string): Promise<void> {
    // 将令牌加入黑名单
    const redis = redisManager.getClient();
    if (redis) {
      const blacklistKey = `blacklist:${sessionId}`;
      await redis.setex(blacklistKey, 7 * 24 * 60 * 60, '1'); // 7天过期
      
      // 删除Redis中的令牌信息
      const accessKey = `token:access:${sessionId}`;
      const refreshKey = `token:refresh:${sessionId}`;
      await redis.del(accessKey, refreshKey);
    }
  }

  /**
   * 撤销用户的所有令牌
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const redis = redisManager.getClient();
    if (redis) {
      // 获取用户的所有会话
      const userSessionsKey = `user:sessions:${userId}`;
      const sessionIds = await redis.smembers(userSessionsKey);
      
      // 撤销所有会话
      for (const sessionId of sessionIds) {
        await this.revokeToken(sessionId);
      }
      
      // 删除用户会话集合
      await redis.del(userSessionsKey);
    }
  }

  /**
   * 存储令牌信息到Redis
   */
  private async storeTokenInfo(sessionId: string, userId: string, type: 'access' | 'refresh'): Promise<void> {
    const redis = redisManager.getClient();
    if (!redis) return;

    const tokenKey = `token:${type}:${sessionId}`;
    const userSessionsKey = `user:sessions:${userId}`;
    
    // 存储令牌信息
    const expiry = type === 'access' ? 15 * 60 : 7 * 24 * 60 * 60; // 15分钟或7天
    await redis.setex(tokenKey, expiry, userId);
    
    // 将sessionId添加到用户的会话集合中
    await redis.sadd(userSessionsKey, sessionId);
    await redis.expire(userSessionsKey, 7 * 24 * 60 * 60); // 7天过期
  }

  /**
   * 检查令牌是否存在于Redis中
   */
  private async tokenExists(sessionId: string, type: 'access' | 'refresh'): Promise<boolean> {
    const redis = redisManager.getClient();
    if (!redis) return false;

    const tokenKey = `token:${type}:${sessionId}`;
    const exists = await redis.exists(tokenKey);
    return exists === 1;
  }

  /**
   * 检查令牌是否在黑名单中
   */
  private async isTokenBlacklisted(sessionId: string): Promise<boolean> {
    const redis = redisManager.getClient();
    if (!redis) return false;

    const blacklistKey = `blacklist:${sessionId}`;
    const exists = await redis.exists(blacklistKey);
    return exists === 1;
  }

  /**
   * 获取令牌剩余时间（秒）
   */
  async getTokenRemainingTime(sessionId: string, type: 'access' | 'refresh'): Promise<number> {
    const redis = redisManager.getClient();
    if (!redis) return 0;

    const tokenKey = `token:${type}:${sessionId}`;
    const ttl = await redis.ttl(tokenKey);
    return ttl > 0 ? ttl : 0;
  }

  /**
   * 轮换令牌（刷新访问令牌）
   */
  async rotateTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    const decoded = await this.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return null;
    }

    // 撤销旧的刷新令牌
    await this.revokeToken(decoded.sessionId);

    // 生成新的会话ID
    const newSessionId = crypto.randomBytes(16).toString('hex');

    // 生成新的访问令牌和刷新令牌
    const userService = new (await import('../services/userService')).UserService();
    const user = await userService.getUserById(decoded.userId);
    
    if (!user) {
      return null;
    }

    const accessToken = await this.generateAccessToken({
      userId: user.id,
      username: user.username,
      roles: user.roles.map((role: any) => role.code),
      permissions: user.permissions || []
    });

    const newRefreshToken = await this.generateRefreshToken(decoded.userId, newSessionId);

    return { accessToken, refreshToken: newRefreshToken };
  }
}

// 创建JWT管理器单例
export const jwtManager = JWTManager.getInstance();

// 便捷函数
export const generateTokens = async (payload: Omit<JWTPayload, 'iat' | 'exp'>) => {
  const accessToken = await jwtManager.generateAccessToken(payload);
  const sessionId = crypto.randomBytes(16).toString('hex');
  const refreshToken = await jwtManager.generateRefreshToken(payload.userId, sessionId);
  
  return { accessToken, refreshToken };
};

export const verifyAccessToken = async (token: string) => {
  return jwtManager.verifyAccessToken(token);
};

export const verifyRefreshToken = async (token: string) => {
  return jwtManager.verifyRefreshToken(token);
};

export const revokeToken = async (sessionId: string) => {
  return jwtManager.revokeToken(sessionId);
};

export default jwtManager;