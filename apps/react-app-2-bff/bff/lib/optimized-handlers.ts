import { NextApiRequest, NextApiResponse } from 'next';
import { databaseProductApi, databaseCategoryApi } from '@/lib/database-api';
import { createApiResponse, createPaginatedResponse } from '@/types';
import { validateProductFilter, validatePagination } from '@/lib/validation';
import { performanceMonitor } from '@/lib/performance-monitor';
import { createProtectedHandler } from '@/lib/middleware';

/**
 * 获取商品列表（优化版本）
 * 支持缓存、数据库查询优化、全文搜索
 */
const handleGetProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // 验证查询参数
    const filter = validateProductFilter(req.query as Record<string, string>);
    const { current, pageSize } = validatePagination(req.query as Record<string, string>);
    
    // 监控数据库查询性能
    const result = await performanceMonitor.monitorDatabase(
      'getProducts',
      async () => {
        return await databaseProductApi.getProducts(filter, current, pageSize);
      }
    );
    
    res.status(200).json(
      createPaginatedResponse(
        result.data,
        current,
        pageSize,
        result.pagination.total
      )
    );
  } catch (error) {
    console.error('获取商品列表错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '获取商品列表失败', error instanceof Error ? error.message : 'Database error')
    );
  }
};

/**
 * 创建商品（优化版本）
 * 支持事务、缓存失效、数据验证
 */
const handleCreateProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { validateCreateProduct } = await import('@/lib/validation');
    const productData = validateCreateProduct(req.body);
    
    // 监控数据库操作性能
    const product = await performanceMonitor.monitorDatabase(
      'createProduct',
      async () => {
        return await databaseProductApi.createProduct({
          ...productData,
          createdBy: 'system', // 实际项目中应该从认证信息获取
          updatedBy: 'system',
        });
      }
    );
    
    res.status(201).json(
      createApiResponse(true, product, '商品创建成功')
    );
  } catch (error) {
    console.error('创建商品错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '创建商品失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
};

/**
 * 获取商品统计（优化版本）
 * 支持缓存、聚合查询
 */
const handleGetStats = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // 监控数据库查询性能
    const stats = await performanceMonitor.monitorDatabase(
      'getProductStats',
      async () => {
        return await databaseProductApi.getProductStats();
      }
    );
    
    res.status(200).json(createApiResponse(true, stats));
  } catch (error) {
    console.error('获取商品统计错误:', error);
    res.status(500).json(
      createApiResponse(false, undefined, '获取商品统计失败', error instanceof Error ? error.message : 'Server error')
    );
  }
};

/**
 * 获取低库存商品（优化版本）
 * 支持索引查询、缓存
 */
const handleGetLowStockProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 10;
    
    // 监控数据库查询性能
    const products = await performanceMonitor.monitorDatabase(
      'getLowStockProducts',
      async () => {
        return await databaseProductApi.getLowStockProducts(threshold);
      }
    );
    
    res.status(200).json(createApiResponse(true, products));
  } catch (error) {
    console.error('获取低库存商品错误:', error);
    res.status(500).json(
      createApiResponse(false, undefined, '获取低库存商品失败', error instanceof Error ? error.message : 'Server error')
    );
  }
};

/**
 * 批量更新商品（优化版本）
 * 支持事务、批量操作、缓存失效
 */
const handleBatchUpdate = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { ids, updates } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID列表不能为空')
      );
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json(
        createApiResponse(false, undefined, '更新数据不能为空')
      );
    }
    
    // 监控数据库批量操作性能
    const updatedProducts = await performanceMonitor.monitorDatabase(
      'batchUpdateProducts',
      async () => {
        return await databaseProductApi.batchUpdateProducts(ids, {
          ...updates,
          updatedBy: 'system',
        });
      }
    );
    
    res.status(200).json(
      createApiResponse(true, updatedProducts, `成功更新 ${updatedProducts.length} 个商品`)
    );
  } catch (error) {
    console.error('批量更新商品错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '批量更新商品失败', error instanceof Error ? error.message : 'Batch update error')
    );
  }
};

/**
 * 批量删除商品（优化版本）
 * 支持事务、批量操作、缓存失效
 */
const handleBatchDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID列表不能为空')
      );
    }
    
    // 监控数据库批量操作性能
    const deletedProducts = await performanceMonitor.monitorDatabase(
      'batchDeleteProducts',
      async () => {
        return await databaseProductApi.batchDeleteProducts(ids);
      }
    );
    
    res.status(200).json(
      createApiResponse(true, deletedProducts, `成功删除 ${deletedProducts.length} 个商品`)
    );
  } catch (error) {
    console.error('批量删除商品错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '批量删除商品失败', error instanceof Error ? error.message : 'Batch delete error')
    );
  }
};

/**
 * 更新库存（优化版本）
 * 支持事务、库存日志、缓存失效
 */
