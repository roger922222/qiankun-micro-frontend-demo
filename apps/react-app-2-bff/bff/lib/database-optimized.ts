import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

// 数据库连接池配置（优化版）
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'product_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  
  // 连接池优化配置
  max: 20,                    // 最大连接数
  min: 2,                     // 最小连接数
  idleTimeoutMillis: 30000,   // 空闲连接超时
  connectionTimeoutMillis: 2000, // 连接超时
  statement_timeout: 5000,    // 语句超时5秒
  query_timeout: 5000,      // 查询超时5秒
  
  // 性能优化配置
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true,
  
  // SSL配置（生产环境）
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : undefined,
};

// 创建连接池
const pool = new Pool(poolConfig);

// 数据库连接事件监听
pool.on('connect', (client) => {
  console.log('📊 数据库客户端连接建立');
  
  // 设置会话参数
  client.query('SET statement_timeout = 5000');
  client.query('SET lock_timeout = 3000');
  client.query('SET idle_in_transaction_session_timeout = 60000');
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

// 创建drizzle实例
export const db = drizzle(pool, { schema });

// 数据库工具函数
export const dbUtils = {
  /**
   * 执行原始SQL查询
   */
  async rawQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  },
  
  /**
   * 执行事务
   */
  async transaction<T>(
    callback: (tx: any) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = drizzle(client, { schema });
      const result = await callback(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
  
  /**
   * 批量插入（优化版）
   */
  async batchInsert<T>(
    table: any,
    data: T[],
    batchSize: number = 1000
  ): Promise<void> {
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(table).values(batch);
    }
  },
  
  /**
   * 获取数据库统计信息
   */
  async getStats() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM products) as product_count,
          (SELECT COUNT(*) FROM categories) as category_count,
          (SELECT COUNT(*) FROM inventory_logs WHERE created_at > NOW() - INTERVAL '1 day') as daily_inventory_changes,
          (SELECT COUNT(*) FROM price_logs WHERE created_at > NOW() - INTERVAL '1 day') as daily_price_changes,
          (SELECT COUNT(*) FROM performance_metrics WHERE created_at > NOW() - INTERVAL '1 hour') as hourly_api_calls,
          (SELECT AVG(response_time_ms) FROM performance_metrics WHERE created_at > NOW() - INTERVAL '1 hour') as avg_response_time,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections
      `);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  },
  
  /**
   * 获取慢查询
   */
  async getSlowQueries(limit: number = 10) {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE mean_time > 100  -- 超过100ms的查询
        ORDER BY mean_time DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } finally {
      client.release();
    }
  },
  
  /**
   * 获取表大小信息
   */
  async getTableSizes() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);
      
      return result.rows;
    } finally {
      client.release();
    }
  },
  
  /**
   * 获取索引使用情况
   */
  async getIndexUsage() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          t.tablename,
          indexname,
          c.reltuples::BIGINT AS num_rows,
          pg_size_pretty(pg_relation_size(c.oid)) AS table_size,
          s.idx_scan as index_scans,
          s.seq_scan as seq_scans,
          s.seq_tup_read as seq_tup_read,
          s.idx_tup_fetch as idx_tup_fetch
        FROM pg_tables t
        LEFT JOIN pg_class c ON c.relname = t.tablename
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.tablename
        LEFT JOIN pg_stat_user_indexes i ON i.relname = t.tablename
        WHERE t.schemaname = 'public'
        ORDER BY c.reltuples DESC
      `);
      
      return result.rows;
    } finally {
      client.release();
    }
  },
};

// 数据库健康检查
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency: number;
  details: Record<string, any>;
}> {
  const start = Date.now();
  
  try {
    // 基本连接测试
    await pool.query('SELECT 1');
    
    // 检查连接池状态
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
    
    // 检查数据库统计信息
    const dbStats = await dbUtils.getStats();
    
    // 检查慢查询
    const slowQueries = await dbUtils.getSlowQueries(5);
    
    const latency = Date.now() - start;
    
    // 确定健康状态
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (latency > 1000) {
      status = 'degraded';
    }
    
    if (poolStats.waitingCount > 5 || slowQueries.length > 3) {
      status = 'degraded';
    }
    
    if (latency > 5000 || pool.totalCount === 0) {
      status = 'unhealthy';
    }
    
    return {
      status,
      latency,
      details: {
        poolStats,
        dbStats,
        slowQueries,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      details: {
        error: error.message,
      },
    };
  }
}

// 数据库性能优化
export const dbOptimizer = {
  /**
   * 分析查询执行计划
   */
  async analyzeQuery(query: string, params?: any[]) {
    const client = await pool.connect();
    try {
      const explainResult = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`, params);
      return explainResult.rows[0]['QUERY PLAN'];
    } finally {
      client.release();
    }
  },
  
  /**
   * 重建索引
   */
  async rebuildIndex(tableName: string) {
    const client = await pool.connect();
    try {
      await client.query(`REINDEX TABLE ${tableName}`);
      console.log(`✅ 索引重建完成: ${tableName}`);
    } finally {
      client.release();
    }
  },
  
  /**
   * 更新统计信息
   */
  async updateStatistics(tableName?: string) {
    const client = await pool.connect();
    try {
      if (tableName) {
        await client.query(`ANALYZE ${tableName}`);
        console.log(`✅ 统计信息更新完成: ${tableName}`);
      } else {
        await client.query('ANALYZE');
        console.log('✅ 全库统计信息更新完成');
      }
    } finally {
      client.release();
    }
  },
  
  /**
   * 清理数据库
   */
  async vacuum(tableName?: string) {
    const client = await pool.connect();
    try {
      if (tableName) {
        await client.query(`VACUUM (FULL, ANALYZE) ${tableName}`);
        console.log(`✅ 表清理完成: ${tableName}`);
      } else {
        await client.query('VACUUM (FULL, ANALYZE)');
        console.log('✅ 全库清理完成');
      }
    } finally {
      client.release();
    }
  },
};

export default pool;