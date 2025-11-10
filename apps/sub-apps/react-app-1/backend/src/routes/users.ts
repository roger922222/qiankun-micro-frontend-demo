import { Router } from 'express';
import multer from 'multer';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  importUsers,
  exportUsers
} from '../controllers/userController';
import { requirePermission } from '../middleware/auth';
import { cacheMiddleware, cacheEvictMiddleware } from '../middleware/cache';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('只支持Excel文件'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// 用户管理路由 - 添加缓存支持
router.get('/', 
  cacheMiddleware({ 
    ttl: 300, // 5分钟缓存
    key: (req: any) => `users:list:${JSON.stringify(req.query)}`
  }), 
  getUsers
);

router.get('/:id', 
  cacheMiddleware({ 
    ttl: 600, // 10分钟缓存
    key: (req: any) => `users:${req.params.id}`
  }), 
  getUserById
);

router.post('/', 
  cacheEvictMiddleware(['users:list:*']), // 清理用户列表缓存
  createUser
);

router.put('/:id', 
  (req, res, next) => {
    // 动态生成缓存清理模式
    const patterns = [`users:${req.params.id}`, 'users:list:*'];
    cacheEvictMiddleware(patterns)(req, res, next);
  },
  updateUser
);

router.delete('/:id', 
  (req, res, next) => {
    // 动态生成缓存清理模式
    const patterns = [`users:${req.params.id}`, 'users:list:*'];
    cacheEvictMiddleware(patterns)(req, res, next);
  },
  deleteUser
);

// 导入导出
router.post('/import', upload.single('file'), importUsers);
router.get('/export', exportUsers);

export { router as userRoutes };