import { db } from '@/lib/database';
import { products, categories, inventoryLogs, priceLogs } from '@/lib/schema';
import { eq, and, or, like, inArray, between, desc, asc, sql, count } from 'drizzle-orm';
import { CacheWrapper, CacheKeyGenerator, CacheStrategy } from '@/lib/redis';
import type { Product, ProductCategory, CreateProductDto, UpdateProductDto } from '@/types';

// 数据库API服务
export class DatabaseProductAPI {
  /**
   * 获取商品列表（带缓存）
   */
  async getProducts(filter: any = {}, page: number = 1, pageSize: number = 10) {
    const cacheKey = CacheKeyGenerator.productList(filter, page, pageSize);
    
    return await CacheStrategy.cacheFirst(
      cacheKey,
      async () => {
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        const conditions = [];
        
        if (filter.keyword) {
          conditions.push(
            or(
              like(products.name, `%${filter.keyword}%`),
              like(products.description, `%${filter.keyword}%`),
              sql`${products.tags}::text ILIKE ${`%${filter.keyword}%`}`
            )
          );
        }
        
        if (filter.category) {
          conditions.push(eq(products.categoryId, filter.category));
        }
        
        if (filter.status) {
          conditions.push(eq(products.status, filter.status));
        }
        
        if (filter.minPrice !== undefined) {
          conditions.push(sql`${products.price} >= ${filter.minPrice}`);
        }
        
        if (filter.maxPrice !== undefined) {
          conditions.push(sql`${products.price} <= ${filter.maxPrice}`);
        }
        
        if (filter.tags && filter.tags.length > 0) {
          conditions.push(sql`${products.tags} ?| ${filter.tags}`);
        }
        
        // 构建排序
        let orderBy = desc(products.createdAt);
        if (filter.sortBy) {
          const sortField = {
            name: products.name,
            price: products.price,
            stock: products.stock,
            createdAt: products.createdAt,
            updatedAt: products.updatedAt,
          }[filter.sortBy];
          
          if (sortField) {
            orderBy = filter.sortOrder === 'asc' ? asc(sortField) : desc(sortField);
          }
        }
        
        // 执行查询
        const query = db.select()
          .from(products)
          .$dynamic();
        
        if (conditions.length > 0) {
          query.where(and(...conditions));
        }
        
        // 获取总数
        const totalQuery = db.select({ count: count() })
          .from(products)
          .$dynamic();
        
        if (conditions.length > 0) {
          totalQuery.where(and(...conditions));
        }
        
        const [results, totalResult] = await Promise.all([
          query.orderBy(orderBy).limit(pageSize).offset(offset),
          totalQuery
        ]);
        
        const total = totalResult[0]?.count || 0;
        
        return {
          data: results,
          pagination: {
            current: page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        };
      },
      CACHE_CONFIG.TTL.PRODUCT_LIST
    );
  }
  
  /**
   * 获取单个商品（带缓存）
   */
  async getProductById(id: string) {
    const cacheKey = CacheKeyGenerator.productDetail(id);
    
    return await CacheStrategy.networkFirst(
      cacheKey,
      async () => {
        const result = await db.select()
          .from(products)
          .where(eq(products.id, id))
          .limit(1);
        
        return result[0] || null;
      },
      CACHE_CONFIG.TTL.PRODUCT_DETAIL
    );
  }
  
  /**
   * 创建商品
   */
  async createProduct(data: CreateProductDto & { createdBy: string; updatedBy: string }) {
    const result = await db.insert(products).values({
      ...data,
      images: JSON.stringify(data.images || []),
      tags: JSON.stringify(data.tags || []),
    }).returning();
    
    // 清理相关缓存
    await this.invalidateProductCaches();
    
    return result[0];
  }
  
  /**
   * 更新商品
   */
  async updateProduct(id: string, updates: UpdateProductDto & { updatedBy: string }) {
    const result = await db.update(products)
      .set({
        ...updates,
        images: updates.images ? JSON.stringify(updates.images) : undefined,
        tags: updates.tags ? JSON.stringify(updates.tags) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    
    // 清理缓存
    await this.invalidateProductCaches(id);
    
    return result[0];
  }
  
  /**
   * 删除商品
   */
  async deleteProduct(id: string) {
    const result = await db.delete(products)
      .where(eq(products.id, id))
      .returning();
    
    // 清理缓存
    await this.invalidateProductCaches(id);
    
    return result[0];
  }
  
  /**
   * 批量更新商品
   */
  async batchUpdateProducts(ids: string[], updates: Partial<Product> & { updatedBy: string }) {
    const results = await Promise.all(
      ids.map(id => 
        db.update(products)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id))
          .returning()
      )
    );
    
    // 清理缓存
    await this.invalidateProductCaches();
    
    return results.map(result => result[0]).filter(Boolean);
  }
  
  /**
   * 批量删除商品
   */
  async batchDeleteProducts(ids: string[]) {
    const results = await Promise.all(
      ids.map(id => 
        db.delete(products)
          .where(eq(products.id, id))
          .returning()
      )
    );
    
    // 清理缓存
    await this.invalidateProductCaches();
    
    return results.map(result => result[0]).filter(Boolean);
  }
  
  /**
   * 获取商品统计（带缓存）
   */
  async getProductStats() {
    const cacheKey = CacheKeyGenerator.productStats();
    
    return await CacheStrategy.cacheFirst(
      cacheKey,
      async () => {
        const result = await db.select({
          totalProducts: count(),
          activeProducts: sql`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
          inactiveProducts: sql`COUNT(CASE WHEN status = 'inactive' THEN 1 END)`,
          discontinuedProducts: sql`COUNT(CASE WHEN status = 'discontinued' THEN 1 END)`,
          lowStockProducts: sql`COUNT(CASE WHEN stock < 10 THEN 1 END)`,
          avgPrice: sql`AVG(price)`,
          minPrice: sql`MIN(price)`,
          maxPrice: sql`MAX(price)`,
          totalInventoryValue: sql`SUM(price * stock)`,
        }).from(products);
        
        return result[0];
      },
      CACHE_CONFIG.TTL.PRODUCT_STATS
    );
  }
  
  /**
   * 获取低库存商品
   */
  async getLowStockProducts(threshold: number = 10) {
    const result = await db.select()
      .from(products)
      .where(sql`${products.stock} < ${threshold}`)
      .orderBy(asc(products.stock));
    
    return result;
  }
  
  /**
   * 更新库存
   */
  async updateStock(productId: string, quantity: number, type: 'increase' | 'decrease', reason?: string) {
    return await db.transaction(async (tx) => {
      // 获取当前库存
      const currentProduct = await tx.select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      
      if (!currentProduct[0]) {
        throw new Error('商品不存在');
      }
      
      const currentStock = currentProduct[0].stock;
      const newStock = type === 'increase' ? currentStock + quantity : currentStock - quantity;
      
      if (newStock < 0) {
        throw new Error('库存不足');
      }
      
      // 更新库存
      const updatedProduct = await tx.update(products)
        .set({ stock: newStock })
        .where(eq(products.id, productId))
        .returning();
      
      // 记录库存变更日志
      await tx.insert(inventoryLogs).values({
        productId,
        changeType: type,
        quantity,
        previousStock: currentStock,
        newStock,
        reason,
      });
      
      // 清理缓存
      await this.invalidateProductCaches(productId);
      
      return updatedProduct[0];
    });
  }
  
  /**
   * 批量更新库存
   */
  async batchUpdateStock(updates: Array<{ productId: string; quantity: number; type: 'increase' | 'decrease'; reason?: string }>) {
    const results = await Promise.all(
      updates.map(update => this.updateStock(update.productId, update.quantity, update.type, update.reason))
    );
    
    return results.filter(Boolean);
  }
  
  /**
   * 批量更新价格
   */
  async batchUpdatePrices(updates: Array<{ productId: string; price: number }>, reason?: string) {
    return await Promise.all(
      updates.map(async (update) => {
        return await db.transaction(async (tx) => {
          // 获取当前价格
          const currentProduct = await tx.select()
            .from(products)
            .where(eq(products.id, update.productId))
            .limit(1);
          
          if (!currentProduct[0]) {
            return null;
          }
          
          const oldPrice = currentProduct[0].price;
          
          // 更新价格
          const updatedProduct = await tx.update(products)
            .set({ price: update.price })
            .where(eq(products.id, update.productId))
            .returning();
          
          // 记录价格变更日志
          await tx.insert(priceLogs).values({
            productId: update.productId,
            oldPrice,
            newPrice: update.price,
            reason,
          });
          
          return updatedProduct[0];
        });
      })
    );
  }
  
  /**
   * 获取价格统计
   */
  async getPricingStats() {
    const result = await db.select({
      minPrice: sql`MIN(price)`,
      maxPrice: sql`MAX(price)`,
      avgPrice: sql`AVG(price)`,
      totalValue: sql`SUM(price * stock)`,
      productCount: count(),
    }).from(products);
    
    return result[0];
  }
  
  /**
   * 清理商品相关缓存
   */
  private async invalidateProductCaches(productId?: string) {
    if (productId) {
      // 清理具体商品缓存
      const { CacheInvalidator } = await import('@/lib/redis');
      await CacheInvalidator.invalidateProduct(productId);
    } else {
      // 清理所有商品相关缓存
      const { CacheInvalidator } = await import('@/lib/redis');
      await CacheInvalidator.invalidateAll();
    }
  }
}

// 分类API服务
export class DatabaseCategoryAPI {
  /**
   * 获取分类列表（带缓存）
   */
  async getCategories() {
    const cacheKey = CacheKeyGenerator.categoryList();
    
    return await CacheStrategy.cacheFirst(
      cacheKey,
      async () => {
        const result = await db.select()
          .from(categories)
          .orderBy(asc(categories.sortOrder));
        
        return result;
      },
      CACHE_CONFIG.TTL.CATEGORY_LIST
    );
  }
  
  /**
   * 获取单个分类
   */
  async getCategoryById(id: string) {
    const result = await db.select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    
    return result[0] || null;
  }
  
  /**
   * 创建分类
   */
  async createCategory(data: Omit<ProductCategory, 'id'>) {
    const result = await db.insert(categories).values(data).returning();
    
    // 清理分类缓存
    await this.invalidateCategoryCaches();
    
    return result[0];
  }
  
  /**
   * 更新分类
   */
  async updateCategory(id: string, updates: Partial<ProductCategory>) {
    const result = await db.update(categories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    
    // 清理缓存
    await this.invalidateCategoryCaches(id);
    
    return result[0];
  }
  
  /**
   * 删除分类
   */
  async deleteCategory(id: string) {
    // 检查是否有商品使用该分类
    const productCount = await db.select({ count: count() })
      .from(products)
      .where(eq(products.categoryId, id));
    
    if (productCount[0].count > 0) {
      throw new Error('该分类下还有商品，不能删除');
    }
    
    const result = await db.delete(categories)
      .where(eq(categories.id, id))
      .returning();
    
    // 清理缓存
    await this.invalidateCategoryCaches(id);
    
    return result[0];
  }
  
  /**
   * 清理分类缓存
   */
  private async invalidateCategoryCaches(categoryId?: string) {
    const { CacheInvalidator } = await import('@/lib/redis');
    
    if (categoryId) {
      await CacheInvalidator.invalidateCategory(categoryId);
    } else {
      await CacheWrapper.delPattern(`${CACHE_CONFIG.PREFIX.CATEGORY}*`);
    }
  }
}

// 导出API实例
export const databaseProductApi = new DatabaseProductAPI();
export const databaseCategoryApi = new DatabaseCategoryAPI();