import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './error';
import crypto from 'crypto';

/**
 * 输入验证规则
 */
export const validationSchemas = {
  // 用户相关验证
  user: {
    create: Joi.object({
      username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .required()
        .messages({
          'string.alphanum': '用户名只能包含字母和数字',
          'string.min': '用户名长度至少为3个字符',
          'string.max': '用户名长度不能超过30个字符',
          'any.required': '用户名是必填项'
        }),
      
      email: Joi.string()
        .email({ tlds: { allow: false } })
        .max(100)
        .required()
        .messages({
          'string.email': '请输入有效的邮箱地址',
          'string.max': '邮箱长度不能超过100个字符',
          'any.required': '邮箱是必填项'
        }),
      
      password: Joi.string()
        .min(8)
        .max(128)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
          'string.min': '密码长度至少为8个字符',
          'string.max': '密码长度不能超过128个字符',
          'string.pattern.base': '密码必须包含大小写字母、数字和特殊字符',
          'any.required': '密码是必填项'
        }),
      
      phone: Joi.string()
        .pattern(/^1[3-9]\d{9}$/)
        .optional()
        .messages({
          'string.pattern.base': '请输入有效的手机号码'
        }),
      
      nickname: Joi.string()
        .min(2)
        .max(50)
        .optional()
        .messages({
          'string.min': '昵称长度至少为2个字符',
          'string.max': '昵称长度不能超过50个字符'
        }),
      
      status: Joi.string()
        .valid('active', 'inactive', 'suspended')
        .default('active')
        .messages({
          'any.only': '状态只能是 active、inactive 或 suspended'
        }),
      
      roles: Joi.array()
        .items(Joi.string().uuid())
        .max(10)
        .optional()
        .messages({
          'array.max': '用户角色不能超过10个'
        }),
      
      profile: Joi.object({
        department: Joi.string().max(100).optional(),
        position: Joi.string().max(100).optional(),
        location: Joi.string().max(100).optional(),
        bio: Joi.string().max(500).optional(),
        avatar: Joi.string().uri().optional()
      }).optional()
    }),

    update: Joi.object({
      email: Joi.string()
        .email({ tlds: { allow: false } })
        .max(100)
        .optional()
        .messages({
          'string.email': '请输入有效的邮箱地址',
          'string.max': '邮箱长度不能超过100个字符'
        }),
      
      phone: Joi.string()
        .pattern(/^1[3-9]\d{9}$/)
        .optional()
        .allow(null)
        .messages({
          'string.pattern.base': '请输入有效的手机号码'
        }),
      
      nickname: Joi.string()
        .min(2)
        .max(50)
        .optional()
        .messages({
          'string.min': '昵称长度至少为2个字符',
          'string.max': '昵称长度不能超过50个字符'
        }),
      
      status: Joi.string()
        .valid('active', 'inactive', 'suspended')
        .optional()
        .messages({
          'any.only': '状态只能是 active、inactive 或 suspended'
        }),
      
      roles: Joi.array()
        .items(Joi.string().uuid())
        .max(10)
        .optional()
        .messages({
          'array.max': '用户角色不能超过10个'
        }),
      
      profile: Joi.object({
        department: Joi.string().max(100).optional(),
        position: Joi.string().max(100).optional(),
        location: Joi.string().max(100).optional(),
        bio: Joi.string().max(500).optional(),
        avatar: Joi.string().uri().optional()
      }).optional()
    }),

    query: Joi.object({
      page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .messages({
          'number.base': '页码必须是数字',
          'number.integer': '页码必须是整数',
          'number.min': '页码不能小于1'
        }),
      
      pageSize: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .messages({
          'number.base': '每页数量必须是数字',
          'number.integer': '每页数量必须是整数',
          'number.min': '每页数量不能小于1',
          'number.max': '每页数量不能超过100'
        }),
      
      keyword: Joi.string()
        .max(100)
        .optional()
        .messages({
          'string.max': '搜索关键词长度不能超过100个字符'
        }),
      
      status: Joi.string()
        .valid('all', 'active', 'inactive', 'suspended')
        .default('all')
        .messages({
          'any.only': '状态只能是 all、active、inactive 或 suspended'
        }),
      
      role: Joi.string()
        .max(50)
        .optional()
        .messages({
          'string.max': '角色代码长度不能超过50个字符'
        }),
      
      sortBy: Joi.string()
        .valid('username', 'email', 'createdAt', 'updatedAt', 'status')
        .default('createdAt')
        .messages({
          'any.only': '排序字段只能是 username、email、createdAt、updatedAt 或 status'
        }),
      
      sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
        .messages({
          'any.only': '排序顺序只能是 asc 或 desc'
        })
    })
  },

  // 认证相关验证
  auth: {
    login: Joi.object({
      username: Joi.string()
        .max(50)
        .required()
        .messages({
          'string.max': '用户名长度不能超过50个字符',
          'any.required': '用户名是必填项'
        }),
      
      password: Joi.string()
        .max(128)
        .required()
        .messages({
          'string.max': '密码长度不能超过128个字符',
          'any.required': '密码是必填项'
        }),
      
      rememberMe: Joi.boolean()
        .default(false)
        .messages({
          'boolean.base': '记住我必须是布尔值'
        })
    }),

    refresh: Joi.object({
      refreshToken: Joi.string()
        .required()
        .messages({
          'any.required': '刷新令牌是必填项'
        })
    })
  },

  // 文件上传验证
  file: {
    import: Joi.object({
      file: Joi.any()
        .required()
        .messages({
          'any.required': '文件是必填项'
        })
    })
  }
};

