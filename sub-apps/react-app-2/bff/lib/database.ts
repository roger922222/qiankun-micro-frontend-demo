import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema';

// 数据库连接配置
const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'product_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 5000, // 5秒超时
  query_timeout: 5000,
};

// 创建连接池
const pool = new Pool(poolConfig);

// 创建drizzle实例
export const db = drizzle(pool, { schema });

// 数据库连接测试
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
}

// 数据库健康检查
export async function checkHealth(): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    const latency = Date.now() - start;
    return { status: 'healthy', latency };
  } catch (error) {
    return { status: 'unhealthy', latency: Date.now() - start };
  }
}

// 获取数据库统计信息
export async function getDatabaseStats() {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM products) as product_count,
        (SELECT COUNT(*) FROM categories) as category_count,
        (SELECT COUNT(*) FROM inventory_logs WHERE created_at > NOW() - INTERVAL '1 day') as daily_inventory_changes,
        (SELECT COUNT(*) FROM price_logs WHERE created_at > NOW() - INTERVAL '1 day') as daily_price_changes,
        (SELECT COUNT(*) FROM performance_metrics WHERE created_at > NOW() - INTERVAL '1 hour') as hourly_api_calls,
        (SELECT AVG(response_time_ms) FROM performance_metrics WHERE created_at > NOW() - INTERVAL '1 hour') as avg_response_time
    `);
    return result.rows[0];
  } catch (error) {
    console.error('获取数据库统计信息失败:', error);
    return null;
  }
}

// 连接池事件监听
pool.on('connect', (client) => {
  console.log('📊 数据库客户端连接建立');
});

pool.on('acquire', (client) => {
  console.log('📈 数据库连接被获取');
});

pool.on('remove', (client) => {
  console.log('📉 数据库客户端连接移除');
});

pool.on('error', (err) => {
  console.error('💥 数据库连接池错误:', err);
});

export default pool;