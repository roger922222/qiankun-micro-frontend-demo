/**
 * 数据转换中间件 - 事件数据格式标准化和转换
 * 提供事件数据的验证、转换、序列化和反序列化功能
 */

import { BaseEvent } from '../../types/events';
import { EventMiddleware } from './event-middleware';

// 类型声明
declare const process: any;

// ==================== 数据转换相关类型定义 ====================

export interface DataTransformer<TInput = any, TOutput = any> {
  name: string;
  transform(data: TInput): Promise<TOutput> | TOutput;
  validate?(data: any): boolean;
  reverse?(data: TOutput): Promise<TInput> | TInput;
}

export interface TransformRule {
  eventTypes: string[];
  transformer: DataTransformer;
  direction: 'in' | 'out' | 'both';
  priority: number;
}

export interface ValidationRule {
  eventTypes: string[];
  validator: DataValidator;
  required: boolean;
}

export interface DataValidator {
  name: string;
  validate(event: BaseEvent): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SerializationConfig {
  format: 'json' | 'msgpack' | 'protobuf' | 'custom';
  customSerializer?: DataSerializer;
  customDeserializer?: DataDeserializer;
}

export type DataSerializer = (data: any) => string | ArrayBuffer;
export type DataDeserializer = (data: string | ArrayBuffer) => any;

// ==================== 内置数据转换器 ====================

/**
 * 日期格式转换器
 */
export class DateTransformer implements DataTransformer {
  public readonly name = 'date';

  constructor(
    private inputFormat: 'iso' | 'timestamp' | 'date-object' = 'iso',
    private outputFormat: 'iso' | 'timestamp' | 'date-object' = 'iso'
  ) {}

  transform(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    return this.transformObject(data);
  }

  private transformObject(obj: any): any {
    if (obj instanceof Date) {
      return this.convertDate(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.transformObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.isDateField(key) && value) {
          result[key] = this.convertDateValue(value);
        } else {
          result[key] = this.transformObject(value);
        }
      }
      return result;
    }

    return obj;
  }

  private isDateField(fieldName: string): boolean {
    const dateFields = ['timestamp', 'createdAt', 'updatedAt', 'date', 'time', 'loginTime', 'lastActivity'];
    return dateFields.some(field => fieldName.toLowerCase().includes(field.toLowerCase()));
  }

  private convertDateValue(value: any): any {
    try {
      let date: Date;

      if (value instanceof Date) {
        date = value;
      } else if (typeof value === 'string') {
        date = new Date(value);
      } else if (typeof value === 'number') {
        date = new Date(value);
      } else {
        return value;
      }

      return this.convertDate(date);
    } catch {
      return value;
    }
  }

  private convertDate(date: Date): any {
    switch (this.outputFormat) {
      case 'iso':
        return date.toISOString();
      case 'timestamp':
        return date.getTime();
      case 'date-object':
        return date;
      default:
        return date.toISOString();
    }
  }

  validate(_data: any): boolean {
    // 简单验证：检查是否包含有效的日期字段
    return true;
  }
}

/**
 * 数字格式转换器
 */
export class NumberTransformer implements DataTransformer {
  public readonly name = 'number';

  constructor(
    private precision?: number,
    private format: 'string' | 'number' = 'number'
  ) {}

  transform(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    return this.transformObject(data);
  }

  private transformObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.isNumberField(key) && typeof value === 'number') {
          result[key] = this.convertNumber(value);
        } else {
          result[key] = this.transformObject(value);
        }
      }
      return result;
    }

    return obj;
  }

  private isNumberField(fieldName: string): boolean {
    const numberFields = ['amount', 'price', 'quantity', 'count', 'size', 'duration', 'percentage'];
    return numberFields.some(field => fieldName.toLowerCase().includes(field.toLowerCase()));
  }

  private convertNumber(value: number): any {
    let result = value;

    if (this.precision !== undefined) {
      result = Number(value.toFixed(this.precision));
    }

    if (this.format === 'string') {
      return result.toString();
    }

    return result;
  }

  validate(_data: any): boolean {
    return true;
  }
}

/**
 * 字符串清理转换器
 */
export class StringSanitizerTransformer implements DataTransformer {
  public readonly name = 'string-sanitizer';

  constructor(
    private options: {
      trim?: boolean;
      toLowerCase?: boolean;
      removeHtml?: boolean;
      maxLength?: number;
    } = {}
  ) {}

  transform(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    return this.transformObject(data);
  }

