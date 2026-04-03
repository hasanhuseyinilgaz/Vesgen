import { useState, useEffect, useCallback } from "react";
import { WindowsServerResource } from "@/types";

export function useWinMonitor(server: WindowsServerResource | null, paused: boolean = false, pauseHistory: boolean = false, historyDate?: string) {
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [currentStats, setCurrentStats] = useState<any>(null);
  const [loading, setLoading] = useState(!!server);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const serverId = server?.id || server?.host;

  const loadInitialHistory = useCallback(async () => {
    if (!serverId) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.monitoringGetHistory(serverId, historyDate);
      if (res.success && res.data) {
        setPerformanceData(res.data);
        if (res.data.length > 0) {
          setCurrentStats(res.data[res.data.length - 1]);
        }
      }
    } catch (err: any) {
      setError("Geçmiş yükleme hatası: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [serverId, historyDate]);

  useEffect(() => {
    if (!server || !serverId) {
      setPerformanceData([]);
      setCurrentStats(null);
      return;
    }

    // Start background monitoring in main process
    window.electronAPI.monitoringStart(server);
    
    // Fetch available dates for UI constraint
    window.electronAPI.monitoringGetAvailableDates(serverId).then((res) => {
      if (res.success && res.data) {
        setAvailableDates(res.data);
      }
    });
    
    // Initial history load
    loadInitialHistory();

    // Listen for real-time updates
    const removeUpdateListener = window.electronAPI.onMonitoringUpdate(serverId, (data: any) => {
      if (paused) return; 
      
      setCurrentStats(data);
      if (!pauseHistory) {
        setPerformanceData(prev => {
          const newData = [...prev, data];
          if (newData.length > 25000) return newData.slice(1);
          return newData;
        });
      }
      setError(null);
      setStatus("connected");
      setLastError(null);
    });

    // Listen for status changes (retrying, error, etc.)
    const removeStatusListener = window.electronAPI.onMonitoringStatus(serverId, (data: any) => {
      setStatus(data.status);
      setLastError(data.lastError);
    });

    // Set preferred interval to 3s (Active page)
    window.electronAPI.monitoringUpdateInterval(serverId, 3000);

    return () => {
      removeUpdateListener();
      removeStatusListener();
      // Set preferred interval to 10s (Background/Other pages)
      window.electronAPI.monitoringUpdateInterval(serverId, 10000);
    };
  }, [server, serverId, paused, pauseHistory, loadInitialHistory]);

  return { 
    performanceData, 
    currentStats, 
    loading, 
    error, 
    status,
    lastError,
    availableDates,
    refresh: loadInitialHistory 
  };
}
