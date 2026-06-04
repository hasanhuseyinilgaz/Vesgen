import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Database, Server, Activity, ShieldCheck, Heart, Clock } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import OverviewHeader from "@/components/overview/OverviewHeader";
import QuickActions from "@/components/overview/QuickActions";
import ResourceFleet from "@/components/overview/ResourceFleet";
import CustomTabs from "@/components/ui/custom-tabs";
import { Tenant } from "@/types";
import { cn } from "@/lib/utils";
import { useHealth } from "@/contexts/HealthContext";

interface OverviewPageProps {
  tenant: Tenant | null;
}

export default function OverviewPage({ tenant }: OverviewPageProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  
  const {
    fleetStatus,
    fleetMetrics,
    fleetSessions,
    isScanning,
    lastScanTime,
  } = useHealth();

  const databases = tenant?.databases || [];
  const servers = tenant?.windowsServers || [];

  // Monitoring is now handled globally in HealthProvider

  // Calculate stats for Header
  const totalCount = databases.length + servers.length;
  const onlineCount = Object.values(fleetStatus).filter(s => s === 'online').length;
  
  let healthLabel = t("dashboard.monitoringActive");
  let healthColor = "text-success";
  
  if (totalCount > 0) {
    if (onlineCount === totalCount) {
      healthLabel = t("dashboard.allSystemsOperational");
      healthColor = "text-success";
    } else if (onlineCount > 0) {
      healthLabel = t("dashboard.partialOutage");
      healthColor = "text-warning";
    } else {
      healthLabel = t("dashboard.systemDown");
      healthColor = "text-destructive";
    }
  }

  const formatLastSync = () => {
    if (!lastScanTime) return "";
    const diff = Math.floor((new Date().getTime() - lastScanTime.getTime()) / 1000);
    if (diff < 5) return t("dashboard.justNow");
    if (diff < 60) return `${diff} ${t("dashboard.secondsAgo")}`;
    return `${Math.floor(diff / 60)} ${t("dashboard.minutesAgo")}`;
  };

  const [syncText, setSyncText] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setSyncText(formatLastSync()), 1000);
    return () => clearInterval(timer);
  }, [lastScanTime]);

  // Derived metrics for summary cards
  const metricsArr = Object.values(fleetMetrics);
  const avgCpu = metricsArr.length > 0 
    ? Math.round(metricsArr.reduce((acc, m) => acc + (m.cpu || 0), 0) / metricsArr.length) 
    : 0;
  const avgRam = metricsArr.length > 0 
    ? Math.round(metricsArr.reduce((acc, m) => acc + (m.ram || 0), 0) / metricsArr.length) 
    : 0;
  const totalSessions = Object.values(fleetSessions).reduce((acc, s) => acc + s, 0);

  const onlineServersCount = servers.filter(s => fleetStatus[s.id] === 'online').length;
  const onlineDatabasesCount = databases.filter(db => fleetStatus[db.id] === 'online').length;

  const getSystemHealthStats = () => {
    if (totalCount === 0) return { label: t("dashboard.monitoringActive"), color: "success", desc: t("dashboard.healthDesc") };
    if (onlineCount === totalCount) return { label: t("dashboard.healthGood"), color: "success", desc: t("dashboard.healthDesc") };
    if (onlineCount > 0) return { label: t("dashboard.partialOutage"), color: "warning", desc: t("dashboard.partialOutageDesc", { count: totalCount - onlineCount }) };
    return { label: t("dashboard.systemDown"), color: "destructive", desc: t("dashboard.systemDownDesc") };
  };

  const getPerformanceStats = () => {
    // Determine the baseline score (0-100) and state
    let score = 100;
    let label = t("dashboard.performanceOptimal");
    let color = "info";
    let subLabel = "";
    let isDataAvailable = false;
    let desc = t("dashboard.performanceDesc");

    // CASE 1: Servers are present
    if (servers.length > 0) {
      if (onlineServersCount > 0) {
        const load = Math.max(avgCpu, avgRam);
        score = 100 - load;
        subLabel = `Load: ${load}%`;
        isDataAvailable = true;
        desc = t("dashboard.performanceDesc");
      } else {
        // Servers exist but all are offline - Check databases before giving up
        if (onlineDatabasesCount > 0) {
          score = 50; // Partial performance because infra data is missing but services are up
          label = t("dashboard.performanceWarning");
          color = "warning";
          subLabel = t("dashboard.statusInfraDown");
          desc = t("dashboard.performanceNoServerDesc");
          return { label, color, desc, subLabel, isDataAvailable: false };
        } else {
          return { 
            label: t("dashboard.noConnection"), 
            color: "destructive", 
            desc: t("dashboard.performanceNoConnectionDesc"), 
            subLabel: t("dashboard.statusDisconnected"), 
            isDataAvailable: false 
          };
        }
      }
    } 
    // CASE 2: No servers, only Databases (Focus on connectivity stability)
    else if (databases.length > 0) {
      isDataAvailable = false;
      desc = t("dashboard.systemStability");
      
      if (onlineDatabasesCount === databases.length) {
        score = 100;
        subLabel = t("dashboard.statusStable");
      } else if (onlineDatabasesCount > 0) {
        score = Math.round((onlineDatabasesCount / databases.length) * 100);
        subLabel = `${t("dashboard.statusDegraded")}: ${score}%`;
      } else {
        score = 0;
        subLabel = t("dashboard.statusDisconnected");
      }
    }
    // CASE 3: Empty Environment
    else {
      return { 
        label: t("dashboard.monitoringActive"), 
        color: "info", 
        desc: t("dashboard.healthDesc"), 
        subLabel: "--", 
        isDataAvailable: false 
      };
    }

    // Map score to status and colors
    if (score >= 90) {
      color = "info";
      label = servers.length > 0 ? t("dashboard.performanceOptimal") : t("dashboard.systemStable");
    } else if (score >= 60) {
      color = "warning";
      label = t("dashboard.performanceWarning");
    } else {
      color = "destructive";
      label = t("dashboard.performanceCritical");
    }

    return { label, color, desc, subLabel, isDataAvailable };
  };

  const healthData = getSystemHealthStats();
  const perfData = getPerformanceStats();

  const tabs = [
    { value: "overview", label: t("dashboard.tabOverview"), icon: LayoutDashboard },
    { value: "databases", label: t("dashboard.tabDatabases"), icon: Database },
    { value: "servers", label: t("dashboard.tabServers"), icon: Server },
  ];

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col gap-6 md:gap-8 p-4 md:p-8 min-h-0 min-w-0 w-full overflow-y-auto custom-scrollbar bg-transparent">

        {/* Header Section */}
        <OverviewHeader
          tenant={tenant}
          dbCount={databases.length}
          activeDbCount={databases.filter(db => fleetStatus[db.id] === 'online').length}
          serverCount={servers.length}
          activeServerCount={servers.filter(s => fleetStatus[s.id] === 'online').length}
        />

        {/* Global Health Summary Section - Informative Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 shrink-0">
          {/* Health Card */}
          <div className={cn(
            "glass-card border p-7 rounded-2xl flex items-center gap-6 shadow-sm transition-all duration-300 w-full",
            healthData.color === "success" ? "bg-success/5 border-success/20" :
            healthData.color === "warning" ? "bg-warning/5 border-warning/20" :
            "bg-destructive/5 border-destructive/20"
          )}>
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
              healthData.color === "success" ? "bg-success/15 text-success" :
              healthData.color === "warning" ? "bg-warning/15 text-warning" :
              "bg-destructive/15 text-destructive"
            )}>
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground/80">{healthData.label}</h4>
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse shrink-0", 
                   healthData.color === "success" ? "bg-success" : 
                   healthData.color === "warning" ? "bg-warning" : "bg-destructive")} />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground/60 leading-relaxed">
                {healthData.desc}
              </p>
            </div>
          </div>

          {/* Performance Card */}
          <div className={cn(
            "glass-card border p-7 rounded-2xl flex items-center gap-6 shadow-sm transition-all duration-300 w-full",
            perfData.color === "info" ? "bg-info/5 border-info/20" :
            perfData.color === "warning" ? "bg-warning/5 border-warning/20" :
            "bg-destructive/5 border-destructive/20"
          )}>
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
              perfData.color === "info" ? "bg-info/15 text-info" :
              perfData.color === "warning" ? "bg-warning/15 text-warning" :
              "bg-destructive/15 text-destructive"
            )}>
              <Activity className="w-7 h-7" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground/80">{perfData.label}</h4>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 transition-all duration-300",
                  perfData.color === "info" ? "bg-info/10 text-info" : 
                  perfData.color === "warning" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive",
                )}>
                  {perfData.subLabel}
                </span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground/60 leading-relaxed">
                {perfData.desc}
              </p>
            </div>
          </div>

          {/* Sustainability/Capacity Card */}
          <div className={cn(
            "glass-card border p-7 rounded-2xl flex items-center gap-6 shadow-sm transition-all duration-300 w-full",
            onlineCount > 0 ? "bg-warning/5 border-warning/20" : "bg-destructive/5 border-destructive/20"
          )}>
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
              onlineCount > 0 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
            )}>
              <Heart className={cn("w-7 h-7", onlineCount > 0 && "animate-[pulse_3s_ease-in-out_infinite]")} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-foreground/80">{t("dashboard.sustainability")}</h4>
                <span className={cn(
                   "text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 uppercase bg-warning/10 text-warning",
                   onlineCount === 0 && "bg-destructive/10 text-destructive"
                )}>
                  {onlineCount > 0 
                    ? `${totalSessions} ${t("queries.results")}` 
                    : t("dashboard.statusDisconnected")} 
                </span>
              </div>
              <p className="text-[11px] font-medium text-muted-foreground/60 leading-relaxed">
                {onlineCount > 0 
                  ? t("dashboard.sustainabilityStable", { count: totalSessions })
                  : t("dashboard.sustainabilityNoConnectionDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Tabs Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <CustomTabs
              activeTab={activeTab}
              onTabChange={(val) => setActiveTab(val as string)}
              tabs={tabs}
            />

            <div className="hidden md:flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 transition-all">
              <div className={cn("flex items-center gap-1.5", healthColor)}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{healthLabel}</span>
              </div>
              <div className="h-3 w-px bg-border/40" />
              <div className="flex items-center gap-1.5">
                <Activity className={cn("w-3.5 h-3.5 text-primary", isScanning && "animate-pulse")} />
                <span>{onlineCount}/{totalCount} {t("dashboard.resourcesOnline")}</span>
              </div>
              {(syncText || isScanning) && (
                <>
                  <div className="h-3 w-px bg-border/40" />
                  <div className={cn(
                    "flex items-center gap-1.5 transition-all duration-300 normal-case tracking-normal font-semibold", 
                    isScanning ? "text-warning" : "opacity-60 text-muted-foreground"
                  )}>
                    <Clock className={cn("w-3.5 h-3.5", isScanning && "animate-spin-slow")} />
                    <span>{isScanning ? t("dashboard.refreshing") : syncText}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="min-h-[400px]">
            {activeTab === "overview" && (
              <div className="space-y-12">
                <QuickActions />
                <ResourceFleet 
                  databases={databases.slice(0, 4)} 
                  servers={servers.slice(0, 4)} 
                  fleetStatus={fleetStatus}
                  fleetMetrics={fleetMetrics}
                  fleetSessions={fleetSessions}
                />
              </div>
            )}

            {activeTab === "databases" && (
              <div>
                <ResourceFleet 
                  databases={databases} 
                  servers={[]} 
                  showServers={false} 
                  fleetStatus={fleetStatus}
                  fleetMetrics={fleetMetrics}
                  fleetSessions={fleetSessions}
                />
              </div>
            )}

            {activeTab === "servers" && (
              <div>
                <ResourceFleet 
                  databases={[]} 
                  servers={servers} 
                  showDatabases={false} 
                  fleetStatus={fleetStatus}
                  fleetMetrics={fleetMetrics}
                  fleetSessions={fleetSessions}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-auto pt-12 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
            Vesgen © 2026 • Monitoring & Administration Control Center
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
