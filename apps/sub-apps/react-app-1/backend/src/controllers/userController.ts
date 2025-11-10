import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ImportExportService } from '../services/importExportService';
import { validationSchemas, validate } from '../middleware/validation';
import { authMiddleware, requirePermission } from '../middleware/auth';
import { rateLimitConfig } from '../middleware/validation';
import rateLimit from 'express-rate-limit';
import { 
  AppError, 
  ErrorCodes, 
  ErrorFactory, 
  ErrorResponseUtil,
  asyncHandler,
  logRequestError 
} from '../utils/error-handler';
import { logAppError } from '../utils/error-logger';

const userService = new UserService();
const importExportService = new ImportExportService();

// 用户相关操作的限流配置
const userRateLimiter = rateLimit({
  ...rateLimitConfig.strict,
  keyGenerator: (req) => `${req.ip}:user:${req.method}`
});

export const getUsers = [
  authMiddleware,
  requirePermission('USER_VIEW'),
  validate(validationSchemas.user.query, 'query'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await userService.getUsers(req.query);
      
      res.json(ErrorResponseUtil.success({
        data: result.data,
        pagination: result.pagination
      }, '获取用户列表成功'));
    } catch (error) {
      if (error instanceof AppError) {
        logRequestError(error, req);
        res.status(getHttpStatusCode(error.code)).json(error.toErrorResponse());
      } else {
        console.error('获取用户列表错误:', error);
        const appError = ErrorFactory.systemError(
          error as Error,
          { operation: 'getUsers' },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(500).json(appError.toErrorResponse());
      }
    }
  })
];

export const getUserById = [
  authMiddleware,
  requirePermission('USER_VIEW'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // 验证ID格式
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        const error = ErrorFactory.businessError(
          { ...ErrorCodes.INVALID_REQUEST, message: '无效的用户ID格式' },
          { userId: id },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        return res.status(400).json(error.toErrorResponse());
      }
      
      const user = await userService.getUserById(id);
      
      if (!user) {
        return res.status(404).json(ErrorResponseUtil.notFound('用户', id, {
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
          method: req.method
        }));
      }
      
      res.json(ErrorResponseUtil.success({
        data: user
      }, '获取用户详情成功'));
    } catch (error) {
      if (error instanceof AppError) {
        logRequestError(error, req);
        res.status(getHttpStatusCode(error.code)).json(error.toErrorResponse());
      } else {
        console.error('获取用户详情错误:', error);
        const appError = ErrorFactory.systemError(
          error as Error,
          { operation: 'getUserById', userId: req.params.id },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(500).json(appError.toErrorResponse());
      }
    }
  })
];

export const createUser = [
  authMiddleware,
  requirePermission('USER_CREATE'),
  userRateLimiter,
  validate(validationSchemas.user.create),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const newUser = await userService.createUser(req.body);
      
      res.status(201).json(ErrorResponseUtil.success({
        data: newUser
      }, '用户创建成功'));
    } catch (error) {
      if (error instanceof AppError) {
        logRequestError(error, req);
        res.status(getHttpStatusCode(error.code)).json(error.toErrorResponse());
      } else if (error instanceof ValidationError) {
        const appError = ErrorFactory.validationError(
          error.message,
          undefined,
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(400).json(appError.toErrorResponse());
      } else {
        console.error('创建用户错误:', error);
        const appError = ErrorFactory.systemError(
          error as Error,
          { operation: 'createUser' },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(500).json(appError.toErrorResponse());
      }
    }
  })
];

