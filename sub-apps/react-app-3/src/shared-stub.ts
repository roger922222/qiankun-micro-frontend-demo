/**
 * 共享库存根文件
 * 当共享库不可用时提供基本功能
 */

// 简单的日志记录器存根
export const globalLogger = {
  info: (message: string, ...args: any[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, error?: Error, context?: any) => console.error(`[ERROR] ${message}`, error, context),
  warn: (message: string, ...args: any[]) => console.warn(`[WARN] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[DEBUG] ${message}`, ...args)
};

// 事件总线存根
export const globalEventBus = {
  emit: (event: any) => {
    console.log('[EventBus] Emit:', event);
    return Promise.resolve();
  },
  on: (type: string, handler: Function) => {
    console.log('[EventBus] On:', type);
  },
  off: (type: string, handler: Function) => {
    console.log('[EventBus] Off:', type);
  },
  onAny: (handler: Function) => {
    console.log('[EventBus] OnAny');
  },
  offAny: (handler: Function) => {
    console.log('[EventBus] OffAny');
  }
};

// 事件类型存根
export const EVENT_TYPES = {
  APP_READY: 'APP_READY',
  THEME_CHANGE: 'THEME_CHANGE',
  USER_LOGOUT: 'USER_LOGOUT',
  LANGUAGE_CHANGE: 'LANGUAGE_CHANGE',
  USER_LOGIN: 'USER_LOGIN',
  DATA_UPDATE: 'DATA_UPDATE'
};