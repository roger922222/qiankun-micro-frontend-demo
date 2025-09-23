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

// 用户管理路由
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

// 导入导出
router.post('/import', upload.single('file'), importUsers);
router.get('/export', exportUsers);

export { router as userRoutes };