import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Activity, Zap, Cpu, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";

import { useSystemMonitor } from "@/hooks/useSystemMonitor";

import DataToolbar from "@/components/DataToolbar";
import DataTable from "@/components/DataTable";
import LiveMonitoringPanel from "@/components/LiveMonitoringPanel";

export default function ActivityMonitorPage() {
  const { t } = useTranslation();
  const {
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
  } = useSystemMonitor();

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-background custom-scrollbar">
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-0 shrink-0">
          <DataToolbar
            title={t("activity.title")}
            recordCount={activityData.length}
            onRefresh={() => loadAllData(false)}
            loading={loading}
            showLimitSelector={false}
            showFilterButton={false}
            showLiveButton={true}
            showLivePanel={showLivePanel}
            onToggleLivePanel={() => setShowLivePanel(!showLivePanel)}
            isLiveActive={isLiveActive}
            onExport={() => exportToExcel(activityData, "DB_Activity")}
          />
          <div
            className={cn(
              "transition-all duration-300",
              !showLivePanel && "hidden",
            )}
          >
            <LiveMonitoringPanel
              isVisible={showLivePanel}
              onRefresh={handleLiveRefresh}
              onStatusChange={setIsLiveActive}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="p-4 rounded-xl border bg-card flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-info/10 rounded-lg transition-transform hover:scale-105">
              <Zap className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase">
                {t("activity.activeSessions")}
              </p>
              <h4 className="text-2xl font-bold">{activityData.length}</h4>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-card flex items-center gap-4 shadow-sm">
            <div
              className={cn(
                "p-3 rounded-lg transition-transform hover:scale-105",
                isCpuCritical ? "bg-destructive/10" : "bg-warning/10",
              )}
            >
              <Cpu
                className={cn(
                  "w-5 h-5",
                  isCpuCritical ? "text-destructive" : "text-warning",
                )}
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase">
                {t("activity.cpuUsage")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-bold">%{healthData.cpu}</h4>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-500",
                      isCpuCritical ? "bg-destructive" : "bg-warning",
                    )}
                    style={{ width: `${healthData.cpu}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {healthData.disks.length > 0 && (
            <div className="p-4 rounded-xl border bg-card flex items-center gap-4 shadow-sm">
              <div
                className={cn(
                  "p-3 rounded-lg transition-transform hover:scale-105",
                  isDiskCritical ? "bg-destructive/10" : "bg-success/10",
                )}
              >
                <HardDrive
                  className={cn(
                    "w-5 h-5",
                    isDiskCritical ? "text-destructive" : "text-success",
                  )}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase">
                  {t("activity.diskUsage")} ({healthData.disks[0].Drive})
                </p>
                <div className="flex items-center gap-2">
                  <h4 className="text-2xl font-bold">
                    %{healthData.disks[0].UsedPercent}
                  </h4>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500",
                        isDiskCritical ? "bg-destructive" : "bg-success",
                      )}
                      style={{ width: `${healthData.disks[0].UsedPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-full shrink-0">
          <DataTable
            data={activityData}
            columns={
              activityData.length > 0
                ? Object.keys(activityData[0]).map((k) => ({ name: k }))
                : []
            }
            title={t("activity.liveQueryTracking")}
          />
        </div>
      </div>
    </div>
  );
}
