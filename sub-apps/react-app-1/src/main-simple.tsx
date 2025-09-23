/**
 * 简化版 React 子应用入口文件 - 用于测试基本功能
 * 不使用 Antd 组件，避免样式冲突
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// 导入共享库
import { globalLogger } from '@shared/utils/logger';

// 简化版应用组件
function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1890ff', marginBottom: '20px' }}>
        用户管理系统 (简化版)
      </h1>
      <div style={{ 
        background: '#f5f5f5', 
        padding: '16px', 
        borderRadius: '4px',
        marginBottom: '16px'
      }}>
        <p>✅ React 子应用已成功加载</p>
        <p>✅ qiankun 沙箱环境正常</p>
        <p>✅ 路由系统工作正常</p>
      </div>
      
      <div style={{ marginBottom: '16px' }}>
        <button 
          style={{
            background: '#1890ff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
          onClick={() => {
            alert('按钮点击正常！');
          }}
        >
          测试按钮
        </button>
        
        <button 
          style={{
            background: '#52c41a',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => {
            globalLogger.info('日志系统测试', { timestamp: new Date().toISOString() });
            alert('日志已记录，请检查控制台');
          }}
        >
          测试日志
        </button>
      </div>
      
      <div style={{ 
        background: '#fff2e8', 
        border: '1px solid #ffbb96',
        padding: '12px', 
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <strong>测试说明：</strong>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>这是一个不使用 Antd 组件的简化版本</li>
          <li>如果此版本正常运行，说明基础架构没有问题</li>
          <li>可以逐步添加 Antd 组件来定位具体问题</li>
        </ul>
      </div>
    </div>
  );
}

// 全局变量保存 React root 实例
let reactRoot: any = null;

/**
 * 渲染应用
 */
function render(props?: any) {
  const { container, routerBase } = props || {};
  
  // 在qiankun环境中，直接使用传入的容器
  let domElement: HTMLElement | null;
  if (window.__POWERED_BY_QIANKUN__) {
    domElement = container;
  } else {
    domElement = document.getElementById('root');
  }
  
  if (!domElement) {
    globalLogger.error('Root element not found', new Error('Root element not found'), { 
      container, 
      hasQiankun: !!window.__POWERED_BY_QIANKUN__ 
    });
    return;
  }

  // 只在第一次或 root 不存在时创建
  if (!reactRoot) {
    reactRoot = ReactDOM.createRoot(domElement);
  }

  reactRoot.render(
    <BrowserRouter basename={routerBase || (window.__POWERED_BY_QIANKUN__ ? '/user-management' : '/')}>
      <SimpleApp />
    </BrowserRouter>
  );

  return reactRoot;
}

/**
 * qiankun生命周期 - 启动
 */
export async function bootstrap() {
  globalLogger.info('Simple React User Management app bootstrapped');
}

/**
 * qiankun生命周期 - 挂载
 */
export async function mount(props: any) {
  globalLogger.info('Simple React User Management app mounting', props);
  
  // 验证挂载参数
  if (!props || !props.container) {
    const error = new Error('Invalid mount props: container is required');
    globalLogger.error('Mount failed', error, { props });
    throw error;
  }
  
  render(props);
}

/**
 * qiankun生命周期 - 卸载
 */
export async function unmount(_props: any) {
  globalLogger.info('Simple React User Management app unmounting');
  
  // 使用保存的 root 实例进行卸载
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
}

/**
 * 独立运行模式
 */
if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

// 设置全局变量供qiankun使用
declare global {
  interface Window {
    __POWERED_BY_QIANKUN__?: boolean;
    __INJECTED_PUBLIC_PATH_BY_QIANKUN__?: string;
  }
}