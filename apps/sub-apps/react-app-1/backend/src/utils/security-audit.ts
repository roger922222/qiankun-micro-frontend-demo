import { createWriteStream } from 'fs';
import { join } from 'path';
import { format } from 'date-fns';

/**
 * 安全事件类型
 */
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  TOKEN_CREATED = 'TOKEN_CREATED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED'
}

/**
 * 安全事件等级
 */
export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * 安全事件接口
 */
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  level: SecurityLevel;
  userId?: string;
  username?: string;
  ip: string;
  userAgent?: string;
  timestamp: Date;
  message: string;
  details?: Record<string, any>;
  success: boolean;
}

/**
 * 安全审计日志管理器
 */
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  private logStream: ReturnType<typeof createWriteStream>;
  private logPath: string;

  private constructor() {
    this.logPath = join(process.cwd(), 'logs', 'security');
    this.logStream = this.createLogStream();
  }

  static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }

  /**
   * 创建日志文件流
   */
  private createLogStream(): ReturnType<typeof createWriteStream> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const logFile = join(this.logPath, `security-${today}.log`);
    
    return createWriteStream(logFile, { flags: 'a' });
  }

  /**
   * 记录安全事件
   */
  async logEvent(event: Omit<SecurityEvent, 'id'>): Promise<void> {
    const fullEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId()
    };

    // 写入日志文件
    this.writeToLogFile(fullEvent);

    // 根据事件等级采取不同的处理措施
    await this.handleEventByLevel(fullEvent);

    // 实时告警（高等级事件）
    if (event.level === SecurityLevel.HIGH || event.level === SecurityLevel.CRITICAL) {
      await this.sendAlert(fullEvent);
    }
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `SEC-${timestamp}-${random}`;
  }

  /**
   * 写入日志文件
   */
  private writeToLogFile(event: SecurityEvent): void {
    const logEntry = {
      id: event.id,
      type: event.type,
      level: event.level,
      userId: event.userId,
      username: event.username,
      ip: event.ip,
      userAgent: event.userAgent,
      timestamp: event.timestamp.toISOString(),
      message: event.message,
      details: event.details,
      success: event.success
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    this.logStream.write(logLine);
  }

  /**
   * 根据事件等级处理
   */
  private async handleEventByLevel(event: SecurityEvent): Promise<void> {
    switch (event.level) {
      case SecurityLevel.CRITICAL:
        await this.handleCriticalEvent(event);
        break;
      case SecurityLevel.HIGH:
        await this.handleHighEvent(event);
        break;
      case SecurityLevel.MEDIUM:
        await this.handleMediumEvent(event);
        break;
      case SecurityLevel.LOW:
        // 低等级事件只记录日志
        break;
    }
  }

  /**
   * 处理关键事件
   */
  private async handleCriticalEvent(event: SecurityEvent): Promise<void> {
    console.error(`[CRITICAL] ${event.type}: ${event.message}`, event);

    // 关键事件处理逻辑
    switch (event.type) {
      case SecurityEventType.LOGIN_FAILED:
        // 多次登录失败，可能锁定账户
        await this.handleMultipleLoginFailures(event);
        break;
      case SecurityEventType.INVALID_TOKEN:
        // 大量无效令牌，可能遭受攻击
        await this.handleTokenAttack(event);
        break;
      case SecurityEventType.SUSPICIOUS_REQUEST:
        // 可疑请求，可能封锁IP
        await this.handleSuspiciousRequest(event);
        break;
    }
  }

  /**
   * 处理高等级事件
   */
  private async handleHighEvent(event: SecurityEvent): Promise<void> {
    console.warn(`[HIGH] ${event.type}: ${event.message}`, event);

    // 高等级事件处理逻辑
    switch (event.type) {
      case SecurityEventType.PERMISSION_DENIED:
        // 权限被拒绝，记录详细信息
        break;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        // 超出速率限制
        break;
      case SecurityEventType.PASSWORD_CHANGED:
        // 密码修改，发送通知
        break;
    }
  }

  /**
   * 处理中等级事件
   */
  private async handleMediumEvent(event: SecurityEvent): Promise<void> {
    console.info(`[MEDIUM] ${event.type}: ${event.message}`, event);
  }

  /**
   * 处理多次登录失败
   */
  private async handleMultipleLoginFailures(event: SecurityEvent): Promise<void> {
    // 这里可以实现账户锁定逻辑
    console.error(`[Account Security] 检测到多次登录失败:`, {
      username: event.username,
      ip: event.ip,
      timestamp: event.timestamp
    });
  }

  /**
   * 处理令牌攻击
   */
  private async handleTokenAttack(event: SecurityEvent): Promise<void> {
    console.error(`[Token Security] 检测到令牌攻击:`, {
      ip: event.ip,
      userAgent: event.userAgent,
      timestamp: event.timestamp
    });
  }

  /**
   * 处理可疑请求
   */
  private async handleSuspiciousRequest(event: SecurityEvent): Promise<void> {
    console.error(`[Request Security] 检测到可疑请求:`, {
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
      timestamp: event.timestamp
    });
  }

  /**
   * 发送告警
   */
  private async sendAlert(event: SecurityEvent): Promise<void> {
    // 这里可以实现实际的告警逻辑，比如发送邮件、短信、Webhook等
    console.error(`[SECURITY ALERT] ${event.level} - ${event.type}: ${event.message}`);
    
    // 示例：可以集成到钉钉、企业微信、Slack等
    // await sendToWebhook(event);
    // await sendEmail(event);
    // await sendSMS(event);
  }

  /**
   * 获取安全统计信息
   */
  async getSecurityStats(timeRange: 'hour' | 'day' | 'week' | 'month'): Promise<any> {
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // 这里可以实现从日志文件或数据库中统计的逻辑
    // 简化实现，返回模拟数据
    return {
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      stats: {
        totalEvents: Math.floor(Math.random() * 1000) + 100,
        criticalEvents: Math.floor(Math.random() * 10),
        highEvents: Math.floor(Math.random() * 50),
        mediumEvents: Math.floor(Math.random() * 200),
        lowEvents: Math.floor(Math.random() * 500),
        topEventTypes: [
          { type: SecurityEventType.LOGIN_SUCCESS, count: Math.floor(Math.random() * 500) + 100 },
          { type: SecurityEventType.LOGIN_FAILED, count: Math.floor(Math.random() * 50) + 10 },
          { type: SecurityEventType.TOKEN_CREATED, count: Math.floor(Math.random() * 200) + 50 }
        ],
        topIPs: [
          { ip: '192.168.1.1', count: Math.floor(Math.random() * 100) + 20 },
          { ip: '192.168.1.2', count: Math.floor(Math.random() * 80) + 15 },
          { ip: '192.168.1.3', count: Math.floor(Math.random() * 60) + 10 }
        ]
      }
    };
  }

  /**
   * 清理过期日志
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    // 这里可以实现清理过期日志的逻辑
    console.log(`[Security Audit] 清理${retentionDays}天前的安全日志`);
  }
}

/**
 * 便捷函数 - 记录登录成功
 */
export const logLoginSuccess = async (
  userId: string,
  username: string,
  ip: string,
  userAgent?: string,
  details?: Record<string, any>
): Promise<void> => {
  const logger = SecurityAuditLogger.getInstance();
  await logger.logEvent({
    type: SecurityEventType.LOGIN_SUCCESS,
    level: SecurityLevel.LOW,
    userId,
    username,
    ip,
    userAgent,
    timestamp: new Date(),
    message: `用户 ${username} 登录成功`,
    details,
    success: true
  });
};

/**
 * 便捷函数 - 记录登录失败
 */
export const logLoginFailed = async (
  username: string,
  ip: string,
  userAgent?: string,
  reason?: string,
  details?: Record<string, any>
): Promise<void> => {
  const logger = SecurityAuditLogger.getInstance();
  await logger.logEvent({
    type: SecurityEventType.LOGIN_FAILED,
    level: SecurityLevel.MEDIUM,
    username,
    ip,
    userAgent,
    timestamp: new Date(),
    message: `用户 ${username} 登录失败: ${reason || '未知原因'}`,
    details,
    success: false
  });
};

/**
 * 便捷函数 - 记录令牌创建
 */
export const logTokenCreated = async (
  userId: string,
  username: string,
  ip: string,
  tokenType: 'access' | 'refresh',
  details?: Record<string, any>
): Promise<void> => {
  const logger = SecurityAuditLogger.getInstance();
  await logger.logEvent({
    type: SecurityEventType.TOKEN_CREATED,
    level: SecurityLevel.LOW,
    userId,
    username,
    ip,
    timestamp: new Date(),
    message: `为用户 ${username} 创建${tokenType === 'access' ? '访问' : '刷新'}令牌`,
    details,
    success: true
  });
};

/**
 * 便捷函数 - 记录权限拒绝
 */
export const logPermissionDenied = async (
  userId: string,
  username: string,
  permission: string,
  ip: string,
  userAgent?: string,
  details?: Record<string, any>
): Promise<void> => {
  const logger = SecurityAuditLogger.getInstance();
  await logger.logEvent({
    type: SecurityEventType.PERMISSION_DENIED,
    level: SecurityLevel.HIGH,
    userId,
    username,
    ip,
    userAgent,
    timestamp: new Date(),
    message: `用户 ${username} 尝试访问未授权资源: ${permission}`,
    details: { ...details, permission },
    success: false
  });
};

/**
 * 便捷函数 - 记录可疑请求
 */
export const logSuspiciousRequest = async (
  ip: string,
  userAgent?: string,
  reason: string = '检测到可疑内容',
  details?: Record<string, any>
): Promise<void> => {
  const logger = SecurityAuditLogger.getInstance();
  await logger.logEvent({
    type: SecurityEventType.SUSPICIOUS_REQUEST,
    level: SecurityLevel.HIGH,
    ip,
    userAgent,
    timestamp: new Date(),
    message: reason,
    details,
    success: false
  });
};

/**
 * 便捷函数 - 记录速率限制超出
 */
export const logRateLimitExceeded = async (
  ip: string,
  userAgent?: string,
  limitType?: string,
  details?: Record<string, any>
): Promise<void> => {
  const logger = SecurityAuditLogger.getInstance();
  await logger.logEvent({
    type: SecurityEventType.RATE_LIMIT_EXCEEDED,
    level: SecurityLevel.MEDIUM,
    ip,
    userAgent,
    timestamp: new Date(),
    message: `IP ${ip} 超出速率限制${limitType ? ` (${limitType})` : ''}`,
    details: { ...details, limitType },
    success: false
  });
};

export default SecurityAuditLogger;