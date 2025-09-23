import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { ImportExportService } from '../services/importExportService';
import { ValidationError } from '../middleware/error';

const userService = new UserService();
const importExportService = new ImportExportService();

export const getUsers = async (req: Request, res: Response) => {
  try {
    const params = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      keyword: req.query.keyword as string,
      status: req.query.status as string,
      role: req.query.role as string,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
    };

    const result = await userService.getUsers(params);
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const newUser = await userService.createUser(userData);
    
    res.status(201).json({
      success: true,
      data: newUser,
      message: '用户创建成功'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    
    const updatedUser = await userService.updateUser(id, userData);
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      data: updatedUser,
      message: '用户更新成功'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: '服务器内部错误' });
    }
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = await userService.deleteUser(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
};

export const importUsers = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      });
    }

    const result = await importExportService.importUsersFromExcel(req.file.buffer);
    
    res.json({
      success: true,
      data: result,
      message: '用户导入成功'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '导入失败' });
  }
};

export const exportUsers = async (req: Request, res: Response) => {
  try {
    const params = {
      keyword: req.query.keyword as string,
      status: req.query.status as string,
      role: req.query.role as string,
    };

    const buffer = await importExportService.exportUsersToExcel(params);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: '导出失败' });
  }
};