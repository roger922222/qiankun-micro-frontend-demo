import type { NextApiRequest, NextApiResponse } from 'next';
import { pricingApi } from '@/lib/api';
import { createApiResponse } from '@/types';
import { z } from 'zod';

const batchUpdatePricesSchema = z.array(z.object({
  productId: z.string().min(1, '商品ID不能为空'),
  price: z.number().positive('价格必须大于0').max(999999, '价格不能超过999999'),
}));

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'POST':
        await handleBatchUpdatePrices(req, res);
        break;
      
      case 'GET':
        await handleGetPricingStats(req, res);
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

async function handleBatchUpdatePrices(req: NextApiRequest, res: NextApiResponse) {
  try {
    const updates = batchUpdatePricesSchema.parse(req.body);
    
    const updatedProducts = await pricingApi.batchUpdatePrices(updates);
    res.status(200).json(
      createApiResponse(true, updatedProducts, `成功更新 ${updatedProducts.length} 个商品的价格`)
    );
  } catch (error) {
    console.error('Batch update prices error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '批量更新价格失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
}

async function handleGetPricingStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = await pricingApi.getPricingStats();
    res.status(200).json(createApiResponse(true, stats));
  } catch (error) {
    console.error('Get pricing stats error:', error);
    res.status(500).json(
      createApiResponse(false, undefined, '获取价格统计失败', error instanceof Error ? error.message : 'Server error')
    );
  }
}