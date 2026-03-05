import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

export interface DiskHealth {
  Drive: string;
  UsedPercent: number;
  [key: string]: any;
}

export interface HealthData {
  cpu: number;
  disks: DiskHealth[];
}

export function useSystemMonitor() {
  const { t } = useTranslation();
  const [activityData, setActivityData] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<HealthData>({
    cpu: 0,
    disks: [],
  });

  const [loading, setLoading] = useState(false);
  const [showLivePanel, setShowLivePanel] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const loadAllData = useCallback(
    async (isSilent: boolean = false) => {
      if (!isSilent) setLoading(true);
      try {
        const [actRes, healthRes] = await Promise.all([
          (window as any).electronAPI.dbGetActivity(),
          (window as any).electronAPI.dbGetServerHealth(),
        ]);

        if (actRes?.success) setActivityData(actRes.data || []);
        if (healthRes?.success) {
          setHealthData({ cpu: healthRes.cpu, disks: healthRes.disks || [] });
        }
      } catch (error) {
        console.error(t("activity.dataFetchError"), error);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [t],
  );

  const handleLiveRefresh = useCallback(() => {
    loadAllData(true);
  }, [loadAllData]);

  const isCpuCritical = healthData.cpu > 80;
  const isDiskCritical =
    healthData.disks.length > 0 && healthData.disks[0].UsedPercent > 90;

  return {
    activityData,
    healthData,
    loading,
    showLivePanel,
    setShowLivePanel,
    isLiveActive,
    setIsLiveActive,
    loadAllData,
    handleLiveRefresh,
    isCpuCritical,
    isDiskCritical,
  };
}
