/**
 * 数据验证器
 * 提供通用的数据验证功能
 */

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'phone' | 'idcard';
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FieldValidationResult {
  [field: string]: ValidationResult;
}

/**
 * 验证器类
 */
export class Validator {
  private rules: Record<string, ValidationRule[]> = {};

  /**
   * 添加验证规则
   */
  addRule(field: string, rule: ValidationRule): this {
    if (!this.rules[field]) {
      this.rules[field] = [];
    }
    this.rules[field].push(rule);
    return this;
  }

  /**
   * 添加多个验证规则
   */
  addRules(rules: Record<string, ValidationRule | ValidationRule[]>): this {
    Object.entries(rules).forEach(([field, rule]) => {
      if (Array.isArray(rule)) {
        rule.forEach(r => this.addRule(field, r));
      } else {
        this.addRule(field, rule);
      }
    });
    return this;
  }

  /**
   * 验证单个字段
   */
  validateField(field: string, value: any): ValidationResult {
    const rules = this.rules[field] || [];
    const errors: string[] = [];

    for (const rule of rules) {
      const error = this.validateRule(value, rule, field);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证对象
   */
  validate(data: Record<string, any>): FieldValidationResult {
    const result: FieldValidationResult = {};

    // 验证已定义规则的字段
    Object.keys(this.rules).forEach(field => {
      result[field] = this.validateField(field, data[field]);
    });

    return result;
  }

  /**
   * 验证单个规则
   */
  private validateRule(value: any, rule: ValidationRule, field: string): string | null {
    // 必填验证
    if (rule.required && (value === undefined || value === null || value === '')) {
      return rule.message || `${field} 是必填项`;
    }

    // 如果值为空且不是必填，跳过其他验证
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return null;
    }

    // 类型验证
    if (rule.type) {
      const typeError = this.validateType(value, rule.type, field, rule.message);
      if (typeError) return typeError;
    }

    // 最小值验证
    if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
      return rule.message || `${field} 不能小于 ${rule.min}`;
    }

    // 最大值验证
    if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
      return rule.message || `${field} 不能大于 ${rule.max}`;
    }

    // 最小长度验证
    if (rule.minLength !== undefined) {
      const length = Array.isArray(value) ? value.length : String(value).length;
      if (length < rule.minLength) {
        return rule.message || `${field} 长度不能少于 ${rule.minLength}`;
      }
    }

    // 最大长度验证
    if (rule.maxLength !== undefined) {
      const length = Array.isArray(value) ? value.length : String(value).length;
      if (length > rule.maxLength) {
        return rule.message || `${field} 长度不能超过 ${rule.maxLength}`;
      }
    }

    // 正则验证
    if (rule.pattern && !rule.pattern.test(String(value))) {
      return rule.message || `${field} 格式不正确`;
    }

    // 自定义验证
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult === false) {
        return rule.message || `${field} 验证失败`;
      }
      if (typeof customResult === 'string') {
        return customResult;
      }
    }

    return null;
  }

  /**
   * 类型验证
   */
  private validateType(value: any, type: string, field: string, message?: string): string | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return message || `${field} 必须是字符串`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return message || `${field} 必须是数字`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return message || `${field} 必须是布尔值`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return message || `${field} 必须是数组`;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          return message || `${field} 必须是对象`;
        }
        break;

      case 'email':
        if (!this.isEmail(String(value))) {
          return message || `${field} 邮箱格式不正确`;
        }
        break;

      case 'url':
        if (!this.isUrl(String(value))) {
          return message || `${field} URL格式不正确`;
        }
        break;

      case 'phone':
        if (!this.isPhone(String(value))) {
          return message || `${field} 手机号格式不正确`;
        }
        break;

      case 'idcard':
        if (!this.isIdCard(String(value))) {
          return message || `${field} 身份证号格式不正确`;
        }
        break;
    }

    return null;
  }

  /**
   * 邮箱验证
   */
  private isEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * URL验证
   */
  private isUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 手机号验证
   */
  private isPhone(phone: string): boolean {
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(phone);
  }

  /**
   * 身份证验证
   */
  private isIdCard(idCard: string): boolean {
    const regex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return regex.test(idCard);
  }

  /**
   * 清除所有规则
   */
  clear(): this {
    this.rules = {};
    return this;
  }

  /**
   * 移除字段规则
   */
  removeField(field: string): this {
    delete this.rules[field];
    return this;
  }
}

/**
 * 创建验证器实例
 */
export function createValidator(): Validator {
  return new Validator();
}

/**
 * 快速验证函数
 */
