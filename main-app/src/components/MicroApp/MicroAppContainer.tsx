/**
 * 微应用容器组件
 * 负责渲染和管理微应用的容器
 */

import React, { useEffect, useRef, useState } from 'react';
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
 * 微应用容器组件
 */
const MicroAppContainer: React.FC<MicroAppContainerProps> = ({
  appName,
  entry,
  container,
  activeRule
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAppStatus, updateAppStatus } = useMicroApps();

  // 获取应用状态
  const appStatus = getAppStatus(appName);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) {
      globalLogger.error(`Micro app container element not found: ${appName}`)
      return
    };

    // 设置容器ID - 确保在DOM中可见
    const containerId = container.replace('#', '');
    containerElement.id = containerId;

    // 显示容器(之前预创建时可能隐藏了)
    containerElement.style.display = 'block';

    // 双重检查容器是否存在于DOM中
    const verifyContainer = document.getElementById(containerId);

    if (!verifyContainer) {
      globalLogger.error(`Container element not found in DOM after setting ID: ${containerId}`)
      return
    }
    globalLogger.info(`Micro app container initialized: ${appName} with container: ${container}`)
    globalLogger.info(`Container element verified in DOM: ${containerId}`)

    // 监听应用加载状态
    const handleAppLoad = () => {
      setLoading(false);
      setError(null);
      updateAppStatus(appName, { status: 'mounted' });
      globalLogger.info(`Micro app container ready: ${appName}`);
    };

    const handleAppError = (errorMsg: string) => {
      setLoading(false);
      setError(errorMsg);
      updateAppStatus(appName, { status: 'error', error: errorMsg });
      globalLogger.error(`Micro app container error: ${appName}`, new Error(errorMsg));
    };

    // 检查应用是否可用
    if (!appStatus?.available) {
      handleAppError('应用服务不可用，请检查应用是否正常运行');
      return;
    }

    // 设置加载超时
    const loadingTimer = setTimeout(() => {
      if (loading) {
        handleAppError('应用加载超时，请刷新重试');
      }
    }, 30000); // 30秒超时

    // 监听qiankun生命周期事件
    const handleQiankunEvent = (event: CustomEvent) => {
      const { type, appName: eventAppName } = event.detail;
      
      if (eventAppName === appName) {
        switch (type) {
          case 'mounted':
            handleAppLoad();
            break;
          case 'unmounted':
            setLoading(true);
            updateAppStatus(appName, { status: 'unmounted' });
            break;
          case 'error':
            handleAppError(event.detail.error?.message || '应用加载失败');
            break;
        }
      }
    };

    // 添加事件监听
    window.addEventListener('qiankun-app-event', handleAppLoad as EventListener);

    // 清理函数
    return () => {
      clearTimeout(loadingTimer);
      window.removeEventListener('qiankun-app-event', handleAppLoad as EventListener);
    };
  }, [appName, container, appStatus, loading, updateAppStatus]);

  // 重新加载应用
  const handleReload = () => {
    setLoading(true);
    setError(null);
    window.location.reload();
  };

  // 渲染加载状态
  if (loading && !error) {
    return (
      <div className="micro-app-loading">
        <Spin size="large" tip={`正在加载 ${appName}...`} />
      </div>
    );
  }

  // 渲染错误状态
  if (error) {
    return (
      <div className="micro-app-error">
        <Alert
          message="应用加载失败"
          description={error}
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
      <div
        ref={containerRef}
        className="micro-app-container"
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
        data-app-name={appName}
        data-container={container}
      />
    </div>
  );
};

export default MicroAppContainer;