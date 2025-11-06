import { createApiResponse, sleep } from '@/types';
import type { Product, ProductCategory, ProductStats } from '@/types';

// 模拟数据库
let products: Product[] = [
  {
    id: 'product_1',
    name: 'iPhone 15 Pro',
    description: '苹果最新旗舰手机，搭载A17 Pro芯片',
    price: 7999,
    category: 'category_1',
    stock: 50,
    status: 'active',
    images: ['https://example.com/iphone15.jpg'],
    tags: ['手机', '苹果', '旗舰'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'product_2',
    name: 'MacBook Air M2',
    description: '轻薄便携的笔记本电脑',
    price: 8999,
    category: 'category_2',
    stock: 30,
    status: 'active',
    images: ['https://example.com/macbook.jpg'],
    tags: ['笔记本', '苹果', '办公'],
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'product_3',
    name: 'AirPods Pro',
    description: '主动降噪无线耳机',
    price: 1999,
    category: 'category_3',
    stock: 100,
    status: 'active',
    images: ['https://example.com/airpods.jpg'],
    tags: ['耳机', '无线', '降噪'],
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T10:00:00Z',
    createdBy: 'admin',
    updatedBy: 'admin',
  },
];

let categories: ProductCategory[] = [
  {
    id: 'category_1',
    name: '手机',
    description: '智能手机产品',
    level: 1,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'category_2',
    name: '电脑',
    description: '笔记本电脑产品',
    level: 1,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'category_3',
    name: '配件',
    description: '数码配件产品',
    level: 1,
    sortOrder: 3,
    isActive: true,
  },
];

// 商品相关API
export const productApi = {
  // 获取商品列表
  async getProducts(filter: any = {}) {
    await sleep(300); // 模拟网络延迟
    
    let filteredProducts = [...products];
    
    // 关键词搜索
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(keyword) ||
        p.description.toLowerCase().includes(keyword) ||
        p.tags.some(tag => tag.toLowerCase().includes(keyword))
      );
    }
    
    // 分类筛选
    if (filter.category) {
      filteredProducts = filteredProducts.filter(p => p.category === filter.category);
    }
    
    // 状态筛选
    if (filter.status) {
      filteredProducts = filteredProducts.filter(p => p.status === filter.status);
    }
    
    // 价格范围筛选
    if (filter.minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.price >= filter.minPrice);
    }
    if (filter.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.price <= filter.maxPrice);
    }
    
    // 标签筛选
    if (filter.tags && filter.tags.length > 0) {
      filteredProducts = filteredProducts.filter(p => 
        filter.tags.some((tag: string) => p.tags.includes(tag))
      );
    }
    
    // 排序
    if (filter.sortBy) {
      filteredProducts.sort((a, b) => {
        const aValue = a[filter.sortBy as keyof Product];
        const bValue = b[filter.sortBy as keyof Product];
        const order = filter.sortOrder === 'desc' ? -1 : 1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * order;
        }
        
        return (aValue > bValue ? 1 : -1) * order;
      });
    }
    
    return filteredProducts;
  },
  
  // 获取单个商品
  async getProductById(id: string) {
    await sleep(200);
    const product = products.find(p => p.id === id);
    if (!product) {
      throw new Error('商品不存在');
    }
    return product;
  },
  
  // 创建商品
  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    await sleep(500);
    
    const newProduct: Product = {
      ...data,
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    products.unshift(newProduct);
    return newProduct;
  },
  
  // 更新商品
  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>) {
    await sleep(500);
    
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('商品不存在');
    }
    
    products[index] = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    return products[index];
  },
  
  // 删除商品
  async deleteProduct(id: string) {
    await sleep(300);
    
    const index = products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('商品不存在');
    }
    
    const deletedProduct = products[index];
    products = products.filter(p => p.id !== id);
    return deletedProduct;
  },
  
  // 批量更新商品
  async batchUpdateProducts(ids: string[], updates: Partial<Omit<Product, 'id' | 'createdAt'>>) {
    await sleep(800);
    
    const updatedProducts: Product[] = [];
    products = products.map(p => {
      if (ids.includes(p.id)) {
        const updatedProduct = {
          ...p,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        updatedProducts.push(updatedProduct);
        return updatedProduct;
      }
      return p;
    });
    
    return updatedProducts;
  },
  
  // 批量删除商品
  async batchDeleteProducts(ids: string[]) {
    await sleep(600);
    
    const deletedProducts = products.filter(p => ids.includes(p.id));
    products = products.filter(p => !ids.includes(p.id));
    
    return deletedProducts;
  },
  
  // 获取商品统计
  async getProductStats(): Promise<ProductStats> {
    await sleep(200);
    
    return {
      total: products.length,
      active: products.filter(p => p.status === 'active').length,
      inactive: products.filter(p => p.status === 'inactive').length,
      discontinued: products.filter(p => p.status === 'discontinued').length,
      lowStock: products.filter(p => p.stock < 10).length,
    };
  },
};