export const validate = {
  /**
   * 验证必填
   */
  required(value: any, message?: string): string | null {
    if (value === undefined || value === null || value === '') {
      return message || '此项为必填项';
    }
    return null;
  },

  /**
   * 验证邮箱
   */
  email(value: string, message?: string): string | null {
    if (!value) return null;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) ? null : (message || '邮箱格式不正确');
  },

  /**
   * 验证手机号
   */
  phone(value: string, message?: string): string | null {
    if (!value) return null;
    const regex = /^1[3-9]\d{9}$/;
    return regex.test(value) ? null : (message || '手机号格式不正确');
  },

  /**
   * 验证URL
   */
  url(value: string, message?: string): string | null {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return message || 'URL格式不正确';
    }
  },

  /**
   * 验证长度范围
   */
  length(value: string | any[], min?: number, max?: number, message?: string): string | null {
    if (!value) return null;
    const length = typeof value === 'string' ? value.length : value.length;
    
    if (min !== undefined && length < min) {
      return message || `长度不能少于 ${min}`;
    }
    
    if (max !== undefined && length > max) {
      return message || `长度不能超过 ${max}`;
    }
    
    return null;
  },

  /**
   * 验证数值范围
   */
  range(value: number, min?: number, max?: number, message?: string): string | null {
    if (value === undefined || value === null) return null;
    
    if (min !== undefined && value < min) {
      return message || `值不能小于 ${min}`;
    }
    
    if (max !== undefined && value > max) {
      return message || `值不能大于 ${max}`;
    }
    
    return null;
  },

  /**
   * 验证正则表达式
   */
  pattern(value: string, pattern: RegExp, message?: string): string | null {
    if (!value) return null;
    return pattern.test(value) ? null : (message || '格式不正确');
  },

  /**
   * 验证密码强度
   */
  password(value: string, options?: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSymbols?: boolean;
  }): string | null {
    if (!value) return null;

    const opts = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: false,
      ...options
    };

    if (value.length < opts.minLength) {
      return `密码长度至少 ${opts.minLength} 位`;
    }

    if (opts.requireUppercase && !/[A-Z]/.test(value)) {
      return '密码必须包含大写字母';
    }

    if (opts.requireLowercase && !/[a-z]/.test(value)) {
      return '密码必须包含小写字母';
    }

    if (opts.requireNumbers && !/\d/.test(value)) {
      return '密码必须包含数字';
    }

    if (opts.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      return '密码必须包含特殊字符';
    }

    return null;
  },

  /**
   * 验证身份证号
   */
  idCard(value: string, message?: string): string | null {
    if (!value) return null;
    const regex = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return regex.test(value) ? null : (message || '身份证号格式不正确');
  },

  /**
   * 验证银行卡号
   */
  bankCard(value: string, message?: string): string | null {
    if (!value) return null;
    // 简单的银行卡号验证（Luhn算法）
    const regex = /^\d{16,19}$/;
    if (!regex.test(value)) {
      return message || '银行卡号格式不正确';
    }

    // Luhn算法验证
    let sum = 0;
    let alternate = false;
    
    for (let i = value.length - 1; i >= 0; i--) {
      let n = parseInt(value.charAt(i), 10);
      
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n = (n % 10) + 1;
        }
      }
      
      sum += n;
      alternate = !alternate;
    }
    
    return sum % 10 === 0 ? null : (message || '银行卡号不正确');
  }
};

/**
 * 表单验证器
 */
export class FormValidator {
  private validators: Record<string, Validator> = {};

  /**
   * 添加字段验证器
   */
  addField(field: string, rules: ValidationRule | ValidationRule[]): this {
    const validator = new Validator();
    if (Array.isArray(rules)) {
      rules.forEach(rule => validator.addRule(field, rule));
    } else {
      validator.addRule(field, rules);
    }
    this.validators[field] = validator;
    return this;
  }

  /**
   * 验证表单
   */
  validate(formData: Record<string, any>): {
    valid: boolean;
    errors: Record<string, string[]>;
    firstError?: string;
  } {
    const errors: Record<string, string[]> = {};
    let firstError: string | undefined;

    Object.entries(this.validators).forEach(([field, validator]) => {
      const result = validator.validateField(field, formData[field]);
      if (!result.valid) {
        errors[field] = result.errors;
        if (!firstError) {
          firstError = result.errors[0];
        }
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      firstError
    };
  }

  /**
   * 验证单个字段
   */
  validateField(field: string, value: any): ValidationResult {
    const validator = this.validators[field];
    if (!validator) {
      return { valid: true, errors: [] };
    }
    return validator.validateField(field, value);
  }

  /**
   * 清除所有验证器
   */
  clear(): this {
    this.validators = {};
    return this;
  }
}

/**
 * 创建表单验证器
 */
export function createFormValidator(): FormValidator {
  return new FormValidator();
}

/**
 * 验证装饰器
 */
export function ValidateProperty(rules: ValidationRule | ValidationRule[]) {
  return function (target: any, propertyKey: string) {
    if (!target._validationRules) {
      target._validationRules = {};
    }
    target._validationRules[propertyKey] = Array.isArray(rules) ? rules : [rules];
  };
}

/**
 * 类验证器
 */
export function validateClass(instance: any): ValidationResult {
  const rules = instance._validationRules || {};
  const errors: string[] = [];

  Object.entries(rules).forEach(([property, propertyRules]) => {
    const value = instance[property];
    const validator = new Validator();
    
    (propertyRules as ValidationRule[]).forEach(rule => {
      validator.addRule(property, rule);
    });
    
    const result = validator.validateField(property, value);
    errors.push(...result.errors);
  });

  return {
    valid: errors.length === 0,
    errors
  };
}