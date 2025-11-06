import { useEffect } from 'react';
import { useProductStore, productSelectors } from '../store/productStore';

// 数据初始化hook
export const useProductData = () => {
  const { fetchProducts, fetchCategories } = useProductStore();
  const loading = useProductStore(productSelectors.loading);
  const error = useProductStore(productSelectors.error);

  useEffect(() => {
    // 初始化时获取数据
    const initData = async () => {
      try {
        await Promise.all([
          fetchProducts(),
          fetchCategories()
        ]);
      } catch (error) {
        console.error('初始化数据失败:', error);
      }
    };

    initData();
  }, [fetchProducts, fetchCategories]);

  return {
    loading,
    error
  };
};

// 商品列表hook
export const useProducts = (filter?: any, page?: number, pageSize?: number) => {
  const { fetchProducts } = useProductStore();
  const products = useProductStore(productSelectors.products);
  const loading = useProductStore(productSelectors.loading);
  const error = useProductStore(productSelectors.error);
  const pagination = useProductStore(productSelectors.pagination);

  useEffect(() => {
    fetchProducts(filter, page, pageSize);
  }, [fetchProducts, filter, page, pageSize]);

  return {
    products,
    loading,
    error,
    pagination
  };
};

// 分类列表hook
export const useCategories = () => {
  const { fetchCategories } = useProductStore();
  const categories = useProductStore(productSelectors.categories);
  const loading = useProductStore(productSelectors.loading);
  const error = useProductStore(productSelectors.error);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error
  };
};