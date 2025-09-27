import React, { useState, useEffect } from 'react';
import { Badge, Alert, Button, Drawer, List, Progress, Space, Typography, Divider, Tag } from 'antd';
import { 
  WifiOutlined, 
  DisconnectOutlined, 
  SyncOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
// import { offlineSyncManager } from '../../utils/offline-sync-manager';

const { Text, Title } = Typography;

interface SyncStatus {
  isOnline: boolean;
  syncInProgress: boolean;
  queueLength: number;
  lastSyncTime: number;
  pendingOperations: Array<{
    id: string;
    type: string;
    resource: string;
    retryCount: number;
    priority: string;
  }>;
}

interface SyncResult {
  success: boolean;
  operation: any;
  error?: string;
}

export const OfflineIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    syncInProgress: false,
    queueLength: 0,
    lastSyncTime: 0,
    pendingOperations: []
  });
  
  const [showDetails, setShowDetails] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncResult[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    // 初始化状态
    updateSyncStatus();

    // 网络状态监听
    const handleOnline = () => {
      updateSyncStatus();
      console.log('Network restored');
    };
    
    const handleOffline = () => {
      updateSyncStatus();
      console.log('Network lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 同步结果监听
    const handleSyncResult = (result: SyncResult) => {
      setSyncHistory(prev => [result, ...prev.slice(0, 49)]); // 保留最近50条
      updateSyncStatus();
    };

    // 定期更新状态
    const statusInterval = setInterval(updateSyncStatus, 5000);

    // 添加同步监听器
    // offlineSyncManager.addSyncListener(handleSyncResult);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // offlineSyncManager.removeSyncListener(handleSyncResult);
      clearInterval(statusInterval);
    };
  }, []);

  const updateSyncStatus = () => {
    // const status = offlineSyncManager.getSyncStatus();
    // setSyncStatus(status);
    setSyncStatus({
      isOnline: navigator.onLine,
      syncInProgress: false,
      queueLength: 0,
      lastSyncTime: 0,
      pendingOperations: []
    });
  };

  const handleManualSync = async () => {
    if (!syncStatus.isOnline || syncStatus.syncInProgress) return;
    
    try {
      setSyncProgress(0);
      // const results = await offlineSyncManager.forceSync();
      setSyncProgress(100);
      
      setTimeout(() => setSyncProgress(0), 2000);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) {
      return <DisconnectOutlined style={{ color: '#ff4d4f' }} />;
    }
    
    if (syncStatus.syncInProgress) {
      return <SyncOutlined spin style={{ color: '#1890ff' }} />;
    }
    
    if (syncStatus.queueLength > 0) {
      return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
    
    return <WifiOutlined style={{ color: '#52c41a' }} />;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) {
      return '离线模式';
    }
    
    if (syncStatus.syncInProgress) {
      return '正在同步...';
    }
    
    if (syncStatus.queueLength > 0) {
      return `${syncStatus.queueLength} 个操作待同步`;
    }
    
    return '已连接';
  };

  const getAlertType = (): 'success' | 'info' | 'warning' | 'error' => {
    if (!syncStatus.isOnline) return 'error';
    if (syncStatus.syncInProgress) return 'info';
    if (syncStatus.queueLength > 0) return 'warning';
    return 'success';
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return '从未';
    return new Date(timestamp).toLocaleString();
  };

  const getPriorityColor = (priority: string) => {
    const colors = { high: 'red', medium: 'orange', low: 'blue' };
    return colors[priority] || 'default';
  };

  const getOperationIcon = (type: string) => {
    const icons = {
      CREATE: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      UPDATE: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      DELETE: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    };
    return icons[type] || <InfoCircleOutlined />;
  };

  // 如果在线且没有待同步操作，不显示指示器
  if (syncStatus.isOnline && syncStatus.queueLength === 0 && !syncStatus.syncInProgress) {
    return null;
  }

  return (
    <>
      <div 
        style={{ 
          position: 'fixed', 
          top: 16, 
          right: 16, 
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={() => setShowDetails(true)}
      >
        <Badge count={syncStatus.queueLength} size="small">
          <Alert
            message={
              <Space>
                {getStatusIcon()}
                <Text>{getStatusText()}</Text>
              </Space>
            }
            type={getAlertType()}
            showIcon={false}
            style={{ 
              minWidth: 200,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          />
        </Badge>
      </div>

      <Drawer
        title="同步状态详情"
        placement="right"
        onClose={() => setShowDetails(false)}
        open={showDetails}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 当前状态 */}
          <div>
            <Title level={5}>当前状态</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>网络状态:</Text>
                <Space>
                  {getStatusIcon()}
                  <Text strong>{syncStatus.isOnline ? '在线' : '离线'}</Text>
                </Space>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>待同步操作:</Text>
                <Text strong>{syncStatus.queueLength}</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>上次同步:</Text>
                <Text>{formatTime(syncStatus.lastSyncTime)}</Text>
              </div>
              
              {syncProgress > 0 && (
                <Progress 
                  percent={syncProgress} 
                  size="small" 
                  status={syncProgress === 100 ? 'success' : 'active'}
                />
              )}
            </Space>
          </div>

          <Divider />

          {/* 操作按钮 */}
          <Space>
            <Button 
              type="primary" 
              icon={<SyncOutlined />}
              onClick={handleManualSync}
              disabled={!syncStatus.isOnline || syncStatus.syncInProgress}
              loading={syncStatus.syncInProgress}
            >
              手动同步
            </Button>
            
            <Button 
              onClick={() => {/* offlineSyncManager.clearQueue() */}}
              disabled={syncStatus.queueLength === 0}
              danger
            >
              清空队列
            </Button>
          </Space>

          <Divider />

          {/* 待同步操作列表 */}
          {syncStatus.pendingOperations.length > 0 && (
            <div>
              <Title level={5}>待同步操作</Title>
              <List
                size="small"
                dataSource={syncStatus.pendingOperations}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={getOperationIcon(item.type)}
                      title={
                        <Space>
                          <Text strong>{item.type}</Text>
                          <Tag color={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Tag>
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary">{item.resource}</Text>
                          {item.retryCount > 0 && (
                            <div>
                              <Text type="warning">重试次数: {item.retryCount}</Text>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>
          )}

          {/* 同步历史 */}
          {syncHistory.length > 0 && (
            <>
              <Divider />
              <div>
                <Title level={5}>同步历史</Title>
                <List
                  size="small"
                  dataSource={syncHistory.slice(0, 10)}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          item.success ? 
                            <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        }
                        title={
                          <Space>
                            <Text>{item.operation.type}</Text>
                            <Text type="secondary">{item.operation.resource}</Text>
                          </Space>
                        }
                        description={
                          item.success ? 
                            <Text type="success">同步成功</Text> :
                            <Text type="danger">{item.error}</Text>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            </>
          )}
        </Space>
      </Drawer>
    </>
  );
};

export default OfflineIndicator;