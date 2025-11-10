import { db } from '@/lib/database';
import { products } from '@/lib/schema';
import { asc, desc, sql } from 'drizzle-orm';

// 游标分页配置
export interface CursorPaginationOptions {
  cursor?: string;
  limit: number;
  orderBy: 'createdAt' | 'updatedAt' | 'name' | 'price';
  orderDirection: 'asc' | 'desc';
}

export interface CursorPaginationResult<T> {
  data: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
  totalCount: number;
}

// 游标编解码器
export class CursorCodec {
  /**
   * 编码游标
   */
  static encode(cursor: { id: string; value: any }): string {
    const data = JSON.stringify(cursor);
    return Buffer.from(data).toString('base64');
  }
  
  /**
   * 解码游标
   */
  static decode<T>(encodedCursor: string): { id: string; value: T } | null {
    try {
      const data = Buffer.from(encodedCursor, 'base64').toString();
      return JSON.parse(data);
    } catch (error) {
      console.error('游标解码失败:', error);
      return null;
    }
  }
}

// 高效分页查询器
export class EfficientPaginator {
  /**
   * 游标分页查询
   * 使用WHERE条件替代OFFSET，提高大数据集性能
   */
  async cursorPagination(
    options: CursorPaginationOptions
  ): Promise<CursorPaginationResult<any>> {
    const { cursor, limit, orderBy, orderDirection } = options;
    
    // 构建排序字段
    const orderField = {
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      name: products.name,
      price: products.price,
    }[orderBy] || products.createdAt;
    
    const orderFunction = orderDirection === 'asc' ? asc : desc;
    
    // 解码游标
    let cursorData = null;
    if (cursor) {
      cursorData = CursorCodec.decode(cursor);
    }
    
    // 构建查询条件
    const conditions = [];
    if (cursorData) {
      // 使用游标条件替代OFFSET
      if (orderDirection === 'asc') {
        conditions.push(
          sql`${orderField} > ${cursorData.value} OR (${orderField} = ${cursorData.value} AND ${products.id} > ${cursorData.id})`
        );
      } else {
        conditions.push(
          sql`${orderField} < ${cursorData.value} OR (${orderField} = ${cursorData.value} AND ${products.id} < ${cursorData.id})`
        );
      }
    }
    
    // 执行查询（多取一条用于判断是否有下一页）
    const query = db.select()
      .from(products)
      .$dynamic();
    
    if (conditions.length > 0) {
      query.where(conditions[0]);
    }
    
    const results = await query
      .orderBy(orderFunction(orderField), orderFunction(products.id))
      .limit(limit + 1);
    
    // 判断是否有下一页
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;
    
    // 生成下一页游标
    let nextCursor: string | undefined;
    if (hasNextPage && data.length > 0) {
      const lastItem = data[data.length - 1];
      const cursorValue = lastItem[orderBy as keyof typeof lastItem];
      nextCursor = CursorCodec.encode({
        id: lastItem.id,
        value: cursorValue,
      });
    }
    
    // 获取总数（用于显示进度）
    const totalResult = await db.select({ count: sql`COUNT(*)` }).from(products);
    const totalCount = Number(totalResult[0].count);
    
    return {
      data,
      hasNextPage,
      hasPreviousPage: !!cursor,
      nextCursor,
      previousCursor: cursor,
      totalCount,
    };
  }
  
  /**
   * 键集分页（Keyset Pagination）
   * 适用于排序字段不唯一的情况
   */
  async keysetPagination(
    options: CursorPaginationOptions & {
      searchKeyword?: string;
      categoryId?: string;
      status?: string;
      minPrice?: number;
      maxPrice?: number;
    }
  ): Promise<CursorPaginationResult<any>> {
    const {
      cursor,
      limit,
      orderBy,
      orderDirection,
      searchKeyword,
      categoryId,
      status,
      minPrice,
      maxPrice,
    } = options;
    
    // 构建基础查询
    let query = db.select().from(products).$dynamic();
    
    // 添加搜索条件
    const conditions = [];
    
    if (searchKeyword) {
      conditions.push(
        sql`(${products.name} ILIKE ${`%${searchKeyword}%`} OR 
             ${products.description} ILIKE ${`%${searchKeyword}%`} OR 
             ${products.tags}::text ILIKE ${`%${searchKeyword}%`})`
      );
    }
    
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }
    
    if (status) {
      conditions.push(eq(products.status, status));
    }
    
    if (minPrice !== undefined) {
      conditions.push(sql`${products.price} >= ${minPrice}`);
    }
    
    if (maxPrice !== undefined) {
      conditions.push(sql`${products.price} <= ${maxPrice}`);
    }
    
