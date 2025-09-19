/**
 * 微应用管理Hook
 * 提供微应用状态管理和操作接口
 */

import { useState, useEffect, useCallback } from 'react';
import { getMicroAppConfigs, checkAppAvailability } from '../micro-apps/setup';
import { MicroAppConfig } from '@shared/types';
import { globalLogger } from '@shared/utils/logger';

interface MicroAppStatus {
  name: string;
  status: 'loading' | 'mounted' | 'unmounted' | 'error';
  available: boolean;
  error?: string;
}

/**
 * 微应用管理Hook
 */
export function useMicroApps() {
  const [microApps, setMicroApps] = useState<MicroAppConfig[]>([]);
  const [appStatuses, setAppStatuses] = useState<Map<string, MicroAppStatus>>(new Map());
  const [loading, setLoading] = useState(true);

  // 初始化微应用列表
  useEffect(() => {
    const configs = getMicroAppConfigs();
    setMicroApps(configs);
    
    // 初始化应用状态
    const initialStatuses = new Map<string, MicroAppStatus>();
    configs.forEach(config => {
      initialStatuses.set(config.name, {
        name: config.name,
        status: 'unmounted',
        available: false
      });
    });
    setAppStatuses(initialStatuses);
    
    setLoading(false);
  }, []);

  // 检查应用可用性
  const checkAppsAvailability = useCallback(async () => {
    const promises = microApps.map(async (app) => {
      try {
        const available = await checkAppAvailability(app.name);
        return { name: app.name, available };
      } catch (error) {
        globalLogger.warn(`Failed to check availability for ${app.name}`, error as Error);
        return { name: app.name, available: false };
      }
    });

    const results = await Promise.all(promises);
    
    setAppStatuses(prev => {
      const newStatuses = new Map(prev);
      results.forEach(({ name, available }) => {
        const current = newStatuses.get(name);
        if (current) {
          newStatuses.set(name, { ...current, available });
        }
      });
      return newStatuses;
    });
  }, [microApps]);

  // 定期检查应用可用性
  useEffect(() => {
    if (microApps.length === 0) return;

    checkAppsAvailability();
    
    const interval = setInterval(checkAppsAvailability, 30000); // 30秒检查一次
    return () => clearInterval(interval);
  }, [microApps, checkAppsAvailability]);

  // 更新应用状态
  const updateAppStatus = useCallback((appName: string, status: Partial<MicroAppStatus>) => {
    setAppStatuses(prev => {
      const newStatuses = new Map(prev);
      const current = newStatuses.get(appName);
      if (current) {
        newStatuses.set(appName, { ...current, ...status });
      }
      return newStatuses;
    });
  }, []);

  // 获取应用状态
  const getAppStatus = useCallback((appName: string): MicroAppStatus | undefined => {
    return appStatuses.get(appName);
  }, [appStatuses]);

  // 获取可用的应用列表
  const getAvailableApps = useCallback((): MicroAppConfig[] => {
    return microApps.filter(app => {
      const status = appStatuses.get(app.name);
      return status?.available;
    });
  }, [microApps, appStatuses]);

  // 获取不可用的应用列表
  const getUnavailableApps = useCallback((): MicroAppConfig[] => {
    return microApps.filter(app => {
      const status = appStatuses.get(app.name);
      return !status?.available;
    });
  }, [microApps, appStatuses]);

  return {
    microApps,
    appStatuses: Array.from(appStatuses.values()),
    loading,
    updateAppStatus,
    getAppStatus,
    getAvailableApps,
    getUnavailableApps,
    checkAppsAvailability
  };
}