import type { NextApiRequest, NextApiResponse } from 'next';
import { productApi } from '@/lib/api';
import { createApiResponse, createPaginatedResponse, validatePagination } from '@/types';
import { validateProductFilter } from '@/lib/validation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGetProducts(req, res);
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

async function handleGetProducts(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 验证查询参数
    const filter = validateProductFilter(req.query as Record<string, string>);
    const { current, pageSize } = validatePagination(req.query as Record<string, string>);
    
    // 获取商品数据
    const products = await productApi.getProducts(filter);
    
    // 分页处理
    const startIndex = (current - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    // 返回分页响应
    res.status(200).json(
      createPaginatedResponse(
        paginatedProducts,
        current,
        pageSize,
        products.length
      )
    );
  } catch (error) {
    console.error('Get products error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, 'Invalid request parameters', error instanceof Error ? error.message : 'Validation error')
    );
  }
}