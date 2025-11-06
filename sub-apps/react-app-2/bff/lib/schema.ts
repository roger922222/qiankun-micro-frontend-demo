// Drizzle ORM Schema定义
import { pgTable, uuid, varchar, text, decimal, integer, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// 枚举定义
export const productStatusEnum = pgEnum('product_status', ['active', 'inactive', 'discontinued']);
export const changeTypeEnum = pgEnum('change_type', ['increase', 'decrease']);

// 分类表
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id').references(() => categories.id, { onDelete: 'set null' }),
  level: integer('level').default(1).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 100 }).default('system').notNull(),
  updatedBy: varchar('updated_by', { length: 100 }).default('system').notNull(),
});

// 商品表
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  stock: integer('stock').default(0).notNull(),
  status: productStatusEnum('status').default('active').notNull(),
  images: jsonb('images').default('[]').notNull(),
  tags: jsonb('tags').default('[]').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 100 }).default('system').notNull(),
  updatedBy: varchar('updated_by', { length: 100 }).default('system').notNull(),
});

// 库存日志表
export const inventoryLogs = pgTable('inventory_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  changeType: changeTypeEnum('change_type').notNull(),
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  reason: varchar('reason', { length: 200 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 100 }).default('system').notNull(),
});

// 价格日志表
export const priceLogs = pgTable('price_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  oldPrice: decimal('old_price', { precision: 10, scale: 2 }).notNull(),
  newPrice: decimal('new_price', { precision: 10, scale: 2 }).notNull(),
  reason: varchar('reason', { length: 200 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 100 }).default('system').notNull(),
});

// 性能监控表
export const performanceMetrics = pgTable('performance_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpoint: varchar('endpoint', { length: 200 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  responseTimeMs: integer('response_time_ms').notNull(),
  statusCode: integer('status_code').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// API日志表
export const apiLogs = pgTable('api_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpoint: varchar('endpoint', { length: 200 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  requestBody: jsonb('request_body'),
  responseBody: jsonb('response_body'),
  statusCode: integer('status_code').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 关系定义
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  children: many(categories),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  inventoryLogs: many(inventoryLogs),
  priceLogs: many(priceLogs),
}));

export const inventoryLogsRelations = relations(inventoryLogs, ({ one }) => ({
  product: one(products, {
    fields: [inventoryLogs.productId],
    references: [products.id],
  }),
}));

export const priceLogsRelations = relations(priceLogs, ({ one }) => ({
  product: one(products, {
    fields: [priceLogs.productId],
    references: [products.id],
  }),
}));

// 类型导出
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type InventoryLog = typeof inventoryLogs.$inferSelect;
export type NewInventoryLog = typeof inventoryLogs.$inferInsert;
export type PriceLog = typeof priceLogs.$inferSelect;
export type NewPriceLog = typeof priceLogs.$inferInsert;
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type NewPerformanceMetric = typeof performanceMetrics.$inferInsert;
export type ApiLog = typeof apiLogs.$inferSelect;
export type NewApiLog = typeof apiLogs.$inferInsert;