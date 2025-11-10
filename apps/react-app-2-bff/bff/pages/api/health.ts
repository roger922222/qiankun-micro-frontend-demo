import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 健康检查端点
  if (req.method === 'GET') {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'react-app-2-bff',
      version: '1.0.0',
      endpoints: [
        'GET /api/products',
        'POST /api/products/create',
        'GET /api/products/[id]',
        'PUT /api/products/[id]',
        'DELETE /api/products/[id]',
        'GET /api/products/stats',
        'POST /api/products/batch-update',
        'POST /api/products/batch-delete',
        'GET /api/categories',
        'POST /api/categories',
        'GET /api/categories/[id]',
        'PUT /api/categories/[id]',
        'DELETE /api/categories/[id]',
        'GET /api/inventory',
        'POST /api/inventory/[productId]',
        'GET /api/pricing',
        'POST /api/pricing',
      ],
    });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}