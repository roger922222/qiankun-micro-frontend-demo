import { Router } from 'express';
import { RoleRepository } from '../repositories/userRepository';
import { ValidationError } from '../middleware/error';

const router = Router();
const roleRepository = new RoleRepository();

// 获取角色列表
router.get('/', async (req, res) => {
  try {
    const roles = await roleRepository.findAll();
    
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 获取角色详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const role = await roleRepository.findById(id);
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      });
    }
    
    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 创建角色
router.post('/', async (req, res) => {
  try {
    const { name, code, description, permissions, level } = req.body;
    
    if (!name || !code) {
      throw new ValidationError('角色名称和编码不能为空');
    }
    
    const existingRole = await roleRepository.findByCode(code);
    if (existingRole) {
      throw new ValidationError('角色编码已存在');
    }
    
    const newRole = await roleRepository.create({
      name,
      code,
      description,
      permissions: permissions || [],
      level: level || 1
    });
    
    res.status(201).json({
      success: true,
      data: newRole,
      message: '角色创建成功'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }
});

// 更新角色
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, level } = req.body;
    
    const updatedRole = await roleRepository.update(id, {
      name,
      description,
      permissions,
      level
    });
    
    if (!updatedRole) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      });
    }
    
    res.json({
      success: true,
      data: updatedRole,
      message: '角色更新成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

// 删除角色
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await roleRepository.delete(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '角色不存在'
      });
    }
    
    res.json({
      success: true,
      message: '角色删除成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

export { router as roleRoutes };