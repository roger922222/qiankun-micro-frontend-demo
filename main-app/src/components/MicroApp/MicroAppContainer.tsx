/**
 * 微应用容器组件
 * 负责渲染和管理微应用的容器
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Spin, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { globalLogger } from '@shared/utils/logger';
import { useMicroApps } from '../../hooks/useMicroApps';
import './MicroAppContainer.css';

interface MicroAppContainerProps {
  appName: string;
  entry: string;
  container: string;
  activeRule: string;
}

/**
 * DOM状态检查器
 */
const createDOMChecker = (containerId: string, appName: string) => {
  return {
    logDOMState: () => {
      const container = document.querySelector(`#${containerId}`);
      const allContainers = document.querySelectorAll('[id*="micro-app"]');
      
      globalLogger.info(`DOM状态检查 - 应用: ${appName}`, {
        containerId,
        containerExists: !!container,
        containerElement: container,
        allMicroAppContainers: Array.from(allContainers).map(el => ({
          id: el.id,
          tagName: el.tagName,
          className: el.className
        })),
        documentReady: document.readyState,
        timestamp: new Date().toISOString()
      });
      
      return !!container;
    },
    
    waitForContainer: (maxWait = 10000) => {
      return new Promise<HTMLElement>((resolve, reject) => {
        const startTime = Date.now();
        
        const check = () => {
          const container = document.querySelector(`#${containerId}`) as HTMLElement;
          
          if (container) {
            globalLogger.info(`容器找到 - 应用: ${appName}, 耗时: ${Date.now() - startTime}ms`);
            resolve(container);
            return;
          }
          
          if (Date.now() - startTime > maxWait) {
            const errorMsg = `容器等待超时 - 应用: ${appName}, 容器ID: ${containerId}, 等待时间: ${maxWait}ms`;
            globalLogger.error(errorMsg);
            reject(new Error(errorMsg));
            return;
          }
          
          // 每100ms检查一次
          setTimeout(check, 100);
        };
        
        check();
      });
    }
  };
};

/**
 * 微应用容器组件
 */
