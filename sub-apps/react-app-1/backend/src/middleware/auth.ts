import { Request, Response, NextFunction } from 'express';
import { jwtManager, JWTPayload } from '../utils/jwt-manager';
import { redisManager } from '../config/redis';
import crypto from 'crypto';

export interface AuthRequest extends Request {
  user?: JWTPayload;
  sessionId?: string;
}

/**
 * 认证中间件 - 增强版
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // 跳过健康检查和公开路由
  const publicRoutes = ['/health', '/health/redis', '/api/auth/login', '/api/auth/refresh'];
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  try {
    // 1. 提取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供认证令牌或格式错误',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    // 2. 验证令牌格式
    if (!isValidJWTFormat(token)) {
      return res.status(401).json({ 
        success: false, 
        message: '令牌格式无效',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // 3. 验证令牌
    const decoded = await jwtManager.verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: '认证令牌无效或已过期',
        code: 'INVALID_TOKEN'
      });
    }

    // 4. 检查会话状态
    const isSessionValid = await validateSession(decoded.sessionId);
    if (!isSessionValid) {
      return res.status(401).json({ 
        success: false, 
        message: '会话已失效',
        code: 'INVALID_SESSION'
      });
    }

    // 5. 设置用户信息
    req.user = decoded;
    req.sessionId = decoded.sessionId;

    // 6. 记录安全日志
    logSecurityEvent('token_validated', {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(500).json({ 
      success: false, 
      message: '认证服务异常',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * 权限检查中间件
 */
export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: '未认证用户',
        code: 'UNAUTHORIZED'
      });
    }

    try {
      // 检查用户是否有特定权限
      const hasPermission = checkUserPermission(req.user, permission);
      
      if (!hasPermission) {
        // 记录权限拒绝日志
        logSecurityEvent('permission_denied', {
          userId: req.user.userId,
          permission: permission,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });

        return res.status(403).json({ 
          success: false, 
          message: '权限不足',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permission
        });
      }

      next();
    } catch (error) {
      console.error('权限检查错误:', error);
      return res.status(500).json({ 
        success: false, 
        message: '权限检查失败',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * 角色检查中间件
 */
export const requireRole = (role: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: '未认证用户',
        code: 'UNAUTHORIZED'
      });
    }

    const hasRole = req.user.roles.includes(role);
    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        message: '需要角色: ' + role,
        code: 'INSUFFICIENT_ROLE',
        required: role
      });
    }

    next();
  };
};

/**
 * 可选认证中间件（用于需要认证但不是必需的场景）
 */
export const optionalAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (isValidJWTFormat(token)) {
        const decoded = await jwtManager.verifyAccessToken(token);
        if (decoded && await validateSession(decoded.sessionId)) {
          req.user = decoded;
          req.sessionId = decoded.sessionId;
        }
      }
    }
    next();
  } catch (error) {
    // 可选认证失败不影响请求继续
    next();
  }
};

/**
 * 验证JWT令牌格式
 */
function isValidJWTFormat(token: string): boolean {
  // JWT格式：header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    // 检查各部分是否为有效的base64url编码
    parts.forEach(part => {
      // 添加填充以进行base64解码
      const padded = part + '='.repeat((4 - part.length % 4) % 4);
      Buffer.from(padded, 'base64').toString();
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 验证会话状态
 */
async function validateSession(sessionId: string): Promise<boolean> {
  try {
    const redis = redisManager.getClient();
    if (!redis) {
      // Redis不可用时，允许通过（降级处理）
      return true;
    }

    // 检查会话是否存在且有效
    const sessionKey = `session:${sessionId}`;
    const exists = await redis.exists(sessionKey);
    
    return exists === 1;
  } catch (error) {
    console.error('会话验证错误:', error);
    // 验证失败时允许通过（降级处理）
    return true;
  }
}

/**
 * 检查用户权限
 */
function checkUserPermission(user: JWTPayload, permission: string): boolean {
  // 检查直接权限
  if (user.permissions && user.permissions.includes(permission)) {
    return true;
  }

  // 检查角色权限（这里需要根据角色查询权限，简化实现）
  // 实际应用中应该查询数据库获取角色对应的权限
  const rolePermissions = getRolePermissions(user.roles);
  return rolePermissions.includes(permission);
}

/**
 * 获取角色权限（简化实现）
 */
function getRolePermissions(roles: string[]): string[] {
  // 这里应该查询数据库获取角色权限
  // 简化实现，返回一些示例权限
  const permissions: string[] = [];
  
  if (roles.includes('SUPER_ADMIN')) {
    permissions.push('USER_MANAGE', 'ROLE_MANAGE', 'PERMISSION_MANAGE');
  }
  
  if (roles.includes('ADMIN')) {
    permissions.push('USER_VIEW', 'USER_CREATE', 'USER_UPDATE');
  }
  
  return permissions;
}

/**
 * 记录安全事件
 */
function logSecurityEvent(event: string, data: any): void {
  try {
    // 这里可以将安全事件记录到专门的日志系统或数据库
    console.log(`[Security] ${event}:`, JSON.stringify(data));
  } catch (error) {
    console.error('记录安全事件失败:', error);
  }
}

export default {
  authMiddleware,
  requirePermission,
  requireRole,
  optionalAuthMiddleware
};