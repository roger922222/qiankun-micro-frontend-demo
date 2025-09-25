/**
 * 权限中间件 - 验证事件发送和接收权限
 * 提供基于角色和权限的事件访问控制
 */

import { BaseEvent } from '../../types/events';
import { EventMiddleware, MiddlewareInterceptor } from './event-middleware';

// ==================== 权限相关类型定义 ====================

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  level: number;
}

export interface User {
  id: string;
  name: string;
  roles: Role[];
  permissions: Permission[];
}

export interface PermissionCondition {
  type: 'time' | 'ip' | 'source' | 'custom';
  operator: 'eq' | 'ne' | 'in' | 'not_in' | 'gt' | 'lt' | 'between';
  value: any;
  customCheck?: (context: PermissionContext) => boolean;
}

export interface PermissionContext {
  user?: User;
  event: BaseEvent;
  timestamp: number;
  metadata: Record<string, any>;
}

// ==================== 权限策略接口 ====================

export interface PermissionStrategy {
  /**
   * 检查用户是否有权限执行指定事件
   */
  checkPermission(context: PermissionContext): Promise<PermissionResult>;
  
  /**
   * 获取用户权限列表
   */
  getUserPermissions(userId: string): Promise<Permission[]>;
  
  /**
   * 获取用户角色列表
   */
  getUserRoles(userId: string): Promise<Role[]>;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
  missingPermissions?: string[];
}

// ==================== 默认权限策略 ====================

export class DefaultPermissionStrategy implements PermissionStrategy {
  private users: Map<string, User> = new Map();
  private eventPermissions: Map<string, string[]> = new Map();

  constructor() {
    this.initializeDefaultPermissions();
  }

  /**
   * 初始化默认权限配置
   */
  private initializeDefaultPermissions(): void {
    // 定义事件权限映射
    this.eventPermissions.set('USER_LOGIN', ['auth.login']);
    this.eventPermissions.set('USER_LOGOUT', ['auth.logout']);
    this.eventPermissions.set('USER_UPDATE', ['user.update']);
    this.eventPermissions.set('USER_PERMISSION_CHANGE', ['user.permission.manage']);
    this.eventPermissions.set('THEME_CHANGE', ['ui.theme.change']);
    this.eventPermissions.set('ROUTE_CHANGE', ['navigation.route']);
    this.eventPermissions.set('DATA_UPDATE', ['data.update']);
    this.eventPermissions.set('NOTIFICATION', ['notification.send']);
    this.eventPermissions.set('CONFIG_UPDATE', ['system.config.update']);
  }

  async checkPermission(context: PermissionContext): Promise<PermissionResult> {
    const { user, event } = context;

    // 如果没有用户信息，检查是否为公开事件
    if (!user) {
      const isPublicEvent = this.isPublicEvent(event.type);
      return {
        allowed: isPublicEvent,
        reason: isPublicEvent ? undefined : 'Authentication required'
      };
    }

    // 获取事件所需权限
    const requiredPermissions = this.eventPermissions.get(event.type) || [];
    
    if (requiredPermissions.length === 0) {
      // 如果事件不需要特定权限，允许访问
      return { allowed: true };
    }

    // 检查用户是否具有所需权限
    const userPermissions = await this.getUserPermissions(user.id);
    const userPermissionCodes = userPermissions.map(p => `${p.resource}.${p.action}`);
    
    const missingPermissions = requiredPermissions.filter(
      perm => !userPermissionCodes.includes(perm)
    );

    if (missingPermissions.length > 0) {
      return {
        allowed: false,
        reason: 'Insufficient permissions',
        requiredPermissions,
        missingPermissions
      };
    }

    // 检查权限条件
    const conditionCheck = await this.checkPermissionConditions(context, userPermissions);
    if (!conditionCheck.allowed) {
      return conditionCheck;
    }

    return { allowed: true };
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = this.users.get(userId);
    if (!user) {
      return [];
    }

    // 合并用户直接权限和角色权限
    const permissions = [...user.permissions];
    user.roles.forEach(role => {
      permissions.push(...role.permissions);
    });

    // 去重
    const uniquePermissions = permissions.filter((perm, index, arr) => 
      arr.findIndex(p => p.id === perm.id) === index
    );

    return uniquePermissions;
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const user = this.users.get(userId);
    return user ? user.roles : [];
  }

