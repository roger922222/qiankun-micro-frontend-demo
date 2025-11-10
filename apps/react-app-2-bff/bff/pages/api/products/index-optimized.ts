import { NextApiRequest, NextApiResponse } from 'next';
import { createProtectedHandler } from '@/lib/middleware';
import { productHandlers, createProtectedProductHandler } from '@/lib/optimized-handlers';
import { createApiResponse } from '@/types';

/**
 * 优化后的商品API处理器
 * 集成：限流、性能监控、缓存、数据库优化
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        // 使用受保护的处理器（包含限流和监控）
        await createProtectedProductHandler('GET', productHandlers.getProducts)(req, res);
        break;
      
      case 'POST':
        await createProtectedProductHandler('POST', productHandlers.createProduct)(req, res);
        break;
      
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json(createApiResponse(false, null, 'Method not allowed'));
    }
  } catch (error) {
    console.error('API错误:', error);
    
    if (!res.headersSent) {
      res.status(500).json(
        createApiResponse(false, null, '服务器内部错误')
      );
    }
  }
}