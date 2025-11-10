import React, { useState, useCallback, useMemo } from 'react';
import { Product } from '../../types/product';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { OptimizedProductForm } from './ProductForm';
import { useProductStore } from '../../stores/productStore';
import { OptimizedAPI } from '../../services/optimized-api';

interface ProductCardProps {
  product: Product;
  onUpdate?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

export const OptimizedProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onUpdate,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const api = useMemo(() => new OptimizedAPI(), []);

  // Memoized price formatting
  const formattedPrice = useMemo(() => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(product.price);
  }, [product.price]);

  // Memoized stock status calculation
  const stockStatus = useMemo(() => {
    if (product.stock <= 0) return { text: '缺货', className: 'out-of-stock' };
    if (product.stock <= 10) return { text: '库存紧张', className: 'low-stock' };
    return { text: '有货', className: 'in-stock' };
  }, [product.stock]);

  // Optimized handlers with useCallback
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!confirm(`确定要删除产品 "${product.name}" 吗？`)) return;
    
    setIsDeleting(true);
    try {
      await api.deleteProduct(product.id);
      onDelete?.(product.id);
    } catch (error) {
      console.error('删除产品失败:', error);
      alert('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  }, [product.id, product.name, api, onDelete]);

  const handleSave = useCallback(async (updatedProduct: Partial<Product>) => {
    try {
      const result = await api.updateProduct(product.id, updatedProduct);
      onUpdate?.(result);
      setIsEditing(false);
    } catch (error) {
      console.error('更新产品失败:', error);
      alert('更新失败，请重试');
    }
  }, [product.id, api, onUpdate]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  // Memoized card content to prevent unnecessary re-renders
  const cardContent = useMemo(() => (
    <div className="product-card-content">
      <div className="product-image-container">
        {!imageError && product.image ? (
          <LazyLoadImage
            src={product.image}
            alt={product.name}
            effect="blur"
            threshold={100}
            afterLoad={() => console.log(`Image loaded: ${product.name}`)}
            onError={() => setImageError(true)}
            className="product-image"
          />
        ) : (
          <div className="product-image-placeholder">
            <span>{product.name.charAt(0)}</span>
          </div>
        )}
        
        <div className="product-stock-badge">
          <span className={`stock-status ${stockStatus.className}`}>
            {stockStatus.text}
          </span>
        </div>
      </div>

      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-meta">
          <span className="product-category">{product.category}</span>
          <span className="product-stock">库存: {product.stock}</span>
        </div>
        <div className="product-price-container">
          <span className="product-price">{formattedPrice}</span>
        </div>
      </div>

      <div className="product-actions">
        <button
          onClick={handleEdit}
          className="btn-edit"
          disabled={isDeleting}
        >
          编辑
        </button>
        <button
          onClick={handleDelete}
          className="btn-delete"
          disabled={isDeleting}
        >
          {isDeleting ? '删除中...' : '删除'}
        </button>
      </div>
    </div>
  ), [product, imageError, stockStatus, formattedPrice, handleEdit, handleDelete, isDeleting]);

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: inView ? 1 : 0, scale: inView ? 1 : 0.9 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="optimized-product-card"
      >
        {isEditing ? (
          <OptimizedProductForm
            product={product}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          cardContent
        )}
      </motion.div>
    </AnimatePresence>
  );
});

OptimizedProductCard.displayName = 'OptimizedProductCard';