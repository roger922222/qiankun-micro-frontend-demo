-- PostgreSQL数据库初始化脚本
-- 商品管理系统数据库设计

-- 创建数据库
CREATE DATABASE product_management;
\c product_management;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 商品分类表
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id UUID,
    level INT DEFAULT 1,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system',
    updated_by VARCHAR(100) DEFAULT 'system'
);

-- 商品表
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id UUID NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    images JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system',
    updated_by VARCHAR(100) DEFAULT 'system'
);

-- 库存变更记录表
CREATE TABLE inventory_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('increase', 'decrease')),
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system'
);

-- 价格变更记录表
CREATE TABLE price_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system'
);

-- API性能监控表
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_time_ms INT NOT NULL,
    status_code INT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API调用日志表
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_body JSONB,
    response_body JSONB,
    status_code INT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
CREATE INDEX idx_categories_created_at ON categories(created_at);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_updated_at ON products(updated_at);

-- GIN索引用于JSONB字段和全文搜索
CREATE INDEX idx_products_images ON products USING GIN (images);
CREATE INDEX idx_products_tags ON products USING GIN (tags);
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('english', name || ' ' || description));

-- 复合索引
CREATE INDEX idx_products_category_status ON products(category_id, status);
CREATE INDEX idx_products_price_range ON products(price) WHERE price > 0;
CREATE INDEX idx_products_stock_level ON products(stock) WHERE stock < 10;

-- 库存和价格日志索引
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX idx_inventory_logs_change_type ON inventory_logs(change_type);

CREATE INDEX idx_price_logs_product_id ON price_logs(product_id);
CREATE INDEX idx_price_logs_created_at ON price_logs(created_at);

-- 性能监控索引
CREATE INDEX idx_performance_metrics_endpoint ON performance_metrics(endpoint);
CREATE INDEX idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX idx_performance_metrics_status_code ON performance_metrics(status_code);

-- API日志索引
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX idx_api_logs_ip_address ON api_logs(ip_address);

-- 外键约束
ALTER TABLE categories ADD CONSTRAINT fk_categories_parent 
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE products ADD CONSTRAINT fk_products_category 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

ALTER TABLE inventory_logs ADD CONSTRAINT fk_inventory_products 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE price_logs ADD CONSTRAINT fk_price_products 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- 创建触发器：自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：获取商品统计
CREATE OR REPLACE FUNCTION get_product_statistics()
RETURNS TABLE (
    total_products BIGINT,
    active_products BIGINT,
    inactive_products BIGINT,
    discontinued_products BIGINT,
    low_stock_products BIGINT,
    avg_price DECIMAL,
    min_price DECIMAL,
    max_price DECIMAL,
    total_inventory_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_products,
        COUNT(CASE WHEN status = 'discontinued' THEN 1 END) as discontinued_products,
        COUNT(CASE WHEN stock < 10 THEN 1 END) as low_stock_products,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        SUM(price * stock) as total_inventory_value
    FROM products;
END;
$$ LANGUAGE plpgsql;

-- 创建函数：搜索商品（支持全文搜索）
CREATE OR REPLACE FUNCTION search_products(
    p_keyword TEXT,
    p_category_id UUID DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_sort_by VARCHAR(50) DEFAULT 'created_at',
    p_sort_order VARCHAR(4) DEFAULT 'DESC',
    p_offset INT DEFAULT 0,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(200),
    description TEXT,
    price DECIMAL,
    category_id UUID,
    stock INT,
    status VARCHAR(20),
    images JSONB,
    tags JSONB,
    created_at TIMESTAMP,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category_id,
        p.stock,
        p.status,
        p.images,
        p.tags,
        p.created_at,
        COUNT(*) OVER() as total_count
    FROM products p
    WHERE 
        (p_keyword IS NULL OR 
         to_tsvector('english', p.name || ' ' || p.description) @@ plainto_tsquery('english', p_keyword))
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (p_status IS NULL OR p.status = p_status)
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        AND (p_max_price IS NULL OR p.price <= p_max_price)
        AND (p_tags IS NULL OR p.tags ?| p_tags)
    ORDER BY 
        CASE p_sort_by
            WHEN 'name' THEN p.name
            WHEN 'price' THEN p.price::TEXT
            WHEN 'stock' THEN p.stock::TEXT
            WHEN 'created_at' THEN p.created_at::TEXT
            ELSE p.created_at::TEXT
        END
        CASE p_sort_order
            WHEN 'ASC' THEN ASC
            WHEN 'DESC' THEN DESC
            ELSE DESC
        END
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 插入初始数据
INSERT INTO categories (id, name, description, level, sort_order, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', '手机', '智能手机产品', 1, 1, true),
('550e8400-e29b-41d4-a716-446655440002', '电脑', '笔记本电脑产品', 1, 2, true),
('550e8400-e29b-41d4-a716-446655440003', '配件', '数码配件产品', 1, 3, true);

INSERT INTO products (id, name, description, price, category_id, stock, status, images, tags, created_by, updated_by) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'iPhone 15 Pro', '苹果最新旗舰手机，搭载A17 Pro芯片', 7999.00, '550e8400-e29b-41d4-a716-446655440001', 50, 'active', 
 '["https://example.com/iphone15.jpg"]', '["手机", "苹果", "旗舰"]', 'admin', 'admin'),
('550e8400-e29b-41d4-a716-446655440102', 'MacBook Air M2', '轻薄便携的笔记本电脑', 8999.00, '550e8400-e29b-41d4-a716-446655440002', 30, 'active',
 '["https://example.com/macbook.jpg"]', '["笔记本", "苹果", "办公"]', 'admin', 'admin'),
('550e8400-e29b-41d4-a716-446655440103', 'AirPods Pro', '主动降噪无线耳机', 1999.00, '550e8400-e29b-41d4-a716-446655440003', 100, 'active',
 '["https://example.com/airpods.jpg"]', '["耳机", "无线", "降噪"]', 'admin', 'admin');

-- 创建数据库连接池配置
-- 适用于生产环境的连接池参数
-- max_connections: 100
-- shared_buffers: 256MB
-- effective_cache_size: 1GB
-- work_mem: 4MB
-- maintenance_work_mem: 64MB