  private transformObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          result[key] = this.sanitizeString(value);
        } else {
          result[key] = this.transformObject(value);
        }
      }
      return result;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    let result = str;

    if (this.options.trim) {
      result = result.trim();
    }

    if (this.options.toLowerCase) {
      result = result.toLowerCase();
    }

    if (this.options.removeHtml) {
      result = result.replace(/<[^>]*>/g, '');
    }

    if (this.options.maxLength && result.length > this.options.maxLength) {
      result = result.substring(0, this.options.maxLength);
    }

    return result;
  }

  validate(_data: any): boolean {
    return true;
  }
}

// ==================== 内置验证器 ====================

/**
 * 事件结构验证器
 */
export class EventStructureValidator implements DataValidator {
  public readonly name = 'event-structure';

  validate(event: BaseEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需字段
    if (!event.type) {
      errors.push('Event type is required');
    }

    if (!event.source) {
      errors.push('Event source is required');
    }

    if (!event.timestamp) {
      errors.push('Event timestamp is required');
    }

    if (!event.id) {
      errors.push('Event id is required');
    }

    // 检查字段格式
    if (event.timestamp && !this.isValidTimestamp(event.timestamp)) {
      warnings.push('Invalid timestamp format');
    }

    if (event.type && typeof event.type !== 'string') {
      errors.push('Event type must be a string');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private isValidTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp);
    return !isNaN(date.getTime());
  }
}

/**
 * 数据大小验证器
 */
export class DataSizeValidator implements DataValidator {
  public readonly name = 'data-size';

  constructor(private maxSizeBytes: number = 1024 * 1024) {} // 1MB 默认

  validate(event: BaseEvent): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const serialized = JSON.stringify(event);
      const sizeBytes = new Blob([serialized]).size;

