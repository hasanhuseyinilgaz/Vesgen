import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  HeartPulse,
  Zap,
  DatabaseBackup,
  BarChartBig,
  RefreshCw,
  Wrench,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Activity,
  HardDrive,
  Eraser,
  Database,
  Table as TableIcon,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import CustomTabs from "@/components/CustomTabs";
import EmptyState from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PasswordModal from "@/components/PasswordModal";

import { useAuthGate } from "@/hooks/useAuthGate";
import {
  useDatabaseMaintenance,
  FragmentedIndex,
} from "@/hooks/useDatabaseMaintenance";

import ActionTooltip from "@/components/ActionTooltip";

export default function DatabaseMaintenancePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"indexes" | "logs" | "stats">(
    "indexes",
  );

  const [fixingIndexId, setFixingIndexId] = useState<string | null>(null);
  const [isShrinking, setIsShrinking] = useState(false);
  const [isUpdatingAllStats, setIsUpdatingAllStats] = useState(false);
  const [updatingTableStat, setUpdatingTableStat] = useState<string | null>(
    null,
  );

  const [resultModal, setResultModal] = useState({
    isOpen: false,
    success: false,
    message: "",
    title: "",
    targetName: "",
    action: "",
    oldVal: 0,
    newVal: 0,
  });

  const {
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    modalContext,
    executeWithAuth,
    handlePasswordSuccess,
  } = useAuthGate();

  const {
    indexes,
    setIndexes,
    indexHealthScore,
    setIndexHealthScore,
    loadingIndexes,
    loadFragmentedIndexes,
    dbFiles,
    topTables,
    loadingDisk,
    diskError,
    loadDiskInfo,
    tableStats,
    statsHealthScore,
    loadingStats,
    loadStatisticsInfo,
  } = useDatabaseMaintenance();

  useEffect(() => {
    if (activeTab === "indexes") loadFragmentedIndexes();
    if (activeTab === "logs") loadDiskInfo();
    if (activeTab === "stats") loadStatisticsInfo();
  }, [activeTab]);

  const executeFixIndex = async (index: FragmentedIndex) => {
    const uniqueId = `${index.TableName}_${index.IndexName}`;
    setFixingIndexId(uniqueId);
    try {
      if ((window as any).electronAPI?.dbFixIndex) {
        const result = await (window as any).electronAPI.dbFixIndex({
          tableName: index.TableName,
          indexName: index.IndexName,
          fragmentation: index.Fragmentation,
        });

        if (result?.success) {
          setIndexes((prev) =>
            prev.map((i) =>
              `${i.TableName}_${i.IndexName}` === uniqueId
                ? { ...i, Fragmentation: result.newFragmentation }
                : i,
            ),
          );
          if (result.newHealthScore !== undefined)
            setIndexHealthScore(result.newHealthScore);

          setResultModal({
            isOpen: true,
            success: true,
            title: t("maintenance.indexFixSuccess"),
            message: result.message,
            targetName: index.IndexName,
            action:
              result.action === "REBUILD"
                ? t("maintenance.indexFixRebuild")
                : t("maintenance.indexFixReorganize"),
            oldVal: index.Fragmentation,
            newVal: result.newFragmentation,
          });
        } else {
          setResultModal({
            isOpen: true,
            success: false,
            title: t("maintenance.indexFixFailed"),
            message: result.message,
            targetName: index.IndexName,
            action: "",
            oldVal: 0,
            newVal: 0,
          });
        }
      }
    } catch (error: any) {
      setResultModal({
        isOpen: true,
        success: false,
        title: t("maintenance.errorTitle"),
        message: error.message,
        targetName: index.IndexName,
        action: "",
        oldVal: 0,
        newVal: 0,
      });
    } finally {
      setFixingIndexId(null);
    }
  };

  const executeShrinkLog = async () => {
    setIsShrinking(true);
    try {
      if ((window as any).electronAPI?.dbShrinkLogFile) {
        const result = await (window as any).electronAPI.dbShrinkLogFile();
        setResultModal({
          isOpen: true,
          success: result.success,
          title: result.success
            ? t("maintenance.logShrinkSuccess")
            : t("maintenance.logShrinkFailed"),
          message: result.message,
          targetName: "",
          action: "",
          oldVal: 0,
          newVal: 0,
        });
        if (result.success) loadDiskInfo();
      }
    } catch (error: any) {
      setResultModal({
        isOpen: true,
        success: false,
        title: t("maintenance.errorTitle"),
        message: error.message,
        targetName: "",
        action: "",
        oldVal: 0,
        newVal: 0,
      });
    } finally {
      setIsShrinking(false);
    }
  };

  const executeUpdateTableStat = async (tableName: string) => {
    setUpdatingTableStat(tableName);
    try {
      if ((window as any).electronAPI?.dbUpdateTableStatistics) {
        const result = await (
          window as any
        ).electronAPI.dbUpdateTableStatistics(tableName);
        if (result?.success) {
          setResultModal({
            isOpen: true,
            success: true,
            title: t("maintenance.statUpdateSuccess"),
            message: result.message,
            targetName: tableName,
            action: t("maintenance.statUpdateAction"),
            oldVal: 0,
            newVal: 0,
          });
          loadStatisticsInfo();
        } else {
          setResultModal({
            isOpen: true,
            success: false,
            title: t("maintenance.errorTitle"),
            message: result.message,
            targetName: tableName,
            action: "",
            oldVal: 0,
            newVal: 0,
          });
        }
      }
    } catch (error: any) {
      setResultModal({
        isOpen: true,
        success: false,
        title: t("maintenance.errorTitle"),
        message: error.message,
        targetName: tableName,
        action: "",
        oldVal: 0,
        newVal: 0,
      });
    } finally {
      setUpdatingTableStat(null);
    }
  };

  const executeUpdateAllStats = async () => {
    setIsUpdatingAllStats(true);
    try {
      if ((window as any).electronAPI?.dbUpdateAllStatistics) {
        const result = await (
          window as any
        ).electronAPI.dbUpdateAllStatistics();
        if (result?.success) {
          setResultModal({
            isOpen: true,
            success: true,
            title: t("maintenance.allStatsUpdateSuccess"),
            message: result.message,
            targetName: t("maintenance.allDatabase"),
            action: t("maintenance.allStatsUpdateAction"),
            oldVal: 0,
            newVal: 0,
          });
          loadStatisticsInfo();
        } else {
          setResultModal({
            isOpen: true,
            success: false,
            title: t("maintenance.errorTitle"),
            message: result.message,
            targetName: "",
            action: "",
            oldVal: 0,
            newVal: 0,
          });
        }
      }
    } catch (error: any) {
      setResultModal({
        isOpen: true,
        success: false,
        title: t("maintenance.errorTitle"),
        message: error.message,
        targetName: "",
        action: "",
        oldVal: 0,
        newVal: 0,
      });
    } finally {
      setIsUpdatingAllStats(false);
    }
  };

  const handleFixIndexInitiate = (index: FragmentedIndex) => {
    const isCritical = index.Fragmentation >= 30;
    const desc = isCritical
      ? t("maintenance.authIndexDescCritical", { table: index.TableName })
      : t("maintenance.authIndexDescHealthy", { table: index.TableName });

    executeWithAuth("indexOptimize", () => executeFixIndex(index), {
      title: t("maintenance.authIndexTitle"),
      description: desc,
    });
  };

  const handleShrinkLogInitiate = () => {
    executeWithAuth("logShrink", executeShrinkLog, {
      title: t("maintenance.authLogTitle"),
      description: t("maintenance.authLogDesc"),
    });
  };

  const handleUpdateTableStatInitiate = (tableName: string) => {
    executeWithAuth("statsUpdate", () => executeUpdateTableStat(tableName), {
      title: t("maintenance.authStatTitle"),
      description: t("maintenance.authStatDesc", { table: tableName }),
    });
  };

  const handleUpdateAllStatsInitiate = () => {
    executeWithAuth("statsUpdate", executeUpdateAllStats, {
      title: t("maintenance.authAllStatsTitle"),
      description: t("maintenance.authAllStatsDesc"),
    });
  };

  return (
    <div className="flex h-screen bg-background flex-col w-full relative z-0">
      <div className="p-6 pb-2 border-b bg-muted/10 shrink-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("maintenance.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("maintenance.description")}
            </p>
          </div>
        </div>
        <CustomTabs
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as any)}
          tabs={[
            { value: "indexes", label: t("maintenance.tabIndexes"), icon: Zap },
            {
              value: "logs",
              label: t("maintenance.tabLogs"),
              icon: DatabaseBackup,
            },
            {
              value: "stats",
              label: t("maintenance.tabStats"),
              icon: BarChartBig,
            },
          ]}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-muted/5 custom-scrollbar">
        {activeTab === "indexes" && (
          <div className="flex flex-col gap-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-4 bg-card p-5 rounded-xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold flex items-center text-lg">
                    <ActionTooltip
                      label={t("maintenance.fragmentedIndexesDesc")}
                      side="top"
                    >
                      <AlertCircle className="w-5 h-5 mr-2 text-warning cursor-help" />
                    </ActionTooltip>
                    {t("maintenance.fragmentedIndexes", {
                      count: indexes.filter((i) => i.Fragmentation >= 10)
                        .length,
                    })}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("maintenance.fragmentedIndexesDesc")}
                  </p>
                </div>
                <Button
                  onClick={loadFragmentedIndexes}
                  disabled={loadingIndexes || fixingIndexId !== null}
                  variant="outline"
                  className="shrink-0 h-10 px-5 shadow-sm"
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 mr-2",
                      loadingIndexes && "animate-spin",
                    )}
                  />{" "}
                  {t("maintenance.rescan")}
                </Button>
              </div>

              <div className="lg:col-span-1 bg-card p-5 rounded-xl border shadow-sm flex flex-col justify-center gap-3">
                <div className="flex justify-between items-center">
                  <ActionTooltip
                    label={t("maintenance.overallHealth")}
                    side="top"
                  >
                    <div className="flex items-center gap-1.5 cursor-help">
                      <Activity
                        className={cn(
                          "w-4 h-4",
                          indexHealthScore >= 90
                            ? "text-success"
                            : indexHealthScore >= 70
                              ? "text-warning"
                              : "text-destructive",
                        )}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("maintenance.overallHealth")}
                      </span>
                    </div>
                  </ActionTooltip>
                  <span
                    className={cn(
                      "text-xl font-black tracking-tight",
                      indexHealthScore >= 90
                        ? "text-success"
                        : indexHealthScore >= 70
                          ? "text-warning"
                          : "text-destructive",
                    )}
                  >
                    %{indexHealthScore}
                  </span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      indexHealthScore >= 90
                        ? "bg-success"
                        : indexHealthScore >= 70
                          ? "bg-warning"
                          : "bg-destructive",
                    )}
                    style={{ width: `${indexHealthScore}%` }}
                  />
                </div>
              </div>
            </div>

            {loadingIndexes ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
                <RefreshCw className="w-10 h-10 animate-spin opacity-20 mb-4" />
                {t("maintenance.analyzingHealth")}
              </div>
            ) : indexes.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={t("maintenance.congratulations")}
                description={t("maintenance.noFragmentedIndexes")}
              />
            ) : (
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-muted-foreground">
                          {t("maintenance.tableName")}
                        </th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground">
                          {t("maintenance.indexName")}
                        </th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground">
                          {t("maintenance.pageCount")}
                        </th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground w-48">
                          {t("maintenance.fragmentationRate")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                          {t("maintenance.action")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {indexes.map((idx) => {
                        const uniqueId = `${idx.TableName}_${idx.IndexName}`;
                        const isFixingThis = fixingIndexId === uniqueId;
                        const isAnyFixing = fixingIndexId !== null;
                        const isHealthy = idx.Fragmentation < 10;
                        const isCritical = idx.Fragmentation >= 30;

                        return (
                          <tr
                            key={uniqueId}
                            className={cn(
                              "transition-colors",
                              isHealthy ? "bg-success/5" : "hover:bg-muted/20",
                            )}
                          >
                            <td className="px-4 py-3 font-medium">
                              {idx.TableName}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {idx.IndexName}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">
                              {idx.PageCount}
                            </td>
                            <td className="px-4 py-3">
                              <ActionTooltip
                                label={`${t("maintenance.fragmentationRate")}: ${idx.Fragmentation.toFixed(1)}%`}
                                side="top"
                              >
                                <div className="flex items-center gap-3 cursor-help">
                                  <span
                                    className={cn(
                                      "font-bold shrink-0 min-w-[64px] whitespace-nowrap",
                                      isHealthy
                                        ? "text-success"
                                        : isCritical
                                          ? "text-destructive"
                                          : "text-warning",
                                    )}
                                  >
                                    %
                                    {idx.Fragmentation.toLocaleString("tr-TR", {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    })}
                                  </span>
                                  <div className="flex-1 h-2 min-w-[50px] bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        isHealthy
                                          ? "bg-success"
                                          : isCritical
                                            ? "bg-destructive"
                                            : "bg-warning",
                                      )}
                                      style={{
                                        width: `${Math.min(Math.max(idx.Fragmentation, 2), 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </ActionTooltip>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant={
                                  isHealthy
                                    ? "outline"
                                    : isCritical
                                      ? "default"
                                      : "secondary"
                                }
                                onClick={() => handleFixIndexInitiate(idx)}
                                disabled={isAnyFixing || isHealthy}
                                className={cn(
                                  "min-w-[150px] shadow-sm",
                                  isHealthy && "border-success/30 text-success",
                                )}
                              >
                                {isFixingThis ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />{" "}
                                    {t("maintenance.fixing")}
                                  </>
                                ) : isHealthy ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />{" "}
                                    {t("maintenance.healthy")}
                                  </>
                                ) : (
                                  <>
                                    <Wrench className="w-3.5 h-3.5 mr-1.5" />{" "}
                                    {isCritical
                                      ? t("maintenance.rebuild")
                                      : t("maintenance.reorganize")}
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-5 rounded-xl border shadow-sm gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold flex items-center text-lg">
                  <ActionTooltip
                    label={t("maintenance.fileSizesDesc")}
                    side="top"
                  >
                    <HardDrive className="w-5 h-5 mr-2 text-primary cursor-help" />
                  </ActionTooltip>
                  {t("maintenance.fileSizesAndUsage")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("maintenance.fileSizesDesc")}
                </p>
              </div>
              <Button
                onClick={loadDiskInfo}
                disabled={loadingDisk || isShrinking}
                variant="outline"
                className="shrink-0 h-10 px-5 shadow-sm"
              >
                <RefreshCw
                  className={cn("w-4 h-4 mr-2", loadingDisk && "animate-spin")}
                />{" "}
                {t("maintenance.refresh")}
              </Button>
            </div>

            {diskError && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">{t("maintenance.errorOccurred")}</p>
                  <p className="mt-1">{diskError}</p>
                </div>
              </div>
            )}

            {loadingDisk ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
                <RefreshCw className="w-10 h-10 animate-spin opacity-20 mb-4" />
                {t("maintenance.analyzingDisk")}
              </div>
            ) : (
              !diskError &&
              dbFiles.length > 0 && (
                <div className="flex flex-col gap-6 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dbFiles.map((file) => {
                      const isLog = file.FileType === "LOG";
                      const usedPercentage =
                        file.TotalSizeMB > 0
                          ? (file.UsedSizeMB / file.TotalSizeMB) * 100
                          : 0;

                      return (
                        <Card
                          key={file.LogicalName}
                          className="border-border/50 shadow-sm"
                        >
                          <CardContent className="p-6 flex flex-col gap-5">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  {isLog ? (
                                    <DatabaseBackup className="w-5 h-5 text-warning" />
                                  ) : (
                                    <Database className="w-5 h-5 text-success" />
                                  )}
                                  <h4 className="font-semibold text-base">
                                    {isLog
                                      ? t("maintenance.logFile")
                                      : t("maintenance.dataFile")}
                                  </h4>
                                </div>
                                <p className="text-sm text-muted-foreground font-mono mt-1">
                                  {file.LogicalName}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-2xl font-bold text-foreground">
                                  {file.TotalSizeMB.toLocaleString("tr-TR", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  <span className="text-base text-muted-foreground">
                                    MB
                                  </span>
                                </span>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">
                                  {t("maintenance.totalSize")}
                                </p>
                              </div>
                            </div>

                            <ActionTooltip
                              label={`${t("maintenance.used")}: ${usedPercentage.toFixed(1)}%`}
                              side="top"
                            >
                              <div className="space-y-2 cursor-help">
                                <div className="flex justify-between text-sm font-medium">
                                  <span className="text-foreground/80">
                                    {t("maintenance.used")}{" "}
                                    {file.UsedSizeMB.toLocaleString("tr-TR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    MB
                                  </span>
                                  <span className="text-muted-foreground">
                                    {t("maintenance.free")}{" "}
                                    {(
                                      file.TotalSizeMB - file.UsedSizeMB
                                    ).toLocaleString("tr-TR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    MB
                                  </span>
                                </div>
                                <div className="w-full h-4 bg-muted rounded-full overflow-hidden shadow-inner">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-1000",
                                      isLog ? "bg-warning" : "bg-success",
                                    )}
                                    style={{
                                      width: `${Math.min(usedPercentage, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </ActionTooltip>

                            {isLog && (
                              <div className="pt-4 border-t flex justify-between items-center mt-2">
                                <span className="text-sm text-muted-foreground font-medium">
                                  {t("maintenance.recoveryModel")}{" "}
                                  <b className="text-foreground">
                                    {file.RecoveryModel}
                                  </b>
                                </span>
                                <Button
                                  onClick={handleShrinkLogInitiate}
                                  disabled={isShrinking}
                                  variant="secondary"
                                  className="hover:bg-warning/20 hover:text-warning transition-colors shadow-sm"
                                >
                                  {isShrinking ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />{" "}
                                      {t("maintenance.shrinking")}
                                    </>
                                  ) : (
                                    <>
                                      <Eraser className="w-4 h-4 mr-2" />{" "}
                                      {t("maintenance.shrinkLog")}
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card className="border-border/50 shadow-sm overflow-hidden flex flex-col w-full">
                    <div className="p-5 border-b bg-muted/30 flex items-center gap-2 shrink-0">
                      <ActionTooltip
                        label={t("maintenance.topTables")}
                        side="top"
                      >
                        <TableIcon className="w-5 h-5 text-primary cursor-help" />
                      </ActionTooltip>
                      <h4 className="font-semibold text-base text-foreground">
                        {t("maintenance.topTables")}
                      </h4>
                    </div>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/10">
                          <tr>
                            <th className="px-6 py-4 font-medium text-muted-foreground text-sm">
                              {t("maintenance.tableName")}
                            </th>
                            <th className="px-6 py-4 font-medium text-muted-foreground text-sm text-right">
                              {t("maintenance.rowCount")}
                            </th>
                            <th className="px-6 py-4 font-medium text-muted-foreground text-sm text-right">
                              {t("maintenance.sizeMb")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {topTables.map((table, i) => (
                            <tr
                              key={i}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-6 py-3.5 font-medium text-foreground/80 whitespace-nowrap">
                                {table.TableName}
                              </td>
                              <td className="px-6 py-3.5 font-mono text-sm text-right text-muted-foreground">
                                {table.RowCount.toLocaleString("tr-TR")}
                              </td>
                              <td className="px-6 py-3.5 font-mono text-sm text-right font-bold text-primary">
                                {table.TotalSpaceMB.toLocaleString("tr-TR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )
            )}
          </div>
        )}

        {activeTab === "stats" && (
          <div className="flex flex-col gap-6 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-4 bg-card p-5 rounded-xl border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold flex items-center text-lg">
                    <ActionTooltip
                      label={t("maintenance.staleStatsDesc")}
                      side="top"
                    >
                      <Sparkles className="w-5 h-5 mr-2 text-primary cursor-help" />
                    </ActionTooltip>
                    {t("maintenance.staleStats")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("maintenance.staleStatsDesc")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <ActionTooltip label={t("maintenance.refresh")} side="bottom">
                    <Button
                      onClick={loadStatisticsInfo}
                      disabled={
                        loadingStats ||
                        isUpdatingAllStats ||
                        updatingTableStat !== null
                      }
                      variant="outline"
                      className="h-11 px-4 shadow-sm"
                    >
                      <RefreshCw
                        className={cn(
                          "w-4 h-4",
                          loadingStats && "animate-spin",
                        )}
                      />
                    </Button>
                  </ActionTooltip>
                  <Button
                    onClick={handleUpdateAllStatsInitiate}
                    disabled={
                      loadingStats ||
                      isUpdatingAllStats ||
                      updatingTableStat !== null
                    }
                    className="h-11 px-6 shadow-sm bg-primary hover:bg-primary/90"
                  >
                    {isUpdatingAllStats ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />{" "}
                        {t("maintenance.updating")}
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2 fill-current" />{" "}
                        {t("maintenance.updateAll")}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-1 bg-card p-5 rounded-xl border shadow-sm flex flex-col justify-center gap-3">
                <div className="flex justify-between items-center">
                  <ActionTooltip label={t("maintenance.statHealth")} side="top">
                    <div className="flex items-center gap-1.5 cursor-help">
                      <Activity
                        className={cn(
                          "w-4 h-4",
                          statsHealthScore >= 90
                            ? "text-success"
                            : statsHealthScore >= 70
                              ? "text-warning"
                              : "text-destructive",
                        )}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("maintenance.statHealth")}
                      </span>
                    </div>
                  </ActionTooltip>
                  <span
                    className={cn(
                      "text-xl font-black tracking-tight",
                      statsHealthScore >= 90
                        ? "text-success"
                        : statsHealthScore >= 70
                          ? "text-warning"
                          : "text-destructive",
                    )}
                  >
                    %{statsHealthScore}
                  </span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      statsHealthScore >= 90
                        ? "bg-success"
                        : statsHealthScore >= 70
                          ? "bg-warning"
                          : "bg-destructive",
                    )}
                    style={{ width: `${statsHealthScore}%` }}
                  />
                </div>
              </div>
            </div>

            {loadingStats ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
                <RefreshCw className="w-10 h-10 animate-spin opacity-20 mb-4" />
                {t("maintenance.analyzingStats")}
              </div>
            ) : tableStats.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={t("maintenance.statsGreat")}
                description={t("maintenance.statsGreatDesc")}
              />
            ) : (
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-muted-foreground">
                          {t("maintenance.tableName")}
                        </th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground">
                          {t("maintenance.lastUpdated")}
                        </th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                          {t("maintenance.recordsTotalChanged")}
                        </th>
                        <th className="px-4 py-3 font-semibold text-muted-foreground w-48">
                          {t("maintenance.staleRate")}
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                          {t("maintenance.action")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {tableStats.map((stat) => {
                        const isUpdatingThis =
                          updatingTableStat === stat.TableName;
                        const isAnyUpdating =
                          updatingTableStat !== null || isUpdatingAllStats;
                        const isHealthy = stat.StalePercentage < 10;
                        const isCritical = stat.StalePercentage >= 30;

                        return (
                          <tr
                            key={stat.TableName}
                            className={cn(
                              "transition-colors",
                              isHealthy ? "bg-success/5" : "hover:bg-muted/20",
                            )}
                          >
                            <td className="px-4 py-3 font-medium">
                              {stat.TableName}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <div className="flex items-center">
                                <CalendarClock className="w-3.5 h-3.5 mr-2 opacity-50" />
                                {stat.LastUpdated
                                  ? (() => {
                                      try {
                                        const dateStr =
                                          typeof stat.LastUpdated === "string"
                                            ? stat.LastUpdated
                                            : new Date(
                                                stat.LastUpdated,
                                              ).toISOString();
                                        return new Date(
                                          dateStr.replace("Z", ""),
                                        ).toLocaleString("tr-TR", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        });
                                      } catch (e) {
                                        return t("maintenance.dateParseError");
                                      }
                                    })()
                                  : t("maintenance.neverUpdated")}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-right">
                              <ActionTooltip
                                label={t("maintenance.recordsTotalChanged")}
                                side="top"
                              >
                                <div className="cursor-help inline-block">
                                  <span className="text-foreground/60">
                                    {stat.TotalRows.toLocaleString("tr-TR")}
                                  </span>
                                  <span className="mx-1 text-muted-foreground">
                                    /
                                  </span>
                                  <span
                                    className={cn(
                                      "font-bold",
                                      isHealthy
                                        ? "text-success"
                                        : isCritical
                                          ? "text-destructive"
                                          : "text-warning",
                                    )}
                                  >
                                    {stat.ModifiedRows.toLocaleString("tr-TR")}
                                  </span>
                                </div>
                              </ActionTooltip>
                            </td>
                            <td className="px-4 py-3">
                              <ActionTooltip
                                label={`${t("maintenance.staleRate")}: ${stat.StalePercentage.toFixed(1)}%`}
                                side="top"
                              >
                                <div className="flex items-center gap-3 cursor-help">
                                  <span
                                    className={cn(
                                      "font-bold shrink-0 min-w-[64px] whitespace-nowrap",
                                      isHealthy
                                        ? "text-success"
                                        : isCritical
                                          ? "text-destructive"
                                          : "text-warning",
                                    )}
                                  >
                                    %
                                    {stat.StalePercentage.toLocaleString(
                                      "tr-TR",
                                      {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1,
                                      },
                                    )}
                                  </span>
                                  <div className="flex-1 h-2 min-w-[50px] bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-1000",
                                        isHealthy
                                          ? "bg-success"
                                          : isCritical
                                            ? "bg-destructive"
                                            : "bg-warning",
                                      )}
                                      style={{
                                        width: `${Math.min(Math.max(stat.StalePercentage, 2), 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </ActionTooltip>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant={isHealthy ? "outline" : "secondary"}
                                onClick={() =>
                                  handleUpdateTableStatInitiate(stat.TableName)
                                }
                                disabled={isAnyUpdating || isHealthy}
                                className={cn(
                                  "min-w-[130px] shadow-sm",
                                  isHealthy && "border-success/30 text-success",
                                )}
                              >
                                {isUpdatingThis ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />{" "}
                                    {t("maintenance.updating")}
                                  </>
                                ) : isHealthy ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />{" "}
                                    {t("maintenance.upToDate")}
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />{" "}
                                    {t("maintenance.refreshSingle")}
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
        title={modalContext.title}
        description={modalContext.description}
      />

      <Dialog
        open={resultModal.isOpen}
        onOpenChange={(open) =>
          !open && setResultModal((prev) => ({ ...prev, isOpen: false }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resultModal.success ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : (
                <XCircle className="w-6 h-6 text-destructive" />
              )}
              {resultModal.title}
            </DialogTitle>
            <DialogDescription>
              {resultModal.targetName && (
                <span className="font-semibold text-foreground">
                  {resultModal.targetName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {resultModal.success &&
            resultModal.targetName &&
            resultModal.action !== t("maintenance.statUpdateAction") &&
            resultModal.action !== t("maintenance.allStatsUpdateAction") ? (
              <div className="flex flex-col gap-3 bg-muted/30 p-4 rounded-lg border">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-sm text-muted-foreground">
                    {t("maintenance.appliedAction")}
                  </span>
                  <span className="text-sm font-bold text-primary">
                    {resultModal.action}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {t("maintenance.oldRate")}
                  </span>
                  <span className="text-sm font-semibold text-destructive">
                    %{resultModal.oldVal}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {t("maintenance.newRate")}
                  </span>
                  <span className="text-sm font-bold text-success">
                    %{resultModal.newVal}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "p-4 rounded-lg text-sm border whitespace-pre-wrap",
                  resultModal.success
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-destructive/10 text-destructive border-destructive/20",
                )}
              >
                {resultModal.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                setResultModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              {t("maintenance.ok")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
