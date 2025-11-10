import type { NextApiRequest, NextApiResponse } from 'next';
import { inventoryApi } from '@/lib/api';
import { createApiResponse } from '@/types';
import { z } from 'zod';

const batchUpdateStockSchema = z.array(z.object({
  productId: z.string().min(1, '商品ID不能为空'),
  quantity: z.number().int().positive('数量必须为正整数'),
  type: z.enum(['increase', 'decrease']),
}));

const lowStockSchema = z.object({
  threshold: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'POST':
        await handleBatchUpdateStock(req, res);
        break;
      
      case 'GET':
        await handleGetLowStockProducts(req, res);
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

async function handleBatchUpdateStock(req: NextApiRequest, res: NextApiResponse) {
  try {
    const updates = batchUpdateStockSchema.parse(req.body);
    
    const updatedProducts = await inventoryApi.batchUpdateStock(updates);
    res.status(200).json(
      createApiResponse(true, updatedProducts, `成功更新 ${updatedProducts.length} 个商品的库存`)
    );
  } catch (error) {
    console.error('Batch update stock error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '批量更新库存失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
}

async function handleGetLowStockProducts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { threshold } = lowStockSchema.parse(req.query);
    
    const products = await inventoryApi.getLowStockProducts(threshold || 10);
    res.status(200).json(createApiResponse(true, products));
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json(
      createApiResponse(false, undefined, '获取低库存商品失败', error instanceof Error ? error.message : 'Server error')
    );
  }
}