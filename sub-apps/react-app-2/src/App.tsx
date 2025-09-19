/**
 * React商品管理子应用主组件
 * 使用Zustand进行状态管理
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, message } from 'antd';
import { Helmet } from 'react-helmet-async';

// 导入页面组件
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import CategoryManagement from './pages/CategoryManagement';
import ProductStats from './pages/ProductStats';

// 导入布局组件
import AppHeader from './components/Layout/AppHeader';
import AppSidebar from './components/Layout/AppSidebar';
import AppFooter from './components/Layout/AppFooter';

// 导入样式
import './styles/App.css';

// 导入共享库
import { globalEventBus } from '@shared/communication/event-bus';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';

// 导入Store
import { useProductStore } from './store/productStore';

const { Content } = Layout;

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const { setError, reset } = useProductStore();

  useEffect(() => {
    globalLogger.info('Product Management App mounted');

    // 监听全局事件
    const handleGlobalEvent = (event: any) => {
      globalLogger.info('Received global event', event);
      
      switch (event.type) {
        case EVENT_TYPES.THEME_CHANGE:
          // 处理主题切换
          document.documentElement.setAttribute('data-theme', event.data.theme);
          break;
          
        case EVENT_TYPES.USER_LOGOUT:
          // 处理用户登出
          reset();
          message.info('用户已登出，数据已清理');
          break;
          
        case EVENT_TYPES.LANGUAGE_CHANGE:
          // 处理语言切换
          message.info(`语言已切换为: ${event.data.language}`);
          break;
          
        default:
          break;
      }
    };

    // 注册事件监听器
    globalEventBus.on(EVENT_TYPES.THEME_CHANGE, handleGlobalEvent);
    globalEventBus.on(EVENT_TYPES.USER_LOGOUT, handleGlobalEvent);
    globalEventBus.on(EVENT_TYPES.LANGUAGE_CHANGE, handleGlobalEvent);

    // 发送应用就绪事件
    globalEventBus.emit({
      type: EVENT_TYPES.APP_READY,
      source: 'react-product-management',
      timestamp: new Date().toISOString(),
      id: `app-ready-${Date.now()}`,
      data: {
        appName: 'react-product-management',
        version: '1.0.0',
        features: ['product-management', 'category-management', 'inventory-tracking']
      }
    });

    // 初始化示例数据
    initializeSampleData();

    // 清理函数
    return () => {
      globalEventBus.off(EVENT_TYPES.THEME_CHANGE, handleGlobalEvent);
      globalEventBus.off(EVENT_TYPES.USER_LOGOUT, handleGlobalEvent);
      globalEventBus.off(EVENT_TYPES.LANGUAGE_CHANGE, handleGlobalEvent);
      
      globalLogger.info('Product Management App unmounted');
    };
  }, [reset]);

  /**
   * 初始化示例数据
   */
  const initializeSampleData = () => {
    const { products, categories, setProducts, setCategories } = useProductStore.getState();
    
    // 如果没有数据，则初始化示例数据
    if (products.length === 0) {
      const sampleCategories = [
        {
          id: 'cat_1',
          name: '电子产品',
          description: '各类电子设备和配件',
          level: 1,
          sortOrder: 1,
          isActive: true
        },
        {
          id: 'cat_2',
          name: '服装鞋帽',
          description: '时尚服装和配饰',
          level: 1,
          sortOrder: 2,
          isActive: true
        },
        {
          id: 'cat_3',
          name: '家居用品',
          description: '家庭生活用品',
          level: 1,
          sortOrder: 3,
          isActive: true
        }
      ];

      const sampleProducts = [
        {
          id: 'prod_1',
          name: 'iPhone 15 Pro',
          description: '苹果最新旗舰手机，配备A17 Pro芯片',
          price: 7999,
          category: 'cat_1',
          stock: 50,
          status: 'active' as const,
          images: ['/images/iphone15pro.jpg'],
          tags: ['手机', '苹果', '5G', '高端'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          id: 'prod_2',
          name: 'MacBook Pro 14"',
          description: 'M3 Pro芯片，专业级笔记本电脑',
          price: 14999,
          category: 'cat_1',
          stock: 25,
          status: 'active' as const,
          images: ['/images/macbook-pro.jpg'],
          tags: ['笔记本', '苹果', 'M3', '专业'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          id: 'prod_3',
          name: '休闲T恤',
          description: '100%纯棉，舒适透气',
          price: 99,
          category: 'cat_2',
          stock: 200,
          status: 'active' as const,
          images: ['/images/t-shirt.jpg'],
          tags: ['T恤', '纯棉', '休闲', '舒适'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          id: 'prod_4',
          name: '智能台灯',
          description: 'LED护眼台灯，支持App控制',
          price: 299,
          category: 'cat_3',
          stock: 5,
          status: 'active' as const,
          images: ['/images/smart-lamp.jpg'],
          tags: ['台灯', '智能', 'LED', '护眼'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system'
        },
        {
          id: 'prod_5',
          name: '无线耳机',
          description: '降噪无线耳机，续航30小时',
          price: 599,
          category: 'cat_1',
          stock: 0,
          status: 'inactive' as const,
          images: ['/images/wireless-earbuds.jpg'],
          tags: ['耳机', '无线', '降噪', '长续航'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          updatedBy: 'system'
        }
      ];

      setCategories(sampleCategories);
      setProducts(sampleProducts);
      
      globalLogger.info('Sample data initialized', {
        categories: sampleCategories.length,
        products: sampleProducts.length
      });
    }
  };

  /**
   * 错误处理
   */
  const handleError = (error: Error) => {
    globalLogger.error('App error', error);
    setError(error.message);
    message.error('应用发生错误，请刷新页面重试');
  };

  return (
    <>
      <Helmet>
        <title>商品管理系统 - React + Zustand</title>
        <meta name="description" content="基于React和Zustand的商品管理系统" />
      </Helmet>

      <Layout className="product-app-layout">
        <AppHeader />
        
        <Layout>
          <AppSidebar />
          
          <Layout className="product-app-content">
            <Content className="product-app-main">
              <div className="product-app-container">
                <Routes>
                  <Route path="/" element={<Navigate to="/products" replace />} />
                  <Route path="/products" element={<ProductList />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/categories" element={<CategoryManagement />} />
                  <Route path="/stats" element={<ProductStats />} />
                  <Route path="*" element={<Navigate to="/products" replace />} />
                </Routes>
              </div>
            </Content>
            
            <AppFooter />
          </Layout>
        </Layout>
      </Layout>
    </>
  );
};

export default App;