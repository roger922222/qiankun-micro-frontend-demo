import type { NextApiRequest, NextApiResponse } from 'next';
import { productApi } from '@/lib/api';
import { createApiResponse } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGetStats(req, res);
        break;
      
      default:
        res.setHeader('Allow', ['GET']);
        res.status(405).json(createApiResponse(false, undefined, 'Method not allowed'));
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json(
      createApiResponse(false, undefined, 'Internal server error', error instanceof Error ? error.message : 'Unknown error')
    );
  }
}

async function handleGetStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    const stats = await productApi.getProductStats();
    res.status(200).json(createApiResponse(true, stats));
  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json(
      createApiResponse(false, undefined, '获取商品统计失败', error instanceof Error ? error.message : 'Server error')
    );
  }
}