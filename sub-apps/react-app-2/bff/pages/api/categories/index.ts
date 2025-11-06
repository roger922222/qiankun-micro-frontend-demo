import type { NextApiRequest, NextApiResponse } from 'next';
import { categoryApi } from '@/lib/api';
import { createApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGetCategories(req, res);
        break;
      
      case 'POST':
        await handleCreateCategory(req, res);
        break;
      
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json(createApiResponse(false, undefined, 'Method not allowed'));
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json(
      createApiResponse(false, undefined, 'Internal server error', error instanceof Error ? error.message : 'Unknown error')
    );
  }
}

async function handleGetCategories(req: NextApiRequest, res: NextApiResponse) {
  try {
    const categories = await categoryApi.getCategories();
    res.status(200).json(createApiResponse(true, categories));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json(
      createApiResponse(false, undefined, '获取分类失败', error instanceof Error ? error.message : 'Server error')
    );
  }
}

async function handleCreateCategory(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { validateCreateCategory } = await import('@/lib/validation');
    const categoryData = validateCreateCategory(req.body);
    
    const category = await categoryApi.createCategory(categoryData);
    res.status(201).json(createApiResponse(true, category, '分类创建成功'));
  } catch (error) {
    console.error('Create category error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '创建分类失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
}