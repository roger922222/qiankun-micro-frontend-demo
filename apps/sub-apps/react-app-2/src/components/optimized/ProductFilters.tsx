import React, { useCallback, useMemo } from 'react';
import { useProductStore } from '../../stores/productStore';
import debounce from 'lodash/debounce';

interface ProductFiltersProps {
  filter: string;
  onFilterChange: (value: string) => void;
  sortBy: 'name' | 'price' | 'stock';
  onSortByChange: (value: 'name' | 'price' | 'stock') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  category: string;
  onCategoryChange: (value: string) => void;
  totalProducts: number;
}

export const ProductFilters: React.FC<ProductFiltersProps> = React.memo(({
  filter,
  onFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  category,
  onCategoryChange,
  totalProducts
}) => {
  const { products } = useProductStore();

  // Memoized unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(products.map(p => p.category)));
    return ['all', ...uniqueCategories.sort()];
  }, [products]);

  // Optimized handlers with useCallback
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange(e.target.value);
  }, [onFilterChange]);

  const handleSortByChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortByChange(e.target.value as 'name' | 'price' | 'stock');
  }, [onSortByChange]);

  const handleSortOrderChange = useCallback(() => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  }, [sortOrder, onSortOrderChange]);

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onCategoryChange(e.target.value);
  }, [onCategoryChange]);

  // Memoized sort icon
  const sortIcon = useMemo(() => {
    return sortOrder === 'asc' ? '↑' : '↓';
  }, [sortOrder]);

  return (
    <div className="product-filters">
      <div className="filter-group">
        <label htmlFor="search-input" className="filter-label">
          搜索产品:
        </label>
        <div className="search-input-container">
          <input
            id="search-input"
            type="text"
            value={filter}
            onChange={handleFilterChange}
            placeholder="输入产品名称、描述或分类..."
            className="search-input"
          />
          {filter && (
            <button
              onClick={() => onFilterChange('')}
              className="clear-search"
              aria-label="清除搜索"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="category-select" className="filter-label">
          分类筛选:
        </label>
        <select
          id="category-select"
          value={category}
          onChange={handleCategoryChange}
          className="category-select"
        >
          <option value="all">全部分类</option>
          {categories.slice(1).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="sort-select" className="filter-label">
          排序方式:
        </label>
        <div className="sort-controls">
          <select
            id="sort-select"
            value={sortBy}
            onChange={handleSortByChange}
            className="sort-select"
          >
            <option value="name">名称</option>
            <option value="price">价格</option>
            <option value="stock">库存</option>
          </select>
          <button
            onClick={handleSortOrderChange}
            className="sort-order-toggle"
            title={`当前排序: ${sortOrder === 'asc' ? '升序' : '降序'}`}
          >
            {sortIcon}
          </button>
        </div>
      </div>

      <div className="filter-stats">
        <span className="total-count">
          显示 {totalProducts} 个产品
        </span>
      </div>
    </div>
  );
});

ProductFilters.displayName = 'ProductFilters';