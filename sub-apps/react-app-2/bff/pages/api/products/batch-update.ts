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
        await handleBatchUpdate(req, res);
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

async function handleBatchUpdate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { ids, updates } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID列表不能为空')
      );
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json(
        createApiResponse(false, undefined, '更新数据不能为空')
      );
    }
    
    const updatedProducts = await productApi.batchUpdateProducts(ids, updates);
    res.status(200).json(
      createApiResponse(true, updatedProducts, `成功更新 ${updatedProducts.length} 个商品`)
    );
  } catch (error) {
    console.error('Batch update products error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '批量更新商品失败', error instanceof Error ? error.message : 'Batch update error')
    );
  }
}