/**
 * 输入清理函数
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  // 移除潜在危险的字符
  return input
    .replace(/[<>]/g, '') // 移除HTML标签
    .replace(/javascript:/gi, '') // 移除javascript协议
    .replace(/on\w+\s*=/gi, '') // 移除事件处理器
    .trim();
};

/**
 * 创建验证中间件
 */
export const validate = (schema: Joi.Schema, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req[source];
      
      // 清理输入数据
      const cleanedData = cleanInputData(data);
      
      // 验证数据
      const { error, value } = schema.validate(cleanedData, {
        abortEarly: false, // 返回所有验证错误
        stripUnknown: true, // 移除未知字段
        convert: true // 自动类型转换
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        return res.status(400).json({
          success: false,
          message: '输入数据验证失败',
          code: 'VALIDATION_ERROR',
          errors: validationErrors
        });
      }

      // 将验证后的数据替换原始数据
      req[source] = value;
      
      next();
    } catch (error) {
      console.error('验证中间件错误:', error);
      return res.status(500).json({
        success: false,
        message: '验证过程发生错误',
        code: 'VALIDATION_PROCESS_ERROR'
      });
    }
  };
};

/**
 * 清理输入数据
 */
function cleanInputData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => cleanInputData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      // 清理键名
      const cleanKey = sanitizeInput(key);
      cleaned[cleanKey] = cleanInputData(value);
    }
    return cleaned;
  }
  
  return data;
}