    // 添加游标条件
    if (cursor) {
      const cursorData = CursorCodec.decode(cursor);
      if (cursorData) {
        const orderField = {
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          name: products.name,
          price: products.price,
        }[orderBy] || products.createdAt;
        
        if (orderDirection === 'asc') {
          conditions.push(
            sql`(${orderField} > ${cursorData.value} OR 
                 (${orderField} = ${cursorData.value} AND ${products.id} > ${cursorData.id}))`
          );
        } else {
          conditions.push(
            sql`(${orderField} < ${cursorData.value} OR 
                 (${orderField} = ${cursorData.value} AND ${products.id} < ${cursorData.id}))`
          );
        }
      }
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    
    // 构建排序字段
    const orderField = {
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      name: products.name,
      price: products.price,
    }[orderBy] || products.createdAt;
    
    const orderFunction = orderDirection === 'asc' ? asc : desc;
    
    // 执行查询
    const results = await query
      .orderBy(orderFunction(orderField), orderFunction(products.id))
      .limit(limit + 1);
    
    // 处理结果
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;
    
    // 生成游标
    let nextCursor: string | undefined;
    if (hasNextPage && data.length > 0) {
      const lastItem = data[data.length - 1];
      const cursorValue = lastItem[orderBy as keyof typeof lastItem];
      nextCursor = CursorCodec.encode({
        id: lastItem.id,
        value: cursorValue,
      });
    }
    
    // 获取总数（带过滤条件）
    let totalQuery = db.select({ count: sql`COUNT(*)` }).from(products).$dynamic();
    
    if (conditions.length > 0) {
      totalQuery = totalQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    
    const totalResult = await totalQuery;
    const totalCount = Number(totalResult[0].count);
    
    return {
      data,
      hasNextPage,
      hasPreviousPage: !!cursor,
      nextCursor,
      previousCursor: cursor,
      totalCount,
    };
  }
  
  /**
   * 时间范围分页
   * 适用于时间序列数据
   */
  async timeRangePagination(
    startDate: Date,
    endDate: Date,
    limit: number,
    cursor?: string
  ): Promise<CursorPaginationResult<any>> {
    let query = db.select()
      .from(products)
      .where(
        and(
          sql`${products.createdAt} >= ${startDate}`,
          sql`${products.createdAt} <= ${endDate}`
        )
      )
      .$dynamic();
    
    // 添加游标条件
    if (cursor) {
      const cursorData = CursorCodec.decode(cursor);
      if (cursorData) {
        query = query.where(sql`${products.createdAt} > ${cursorData.value}`);
      }
    }
    
    // 执行查询
    const results = await query
      .orderBy(asc(products.createdAt), asc(products.id))
      .limit(limit + 1);
    
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;
    
    // 生成游标
    let nextCursor: string | undefined;
    if (hasNextPage && data.length > 0) {
      const lastItem = data[data.length - 1];
      nextCursor = CursorCodec.encode({
        id: lastItem.id,
        value: lastItem.createdAt,
      });
    }
    
    return {
      data,
      hasNextPage,
      hasPreviousPage: !!cursor,
      nextCursor,
      previousCursor: cursor,
      totalCount: data.length, // 时间范围内的总数
    };
  }
  
  /**
   * 性能分析
   */
  async analyzePerformance() {
    const client = await pool.connect();
    try {
      // 分析查询执行计划
      const explainResult = await client.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) 
        SELECT * FROM products 
        WHERE created_at > NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      
      return explainResult.rows[0]['QUERY PLAN'];
    } finally {
      client.release();
    }
  }
  
  /**
   * 获取分页性能统计
   */
  async getPaginationStats() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_products,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as recent_products,
          AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds,
          MIN(created_at) as oldest_product,
          MAX(created_at) as newest_product
        FROM products
      `);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }
}

// 分页优化器
export class PaginationOptimizer {
  /**
   * 选择最优分页策略
   */
  static selectOptimalStrategy(
    totalCount: number,
    limit: number,
    hasFilters: boolean,
    orderBy: string
  ): 'offset' | 'cursor' | 'keyset' {
    // 小数据集使用OFFSET
    if (totalCount < 10000) {
      return 'offset';
    }
    
    // 有复杂过滤条件使用键集分页
    if (hasFilters && totalCount > 50000) {
      return 'keyset';
    }
    
    // 大数据集使用游标分页
    if (totalCount > 100000) {
      return 'cursor';
    }
    
    // 默认使用游标分页
    return 'cursor';
  }
  
  /**
   * 计算最优页面大小
   */
  static calculateOptimalPageSize(
    totalCount: number,
    clientMemory: number = 50 * 1024 * 1024 // 50MB
  ): number {
    // 假设每行数据平均2KB
    const avgRowSize = 2048;
    const maxRows = Math.floor(clientMemory / avgRowSize);
    
    // 根据总数调整页面大小
    if (totalCount < 1000) {
      return Math.min(100, maxRows);
    } else if (totalCount < 10000) {
      return Math.min(50, maxRows);
    } else {
      return Math.min(20, maxRows);
    }
  }
  
  /**
   * 建议索引优化
   */
  static suggestIndexOptimizations(
    queryPattern: {
      filters: string[];
      orderBy: string;
      joinTables: string[];
    }
  ): string[] {
    const suggestions: string[] = [];
    
    const { filters, orderBy, joinTables } = queryPattern;
    
    // 建议复合索引
    if (filters.length > 0) {
      const filterFields = filters.join('_');
      suggestions.push(`CREATE INDEX idx_${filterFields}_${orderBy} ON products (${filterFields}, ${orderBy});`);
    }
    
    // 建议覆盖索引
    if (filters.length > 0 && joinTables.length === 0) {
      suggestions.push(`CREATE INDEX idx_covering_${orderBy} ON products (${orderBy}) INCLUDE (name, price, status);`);
    }
    
    // 建议部分索引
    if (filters.includes('status')) {
      suggestions.push(`CREATE INDEX idx_active_products ON products (created_at) WHERE status = 'active';`);
    }
    
    return suggestions;
  }
}

// 导出实例
export const efficientPaginator = new EfficientPaginator();
export const paginationOptimizer = new PaginationOptimizer;