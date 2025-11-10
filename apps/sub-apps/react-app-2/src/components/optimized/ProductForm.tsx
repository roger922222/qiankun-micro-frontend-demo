import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Product } from '../../types/product';
import debounce from 'lodash/debounce';

interface ProductFormProps {
  product?: Product;
  onSave: (product: Partial<Product>) => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image: string;
}

interface FormErrors {
  name?: string;
  price?: string;
  stock?: string;
  category?: string;
}

export const OptimizedProductForm: React.FC<ProductFormProps> = React.memo(({
  product,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    category: product?.category || '',
    image: product?.image || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized validation function
  const validateForm = useCallback((data: FormData): FormErrors => {
    const newErrors: FormErrors = {};

    if (!data.name.trim()) {
      newErrors.name = '产品名称不能为空';
    } else if (data.name.length < 2) {
      newErrors.name = '产品名称至少需要2个字符';
    } else if (data.name.length > 100) {
      newErrors.name = '产品名称不能超过100个字符';
    }

    if (data.price < 0) {
      newErrors.price = '价格不能为负数';
    } else if (data.price > 999999) {
      newErrors.price = '价格不能超过999,999';
    }

    if (data.stock < 0) {
      newErrors.stock = '库存不能为负数';
    } else if (data.stock > 999999) {
      newErrors.stock = '库存不能超过999,999';
    }

    if (!data.category.trim()) {
      newErrors.category = '产品分类不能为空';
    } else if (data.category.length > 50) {
      newErrors.category = '分类名称不能超过50个字符';
    }

    return newErrors;
  }, []);

  // Debounced validation
  const debouncedValidate = useMemo(
    () => debounce((data: FormData) => {
      const newErrors = validateForm(data);
      setErrors(newErrors);
    }, 500),
    [validateForm]
  );

  // Validate on form data change
  useEffect(() => {
    debouncedValidate(formData);
    return () => debouncedValidate.cancel();
  }, [formData, debouncedValidate]);

  // Optimized input handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? parseFloat(value) || 0 : value
    }));
  }, []);

  const handleNumberInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => ({
      ...prev,
      [name]: numValue
    }));
  }, []);

  // Memoized form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('保存产品失败:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSave]);

  // Memoized form validity
  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0 && 
           formData.name.trim() !== '' && 
           formData.category.trim() !== '';
  }, [errors, formData]);

  // Common categories for autocomplete
  const commonCategories = useMemo(() => [
    '电子产品', '服装', '食品', '图书', '家居', '运动', '美妆', '玩具', '工具', '配件'
  ], []);

  return (
    <form onSubmit={handleSubmit} className="optimized-product-form">
      <div className="form-header">
        <h3>{product ? '编辑产品' : '添加新产品'}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="btn-cancel"
          disabled={isSubmitting}
        >
          取消
        </button>
      </div>

      <div className="form-content">
        <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
          <label htmlFor="name" className="form-label">
            产品名称 <span className="required">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            className="form-input"
            placeholder="输入产品名称"
            maxLength={100}
            disabled={isSubmitting}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            产品描述
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="form-textarea"
            placeholder="输入产品描述（可选）"
            rows={3}
            maxLength={500}
            disabled={isSubmitting}
          />
        </div>

        <div className={`form-group ${errors.category ? 'has-error' : ''}`}>
          <label htmlFor="category" className="form-label">
            产品分类 <span className="required">*</span>
          </label>
          <input
            id="category"
            name="category"
            type="text"
            value={formData.category}
            onChange={handleInputChange}
            className="form-input"
            placeholder="输入产品分类"
            maxLength={50}
            list="category-suggestions"
            disabled={isSubmitting}
          />
          <datalist id="category-suggestions">
            {commonCategories.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          {errors.category && <span className="error-message">{errors.category}</span>}
        </div>

        <div className="form-row">
          <div className={`form-group ${errors.price ? 'has-error' : ''}`}>
            <label htmlFor="price" className="form-label">
              价格 <span className="required">*</span>
            </label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              max="999999"
              value={formData.price}
              onChange={handleNumberInputChange}
              className="form-input"
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.price && <span className="error-message">{errors.price}</span>}
          </div>

          <div className={`form-group ${errors.stock ? 'has-error' : ''}`}>
            <label htmlFor="stock" className="form-label">
              库存 <span className="required">*</span>
            </label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              max="999999"
              value={formData.stock}
              onChange={handleNumberInputChange}
              className="form-input"
              placeholder="0"
              disabled={isSubmitting}
            />
            {errors.stock && <span className="error-message">{errors.stock}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="image" className="form-label">
            产品图片 URL
          </label>
          <input
            id="image"
            name="image"
            type="url"
            value={formData.image}
            onChange={handleInputChange}
            className="form-input"
            placeholder="https://example.com/image.jpg"
            disabled={isSubmitting}
          />
        </div>

        {formData.image && (
          <div className="form-group">
            <label className="form-label">图片预览</label>
            <div className="image-preview">
              <img
                src={formData.image}
                alt="预览"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-footer">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={isSubmitting}
        >
          取消
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? '保存中...' : (product ? '更新' : '添加')}
        </button>
      </div>
    </form>
  );
});

OptimizedProductForm.displayName = 'OptimizedProductForm';