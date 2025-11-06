import type { NextApiRequest, NextApiResponse } from 'next';
import { productApi } from '@/lib/api';
import { createApiResponse } from '@/types';
import { validateCreateProduct } from '@/lib/validation';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'POST':
        await handleCreateProduct(req, res);
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

async function handleCreateProduct(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 验证请求体
    const productData = validateCreateProduct(req.body);
    
    // 创建商品
    const product = await productApi.createProduct({
      ...productData,
      createdBy: 'system', // 实际项目中应该从认证信息获取
      updatedBy: 'system',
    });
    
    res.status(201).json(
      createApiResponse(true, product, '商品创建成功')
    );
  } catch (error) {
    console.error('Create product error:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '创建商品失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
}