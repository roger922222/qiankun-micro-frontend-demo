import type { NextApiRequest, NextApiResponse } from 'next';
import { productApi } from '@/lib/api';
import { createApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID不能为空')
      );
    }
    
    switch (req.method) {
      case 'GET':
        await handleGetProduct(req, res, id);
        break;
      
      case 'PUT':
        await handleUpdateProduct(req, res, id);
        break;
      
      case 'DELETE':
        await handleDeleteProduct(req, res, id);
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

async function handleGetProduct(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const product = await productApi.getProductById(id);
    res.status(200).json(createApiResponse(true, product));
  } catch (error) {
    console.error('Get product error:', error);
    res.status(404).json(
      createApiResponse(false, undefined, '商品不存在', error instanceof Error ? error.message : 'Not found')
    );
  }
}

async function handleUpdateProduct(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { validateUpdateProduct } = await import('@/lib/validation');
    const updates = validateUpdateProduct({ ...req.body, id });
    
    const product = await productApi.updateProduct(id, updates);
    res.status(200).json(createApiResponse(true, product, '商品更新成功'));
  } catch (error) {
    console.error('Update product error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '更新商品失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
}

async function handleDeleteProduct(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const product = await productApi.deleteProduct(id);
    res.status(200).json(createApiResponse(true, product, '商品删除成功'));
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '删除商品失败', error instanceof Error ? error.message : 'Delete error')
    );
  }
}