      if (sizeBytes > this.maxSizeBytes) {
        errors.push(`Event data size (${sizeBytes} bytes) exceeds maximum allowed size (${this.maxSizeBytes} bytes)`);
      } else if (sizeBytes > this.maxSizeBytes * 0.8) {
        warnings.push(`Event data size (${sizeBytes} bytes) is approaching maximum limit`);
      }
    } catch (error) {
      errors.push('Failed to serialize event data for size validation');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// ==================== 数据转换中间件 ====================

export interface DataTransformMiddlewareOptions {
  transformRules?: TransformRule[];
  validationRules?: ValidationRule[];
  serializationConfig?: SerializationConfig;
  debug?: boolean;
  onValidationError?: (event: BaseEvent, errors: string[]) => void;
  onTransformError?: (event: BaseEvent, error: Error, transformer: DataTransformer) => void;
}

export class DataTransformMiddleware implements EventMiddleware {
  public readonly name = 'data-transform';
  public readonly priority = 40; // 在其他中间件之后，业务逻辑之前

  private transformRules: TransformRule[] = [];
  private validationRules: ValidationRule[] = [];
  private serializationConfig?: SerializationConfig;
  private debug: boolean;
  private onValidationError?: (event: BaseEvent, errors: string[]) => void;
  private onTransformError?: (event: BaseEvent, error: Error, transformer: DataTransformer) => void;

  constructor(options: DataTransformMiddlewareOptions = {}) {
    this.transformRules = options.transformRules || [];
    this.validationRules = options.validationRules || [];
    this.serializationConfig = options.serializationConfig;
    this.debug = options.debug || false;
    this.onValidationError = options.onValidationError;
    this.onTransformError = options.onTransformError;

    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // 添加默认验证规则
    this.addValidationRule({
      eventTypes: ['*'], // 所有事件类型
      validator: new EventStructureValidator(),
      required: true
    });

    this.addValidationRule({
      eventTypes: ['*'],
      validator: new DataSizeValidator(),
      required: false
    });

    // 添加默认转换规则
    this.addTransformRule({
      eventTypes: ['*'],
      transformer: new DateTransformer('iso', 'iso'),
      direction: 'both',
      priority: 100
    });
  }

  async process<T extends BaseEvent>(event: T, next: (event: T) => Promise<void>): Promise<void> {
    if (this.debug) {
      console.log(`[DataTransformMiddleware] Processing event: ${event.type}`);
    }

    // 1. 输入验证
    await this.validateEvent(event);

    // 2. 输入转换
    const transformedEvent = await this.transformEvent(event, 'in');

    // 3. 序列化（如果需要）
    const serializedEvent = this.serializeEvent(transformedEvent);

    // 4. 执行下一个中间件
    await next(serializedEvent);

    if (this.debug) {
      console.log(`[DataTransformMiddleware] Event processed successfully: ${event.type}`);
    }
  }

  /**
   * 验证事件
   */
  private async validateEvent(event: BaseEvent): Promise<void> {
    const applicableRules = this.validationRules.filter(rule => 
      rule.eventTypes.includes('*') || rule.eventTypes.includes(event.type)
    );

    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const rule of applicableRules) {
      try {
        const result = rule.validator.validate(event);
        
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);

        if (!result.valid && rule.required) {
          if (this.debug) {
            console.error(`[DataTransformMiddleware] Validation failed for ${rule.validator.name}:`, result.errors);
          }

          if (this.onValidationError) {
            this.onValidationError(event, result.errors);
          }

          throw new Error(`Validation failed: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        if (rule.required) {
          throw error;
        } else {
          console.warn(`[DataTransformMiddleware] Non-critical validation error:`, error);
        }
      }
    }

    if (this.debug && allWarnings.length > 0) {
      console.warn(`[DataTransformMiddleware] Validation warnings:`, allWarnings);
    }
  }

  /**
   * 转换事件数据
   */
  private async transformEvent<T extends BaseEvent>(event: T, direction: 'in' | 'out'): Promise<T> {
    const applicableRules = this.transformRules
      .filter(rule => 
        (rule.eventTypes.includes('*') || rule.eventTypes.includes(event.type)) &&
        (rule.direction === 'both' || rule.direction === direction)
      )
      .sort((a, b) => a.priority - b.priority);

    let transformedEvent = { ...event };

    for (const rule of applicableRules) {
      try {
        if (this.debug) {
          console.log(`[DataTransformMiddleware] Applying transformer: ${rule.transformer.name}`);
        }

        const transformed = await rule.transformer.transform(transformedEvent);
        transformedEvent = transformed;

      } catch (error) {
        console.error(`[DataTransformMiddleware] Transform error in ${rule.transformer.name}:`, error);
        
        if (this.onTransformError) {
          this.onTransformError(event, error as Error, rule.transformer);
        }

        // 继续处理其他转换器
      }
    }

    return transformedEvent;
  }

  /**
   * 序列化事件
   */
  private serializeEvent<T extends BaseEvent>(event: T): T {
    if (!this.serializationConfig) {
      return event;
    }

    try {
      // 这里可以根据配置进行序列化
      // 目前保持原样，可以扩展支持不同的序列化格式
      return event;
    } catch (error) {
      console.error('[DataTransformMiddleware] Serialization error:', error);
      return event;
    }
  }

  /**
   * 添加转换规则
   */
  addTransformRule(rule: TransformRule): void {
    this.transformRules.push(rule);
    this.transformRules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 移除转换规则
   */
  removeTransformRule(transformerName: string): void {
    this.transformRules = this.transformRules.filter(
      rule => rule.transformer.name !== transformerName
    );
  }

  /**
   * 添加验证规则
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * 移除验证规则
   */
  removeValidationRule(validatorName: string): void {
    this.validationRules = this.validationRules.filter(
      rule => rule.validator.name !== validatorName
    );
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    transformRules: number;
    validationRules: number;
    rulesByEventType: Record<string, number>;
  } {
    const rulesByEventType: Record<string, number> = {};

    [...this.transformRules, ...this.validationRules].forEach(rule => {
      rule.eventTypes.forEach(eventType => {
        rulesByEventType[eventType] = (rulesByEventType[eventType] || 0) + 1;
      });
    });

    return {
      transformRules: this.transformRules.length,
      validationRules: this.validationRules.length,
      rulesByEventType
    };
  }
}

// ==================== 工厂函数 ====================

/**
 * 创建数据转换中间件
 */
export function createDataTransformMiddleware(options: DataTransformMiddlewareOptions = {}): DataTransformMiddleware {
  return new DataTransformMiddleware(options);
}

/**
 * 创建基础数据转换中间件
 */
export function createBasicDataTransformMiddleware(): DataTransformMiddleware {
  const middleware = new DataTransformMiddleware({
    debug: process.env.NODE_ENV === 'development'
  });

  // 添加常用转换器
  middleware.addTransformRule({
    eventTypes: ['*'],
    transformer: new StringSanitizerTransformer({
      trim: true,
      removeHtml: true,
      maxLength: 10000
    }),
    direction: 'both',
    priority: 50
  });

  middleware.addTransformRule({
    eventTypes: ['*'],
    transformer: new NumberTransformer(2, 'number'),
    direction: 'both',
    priority: 60
  });

  return middleware;
}

// ==================== 导出 ====================
// 所有导出已在上面通过 export 关键字直接声明，无需重复导出