  /**
   * 检查权限条件
   */
  private async checkPermissionConditions(
    context: PermissionContext, 
    permissions: Permission[]
  ): Promise<PermissionResult> {
    for (const permission of permissions) {
      if (!permission.conditions) continue;

      for (const condition of permission.conditions) {
        const conditionMet = await this.evaluateCondition(condition, context);
        if (!conditionMet) {
          return {
            allowed: false,
            reason: `Permission condition not met: ${condition.type}`
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * 评估权限条件
   */
  private async evaluateCondition(
    condition: PermissionCondition, 
    context: PermissionContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition, context);
      
      case 'ip':
        return this.evaluateIpCondition(condition, context);
      
      case 'source':
        return this.evaluateSourceCondition(condition, context);
      
      case 'custom':
        return condition.customCheck ? condition.customCheck(context) : true;
      
      default:
        return true;
    }
  }

  private evaluateTimeCondition(condition: PermissionCondition, _context: PermissionContext): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    switch (condition.operator) {
      case 'between':
        const [start, end] = condition.value as [number, number];
        return currentTime >= start && currentTime <= end;
      default:
        return true;
    }
  }

  private evaluateIpCondition(condition: PermissionCondition, context: PermissionContext): boolean {
    const clientIp = context.metadata.clientIp;
    if (!clientIp) return true;

    switch (condition.operator) {
      case 'eq':
        return clientIp === condition.value;
      case 'in':
        return (condition.value as string[]).includes(clientIp);
      default:
        return true;
    }
  }

  private evaluateSourceCondition(condition: PermissionCondition, context: PermissionContext): boolean {
    const eventSource = context.event.source;

    switch (condition.operator) {
      case 'eq':
        return eventSource === condition.value;
      case 'in':
        return (condition.value as string[]).includes(eventSource);
      case 'not_in':
        return !(condition.value as string[]).includes(eventSource);
      default:
        return true;
    }
  }

  /**
   * 检查是否为公开事件
   */
  private isPublicEvent(eventType: string): boolean {
    const publicEvents = [
      'THEME_CHANGE',
      'LANGUAGE_CHANGE',
      'APP_MOUNT',
      'APP_UNMOUNT',
      'ROUTE_CHANGE'
    ];
    return publicEvents.includes(eventType);
  }

  /**
   * 注册用户
   */
  registerUser(user: User): void {
    this.users.set(user.id, user);
  }

  /**
   * 设置事件权限
   */
  setEventPermissions(eventType: string, permissions: string[]): void {
    this.eventPermissions.set(eventType, permissions);
  }
}

// ==================== 权限中间件 ====================

export interface PermissionMiddlewareOptions {
  strategy?: PermissionStrategy;
  getCurrentUser?: () => Promise<User | undefined>;
  onPermissionDenied?: (context: PermissionContext, result: PermissionResult) => void;
  skipPermissionCheck?: (event: BaseEvent) => boolean;
  debug?: boolean;
}

export class PermissionMiddleware implements EventMiddleware {
  public readonly name = 'permission';
  public readonly priority = 20; // 在日志之后，业务逻辑之前

  private strategy: PermissionStrategy;
  private getCurrentUser?: () => Promise<User | undefined>;
  private onPermissionDenied?: (context: PermissionContext, result: PermissionResult) => void;
  private skipPermissionCheck?: (event: BaseEvent) => boolean;
  private debug: boolean;

  constructor(options: PermissionMiddlewareOptions = {}) {
    this.strategy = options.strategy || new DefaultPermissionStrategy();
    this.getCurrentUser = options.getCurrentUser;
    this.onPermissionDenied = options.onPermissionDenied;
    this.skipPermissionCheck = options.skipPermissionCheck;
    this.debug = options.debug || false;
  }

  async process<T extends BaseEvent>(event: T, next: (event: T) => Promise<void>): Promise<void> {
    // 检查是否跳过权限检查
    if (this.skipPermissionCheck && this.skipPermissionCheck(event)) {
      if (this.debug) {
        console.log(`[PermissionMiddleware] Skipping permission check for event: ${event.type}`);
      }
      await next(event);
      return;
    }

    // 获取当前用户
    const user = this.getCurrentUser ? await this.getCurrentUser() : undefined;

    // 创建权限上下文
    const context: PermissionContext = {
      user,
      event,
      timestamp: Date.now(),
      metadata: {}
    };

    if (this.debug) {
      console.log(`[PermissionMiddleware] Checking permission for event: ${event.type}, user: ${user?.name || 'anonymous'}`);
    }

    // 检查权限
    const result = await this.strategy.checkPermission(context);

    if (!result.allowed) {
      if (this.debug) {
        console.warn(`[PermissionMiddleware] Permission denied for event: ${event.type}, reason: ${result.reason}`);
      }

      // 调用权限拒绝回调
      if (this.onPermissionDenied) {
        this.onPermissionDenied(context, result);
      }

      // 抛出权限拒绝错误
      throw new MiddlewareInterceptor(
        result.reason || 'Permission denied',
        this.name
      );
    }

    if (this.debug) {
      console.log(`[PermissionMiddleware] Permission granted for event: ${event.type}`);
    }

    // 权限检查通过，继续执行
    await next(event);
  }

  /**
   * 设置权限策略
   */
  setStrategy(strategy: PermissionStrategy): void {
    this.strategy = strategy;
  }

  /**
   * 设置当前用户获取函数
   */
  setCurrentUserProvider(provider: () => Promise<User | undefined>): void {
    this.getCurrentUser = provider;
  }

  /**
   * 检查用户权限（外部调用）
   */
  async checkUserPermission(eventType: string, userId?: string): Promise<PermissionResult> {
    const user = userId ? { id: userId } as User : await this.getCurrentUser?.();
    
    const mockEvent: BaseEvent = {
      type: eventType,
      source: 'permission-check',
      timestamp: new Date().toISOString(),
      id: `perm-check-${Date.now()}`
    };

    const context: PermissionContext = {
      user,
      event: mockEvent,
      timestamp: Date.now(),
      metadata: {}
    };

    return await this.strategy.checkPermission(context);
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建权限中间件
 */
export function createPermissionMiddleware(options: PermissionMiddlewareOptions = {}): PermissionMiddleware {
  return new PermissionMiddleware(options);
}

/**
 * 创建开发环境权限中间件（宽松权限）
 */
export function createDevPermissionMiddleware(): PermissionMiddleware {
  return new PermissionMiddleware({
    debug: true,
    skipPermissionCheck: (event) => {
      // 开发环境跳过大部分权限检查
      const strictEvents = ['USER_PERMISSION_CHANGE', 'CONFIG_UPDATE'];
      return !strictEvents.includes(event.type);
    }
  });
}

/**
 * 创建生产环境权限中间件（严格权限）
 */
export function createProdPermissionMiddleware(
  getCurrentUser: () => Promise<User | undefined>
): PermissionMiddleware {
  return new PermissionMiddleware({
    getCurrentUser,
    debug: false,
    onPermissionDenied: (context, result) => {
      // 记录权限拒绝事件
      console.warn(`Permission denied: ${context.event.type} for user ${context.user?.name || 'anonymous'}: ${result.reason}`);
    }
  });
}

// ==================== 导出 ====================
// 所有导出已在上面通过 export 关键字直接声明，无需重复导出