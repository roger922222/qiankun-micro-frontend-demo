import type { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>React App 2 BFF</title>
        <meta name="description" content="商品管理子应用 BFF层" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ padding: '2rem' }}>
        <h1>React App 2 BFF 服务</h1>
        <p>商品管理子应用的后端服务层</p>
        
        <div style={{ marginTop: '2rem' }}>
          <h2>可用 API 端点</h2>
          <ul>
            <li>GET /api/health - 健康检查</li>
            <li>GET /api/products - 获取商品列表</li>
            <li>POST /api/products/create - 创建商品</li>
            <li>GET /api/products/[id] - 获取单个商品</li>
            <li>PUT /api/products/[id] - 更新商品</li>
            <li>DELETE /api/products/[id] - 删除商品</li>
            <li>GET /api/products/stats - 商品统计</li>
            <li>POST /api/products/batch-update - 批量更新商品</li>
            <li>POST /api/products/batch-delete - 批量删除商品</li>
            <li>GET /api/categories - 获取分类列表</li>
            <li>POST /api/categories - 创建分类</li>
            <li>GET /api/categories/[id] - 获取单个分类</li>
            <li>PUT /api/categories/[id] - 更新分类</li>
            <li>DELETE /api/categories/[id] - 删除分类</li>
            <li>GET /api/inventory - 获取低库存商品</li>
            <li>POST /api/inventory/[productId] - 更新库存</li>
            <li>GET /api/pricing - 获取价格统计</li>
            <li>POST /api/pricing - 批量更新价格</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Home;