export const updateUser = [
  authMiddleware,
  requirePermission('USER_UPDATE'),
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // 验证ID格式
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        const error = ErrorFactory.businessError(
          { ...ErrorCodes.INVALID_REQUEST, message: '无效的用户ID格式' },
          { userId: id },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        return res.status(400).json(error.toErrorResponse());
      }
      
      // 验证更新数据
      const { error, value } = validationSchemas.user.update.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      
      if (error) {
        const appError = ErrorFactory.validationError(
          '输入数据验证失败',
          { 
            errors: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        return res.status(400).json(appError.toErrorResponse());
      }
      
      const updatedUser = await userService.updateUser(id, value);
      
      if (!updatedUser) {
        return res.status(404).json(ErrorResponseUtil.notFound('用户', id, {
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
          method: req.method
        }));
      }
      
      res.json(ErrorResponseUtil.success({
        data: updatedUser
      }, '用户更新成功'));
    } catch (error) {
      if (error instanceof AppError) {
        logRequestError(error, req);
        res.status(getHttpStatusCode(error.code)).json(error.toErrorResponse());
      } else if (error instanceof ValidationError) {
        const appError = ErrorFactory.validationError(
          error.message,
          undefined,
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(400).json(appError.toErrorResponse());
      } else {
        console.error('更新用户错误:', error);
        const appError = ErrorFactory.systemError(
          error as Error,
          { operation: 'updateUser', userId: req.params.id },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(500).json(appError.toErrorResponse());
      }
    }
  })
];

export const deleteUser = [
  authMiddleware,
  requirePermission('USER_DELETE'),
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // 验证ID格式
      if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        const error = ErrorFactory.businessError(
          { ...ErrorCodes.INVALID_REQUEST, message: '无效的用户ID格式' },
          { userId: id },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        return res.status(400).json(error.toErrorResponse());
      }
      
      const success = await userService.deleteUser(id);
      
      if (!success) {
        return res.status(404).json(ErrorResponseUtil.notFound('用户', id, {
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
          method: req.method
        }));
      }
      
      res.json(ErrorResponseUtil.success({
        message: '用户删除成功'
      }, '用户删除成功'));
    } catch (error) {
      if (error instanceof AppError) {
        logRequestError(error, req);
        res.status(getHttpStatusCode(error.code)).json(error.toErrorResponse());
      } else {
        console.error('删除用户错误:', error);
        const appError = ErrorFactory.systemError(
          error as Error,
          { operation: 'deleteUser', userId: req.params.id },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(500).json(appError.toErrorResponse());
      }
    }
  })
];

export const importUsers = [
  authMiddleware,
  requirePermission('USER_CREATE'),
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        const error = ErrorFactory.businessError(
          { ...ErrorCodes.INVALID_REQUEST, message: '请上传文件' },
          undefined,
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        return res.status(400).json(error.toErrorResponse());
      }

      // 验证文件类型和大小
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!allowedTypes.includes(req.file.mimetype)) {
        const error = ErrorFactory.businessError(
          { ...ErrorCodes.INVALID_FILE_TYPE, message: '不支持的文件类型。请上传Excel文件' },
          { fileType: req.file.mimetype },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        return res.status(400).json(error.toErrorResponse());
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        const error = ErrorFactory.businessError(
          { ...ErrorCodes.FILE_TOO_LARGE, message: '文件大小超过限制。最大允许5MB' },
          { fileSize: req.file.size, maxSize },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        return res.status(400).json(error.toErrorResponse());
      }

      const result = await importExportService.importUsersFromExcel(req.file.buffer);
      
      res.json(ErrorResponseUtil.success({
        data: result
      }, '用户导入成功'));
    } catch (error) {
      if (error instanceof AppError) {
        logRequestError(error, req);
        res.status(getHttpStatusCode(error.code)).json(error.toErrorResponse());
      } else {
        console.error('导入用户错误:', error);
        const appError = ErrorFactory.systemError(
          error as Error,
          { operation: 'importUsers' },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(500).json(appError.toErrorResponse());
      }
    }
  })
];

export const exportUsers = [
  authMiddleware,
  requirePermission('USER_VIEW'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const params = {
        keyword: req.query.keyword as string,
        status: req.query.status as string,
        role: req.query.role as string,
      };

      const buffer = await importExportService.exportUsersToExcel(params);
      
      // 设置安全响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      
      res.send(buffer);
    } catch (error) {
      if (error instanceof AppError) {
        logRequestError(error, req);
        res.status(getHttpStatusCode(error.code)).json(error.toErrorResponse());
      } else {
        console.error('导出用户错误:', error);
        const appError = ErrorFactory.systemError(
          error as Error,
          { operation: 'exportUsers' },
          {
            requestId: req.headers['x-request-id'] as string,
            path: req.path,
            method: req.method
          }
        );
        logRequestError(appError, req);
        res.status(500).json(appError.toErrorResponse());
      }
    }
  })
];