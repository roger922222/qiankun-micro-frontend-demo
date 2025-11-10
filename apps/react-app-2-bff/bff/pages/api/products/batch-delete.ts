import type { NextApiRequest, NextApiResponse } from 'next';
import { productApi } from '@/lib/api';
import { createApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'POST':
        await handleBatchDelete(req, res);
        break;
      
      default:
        res.setHeader('Allow', ['POST']);
        res.status(405).json(createApiResponse(false, undefined, 'Method not allowed'));
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json(
      createApiResponse(false, undefined, 'Internal server error', error instanceof Error ? error.message : 'Unknown error')
    );
  }
}

async function handleBatchDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID列表不能为空')
      );
    }
    
    const deletedProducts = await productApi.batchDeleteProducts(ids);
    res.status(200).json(
      createApiResponse(true, deletedProducts, `成功删除 ${deletedProducts.length} 个商品`)
    );
  } catch (error) {
    console.error('Batch delete products error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '批量删除商品失败', error instanceof Error ? error.message : 'Batch delete error')
    );
  }
}