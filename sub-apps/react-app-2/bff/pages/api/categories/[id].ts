import type { NextApiRequest, NextApiResponse } from 'next';
import { categoryApi } from '@/lib/api';
import { createApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json(
        createApiResponse(false, undefined, '分类ID不能为空')
      );
    }
    
    switch (req.method) {
      case 'GET':
        await handleGetCategory(req, res, id);
        break;
      
      case 'PUT':
        await handleUpdateCategory(req, res, id);
        break;
      
      case 'DELETE':
        await handleDeleteCategory(req, res, id);
        break;
      
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json(createApiResponse(false, undefined, 'Method not allowed'));
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json(
      createApiResponse(false, undefined, 'Internal server error', error instanceof Error ? error.message : 'Unknown error')
    );
  }
}

async function handleGetCategory(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const category = await categoryApi.getCategoryById(id);
    res.status(200).json(createApiResponse(true, category));
  } catch (error) {
    console.error('Get category error:', error);
    res.status(404).json(
      createApiResponse(false, undefined, '分类不存在', error instanceof Error ? error.message : 'Not found')
    );
  }
}

async function handleUpdateCategory(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { validateUpdateCategory } = await import('@/lib/validation');
    const updates = validateUpdateCategory({ ...req.body, id });
    
    const category = await categoryApi.updateCategory(id, updates);
    res.status(200).json(createApiResponse(true, category, '分类更新成功'));
  } catch (error) {
    console.error('Update category error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '更新分类失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
}

async function handleDeleteCategory(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const category = await categoryApi.deleteCategory(id);
    res.status(200).json(createApiResponse(true, category, '分类删除成功'));
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '删除分类失败', error instanceof Error ? error.message : 'Delete error')
    );
  }
}