/**
 * React商品管理子应用主组件
 * 使用Zustand进行状态管理
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, message, Typography, Menu } from 'antd';
import { Helmet } from 'react-helmet-async';
import {
  AppstoreOutlined,
  TagsOutlined,
  StockOutlined,
  DollarOutlined,
  UserOutlined,
  DashboardOutlined
} from '@ant-design/icons';

// 导入页面组件
import ProductList from './pages/ProductList';
import CategoryManagement from './pages/CategoryManagement';
import InventoryManagement from './pages/InventoryManagement';
import PricingManagement from './pages/PricingManagement';
import SupplierManagement from './pages/SupplierManagement';
import Dashboard from './pages/Dashboard';

// 导入样式
import './styles/index.css';

// 导入共享库
import { globalEventBus } from '@shared/communication/event-bus';
import { globalLogger } from '@shared/utils/logger';
import { EVENT_TYPES } from '@shared/types/events';

// 导入Store
import { useProductStore } from './store/productStore';

const { Content, Header, Sider } = Layout;
const { Title } = Typography;

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const { reset } = useProductStore();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
      type: 'APP_READY',
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
    const { products } = useProductStore.getState();
    const { setProducts, setCategories } = useProductStore.getState();
    
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

  // 菜单配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '数据统计',
    },
    {
      key: '/products',
      icon: <AppstoreOutlined />,
      label: '商品管理',
    },
    {
      key: '/categories',
      icon: <TagsOutlined />,
      label: '分类管理',
    },
    {
      key: '/inventory',
      icon: <StockOutlined />,
      label: '库存管理',
    },
    {
      key: '/pricing',
      icon: <DollarOutlined />,
      label: '价格策略',
    },
    {
      key: '/suppliers',
      icon: <UserOutlined />,
      label: '供应商管理',
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <>
      <Helmet>
        <title>商品管理系统 - React + Zustand</title>
        <meta name="description" content="基于React和Zustand的商品管理系统" />
      </Helmet>

      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#52c41a', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            商品管理系统
          </Title>
        </Header>
        
        <Layout>
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            theme="light"
            style={{ background: '#fff' }}
          >
            <Menu
              mode="inline"
              selectedKeys={[location.pathname]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{ height: '100%', borderRight: 0 }}
            />
          </Sider>
          
          <Content style={{ padding: '24px', background: '#f0f2f5' }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/categories" element={<CategoryManagement />} />
                <Route path="/inventory" element={<InventoryManagement />} />
                <Route path="/pricing" element={<PricingManagement />} />
                <Route path="/suppliers" element={<SupplierManagement />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>
    </>
  );
};

export default App;