// 分类相关API
export const categoryApi = {
  // 获取分类列表
  async getCategories() {
    await sleep(200);
    return categories;
  },
  
  // 获取单个分类
  async getCategoryById(id: string) {
    await sleep(200);
    const category = categories.find(c => c.id === id);
    if (!category) {
      throw new Error('分类不存在');
    }
    return category;
  },
  
  // 创建分类
  async createCategory(data: Omit<ProductCategory, 'id'>) {
    await sleep(300);
    
    const newCategory: ProductCategory = {
      ...data,
      id: `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    categories.push(newCategory);
    return newCategory;
  },
  
  // 更新分类
  async updateCategory(id: string, updates: Partial<Omit<ProductCategory, 'id'>>) {
    await sleep(300);
    
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('分类不存在');
    }
    
    categories[index] = { ...categories[index], ...updates };
    return categories[index];
  },
  
  // 删除分类
  async deleteCategory(id: string) {
    await sleep(300);
    
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('分类不存在');
    }
    
    // 检查是否有商品使用该分类
    const hasProducts = products.some(p => p.category === id);
    if (hasProducts) {
      throw new Error('该分类下还有商品，不能删除');
    }
    
    const deletedCategory = categories[index];
    categories = categories.filter(c => c.id !== id);
    return deletedCategory;
  },
};

// 库存相关API
export const inventoryApi = {
  // 更新库存
  async updateStock(productId: string, quantity: number, type: 'increase' | 'decrease') {
    await sleep(400);
    
    const product = products.find(p => p.id === productId);
    if (!product) {
      throw new Error('商品不存在');
    }
    
    const newStock = type === 'increase' 
      ? product.stock + quantity 
      : product.stock - quantity;
    
    if (newStock < 0) {
      throw new Error('库存不足');
    }
    
    product.stock = newStock;
    product.updatedAt = new Date().toISOString();
    
    return product;
  },
  
  // 批量更新库存
  async batchUpdateStock(updates: Array<{ productId: string; quantity: number; type: 'increase' | 'decrease' }>) {
    await sleep(600);
    
    const updatedProducts: Product[] = [];
    
    for (const update of updates) {
      try {
        const product = await this.updateStock(update.productId, update.quantity, update.type);
        updatedProducts.push(product);
      } catch (error) {
        console.error(`更新商品 ${update.productId} 库存失败:`, error);
      }
    }
    
    return updatedProducts;
  },
  
  // 获取低库存商品
  async getLowStockProducts(threshold: number = 10) {
    await sleep(200);
    return products.filter(p => p.stock < threshold);
  },
};

// 价格相关API
export const pricingApi = {
  // 批量更新价格
  async batchUpdatePrices(updates: Array<{ productId: string; price: number }>) {
    await sleep(500);
    
    const updatedProducts: Product[] = [];
    
    for (const update of updates) {
      const product = products.find(p => p.id === update.productId);
      if (product) {
        product.price = update.price;
        product.updatedAt = new Date().toISOString();
        updatedProducts.push(product);
      }
    }
    
    return updatedProducts;
  },
  
  // 获取价格统计
  async getPricingStats() {
    await sleep(200);
    
    const prices = products.map(p => p.price);
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      totalValue,
      productCount: products.length,
    };
  },
};