/**
 * SQL注入防护中间件
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|script|declare|truncate)\b)/gi,
    /(--|\/\*|\*\/)/g,
    /(\b(or|and)\b.*=.*\b(or|and)\b)/gi,
    /(\bunion\b.*\bselect\b)/gi
  ];

  const checkForSQLInjection = (data: any): boolean => {
    if (typeof data === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(data));
    }
    
    if (Array.isArray(data)) {
      return data.some(item => checkForSQLInjection(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some(value => checkForSQLInjection(value));
    }
    
    return false;
  };

  // 检查请求的各个部分
  const requestData = {
    body: req.body,
    query: req.query,
    params: req.params
  };

  if (checkForSQLInjection(requestData)) {
    // 记录安全事件
    console.warn(`[Security] 检测到可能的SQL注入攻击:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      success: false,
      message: '请求包含非法字符',
      code: 'MALICIOUS_INPUT_DETECTED'
    });
  }

  next();
};

/**
 * XSS防护中间件
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction): void => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];

  const checkForXSS = (data: any): boolean => {
    if (typeof data === 'string') {
      return xssPatterns.some(pattern => pattern.test(data));
    }
    
    if (Array.isArray(data)) {
      return data.some(item => checkForXSS(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).some(value => checkForXSS(value));
    }
    
    return false;
  };

  const requestData = {
    body: req.body,
    query: req.query,
    params: req.params
  };

  if (checkForXSS(requestData)) {
    console.warn(`[Security] 检测到可能的XSS攻击:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    return res.status(400).json({
      success: false,
      message: '请求包含非法内容',
      code: 'MALICIOUS_INPUT_DETECTED'
    });
  }

  next();
};

/**
 * 文件上传验证中间件
 */
export const validateFileUpload = (allowedTypes: string[], maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '未上传文件',
        code: 'NO_FILE_UPLOADED'
      });
    }

    // 验证文件类型
    const fileType = req.file.mimetype;
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: `不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`,
        code: 'INVALID_FILE_TYPE'
      });
    }

    // 验证文件大小
    if (req.file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return res.status(400).json({
        success: false,
        message: `文件大小超过限制。最大允许: ${maxSizeMB}MB`,
        code: 'FILE_TOO_LARGE'
      });
    }

    // 验证文件名
    const filename = req.file.originalname;
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const hasSuspiciousExtension = suspiciousExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );

    if (hasSuspiciousExtension) {
      return res.status(400).json({
        success: false,
        message: '上传的文件类型存在安全风险',
        code: 'SUSPICIOUS_FILE_TYPE'
      });
    }

    next();
  };
};

/**
 * 请求大小限制中间件
 */
export const requestSizeLimit = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        success: false,
        message: `请求体大小超过限制。最大允许: ${maxSize}字节`,
        code: 'REQUEST_TOO_LARGE'
      });
    }

    next();
  };
};

/**
 * 参数污染防护中间件
 */
export const parameterPollutionProtection = (req: Request, res: Response, next: NextFunction): void => {
  // 检查查询参数中的数组
  for (const [key, value] of Object.entries(req.query)) {
    if (Array.isArray(value) && value.length > 1) {
      // 只允许特定的参数为数组
      const allowedArrayParams = ['roles', 'permissions', 'ids'];
      if (!allowedArrayParams.includes(key)) {
        // 取第一个值，忽略其他值
        req.query[key] = value[0];
      }
    }
  }

  next();
};

/**
 * 速率限制配置
 */
export const rateLimitConfig = {
  // 通用API限流
  api: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP最多100个请求
    message: '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(req.rateLimit.resetTime / 1000 - Date.now() / 1000)
      });
    }
  },

  // 认证相关限流
  auth: {
    windowMs: 5 * 60 * 1000, // 5分钟
    max: 5, // 每个IP最多5次登录尝试
    message: '登录尝试过于频繁，请5分钟后再试',
    skipSuccessfulRequests: true, // 成功的请求不计入限制
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: '登录尝试过于频繁，请5分钟后再试',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      });
    }
  },

  // 严格限流（用于敏感操作）
  strict: {
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 10, // 每个IP最多10个请求
    message: '操作过于频繁，请稍后再试',
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: '操作过于频繁，请稍后再试',
        code: 'STRICT_RATE_LIMIT_EXCEEDED'
      });
    }
  }
};

export default {
  validationSchemas,
  validate,
  sanitizeInput,
  sqlInjectionProtection,
  xssProtection,
  validateFileUpload,
  requestSizeLimit,
  parameterPollutionProtection,
  rateLimitConfig
};