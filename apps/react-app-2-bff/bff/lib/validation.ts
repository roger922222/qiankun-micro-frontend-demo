import { z } from 'zod';
import type { CreateProductDto, UpdateProductDto, CreateCategoryDto, UpdateCategoryDto } from '@/types';

// 商品验证schema
export const productSchema = z.object({
  name: z.string().min(1, '商品名称不能为空').max(100, '商品名称不能超过100个字符'),
  description: z.string().min(1, '商品描述不能为空').max(500, '商品描述不能超过500个字符'),
  price: z.number().positive('价格必须大于0').max(999999, '价格不能超过999999'),
  category: z.string().min(1, '商品分类不能为空'),
  stock: z.number().int('库存必须是整数').min(0, '库存不能为负数'),
  status: z.enum(['active', 'inactive', 'discontinued'], {
    errorMap: () => ({ message: '商品状态必须是active、inactive或discontinued' })
  }),
  images: z.array(z.string().url('图片链接格式不正确')).optional(),
  tags: z.array(z.string()).optional(),
});

export const createProductSchema = productSchema;

export const updateProductSchema = productSchema.partial().extend({
  id: z.string().min(1, '商品ID不能为空'),
});

// 分类验证schema
export const categorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称不能超过50个字符'),
  description: z.string().max(200, '分类描述不能超过200个字符').optional(),
  parentId: z.string().optional(),
  level: z.number().int().min(0).max(5).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const createCategorySchema = categorySchema;

export const updateCategorySchema = categorySchema.partial().extend({
  id: z.string().min(1, '分类ID不能为空'),
});

// 查询参数验证schema
export const paginationSchema = z.object({
  page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1)).optional(),
  pageSize: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
});

export const productFilterSchema = z.object({
  keyword: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
  minPrice: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  maxPrice: z.string().transform(val => parseFloat(val)).pipe(z.number().min(0)).optional(),
  tags: z.string().transform(val => val.split(',')).pipe(z.array(z.string())).optional(),
  sortBy: z.enum(['name', 'price', 'stock', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// 验证函数
export const validateCreateProduct = (data: unknown): CreateProductDto => {
  return createProductSchema.parse(data);
};

export const validateUpdateProduct = (data: unknown): UpdateProductDto => {
  return updateProductSchema.parse(data);
};

export const validateCreateCategory = (data: unknown): CreateCategoryDto => {
  return createCategorySchema.parse(data);
};

export const validateUpdateCategory = (data: unknown): UpdateCategoryDto => {
  return updateCategorySchema.parse(data);
};

export const validatePagination = (query: Record<string, string>) => {
  return paginationSchema.parse(query);
};

export const validateProductFilter = (query: Record<string, string>) => {
  return productFilterSchema.parse(query);
};