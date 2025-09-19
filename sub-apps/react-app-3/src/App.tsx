/**
 * React订单管理子应用主组件
 * 使用Context API进行状态管理
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, message } from 'antd';
import { Helmet } from 'react-helmet-async';

// 导入页面组件
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import OrderStats from './pages/OrderStats';

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

// 导入Context
import { useOrderContext } from './context/OrderContext';

const { Content } = Layout;

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const { actions } = useOrderContext();

  useEffect(() => {
    globalLogger.info('Order Management App mounted');

    // 监听全局事件
    const handleGlobalEvent = (event: any) => {
      globalLogger.info('Received global event', event);
      
      switch (event.type) {
        case EVENT_TYPES.THEME_CHANGE:
          document.documentElement.setAttribute('data-theme', event.data.theme);
          break;
          
        case EVENT_TYPES.USER_LOGOUT:
          actions.reset();
          message.info('用户已登出，数据已清理');
          break;
          
        case EVENT_TYPES.LANGUAGE_CHANGE:
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
      source: 'react-order-management',
      timestamp: new Date().toISOString(),
      id: `app-ready-${Date.now()}`,
      data: {
        appName: 'react-order-management',
        version: '1.0.0',
        features: ['order-management', 'customer-management', 'payment-tracking']
      }
    });

    // 初始化示例数据
    initializeSampleData();

    return () => {
      globalEventBus.off(EVENT_TYPES.THEME_CHANGE, handleGlobalEvent);
      globalEventBus.off(EVENT_TYPES.USER_LOGOUT, handleGlobalEvent);
      globalEventBus.off(EVENT_TYPES.LANGUAGE_CHANGE, handleGlobalEvent);
      
      globalLogger.info('Order Management App unmounted');
    };
  }, [actions]);

  /**
   * 初始化示例数据
   */
  const initializeSampleData = () => {
    // 示例订单数据
    const sampleOrders = [
      {
        orderNumber: 'ORD-2024-001',
        customerId: 'cust_1',
        customerName: '张三',
        customerEmail: 'zhangsan@example.com',
        customerPhone: '13800138000',
        items: [
          {
            id: 'item_1',
            productId: 'prod_1',
            productName: 'iPhone 15 Pro',
            productImage: '/images/iphone15pro.jpg',
            quantity: 1,
            unitPrice: 7999,
            totalPrice: 7999,
            specifications: { color: '深空黑色', storage: '256GB' }
          }
        ],
        totalAmount: 7999,
        status: 'confirmed' as const,
        paymentStatus: 'paid' as const,
        paymentMethod: 'alipay' as const,
        shippingAddress: {
          id: 'addr_1',
          name: '张三',
          phone: '13800138000',
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          street: '三里屯街道1号',
          zipCode: '100000',
          isDefault: true
        },
        billingAddress: {
          id: 'addr_1',
          name: '张三',
          phone: '13800138000',
          province: '北京市',
          city: '北京市',
          district: '朝阳区',
          street: '三里屯街道1号',
          zipCode: '100000',
          isDefault: true
        },
        notes: '请尽快发货'
      },
      {
        orderNumber: 'ORD-2024-002',
        customerId: 'cust_2',
        customerName: '李四',
        customerEmail: 'lisi@example.com',
        customerPhone: '13900139000',
        items: [
          {
            id: 'item_2',
            productId: 'prod_2',
            productName: 'MacBook Pro 14"',
            productImage: '/images/macbook-pro.jpg',
            quantity: 1,
            unitPrice: 14999,
            totalPrice: 14999
          }
        ],
        totalAmount: 14999,
        status: 'processing' as const,
        paymentStatus: 'paid' as const,
        paymentMethod: 'credit_card' as const,
        shippingAddress: {
          id: 'addr_2',
          name: '李四',
          phone: '13900139000',
          province: '上海市',
          city: '上海市',
          district: '浦东新区',
          street: '陆家嘴环路1000号',
          zipCode: '200000',
          isDefault: true
        },
        billingAddress: {
          id: 'addr_2',
          name: '李四',
          phone: '13900139000',
          province: '上海市',
          city: '上海市',
          district: '浦东新区',
          street: '陆家嘴环路1000号',
          zipCode: '200000',
          isDefault: true
        }
      }
    ];

    actions.setOrders(sampleOrders);
    globalLogger.info('Sample order data initialized', { count: sampleOrders.length });
  };

  return (
    <>
      <Helmet>
        <title>订单管理系统 - React + Context API</title>
        <meta name="description" content="基于React和Context API的订单管理系统" />
      </Helmet>

      <Layout className="order-app-layout">
        <AppHeader />
        
        <Layout>
          <AppSidebar />
          
          <Layout className="order-app-content">
            <Content className="order-app-main">
              <div className="order-app-container">
                <Routes>
                  <Route path="/" element={<Navigate to="/orders" replace />} />
                  <Route path="/orders" element={<OrderList />} />
                  <Route path="/orders/:id" element={<OrderDetail />} />
                  <Route path="/stats" element={<OrderStats />} />
                  <Route path="*" element={<Navigate to="/orders" replace />} />
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