/**
 * 中间件系统入口文件
 * 提供便捷的中间件导入和配置
 */

// 事件中间件
export { EventMiddlewareManager, createMiddleware, createInterceptMiddleware, MiddlewareInterceptor } from './event-middleware';
export { LoggingMiddleware, MemoryLogStorage, ConsoleLogStorage, CompositeLogStorage, createLoggingMiddleware, createDevLoggingMiddleware, createProdLoggingMiddleware } from './logging-middleware';
export { PermissionMiddleware, DefaultPermissionStrategy, createPermissionMiddleware, createDevPermissionMiddleware, createProdPermissionMiddleware } from './permission-middleware';
export { RateLimitMiddleware, MemoryRateLimitStorage, SlidingWindowAlgorithm, TokenBucketAlgorithm, FixedWindowAlgorithm, createRateLimitMiddleware, createBasicRateLimitConfig, createDevRateLimitMiddleware, createProdRateLimitMiddleware } from './rate-limit-middleware';
export { DataTransformMiddleware, DateTransformer, NumberTransformer, StringSanitizerTransformer, EventStructureValidator, DataSizeValidator, createDataTransformMiddleware, createBasicDataTransformMiddleware } from './data-transform-middleware';

// 状态中间件
export { StateMiddlewareManager, createStateMiddleware, createInterceptStateMiddleware, StateMiddlewareInterceptor } from './state-middleware';
export { PersistenceMiddleware, LocalStoragePersistence, SessionStoragePersistence, MemoryPersistence, createPersistenceMiddleware, createBasicPersistenceConfig, createDevPersistenceMiddleware, createProdPersistenceMiddleware } from './persistence-middleware';

// 类型导出
export type { EventMiddleware, MiddlewareContext, MiddlewareErrorHandler } from './event-middleware';
export type { LogEntry, LogStorage, LogFilter, LoggingMiddlewareOptions } from './logging-middleware';
export type { Permission, Role, User, PermissionCondition, PermissionContext, PermissionStrategy, PermissionResult, PermissionMiddlewareOptions } from './permission-middleware';
export type { RateLimitConfig, RateLimitResult, RateLimitEntry, RateLimitStorage, RateLimitMiddlewareOptions } from './rate-limit-middleware';
export type { DataTransformer, TransformRule, ValidationRule, DataValidator, ValidationResult, SerializationConfig, DataTransformMiddlewareOptions } from './data-transform-middleware';
export type { StateMiddleware, StateMiddlewareContext, StateMiddlewareErrorHandler } from './state-middleware';
export type { PersistenceStorage, PersistenceConfig, PersistenceMiddlewareOptions } from './persistence-middleware';

// 工厂函数 - 创建预配置的中间件集合

// 导入类用于工厂函数
import { LoggingMiddleware } from './logging-middleware';
import { PermissionMiddleware } from './permission-middleware';
import { RateLimitMiddleware } from './rate-limit-middleware';
import { DataTransformMiddleware } from './data-transform-middleware';
import { PersistenceMiddleware } from './persistence-middleware';

/**
 * 创建开发环境中间件配置
 */
export function createDevMiddlewareConfig() {
  const logging = new LoggingMiddleware({ level: 0 }); // DEBUG level
  const permission = new PermissionMiddleware({ debug: true });
  const rateLimit = new RateLimitMiddleware({ debug: true });
  const dataTransform = new DataTransformMiddleware({ debug: true });
  const persistence = new PersistenceMiddleware({ debug: true });

  return {
    logging,
    permission,
    rateLimit,
    dataTransform,
    persistence
  };
}

/**
 * 创建生产环境中间件配置
 */
export function createProdMiddlewareConfig(getCurrentUser?: () => Promise<any>) {
  const logging = new LoggingMiddleware({ level: 2 }); // WARN level
  const permission = new PermissionMiddleware({ getCurrentUser, debug: false });
  const rateLimit = new RateLimitMiddleware({ debug: false });
  const dataTransform = new DataTransformMiddleware({ debug: false });
  const persistence = new PersistenceMiddleware({ debug: false });

  return {
    logging,
    permission,
    rateLimit,
    dataTransform,
    persistence
  };
}

/**
 * 快速设置事件总线中间件
 */
export function setupEventBusMiddleware(eventBus: any, config: ReturnType<typeof createDevMiddlewareConfig> | ReturnType<typeof createProdMiddlewareConfig>) {
  eventBus.use(config.logging);
  eventBus.use(config.permission);
  eventBus.use(config.rateLimit);
  eventBus.use(config.dataTransform);
}

/**
 * 快速设置状态管理中间件
 */
export function setupStateMiddleware(stateManager: any, config: ReturnType<typeof createDevMiddlewareConfig> | ReturnType<typeof createProdMiddlewareConfig>) {
  stateManager.useStateMiddleware(config.persistence);
}