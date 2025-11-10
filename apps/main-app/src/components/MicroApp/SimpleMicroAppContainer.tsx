/**
 * 简化的微应用容器组件
 * 专门用于解决容器挂载问题
 */

import React, { useEffect, useRef } from 'react';
import { globalLogger } from '@shared/utils/logger';

interface SimpleMicroAppContainerProps {
  appName: string;
  container: string;
}

const SimpleMicroAppContainer: React.FC<SimpleMicroAppContainerProps> = ({
  appName,
  container
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (!containerElement) {
      globalLogger.error(`Container ref not found for ${appName}`);
      return;
    }

    // 设置容器ID
    const containerId = container.startsWith('#') ? container.slice(1) : container;
    containerElement.id = containerId;
    
    globalLogger.info(`✅ 简化容器已创建: ${containerId} for ${appName}`);
    
    // 验证容器存在
    const verifyContainer = document.querySelector(`#${containerId}`);
    if (verifyContainer) {
      globalLogger.info(`✅ 容器验证成功: ${containerId}`);
    } else {
      globalLogger.error(`❌ 容器验证失败: ${containerId}`);
    }

  }, [appName, container]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '500px',
        background: '#f5f5f5',
        // display: 'flex',
        // alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        color: '#666'
      }}
    >
      等待微应用 {appName} 加载...
    </div>
  );
};

export default SimpleMicroAppContainer;