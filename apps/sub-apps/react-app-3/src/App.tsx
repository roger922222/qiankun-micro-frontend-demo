/**
 * React订单管理子应用主组件
 * 使用Context API进行状态管理
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, message, Typography, Menu } from 'antd';
import { Helmet } from 'react-helmet-async';
import {
  ShoppingCartOutlined,
  BarChartOutlined,
  FileTextOutlined,
  DashboardOutlined,
  UnorderedListOutlined,
  PlusOutlined,
  DollarOutlined,
  UserOutlined
} from '@ant-design/icons';

// 导入页面组件
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import OrderStats from './pages/OrderStats';
import OrderTracking from './pages/OrderTracking';
import PaymentManagement from './pages/PaymentManagement';
import OrderCreate from './pages/OrderCreate';
import CustomerManagement from './pages/CustomerManagement';
import ReportsAnalytics from './pages/ReportsAnalytics';

// 导入布局组件
// import AppHeader from './components/Layout/AppHeader';
// import AppSidebar from './components/Layout/AppSidebar';
// import AppFooter from './components/Layout/AppFooter';

// 导入样式
import './styles/App.css';

// 导入共享库
import { globalEventBus, globalLogger, EVENT_TYPES } from './shared-stub';

// 导入Context
import { useOrderContext } from './context/OrderContext';

const { Content, Header, Sider } = Layout;
const { Title } = Typography;

/**
 * 主应用组件
 */
const App: React.FC = () => {
  const { actions } = useOrderContext();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
        id: 'order_1',
        orderNumber: 'ORD-2024-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        id: 'order_2',
        orderNumber: 'ORD-2024-002',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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

  // 菜单配置
  const menuItems = [
    {
      key: '/orders',
      icon: <UnorderedListOutlined />,
      label: '订单列表',
    },
    {
      key: '/create-order',
      icon: <PlusOutlined />,
      label: '创建订单',
    },
    {
      key: '/payment',
      icon: <DollarOutlined />,
      label: '支付管理',
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: '客户管理',
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '报表分析',
    },
    {
      key: '/stats',
      icon: <DashboardOutlined />,
      label: '订单统计',
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <>
      <Helmet>
        <title>订单管理系统 - React + Context API</title>
        <meta name="description" content="基于React和Context API的订单管理系统" />
      </Helmet>

      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#1890ff', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            订单管理系统
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
                <Route path="/" element={<Navigate to="/orders" replace />} />
                <Route path="/orders" element={<OrderList />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/orders/:id/tracking" element={<OrderTracking />} />
                <Route path="/create-order" element={<OrderCreate />} />
                <Route path="/payment" element={<PaymentManagement />} />
                <Route path="/customers" element={<CustomerManagement />} />
                <Route path="/reports" element={<ReportsAnalytics />} />
                <Route path="/stats" element={<OrderStats />} />
                <Route path="*" element={<Navigate to="/orders" replace />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>
    </>
  );
};

export default App;