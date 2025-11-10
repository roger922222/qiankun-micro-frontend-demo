import type { NextApiRequest, NextApiResponse } from 'next';
import { inventoryApi } from '@/lib/api';
import { createApiResponse } from '@/types';
import { z } from 'zod';

const updateStockSchema = z.object({
  quantity: z.number().int().positive('数量必须为正整数'),
  type: z.enum(['increase', 'decrease']),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { productId } = req.query;
    
    if (!productId || typeof productId !== 'string') {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID不能为空')
      );
    }
    
    switch (req.method) {
      case 'POST':
        await handleUpdateStock(req, res, productId);
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

async function handleUpdateStock(req: NextApiRequest, res: NextApiResponse, productId: string) {
  try {
    const validatedData = updateStockSchema.parse(req.body);
    
    const product = await inventoryApi.updateStock(
      productId,
      validatedData.quantity,
      validatedData.type
    );
    
    res.status(200).json(
      createApiResponse(true, product, '库存更新成功')
    );
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '更新库存失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
}