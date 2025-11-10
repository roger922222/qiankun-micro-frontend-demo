import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { motion, AnimatePresence } from 'framer-motion';
import { useProductStore } from '../../stores/productStore';
import { OptimizedAPI } from '../../services/optimized-api';
import { PerformanceMonitor } from '../../utils/performance-monitor';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorFallback } from '../common/ErrorFallback';

// Lazy load heavy components
const OptimizedProductList = lazy(() => 
  import('./ProductList').then(module => ({ 
    default: module.OptimizedProductList 
  }))
);

const OptimizedProductForm = lazy(() => 
  import('./ProductForm').then(module => ({ 
    default: module.OptimizedProductForm 
  }))
);

const ProductStats = lazy(() => 
  import('./ProductStats').then(module => ({ 
    default: module.ProductStats 
  }))
);

export const OptimizedApp: React.FC = () => {
  const { 
    products, 
    loading, 
    error, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    refreshProducts 
  } = useProductStore();

  const [showAddForm, setShowAddForm] = React.useState(false);
  const api = useMemo(() => new OptimizedAPI(), []);

  // Memoized callbacks to prevent unnecessary re-renders
  const handleAddProduct = useCallback(async (productData: any) => {
    try {
      const newProduct = await api.createProduct(productData);
      addProduct(newProduct);
      setShowAddForm(false);
    } catch (error) {
      console.error('添加产品失败:', error);
      throw error;
    }
  }, [api, addProduct]);

  const handleUpdateProduct = useCallback(async (updatedProduct: any) => {
    try {
      const result = await api.updateProduct(updatedProduct.id, updatedProduct);
      updateProduct(result);
    } catch (error) {
      console.error('更新产品失败:', error);
      throw error;
    }
  }, [api, updateProduct]);

  const handleDeleteProduct = useCallback(async (id: string) => {
    try {
      await api.deleteProduct(id);
      deleteProduct(id);
    } catch (error) {
      console.error('删除产品失败:', error);
      throw error;
    }
  }, [api, deleteProduct]);

  const handleRefresh = useCallback(() => {
    refreshProducts();
  }, [refreshProducts]);

  const handleShowAddForm = useCallback(() => {
    setShowAddForm(true);
  }, []);

  const handleHideAddForm = useCallback(() => {
    setShowAddForm(false);
  }, []);

  // Memoized computed values
  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(p => p.stock > 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 10).length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    return { total, inStock, lowStock, outOfStock, totalValue };
  }, [products]);

  if (error) {
    return <ErrorFallback error={error} resetError={handleRefresh} />;
  }

  return (
    <div className="optimized-app">
      <PerformanceMonitor />
      
      <header className="app-header">
        <h1>产品管理系统</h1>
        <div className="header-actions">
          <button
            onClick={handleRefresh}
            className="btn-refresh"
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新'}
          </button>
          <button
            onClick={handleShowAddForm}
            className="btn-add"
            disabled={showAddForm}
          >
            添加产品
          </button>
        </div>
      </header>

      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onReset={handleRefresh}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <div className="app-content">
            <AnimatePresence mode="wait">
              {showAddForm ? (
                <motion.div
                  key="add-form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="form-container"
                >
                  <OptimizedProductForm
                    onSave={handleAddProduct}
                    onCancel={handleHideAddForm}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="product-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="content-container"
                >
                  <div className="stats-container">
                    <ProductStats stats={stats} />
                  </div>
                  
                  <div className="list-container">
                    <OptimizedProductList
                      products={products}
                      loading={loading}
                      onProductUpdate={handleUpdateProduct}
                      onProductDelete={handleDeleteProduct}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

OptimizedApp.displayName = 'OptimizedApp';