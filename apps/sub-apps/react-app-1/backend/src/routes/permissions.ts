import { Router } from 'express';
import { PermissionRepository } from '../repositories/userRepository';
import { ValidationError } from '../middleware/error';

const router = Router();
const permissionRepository = new PermissionRepository();

// 获取权限列表
router.get('/', async (req, res) => {
  try {
    const permissions = await permissionRepository.findAll();
    
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取权限详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await permissionRepository.findById(id);
    
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: '权限不存在'
      });
    }
    
    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export { router as permissionRoutes };