const MicroAppContainer: React.FC<MicroAppContainerProps> = ({
  appName,
  entry: _entry,
  container,
  activeRule: _activeRule
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [containerReady, setContainerReady] = useState(false);
  const { getAppStatus, updateAppStatus } = useMicroApps();

  // 获取应用状态
  const appStatus = getAppStatus(appName);

  // 创建调试信息更新函数
  const updateDebugInfo = useCallback((info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => `${prev}\n[${timestamp}] ${info}`);
    globalLogger.info(`调试信息 - ${appName}: ${info}`);
  }, [appName]);

  useEffect(() => {
    updateDebugInfo('组件开始初始化...');
    
    // 设置容器ID
    const containerId = container.startsWith('#') ? container.slice(1) : container;
    
    updateDebugInfo(`设置容器ID: ${containerId}`);
    updateDebugInfo(`原始容器参数: ${container}`);
    updateDebugInfo(`应用名称: ${appName}`);

    // 等待DOM准备就绪
    const waitForDOM = () => {
      return new Promise<void>((resolve) => {
        const checkDOM = () => {
          if (document.readyState === 'complete') {
            updateDebugInfo('DOM已完全加载');
            resolve();
          } else {
            updateDebugInfo(`DOM状态: ${document.readyState}，等待完成...`);
            setTimeout(checkDOM, 100);
          }
        };
        checkDOM();
      });
    };

    // 创建容器元素
    const createContainer = async () => {
      try {
        await waitForDOM();
        
        updateDebugInfo('开始创建容器元素...');
        
        // 检查容器是否已存在
        let containerElement = document.querySelector(`#${containerId}`) as HTMLElement;
        
        if (containerElement) {
          updateDebugInfo('容器已存在，直接使用');
        } else {
          // 创建新的容器元素
          containerElement = document.createElement('div');
          containerElement.id = containerId;
          containerElement.className = 'micro-app-container';
          containerElement.style.width = '100%';
          containerElement.style.height = '100%';
          
          // 找到合适的父容器
          const parentContainer = document.querySelector('.app-content') || document.body;
          parentContainer.appendChild(containerElement);
          
          updateDebugInfo(`容器元素已创建并添加到DOM: ${containerId}`);
        }
        
        // 验证容器存在
        const verifyContainer = document.querySelector(`#${containerId}`);
        if (verifyContainer) {
          updateDebugInfo('✓ 容器验证成功');
          setContainerReady(true);
          
          // 创建DOM检查器
          const domChecker = createDOMChecker(containerId, appName);
          domChecker.logDOMState();
          
          // 检查应用是否可用（暂时跳过此检查，让qiankun自己处理）
          updateDebugInfo(`应用状态检查: available=${appStatus?.available || 'unknown'}`);
          updateDebugInfo('跳过应用可用性检查，让qiankun处理连接');
          
          updateDebugInfo('容器创建完成，等待qiankun加载应用');
          
        } else {
          throw new Error('容器创建后验证失败');
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        updateDebugInfo(`容器创建失败: ${errorMsg}`);
        handleAppError(`容器创建失败: ${errorMsg}`);
      }
    };

    // 监听应用加载状态
    const handleAppLoad = () => {
      setLoading(false);
      setError(null);
      updateAppStatus(appName, { status: 'mounted' });
      updateDebugInfo('应用加载成功');
      globalLogger.info(`微应用容器就绪: ${appName}, 容器ID: ${containerId}`);
    };

    const handleAppError = (errorMsg: string) => {
      setLoading(false);
      setError(errorMsg);
      updateAppStatus(appName, { status: 'error', error: errorMsg });
      updateDebugInfo(`应用加载错误: ${errorMsg}`);
      globalLogger.error(`微应用容器错误: ${appName}, 容器ID: ${containerId}, 错误: ${errorMsg}`, new Error(errorMsg));
    };

    // 设置加载超时
    const loadingTimer = setTimeout(() => {
      if (loading) {
        const timeoutMsg = `应用加载超时: ${appName}`;
        updateDebugInfo(timeoutMsg);
        handleAppError(timeoutMsg);
      }
    }, 30000); // 30秒超时

    // 监听qiankun生命周期事件
    const handleQiankunEvent = (event: CustomEvent) => {
      const { type, appName: eventAppName } = event.detail;
      
      if (eventAppName === appName) {
        updateDebugInfo(`收到qiankun事件: ${type}`);
        
        switch (type) {
          case 'mounted':
            handleAppLoad();
            break;
          case 'unmounted':
            setLoading(true);
            updateAppStatus(appName, { status: 'unmounted' });
            updateDebugInfo('应用已卸载');
            break;
          case 'error':
            const errorMsg = event.detail.error?.message || '应用加载失败';
            handleAppError(errorMsg);
            break;
        }
      }
    };

    // 添加事件监听
    window.addEventListener('qiankun-app-event', handleQiankunEvent as EventListener);

    // 创建容器
    createContainer();

    // 清理函数
    return () => {
      clearTimeout(loadingTimer);
      window.removeEventListener('qiankun-app-event', handleQiankunEvent as EventListener);
      updateDebugInfo('容器组件清理完成');
    };
  }, [appName, container, appStatus, loading, updateAppStatus, updateDebugInfo]);

  // 重新加载应用
  const handleReload = () => {
    setLoading(true);
    setError(null);
    setDebugInfo('');
    updateDebugInfo('手动重新加载应用');
    window.location.reload();
  };

  // 渲染加载状态
  if (loading && !error) {
    return (
      <div className="micro-app-loading">
        <Spin size="large" tip={`正在加载 ${appName}...`} />
        {debugInfo && (
          <div style={{ 
            marginTop: '20px', 
            padding: '10px', 
            background: '#f5f5f5', 
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            <strong>调试信息:</strong>
            {debugInfo}
          </div>
        )}
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="micro-app-error">
        <Alert
          message="应用加载失败"
          description={
            <div>
              <p>{error}</p>
              {debugInfo && (
                <details style={{ marginTop: '10px' }}>
                  <summary>查看详细调试信息</summary>
                  <pre style={{ 
                    marginTop: '10px',
                    padding: '10px', 
                    background: '#f5f5f5', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {debugInfo}
                  </pre>
                </details>
              )}
            </div>
          }
          type="error"
          showIcon
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReload}
            >
              重新加载
            </Button>
          }
        />
      </div>
    );
  }

  // 渲染微应用容器
  return (
    <div className="micro-app-wrapper">
      {/* 容器会通过JavaScript动态创建，不需要React ref */}
      {containerReady && (
        <div style={{ 
          width: '100%', 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          容器已准备就绪，等待微应用加载...
        </div>
      )}
      
      {debugInfo && (
        <div style={{ 
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          width: '300px',
          maxHeight: '150px',
          padding: '8px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          fontSize: '11px',
          fontFamily: 'monospace',
          borderRadius: '4px',
          overflow: 'auto',
          zIndex: 9999,
          whiteSpace: 'pre-wrap'
        }}>
          <strong>实时调试:</strong>
          {debugInfo.split('\n').slice(-10).join('\n')}
        </div>
      )}
    </div>
  );
};

export default MicroAppContainer;