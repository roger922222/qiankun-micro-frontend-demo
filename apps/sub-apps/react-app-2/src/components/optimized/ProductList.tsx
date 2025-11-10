import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useVirtual } from 'react-virtual';
import { Product } from '../../types/product';
import { OptimizedProductCard } from './ProductCard';
import { ProductFilters } from './ProductFilters';
import { useProductStore } from '../../stores/productStore';
import { PerformanceMonitor } from '../../utils/performance-monitor';
import debounce from 'lodash/debounce';

interface ProductListProps {
  products: Product[];
  loading?: boolean;
  onProductUpdate?: (product: Product) => void;
  onProductDelete?: (id: string) => void;
}

const ROW_HEIGHT = 280;
const OVERSCAN = 5;

export const OptimizedProductList: React.FC<ProductListProps> = React.memo(({
  products,
  loading = false,
  onProductUpdate,
  onProductDelete
}) => {
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [category, setCategory] = useState<string>('all');
  const parentRef = useRef<HTMLDivElement>(null);
  const performanceMonitor = useRef(new PerformanceMonitor());

  // Memoized filtering and sorting logic
  const filteredAndSortedProducts = useMemo(() => {
    const startTime = performance.now();
    
    let filtered = products;
    
    // Apply category filter
    if (category !== 'all') {
      filtered = filtered.filter(p => p.category === category);
    }
    
    // Apply text filter
    if (filter.trim()) {
      const searchTerm = filter.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = a.stock - b.stock;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    const endTime = performance.now();
    performanceMonitor.current.recordMetric('product_filter_sort', endTime - startTime);
    
    return sorted;
  }, [products, filter, sortBy, sortOrder, category]);

  // Debounced filter update
  const debouncedSetFilter = useMemo(
    () => debounce((value: string) => setFilter(value), 300),
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetFilter.cancel();
    };
  }, [debouncedSetFilter]);

  // Virtual scrolling setup
  const virtualizer = useVirtual({
    size: filteredAndSortedProducts.length,
    parentRef,
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: OVERSCAN,
  });

  // Render row for virtual list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = filteredAndSortedProducts[index];
    if (!product) return null;

    return (
      <div style={style} className="virtual-row">
        <OptimizedProductCard
          product={product}
          onUpdate={onProductUpdate}
          onDelete={onProductDelete}
        />
      </div>
    );
  }, [filteredAndSortedProducts, onProductUpdate, onProductDelete]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="product-list-loading">
        <div className="skeleton-grid">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (filteredAndSortedProducts.length === 0) {
    return (
      <div className="product-list-empty">
        <div className="empty-state">
          <h3>没有找到匹配的产品</h3>
          <p>尝试调整搜索条件或筛选器</p>
        </div>
      </div>
    );
  }

  return (
    <div className="optimized-product-list">
      <ProductFilters
        filter={filter}
        onFilterChange={debouncedSetFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        category={category}
        onCategoryChange={setCategory}
        totalProducts={filteredAndSortedProducts.length}
      />
      
      <div ref={parentRef} className="virtual-list-container">
        <div
          style={{
            height: `${virtualizer.totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.virtualItems.map((virtualItem) => (
            <Row
              key={virtualItem.index}
              index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          ))}
        </div>
      </div>
      
      <div className="product-list-stats">
        <span>显示 {filteredAndSortedProducts.length} 个产品</span>
        <span>总计 {products.length} 个产品</span>
      </div>
    </div>
  );
});

OptimizedProductList.displayName = 'OptimizedProductList';