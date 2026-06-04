import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ServerCog, Loader2, Play, Square, Eye, EyeOff, ArrowUpDown, ChevronUp, ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { WindowsServerResource } from "@/types";
import PageHeader from "@/components/PageHeader";
import PageLayout from "@/components/PageLayout";
import ActionTooltip from "@/components/ui/action-tooltip";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface WinServicesPageProps {
  server: WindowsServerResource;
  tenantId?: string;
}

export default function WinServicesPage({ server, tenantId }: WinServicesPageProps) {
  const { t } = useTranslation();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Local state to instantly update UI for watched services
  const [watchedServices, setWatchedServices] = useState<string[]>([]);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchServices = async (isBackground = false) => {
    if (!server) return;
    if (!isBackground) setLoading(true);
    try {
      const res = await window.electronAPI.winGetServices(server);
      if (res.success && res.data) {
        setServices(Array.isArray(res.data) ? res.data : [res.data]);
        setLastUpdated(new Date());
        setError(null);
      } else {
        if (!isBackground) setError(res.message || t("dashboard.connFailed"));
      }
    } catch (err: any) {
      if (!isBackground) setError(err.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (server) {
      setWatchedServices((server as any).watchedServices || []);
    }
    fetchServices();

    const interval = setInterval(() => {
      fetchServices(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [server]);

  const handleStartService = async (e: React.MouseEvent, serviceName: string) => {
    e.stopPropagation();
    const res = await window.electronAPI.winStartService({ config: server, serviceName });
    if (res.success) fetchServices(true);
  };

  const handleStopService = async (e: React.MouseEvent, serviceName: string) => {
    e.stopPropagation();
    const res = await window.electronAPI.winStopService({ config: server, serviceName });
    if (res.success) fetchServices(true);
  };

  const handleToggleWatch = async (e: React.MouseEvent, serviceName: string, isWatched: boolean) => {
    e.stopPropagation();

    // Optimistic UI update for immediate feedback
    if (isWatched) {
      setWatchedServices(prev => prev.filter(n => n !== serviceName));
    } else {
      setWatchedServices(prev => [...prev, serviceName]);
    }

    const res = await window.electronAPI.winToggleServiceWatch({
      tenantId: tenantId || server.tenantId || (server as any).tenantInfo?.id || 'default',
      serverId: server.id || server.host,
      serviceName,
      watch: !isWatched
    });
    
    if (!res.success) {
      // Revert if API call fails
      if (isWatched) {
        setWatchedServices(prev => [...prev, serviceName]);
      } else {
        setWatchedServices(prev => prev.filter(n => n !== serviceName));
      }
    } else {
      fetchServices(true);
    }
  };

  const renderStatus = (status: number | string) => {
    const s = String(status);
    if (s === "4" || s === "Running") return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/20 text-success border border-success/30 inline-flex items-center">{t("jobs.running")}</div>;
    if (s === "1" || s === "Stopped") return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border inline-flex items-center opacity-70">{t("jobs.canceled")}</div>;
    if (s === "2" || s === "StartPending") return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/20 text-warning border border-warning/30 inline-flex items-center animate-pulse">{t("common.loading")}</div>;
    return <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-outline text-foreground border border-border inline-flex items-center">{s}</div>;
  };

  const renderActions = (s: any) => {
    const isRunning = String(s.Status) === "4" || String(s.Status) === "Running";
    const isWatched = watchedServices.includes(s.Name);

    return (
      <div className="flex items-center justify-end gap-2">
        {isRunning ? (
          <ActionTooltip label={t("jobs.stop") || "Stop"} side="top">
            <Button variant="outline" size="icon" className="h-7 w-7 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={(e) => handleStopService(e, s.Name)}>
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          </ActionTooltip>
        ) : (
          <ActionTooltip label={t("jobs.start") || "Start"} side="top">
            <Button variant="outline" size="icon" className="h-7 w-7 text-success border-success/30 hover:bg-success/10" onClick={(e) => handleStartService(e, s.Name)}>
              <Play className="h-3.5 w-3.5 fill-current" />
            </Button>
          </ActionTooltip>
        )}

        <ActionTooltip label={isWatched ? t("common.unwatch", "İzlemeyi Bırak") : t("common.watch", "Arka Planda İzle")} side="top">
          <Button variant="outline" size="icon" className={`h-7 w-7 transition-colors ${isWatched ? 'text-primary border-primary/50 bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:bg-muted'}`} onClick={(e) => handleToggleWatch(e, s.Name, isWatched)}>
            {isWatched ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </Button>
        </ActionTooltip>
      </div>
    );
  };

  const isWindowsService = (name: string, display: string) => {
    const n = (name || '').toLowerCase();
    const d = (display || '').toLowerCase();
    return n.startsWith('win') || d.includes('windows') || d.includes('microsoft');
  };

  const processedServices = useMemo(() => {
    let filtered = services.filter((s: any) => {
      // Search term filter
      const matchesSearch =
        s.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== "all") {
        const isRunning = String(s.Status) === "4" || String(s.Status) === "Running";
        if (statusFilter === "running" && !isRunning) return false;
        if (statusFilter === "stopped" && isRunning) return false;
      }

      // Type filter
      if (typeFilter !== "all") {
        const isWin = isWindowsService(s.Name, s.DisplayName);
        if (typeFilter === "windows" && !isWin) return false;
        if (typeFilter === "other" && isWin) return false;
      }

      return true;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Status is numeric in string form '4', '1', etc. Convert to boolean logic for running
        if (sortConfig.key === "Status") {
          aVal = (String(aVal) === "4" || String(aVal) === "Running") ? 1 : 0;
          bVal = (String(bVal) === "4" || String(bVal) === "Running") ? 1 : 0;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [services, searchTerm, statusFilter, typeFilter, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-20 transition-opacity" />;
    return sortConfig.direction === "asc"
      ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-primary" />
      : <ChevronDown className="w-3.5 h-3.5 ml-1 text-primary" />;
  };

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col gap-6 p-8 min-h-0 min-w-0 w-full overflow-y-auto custom-scrollbar">
        <PageHeader
          title={t("dashboard.services")}
          icon={ServerCog}
          description={
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
              <span>{`${server?.alias || server?.name || ''} ${t("maintenance.allDatabase")} - ${t("common.liveMonitoringActive", "Canlı İzleme Aktif")}`}</span>
              {lastUpdated && (
                <span className="flex items-center text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-medium" key={lastUpdated.toISOString()}>
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse mr-1.5" />
                  {t("common.lastUpdated", "Son Yenilenme")}: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          }
          showRecordCount={true}
          recordCount={processedServices.length}
          loading={loading}
          customActions={
            <div className="flex items-center gap-3">
              <Input
                placeholder={t("components.searchableSidebar.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 sm:w-64 glass-card border-border/50 h-9"
              />
            </div>
          }
        />

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium">
            {t("common.error")}: {error}
          </div>
        )}

        <div className="flex-1 min-h-0">
          {loading && services.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
              <p className="text-sm font-medium">{t("common.loading")}</p>
            </div>
          ) : (
            <Card className="border-border/50 shadow-sm overflow-hidden glass-card">
              <CardContent className="p-0">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-card/95 border-b border-border/50 backdrop-blur-sm">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-muted-foreground w-48">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("Status")}>
                            {t("jobs.status")}
                            {renderSortIcon("Status")}
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="h-6 w-6 bg-transparent border-none p-0 flex justify-center items-center hover:bg-muted focus:ring-0 shadow-none rounded-md transition-colors opacity-60 hover:opacity-100 data-[state=open]:bg-muted data-[state=open]:opacity-100">
                                <Filter className="w-3.5 h-3.5" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t("common.all", "Tümü")}</SelectItem>
                                <SelectItem value="running">{t("jobs.running")}</SelectItem>
                                <SelectItem value="stopped">{t("jobs.canceled")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </th>
                      <th className="px-5 py-3 font-semibold text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("DisplayName")}>
                            {t("dataTable.rowDetailsTitleInfo")}
                            {renderSortIcon("DisplayName")}
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                              <SelectTrigger className="h-6 w-6 bg-transparent border-none p-0 flex justify-center items-center hover:bg-muted focus:ring-0 shadow-none rounded-md transition-colors opacity-60 hover:opacity-100 data-[state=open]:bg-muted data-[state=open]:opacity-100">
                                <Filter className="w-3.5 h-3.5" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t("common.all", "Tümü")}</SelectItem>
                                <SelectItem value="windows">{t("common.windowsServices", "Windows Servisleri")}</SelectItem>
                                <SelectItem value="other">{t("common.otherServices", "Diğer Servisler")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </th>
                      <th className="px-5 py-3 font-semibold text-muted-foreground cursor-pointer group hover:text-foreground transition-colors" onClick={() => handleSort("Name")}>
                        <div className="flex items-center">
                          {t("jobs.jobName")}
                          {renderSortIcon("Name")}
                        </div>
                      </th>
                      <th className="px-5 py-3 text-right font-semibold text-muted-foreground w-40">
                        {t("jobs.actions", "İşlemler")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {processedServices.map((s: any) => (
                      <tr
                        key={s.Name}
                        className={cn(
                          "transition-all duration-200 table-row-solid hover:bg-muted/30"
                        )}
                      >
                        <td className="px-5 py-3">
                          {renderStatus(s.Status)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-foreground/90 font-medium">
                            {s.DisplayName}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-muted-foreground text-xs font-mono">
                            {s.Name}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {renderActions(s)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {processedServices.length === 0 && !loading && (
                  <div className="p-12 text-center text-muted-foreground text-sm italic border-t border-border/20">
                    {t("components.dataTable.noData", "Gösterilecek veri bulunamadı.")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
