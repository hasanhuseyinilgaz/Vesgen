import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Tenant } from "@/types";
import { useTenants } from "@/hooks/useTenants";
import { useSettings } from "@/hooks/useSettings";

type HealthStatus = "online" | "offline" | "connecting";

interface HealthMetrics {
  cpu?: number;
  ram?: number;
}

interface HealthContextType {
  fleetStatus: Record<string, HealthStatus>;
  fleetMetrics: Record<string, HealthMetrics>;
  fleetSessions: Record<string, number>;
  isScanning: boolean;
  lastScanTime: Date | null;
  refreshHealth: (force?: boolean) => Promise<void>;
  monitoringInterval: number;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenants } = useTenants();
  const { config, loadConfig } = useSettings();

  const [fleetStatus, setFleetStatus] = useState<Record<string, HealthStatus>>({});
  const [fleetMetrics, setFleetMetrics] = useState<Record<string, HealthMetrics>>({});
  const [fleetSessions, setFleetSessions] = useState<Record<string, number>>({});
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const isScanningRef = useRef(false);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Default interval 10 seconds if not set in config
  const monitoringInterval = useMemo(() => {
    return config?.ui?.monitoring?.interval || 10;
  }, [config]);

  const allDatabases = useMemo(() => tenants.flatMap(t => t.databases || []), [tenants]);
  const allWindowsServers = useMemo(() => tenants.flatMap(t => t.windowsServers || []), [tenants]);

  const allResources = useMemo(() => [
    ...tenants.flatMap(t => (t.databases || []).map(db => ({ ...db, type: 'database' }))),
    ...tenants.flatMap(t => (t.windowsServers || []).map(srv => ({ ...srv, type: 'windowsServer' })))
  ], [tenants]);

  const refreshHealth = useCallback(async () => {
    if (isScanningRef.current) return;
    
    setIsScanning(true);
    isScanningRef.current = true;
    
    try {
      await window.electronAPI.monitoringRefresh();
      setLastScanTime(new Date());
    } finally {
      // Simulate scanning animation for 1s for UX
      setTimeout(() => {
        setIsScanning(false);
        isScanningRef.current = false;
      }, 1000);
    }
  }, []);

  // Initial synchronization with Main Process
  useEffect(() => {
    const syncStatus = async () => {
      try {
        const res = await window.electronAPI.monitoringGetAllStatuses();
        if (res.success && res.data) {
          const statuses: Record<string, HealthStatus> = {};
          const metrics: Record<string, HealthMetrics> = {};
          const sessions: Record<string, number> = {};

          Object.entries(res.data).forEach(([id, info]: [string, any]) => {
            statuses[id] = info.status === "connected" ? "online" : 
                           info.status === "error" ? "offline" : "connecting";
            
            if (info.lastData) {
              if (typeof info.lastData.activeSessions !== "undefined") {
                sessions[id] = info.lastData.activeSessions;
              }
              if (typeof info.lastData.CPU !== "undefined") {
                metrics[id] = {
                  cpu: Math.round(info.lastData.CPU),
                  ram: info.lastData.RAM?.Percent ? Math.round(info.lastData.RAM.Percent) : undefined
                };
              }
            }
          });

          setFleetStatus(prev => ({ ...prev, ...statuses }));
          setFleetMetrics(prev => ({ ...prev, ...metrics }));
          setFleetSessions(prev => ({ ...prev, ...sessions }));
          setLastScanTime(new Date());
        }
      } catch (err) {
        console.error("[Health] Initial sync failed:", err);
      }
    };

    syncStatus();
  }, []);

  // Sync state with Main Process Monitoring Service
  useEffect(() => {
    if (allResources.length === 0) return;

    const cleanupFns: (() => void)[] = [];

    allResources.forEach(res => {
      if (res.excludeFromMonitoring) {
        // Clear status if it was previously set
        setFleetStatus(prev => {
          if (prev[res.id]) {
            const next = { ...prev };
            delete next[res.id];
            return next;
          }
          return prev;
        });
        return;
      }

      // Status listener (Connecting -> Connected -> Error)
      const unsubStatus = window.electronAPI.onMonitoringStatus(res.id, (data: any) => {
        setFleetStatus(prev => ({
          ...prev,
          [res.id]: data.status === "connected" ? "online" : 
                    data.status === "error" ? "offline" : "connecting"
        }));
        setLastScanTime(new Date());

        if (data.status === "error" && data.lastError) {
          console.warn(`[Health] Error for ${res.id}: ${data.lastError}`);
        }
      });

      // Data listener (Metrics, Sessions, etc.)
      const unsubUpdate = window.electronAPI.onMonitoringUpdate(res.id, (data: any) => {
        // Update Sessions (Databases)
        if (typeof data.activeSessions !== "undefined") {
          setFleetSessions(prev => ({ ...prev, [res.id]: data.activeSessions }));
        }

        // Update Metrics (Servers)
        if (typeof data.CPU !== "undefined") {
          setFleetMetrics(prev => ({
            ...prev,
            [res.id]: {
              cpu: Math.round(data.CPU),
              ram: data.RAM?.Percent ? Math.round(data.RAM.Percent) : undefined
            }
          }));
        }

        // Receiving data implicitly means online
        setFleetStatus(prev => ({ ...prev, [res.id]: "online" }));
        setLastScanTime(new Date());
      });

      cleanupFns.push(unsubStatus, unsubUpdate);
    });

    return () => cleanupFns.forEach(fn => fn());
  }, [allResources]);

  // Handle network online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (window.electronAPI.sendNetworkStatus) {
        window.electronAPI.sendNetworkStatus(true);
      }
      refreshHealth();
    };
    const handleOffline = () => {
      if (window.electronAPI.sendNetworkStatus) {
        window.electronAPI.sendNetworkStatus(false);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshHealth]);

  return (
    <HealthContext.Provider value={{
      fleetStatus,
      fleetMetrics,
      fleetSessions,
      isScanning,
      lastScanTime,
      refreshHealth,
      monitoringInterval
    }}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error("useHealth must be used within a HealthProvider");
  }
  return context;
};
