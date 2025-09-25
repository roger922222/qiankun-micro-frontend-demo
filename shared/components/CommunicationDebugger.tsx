/**
 * 通信调试器组件 - 微前端通信系统调试面板
 * 提供通信调试、事件流可视化、状态变更追踪等功能
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BaseEvent } from '../types/events';
import { GlobalState } from '../types/store';
import { globalEventBus } from '../communication/event-bus';
import { globalStateManager } from '../communication/global-state';
import { globalNotificationService } from '../communication/realtime/notification-service';
import { globalWebSocketManager } from '../communication/realtime/websocket-manager';
import { defaultMessageQueue } from '../communication/realtime/message-queue';
import { globalDataSynchronizer } from '../communication/utils/data-sync';
import { globalConflictResolver } from '../communication/utils/conflict-resolver';
import { globalPerformanceOptimizer } from '../communication/utils/performance-utils';
import { checkCommunicationHealth, CommunicationHealth } from '../communication/utils/communication-utils';

// ==================== 类型定义 ====================

interface EventLogEntry {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  data: any;
  processed: boolean;
  processingTime?: number;
  error?: string;
}

interface StateChangeEntry {
  id: string;
  timestamp: string;
  action: any;
  previousState: any;
  newState: any;
  diff: any;
}

interface PerformanceEntry {
  id: string;
  timestamp: string;
  category: string;
  operation: string;
  duration: number;
  metadata?: any;
}

interface DebuggerState {
  isVisible: boolean;
  activeTab: string;
  eventLogs: EventLogEntry[];
  stateChanges: StateChangeEntry[];
  performanceEntries: PerformanceEntry[];
  health: CommunicationHealth | null;
  filters: {
    eventTypes: string[];
    sources: string[];
    timeRange: number; // minutes
  };
  autoScroll: boolean;
  maxEntries: number;
}

// ==================== 主组件 ====================

export const CommunicationDebugger: React.FC = () => {
  const [state, setState] = useState<DebuggerState>({
    isVisible: false,
    activeTab: 'events',
    eventLogs: [],
    stateChanges: [],
    performanceEntries: [],
    health: null,
    filters: {
      eventTypes: [],
      sources: [],
      timeRange: 60 // 1 hour
    },
    autoScroll: true,
    maxEntries: 1000
  });

  // ==================== 事件监听 ====================

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // 监听事件总线
    const eventUnsubscriber = globalEventBus.on('*', (event: BaseEvent) => {
      const entry: EventLogEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: event.type,
        source: event.source,
        data: event.data,
        processed: true
      };

      setState(prev => ({
        ...prev,
        eventLogs: [...prev.eventLogs.slice(-prev.maxEntries + 1), entry]
      }));
    });
    unsubscribers.push(eventUnsubscriber);

    // 监听状态变化
    const stateUnsubscriber = globalStateManager.subscribe((newState, action) => {
      const entry: StateChangeEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action,
        previousState: null, // 简化实现
        newState,
        diff: null // 简化实现
      };

      setState(prev => ({
        ...prev,
        stateChanges: [...prev.stateChanges.slice(-prev.maxEntries + 1), entry]
      }));
    });
    unsubscribers.push(stateUnsubscriber);

    // 定期更新健康状态
    const healthInterval = setInterval(async () => {
      try {
        const health = await checkCommunicationHealth();
        setState(prev => ({ ...prev, health }));
      } catch (error) {
        console.error('[CommunicationDebugger] Health check failed:', error);
      }
    }, 5000);

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      clearInterval(healthInterval);
    };
  }, []);

  // ==================== 事件处理 ====================

  const toggleVisibility = useCallback(() => {
    setState(prev => ({ ...prev, isVisible: !prev.isVisible }));
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const clearLogs = useCallback((logType: string) => {
    setState(prev => ({
      ...prev,
      [logType]: []
    }));
  }, []);

  const exportLogs = useCallback(() => {
    const data = {
      eventLogs: state.eventLogs,
      stateChanges: state.stateChanges,
      performanceEntries: state.performanceEntries,
      health: state.health,
      exportTime: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `communication-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const sendTestEvent = useCallback(() => {
    globalEventBus.emit({
      type: 'DEBUG_TEST_EVENT',
      source: 'communication-debugger',
      timestamp: new Date().toISOString(),
      id: generateId(),
      data: { test: true, timestamp: Date.now() }
    });
  }, []);

  // ==================== 过滤逻辑 ====================

  const filteredEventLogs = useMemo(() => {
    return state.eventLogs.filter(entry => {
      const timeFilter = Date.now() - new Date(entry.timestamp).getTime() <= state.filters.timeRange * 60 * 1000;
      const typeFilter = state.filters.eventTypes.length === 0 || state.filters.eventTypes.includes(entry.type);
      const sourceFilter = state.filters.sources.length === 0 || state.filters.sources.includes(entry.source);
      
      return timeFilter && typeFilter && sourceFilter;
    });
  }, [state.eventLogs, state.filters]);

  const filteredStateChanges = useMemo(() => {
    return state.stateChanges.filter(entry => {
      const timeFilter = Date.now() - new Date(entry.timestamp).getTime() <= state.filters.timeRange * 60 * 1000;
      return timeFilter;
    });
  }, [state.stateChanges, state.filters]);

  // ==================== 渲染 ====================

  if (!state.isVisible) {
    return (
      <div style={styles.toggleButton} onClick={toggleVisibility}>
        🔧 Debug
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Communication Debugger</h3>
        <div style={styles.headerActions}>
          <button onClick={sendTestEvent} style={styles.button}>
            Send Test Event
          </button>
          <button onClick={exportLogs} style={styles.button}>
            Export Logs
          </button>
          <button onClick={toggleVisibility} style={styles.closeButton}>
            ✕
          </button>
        </div>
      </div>

      <div style={styles.tabs}>
        {['events', 'state', 'performance', 'health', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(state.activeTab === tab ? styles.activeTab : {})
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {state.activeTab === 'events' && (
          <EventLogsTab
            logs={filteredEventLogs}
            onClear={() => clearLogs('eventLogs')}
            autoScroll={state.autoScroll}
          />
        )}

        {state.activeTab === 'state' && (
          <StateChangesTab
            changes={filteredStateChanges}
            onClear={() => clearLogs('stateChanges')}
            autoScroll={state.autoScroll}
          />
        )}

        {state.activeTab === 'performance' && (
          <PerformanceTab />
        )}

        {state.activeTab === 'health' && (
          <HealthTab health={state.health} />
        )}

        {state.activeTab === 'settings' && (
          <SettingsTab
            filters={state.filters}
            autoScroll={state.autoScroll}
            maxEntries={state.maxEntries}
            onFiltersChange={(filters) => setState(prev => ({ ...prev, filters }))}
            onAutoScrollChange={(autoScroll) => setState(prev => ({ ...prev, autoScroll }))}
            onMaxEntriesChange={(maxEntries) => setState(prev => ({ ...prev, maxEntries }))}
          />
        )}
      </div>
    </div>
  );
};

// ==================== 子组件 ====================

interface EventLogsTabProps {
  logs: EventLogEntry[];
  onClear: () => void;
  autoScroll: boolean;
}

const EventLogsTab: React.FC<EventLogsTabProps> = ({ logs, onClear, autoScroll }) => {
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <span>Event Logs ({logs.length})</span>
        <button onClick={onClear} style={styles.clearButton}>
          Clear
        </button>
      </div>
      <div style={styles.logContainer}>
        {logs.map(entry => (
          <div key={entry.id} style={styles.logEntry}>
            <div style={styles.logHeader}>
              <span style={styles.logTime}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span style={styles.logType}>{entry.type}</span>
              <span style={styles.logSource}>{entry.source}</span>
            </div>
            <div style={styles.logData}>
              <pre>{JSON.stringify(entry.data, null, 2)}</pre>
            </div>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

interface StateChangesTabProps {
  changes: StateChangeEntry[];
  onClear: () => void;
  autoScroll: boolean;
}

const StateChangesTab: React.FC<StateChangesTabProps> = ({ changes, onClear, autoScroll }) => {
  const changesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && changesEndRef.current) {
      changesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [changes, autoScroll]);

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <span>State Changes ({changes.length})</span>
        <button onClick={onClear} style={styles.clearButton}>
          Clear
        </button>
      </div>
      <div style={styles.logContainer}>
        {changes.map(entry => (
          <div key={entry.id} style={styles.logEntry}>
            <div style={styles.logHeader}>
              <span style={styles.logTime}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span style={styles.logType}>
                {entry.action?.type || 'UNKNOWN_ACTION'}
              </span>
            </div>
            <div style={styles.logData}>
              <div>
                <strong>Action:</strong>
                <pre>{JSON.stringify(entry.action, null, 2)}</pre>
              </div>
            </div>
          </div>
        ))}
        <div ref={changesEndRef} />
      </div>
    </div>
  );
};

const PerformanceTab: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const updateMetrics = () => {
      const performanceMetrics = globalPerformanceOptimizer.getMetrics();
      setMetrics(performanceMetrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!metrics) {
    return <div style={styles.loading}>Loading performance metrics...</div>;
  }

  return (
    <div style={styles.tabContent}>
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <h4>Event Processing</h4>
          <p>Count: {metrics.eventProcessingTime.length}</p>
          <p>Avg Time: {calculateAverage(metrics.eventProcessingTime).toFixed(2)}ms</p>
        </div>
        <div style={styles.metricCard}>
          <h4>State Updates</h4>
          <p>Count: {metrics.stateUpdateTime.length}</p>
          <p>Avg Time: {calculateAverage(metrics.stateUpdateTime).toFixed(2)}ms</p>
        </div>
        <div style={styles.metricCard}>
          <h4>Memory Usage</h4>
          <p>Samples: {metrics.memoryUsage.length}</p>
          {metrics.memoryUsage.length > 0 && (
            <p>Latest: {metrics.memoryUsage[metrics.memoryUsage.length - 1].used.toFixed(2)}MB</p>
          )}
        </div>
        <div style={styles.metricCard}>
          <h4>Batch Processing</h4>
          <p>Total Batches: {metrics.batchProcessingStats.totalBatches}</p>
          <p>Avg Size: {metrics.batchProcessingStats.averageBatchSize.toFixed(2)}</p>
          <p>Avg Time: {metrics.batchProcessingStats.averageProcessingTime.toFixed(2)}ms</p>
        </div>
      </div>
    </div>
  );
};

interface HealthTabProps {
  health: CommunicationHealth | null;
}

const HealthTab: React.FC<HealthTabProps> = ({ health }) => {
  if (!health) {
    return <div style={styles.loading}>Loading health status...</div>;
  }

  const getStatusColor = (status: boolean) => status ? '#4CAF50' : '#F44336';

  return (
    <div style={styles.tabContent}>
      <div style={styles.healthGrid}>
        <div style={styles.healthCard}>
          <h4>Overall Health</h4>
          <div
            style={{
              ...styles.healthStatus,
              backgroundColor: getStatusColor(health.overall)
            }}
          >
            {health.overall ? 'Healthy' : 'Unhealthy'}
          </div>
        </div>
        
        {Object.entries(health).filter(([key]) => key !== 'overall' && key !== 'timestamp').map(([key, status]) => (
          <div key={key} style={styles.healthCard}>
            <h4>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h4>
            <div
              style={{
                ...styles.healthStatus,
                backgroundColor: getStatusColor(status as boolean)
              }}
            >
              {status ? 'OK' : 'Error'}
            </div>
          </div>
        ))}
      </div>
      <div style={styles.healthTimestamp}>
        Last checked: {new Date(health.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

interface SettingsTabProps {
  filters: DebuggerState['filters'];
  autoScroll: boolean;
  maxEntries: number;
  onFiltersChange: (filters: DebuggerState['filters']) => void;
  onAutoScrollChange: (autoScroll: boolean) => void;
  onMaxEntriesChange: (maxEntries: number) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({
  filters,
  autoScroll,
  maxEntries,
  onFiltersChange,
  onAutoScrollChange,
  onMaxEntriesChange
}) => {
  return (
    <div style={styles.tabContent}>
      <div style={styles.settingsSection}>
        <h4>Display Settings</h4>
        <label style={styles.settingItem}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => onAutoScrollChange(e.target.checked)}
          />
          Auto-scroll to latest entries
        </label>
        <label style={styles.settingItem}>
          Max entries:
          <input
            type="number"
            value={maxEntries}
            onChange={(e) => onMaxEntriesChange(parseInt(e.target.value))}
            style={styles.numberInput}
            min="100"
            max="10000"
            step="100"
          />
        </label>
      </div>

      <div style={styles.settingsSection}>
        <h4>Filters</h4>
        <label style={styles.settingItem}>
          Time range (minutes):
          <input
            type="number"
            value={filters.timeRange}
            onChange={(e) => onFiltersChange({
              ...filters,
              timeRange: parseInt(e.target.value)
            })}
            style={styles.numberInput}
            min="1"
            max="1440"
          />
        </label>
      </div>
    </div>
  );
};

// ==================== 工具函数 ====================

function generateId(): string {
  return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}

// ==================== 样式 ====================

const styles = {
  toggleButton: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    zIndex: 10000,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },
  container: {
    position: 'fixed' as const,
    top: '60px',
    right: '20px',
    width: '800px',
    height: '600px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column' as const,
    fontFamily: 'monospace'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f5f5f5'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold'
  },
  headerActions: {
    display: 'flex',
    gap: '8px'
  },
  button: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  closeButton: {
    backgroundColor: '#F44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #ddd'
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '12px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    borderBottom: '2px solid transparent'
  },
  activeTab: {
    borderBottomColor: '#2196F3',
    color: '#2196F3',
    fontWeight: 'bold'
  },
  content: {
    flex: 1,
    overflow: 'hidden'
  },
  tabContent: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#fafafa'
  },
  clearButton: {
    backgroundColor: '#FF9800',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  logContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '8px'
  },
  logEntry: {
    marginBottom: '8px',
    border: '1px solid #eee',
    borderRadius: '4px',
    backgroundColor: '#fafafa'
  },
  logHeader: {
    display: 'flex',
    gap: '12px',
    padding: '8px 12px',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #eee',
    fontSize: '12px'
  },
  logTime: {
    color: '#666',
    fontWeight: 'bold'
  },
  logType: {
    color: '#2196F3',
    fontWeight: 'bold'
  },
  logSource: {
    color: '#FF9800'
  },
  logData: {
    padding: '8px 12px',
    fontSize: '11px',
    maxHeight: '200px',
    overflow: 'auto'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    fontSize: '14px',
    color: '#666'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    padding: '16px'
  },
  metricCard: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '12px',
    backgroundColor: '#fafafa'
  },
  healthGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    padding: '16px'
  },
  healthCard: {
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '12px',
    backgroundColor: '#fafafa',
    textAlign: 'center' as const
  },
  healthStatus: {
    padding: '8px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 'bold',
    marginTop: '8px'
  },
  healthTimestamp: {
    padding: '16px',
    textAlign: 'center' as const,
    color: '#666',
    fontSize: '12px',
    borderTop: '1px solid #eee'
  },
  settingsSection: {
    padding: '16px',
    borderBottom: '1px solid #eee'
  },
  settingItem: {
    display: 'block',
    marginBottom: '12px',
    fontSize: '14px'
  },
  numberInput: {
    marginLeft: '8px',
    padding: '4px 8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    width: '80px'
  }
};

export default CommunicationDebugger;