const handleUpdateStock = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { productId } = req.query;
    const { quantity, type, reason } = req.body;
    
    if (!productId || typeof productId !== 'string') {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID不能为空')
      );
    }
    
    // 监控数据库事务性能
    const product = await performanceMonitor.monitorDatabase(
      'updateStock',
      async () => {
        return await databaseProductApi.updateStock(
          productId,
          quantity,
          type,
          reason
        );
      }
    );
    
    res.status(200).json(
      createApiResponse(true, product, '库存更新成功')
    );
  } catch (error) {
    console.error('更新库存错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '更新库存失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
};

/**
 * 批量更新库存（优化版本）
 * 支持事务、库存日志、并发处理
 */
const handleBatchUpdateStock = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const updates = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json(
        createApiResponse(false, undefined, '更新列表不能为空')
      );
    }
    
    // 监控数据库批量操作性能
    const updatedProducts = await performanceMonitor.monitorDatabase(
      'batchUpdateStock',
      async () => {
        return await databaseProductApi.batchUpdateStock(updates);
      }
    );
    
    res.status(200).json(
      createApiResponse(true, updatedProducts, `成功更新 ${updatedProducts.length} 个商品的库存`)
    );
  } catch (error) {
    console.error('批量更新库存错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '批量更新库存失败', error instanceof Error ? error.message : 'Batch update error')
    );
  }
};

/**
 * 批量更新价格（优化版本）
 * 支持事务、价格日志、缓存失效
 */
const handleBatchUpdatePrices = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const updates = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json(
        createApiResponse(false, undefined, '价格更新列表不能为空')
      );
    }
    
    // 监控数据库批量操作性能
    const updatedProducts = await performanceMonitor.monitorDatabase(
      'batchUpdatePrices',
      async () => {
        return await databaseProductApi.batchUpdatePrices(updates);
      }
    );
    
    res.status(200).json(
      createApiResponse(true, updatedProducts, `成功更新 ${updatedProducts.length} 个商品的价格`)
    );
  } catch (error) {
    console.error('批量更新价格错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '批量更新价格失败', error instanceof Error ? error.message : 'Batch update error')
    );
  }
};

/**
 * 获取价格统计（优化版本）
 * 支持聚合查询、缓存
 */
const handleGetPricingStats = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // 监控数据库聚合查询性能
    const stats = await performanceMonitor.monitorDatabase(
      'getPricingStats',
      async () => {
        return await databaseProductApi.getPricingStats();
      }
    );
    
    res.status(200).json(createApiResponse(true, stats));
  } catch (error) {
    console.error('获取价格统计错误:', error);
    res.status(500).json(
      createApiResponse(false, undefined, '获取价格统计失败', error instanceof Error ? error.message : 'Server error')
    );
  }
};

/**
 * 获取单个商品（优化版本）
 * 支持缓存、数据库查询优化
 */
const handleGetProductById = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID不能为空')
      );
    }
    
    // 监控数据库查询性能
    const product = await performanceMonitor.monitorDatabase(
      'getProductById',
      async () => {
        return await databaseProductApi.getProductById(id);
      }
    );
    
    if (!product) {
      return res.status(404).json(
        createApiResponse(false, undefined, '商品不存在')
      );
    }
    
    res.status(200).json(createApiResponse(true, product));
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(404).json(
      createApiResponse(false, undefined, '商品不存在', error instanceof Error ? error.message : 'Not found')
    );
  }
};

/**
 * 更新商品（优化版本）
 * 支持事务、缓存失效、数据验证
 */
const handleUpdateProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    const { validateUpdateProduct } = await import('@/lib/validation');
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID不能为空')
      );
    }
    
    const updates = validateUpdateProduct({ ...req.body, id });
    
    // 监控数据库事务性能
    const product = await performanceMonitor.monitorDatabase(
      'updateProduct',
      async () => {
        return await databaseProductApi.updateProduct(id, {
          ...updates,
          updatedBy: 'system',
        });
      }
    );
    
    res.status(200).json(createApiResponse(true, product, '商品更新成功'));
  } catch (error) {
    console.error('更新商品错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '更新商品失败', error instanceof Error ? error.message : 'Validation error')
    );
  }
};

/**
 * 删除商品（优化版本）
 * 支持事务、缓存失效、外键约束
 */
const handleDeleteProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json(
        createApiResponse(false, undefined, '商品ID不能为空')
      );
    }
    
    // 监控数据库事务性能
    const product = await performanceMonitor.monitorDatabase(
      'deleteProduct',
      async () => {
        return await databaseProductApi.deleteProduct(id);
      }
    );
    
    res.status(200).json(createApiResponse(true, product, '商品删除成功'));
  } catch (error) {
    console.error('删除商品错误:', error);
    res.status(400).json(
      createApiResponse(false, undefined, '删除商品失败', error instanceof Error ? error.message : 'Delete error')
    );
  }
};

// 导出所有处理器
export const productHandlers = {
  getProducts: handleGetProducts,
  createProduct: handleCreateProduct,
  getProductById: handleGetProductById,
  updateProduct: handleUpdateProduct,
  deleteProduct: handleDeleteProduct,
  getStats: handleGetStats,
  batchUpdate: handleBatchUpdate,
  batchDelete: handleBatchDelete,
  updateStock: handleUpdateStock,
  batchUpdateStock: handleBatchUpdateStock,
  batchUpdatePrices: handleBatchUpdatePrices,
  getPricingStats: handleGetPricingStats,
  getLowStockProducts: handleGetLowStockProducts,
};

// 创建受保护的API处理器
export const createProtectedProductHandler = (method: string, handler: Function) => {
  return createProtectedHandler('/api/products', method, handler);
};