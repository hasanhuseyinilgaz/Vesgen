import { useState, useEffect, useRef, useMemo } from "react";
import { Monitor, Activity, ServerCog, Cpu, HardDrive, Wifi, History, RefreshCw, FileText } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { WindowsServerResource } from "@/types";
import { useWinMonitor } from "@/hooks/useWinMonitor";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DateRangeCalendar, DateRange } from "@/components/ui/date-range-calendar";
import { cn } from "@/lib/utils";

const Badge = ({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: string, className?: string }) => (
  <div className={cn(
    "px-2 py-0.5 rounded text-[10px] font-bold border",
    variant === "outline" ? "bg-muted/50 border-border" : "bg-primary text-primary-foreground border-transparent",
    className
  )}>
    {children}
  </div>
);

const MonitoringOverlay = ({ 
  show, 
  hasData = false,
  message, 
  children,
  icon: Icon = RefreshCw, 
  className = "",
  containerClassName = "absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[4px] animate-in fade-in duration-500",
  iconClassName = "h-5 w-5 animate-spin mb-2",
  textClassName = "text-[8px] font-black uppercase tracking-[0.2em]"
}: { 
  show: boolean, 
  hasData?: boolean,
  message?: string, 
  children?: React.ReactNode,
  icon?: any, 
  className?: string,
  containerClassName?: string,
  iconClassName?: string,
  textClassName?: string
}) => {
  const { t } = useTranslation();
  if (!show || hasData) return null;
  return (
    <div className={cn(containerClassName, className)}>
      <Icon className={cn(iconClassName)} />
      <span className={cn(textClassName)}>{message || t("winPerformance.connecting")}</span>
      {children}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    const metrics: Record<string, { label: string, icon: any, color: string, unit: string }> = {
      "CPU": { label: t("winPerformance.tooltipCpu"), icon: Cpu, color: "text-info", unit: "%" },
      "RAM.Percent": { label: t("winPerformance.tooltipRam"), icon: ServerCog, color: "text-warning", unit: "%" },
      "IO.DiskRW": { label: t("winPerformance.tooltipDisk"), icon: HardDrive, color: "text-success", unit: " MB/s" },
      "IO.Network": { label: t("winPerformance.tooltipNetwork"), icon: Wifi, color: "text-primary", unit: " KB/s" }
    };

    return (
      <div className="bg-background/90 backdrop-blur-md border border-border/50 p-4 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[200px] animate-in zoom-in-95 duration-200">
        <div className="text-[10px] font-black tracking-widest text-muted-foreground/50 border-bottom border-border/20 pb-1 mb-1 uppercase">
          {payload[0]?.payload?.DisplayTime || label}
        </div>
        {payload.map((item: any) => {
          const config = metrics[item.dataKey];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <div key={item.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg bg-current/10", config.color)}>
                  <Icon className={cn("h-3.5 w-3.5", config.color)} />
                </div>
                <span className="text-xs font-bold text-foreground/80">{config.label}</span>
              </div>
              <span className={cn("text-xs font-black tabular-nums", config.color)}>
                {item.value}{config.unit}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

interface WinPerformancePageProps {
  server: WindowsServerResource;
}

export default function WinPerformancePage({ server }: WinPerformancePageProps) {
  const { t, i18n } = useTranslation();
  const [isLive, setIsLive] = useState(true);
  const [isGlobalPaused, setIsGlobalPaused] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [brushRange, setBrushRange] = useState<{ start?: number; end?: number }>({});
  const [visibleMetrics, setVisibleMetrics] = useState({
    cpu: true,
    ram: true,
    disk: true,
    network: true
  });
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportRange, setReportRange] = useState<DateRange>({});

  const { performanceData, currentStats, loading, error, status, lastError, availableDates } = useWinMonitor(
    server, 
    isGlobalPaused, 
    !isLive, 
    !isLive ? selectedDate : undefined
  );
  const backOffTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const isConnectionError = status === "connecting" || status === "retrying" || status === "error";
  const isBlockingError = isLive && isConnectionError && performanceData.length === 0 && !loading;
  const isTransientError = isLive && isConnectionError && performanceData.length > 0;

  const handleManualReconnect = () => {
    window.electronAPI.monitoringStart(server);
  };

  // Sync brush to end when Live is active
  useEffect(() => {
    if (isLive && performanceData.length > 0) {
      setBrushRange({
        start: Math.max(0, performanceData.length - 50),
        end: performanceData.length - 1
      });
    }
  }, [performanceData.length, isLive]);

  useEffect(() => {
    setIsGlobalPaused(false);
  }, []);

  const handleExportReport = async () => {
    if (!server) return;
    setIsReporting(true);
    const toastId = toast.loading(t("winPerformance.reportToastLoading"), { description: t("winPerformance.reportToastLoadingDesc") });

    let targetDateStr = undefined;
    if (!reportRange.start && !isLive) targetDateStr = selectedDate;

    try {
      const res = await window.electronAPI.monitoringGenerateReport({ 
        server, 
        lang: i18n.language,
        dateStr: targetDateStr,
        dateRange: reportRange
      });
      if (res.success) {
        toast.success(t("winPerformance.reportToastSuccess"), { 
            id: toastId,
            description: t("winPerformance.reportToastSuccessDesc") 
        });
      } else {
        toast.error(t("winPerformance.reportToastError"), { 
            id: toastId,
            description: res.message || t("dashboard.unknownError") 
        });
      }
    } catch (err: any) {
      toast.error(t("winPerformance.reportToastSystemError"), { 
        id: toastId,
        description: err.message 
      });
    } finally {
      setIsReporting(false);
    }
  };

  // Native wheel listener to prevent page scroll and handle panning
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (performanceData.length < 10) return;
      
      // Prevent page scroll (Passive: false makes this work)
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
      
      const start = brushRange.start ?? 0;
      const end = brushRange.end ?? (performanceData.length - 1);
      const windowSize = end - start;
      
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;
      const magnitude = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      
      // sensitivity: 1 index change per ~10px of scroll
      const deltaIndices = Math.round(magnitude / 10);
      
      if (deltaIndices === 0) return;

      let newStart = start + deltaIndices;
      let newEnd = end + deltaIndices;

      if (newStart < 0) {
        newStart = 0;
        newEnd = windowSize;
      }
      
      if (newEnd >= performanceData.length - 1) {
        newEnd = performanceData.length - 1;
        newStart = newEnd - windowSize;
        if (!isLive) setIsLive(true);
      } else {
        if (isLive) setIsLive(false);
      }

      setBrushRange({ start: newStart, end: newEnd });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [performanceData.length, brushRange, isLive]);

  const toggleMetric = (metric: keyof typeof visibleMetrics) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  // Sparkline data (last 100 points) for mini-charts to save CPU
  const sparklineData = useMemo(() => performanceData.slice(-100), [performanceData]);

  // Analytics data (sliced by brush) for big chart to save CPU
  const analyticsData = useMemo(() => {
    return performanceData.slice(brushRange.start ?? 0, (brushRange.end ?? (performanceData.length - 1)) + 1).map(d => {
      let display = d.Timestamp;
      if (d.Date) {
        // e.g., "2026-03-31" -> "31/03"
        const [, month, day] = d.Date.split('-');
        display = `${day}/${month} ${d.Timestamp}`;
      }
      return { ...d, DisplayTime: display };
    });
  }, [performanceData, brushRange.start, brushRange.end]);

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col gap-6 p-8 min-h-0 min-w-0 w-full overflow-y-auto custom-scrollbar">
        <PageHeader
          title={t("winPerformance.title")}
          badges={[{ label: "Server", value: server.alias || server.name }]}
          icon={Monitor}
          description={t("activity.description")}
          showRecordCount={false}
          showLiveButton={true}
          isLiveActive={!loading}
          loading={loading}
        />

        {error && !error.toLowerCase().includes("timeout") && !error.toLowerCase().includes("bağlantı") && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-2">
            Hata: {error}
          </div>
        )}

        {/* Real-time Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={cn(
            "bg-card/40 border glass-card p-5 rounded-2xl shadow-sm flex flex-col gap-3 transition-opacity duration-300 relative overflow-hidden",
            !visibleMetrics.cpu && "opacity-50"
          )}>
            <MonitoringOverlay 
              show={isBlockingError} 
              hasData={performanceData.length > 0}
              message={t("winPerformance.connecting")} 
              textClassName="text-[8px] font-black uppercase tracking-[0.2em] text-info"
              iconClassName="h-5 w-5 animate-spin mb-2 text-info"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{t("winPerformance.cpuLabel")}</span>
              <Cpu className="h-4 w-4 text-info" />
            </div>
            <div className="flex items-baseline gap-2 relative">
              <span className="text-4xl font-black tracking-tighter text-info">%{currentStats?.CPU || 0}</span>
              <span className="text-[10px] font-bold text-muted-foreground/50">{t("winPerformance.cpuLoad")}</span>
            </div>
            <div className="h-[40px] w-full opacity-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="CPU" stroke="hsl(var(--info))" fill="hsl(var(--info))" fillOpacity={0.2} isAnimationActive={false} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn(
            "bg-card/40 border glass-card p-5 rounded-2xl shadow-sm flex flex-col gap-3 transition-opacity duration-300 relative overflow-hidden",
            !visibleMetrics.ram && "opacity-50"
          )}>
            <MonitoringOverlay 
              show={isBlockingError} 
              hasData={performanceData.length > 0}
              message={t("winPerformance.connecting")} 
              textClassName="text-[8px] font-black uppercase tracking-[0.2em] text-warning"
              iconClassName="h-5 w-5 animate-spin mb-2 text-warning"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{t("winPerformance.ramLabel")}</span>
              <ServerCog className="h-4 w-4 text-warning" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter text-warning">%{currentStats?.RAM?.Percent || 0}</span>
              <span className="text-[10px] font-bold text-muted-foreground/50">{currentStats?.RAM?.Used || 0} GB / {currentStats?.RAM?.Total || 0} GB</span>
            </div>
            <div className="h-[40px] w-full opacity-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="RAM.Percent" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.2} isAnimationActive={false} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn(
            "bg-card/40 border glass-card p-5 rounded-2xl shadow-sm flex flex-col gap-3 transition-opacity duration-300 relative overflow-hidden",
            !visibleMetrics.disk && "opacity-50"
          )}>
            <MonitoringOverlay 
              show={isBlockingError} 
              hasData={performanceData.length > 0}
              message={t("winPerformance.connecting")} 
              textClassName="text-[8px] font-black uppercase tracking-[0.2em] text-success"
              iconClassName="h-5 w-5 animate-spin mb-2 text-success"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{t("winPerformance.diskIOLabel")}</span>
              <HardDrive className="h-4 w-4 text-success" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter text-success">{currentStats?.IO?.DiskRW || 0}</span>
              <span className="text-[10px] font-bold text-muted-foreground/50">{t("winPerformance.diskRW")}</span>
            </div>
            <div className="h-[40px] w-full opacity-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="IO.DiskRW" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.2} isAnimationActive={false} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cn(
            "bg-card/40 border glass-card p-5 rounded-2xl shadow-sm flex flex-col gap-3 transition-opacity duration-300 relative overflow-hidden",
            !visibleMetrics.network && "opacity-50"
          )}>
            <MonitoringOverlay 
              show={isBlockingError} 
              hasData={performanceData.length > 0}
              message={t("winPerformance.connecting")} 
              textClassName="text-[8px] font-black uppercase tracking-[0.2em] text-primary"
              iconClassName="h-5 w-5 animate-spin mb-2 text-primary"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">{t("winPerformance.networkLabel")}</span>
              <Wifi className="h-4 w-4 text-primary" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter text-primary">{currentStats?.IO?.Network || 0}</span>
              <span className="text-[10px] font-bold text-muted-foreground/50">{t("winPerformance.networkTotal")}</span>
            </div>
            <div className="h-[40px] w-full opacity-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="IO.Network" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} isAnimationActive={false} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>


        {/* Big Analytics Chart */}
        <div className="bg-card border glass-card p-8 rounded-3xl shadow-xl flex-1 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Activity className="h-5 w-5 text-info animate-pulse" />
                {t("activity.liveQueryTracking")}
              </h3>
              <p className="text-xs text-muted-foreground font-medium">{t("activity.description")}</p>
            </div>

            <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsLive(!isLive);
                  setIsGlobalPaused(false);
                  if (backOffTimerRef.current) {
                    clearTimeout(backOffTimerRef.current);
                    backOffTimerRef.current = null;
                  }
                }}
                className={cn(
                  "h-8 rounded-xl px-3 flex items-center gap-2 transition-all duration-300",
                  isLive ? "bg-primary/10 text-primary hover:bg-primary/20" : "hover:bg-muted"
                )}
              >
                  {isLive ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{t("winPerformance.liveMode")}</span>
                    </>
                  ) : (
                    <>
                      <History className="h-3 w-3" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{t("winPerformance.historyMode")}</span>
                    </>
                  )}
                </Button>

              {!isLive && (
                <DatePicker 
                  date={selectedDate} 
                  onSelect={setSelectedDate} 
                  maxDate={new Date().toISOString().split('T')[0]} 
                  availableDates={availableDates}
                  className="ml-1 mr-1 scale-90 origin-left"
                />
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isReporting}
                    className="h-8 gap-2 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 rounded-xl px-3 transition-all font-bold text-[10px] uppercase tracking-wider"
                  >
                    <FileText className={cn("h-3 w-3", isReporting && "animate-spin")} />
                    {isReporting ? t("winPerformance.preparingReport") : t("winPerformance.exportReport")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[320px] p-5 bg-card/95 backdrop-blur-3xl border-border/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col gap-5 animate-in zoom-in-95 duration-200">
                  <div>
                     <h4 className="font-black text-sm uppercase tracking-wider">{t("winPerformance.reportTitle")}</h4>
                     <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-relaxed">{t("winPerformance.reportDesc")}</p>
                  </div>
                  
                  <div className="p-3 bg-muted/20 border border-border/30 rounded-2xl">
                    <DateRangeCalendar 
                       range={reportRange} 
                       onSelect={setReportRange} 
                       availableDates={availableDates}
                       maxDate={new Date().toISOString().split('T')[0]} 
                    />
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full gap-2 h-10 text-[10px] font-black uppercase tracking-[0.15em] bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all rounded-xl" 
                    onClick={handleExportReport} 
                    disabled={isReporting || (reportRange.start && !reportRange.end) || (!reportRange.start && performanceData.length === 0)}
                  >
                     <FileText className={cn("h-3.5 w-3.5", isReporting && "animate-spin")} />
                     {t("winPerformance.generateReport")}
                  </Button>
                </PopoverContent>
              </Popover>
              <div className="w-[1px] h-4 bg-border/50 mx-1" />
              <Button
                variant={visibleMetrics.cpu ? "secondary" : "ghost"}
                size="sm"
                onClick={() => toggleMetric('cpu')}
                className={cn("h-8 rounded-xl px-3", visibleMetrics.cpu && "bg-info/10 text-info hover:bg-info/20")}
              >
                CPU
              </Button>
              <Button
                variant={visibleMetrics.ram ? "secondary" : "ghost"}
                size="sm"
                onClick={() => toggleMetric('ram')}
                className={cn("h-8 rounded-xl px-3", visibleMetrics.ram && "bg-warning/10 text-warning hover:bg-warning/20")}
              >
                RAM
              </Button>
              <Button
                variant={visibleMetrics.disk ? "secondary" : "ghost"}
                size="sm"
                onClick={() => toggleMetric('disk')}
                className={cn("h-8 rounded-xl px-3", visibleMetrics.disk && "bg-success/10 text-success hover:bg-success/20")}
              >
                Disk
              </Button>
              <Button
                variant={visibleMetrics.network ? "secondary" : "ghost"}
                size="sm"
                onClick={() => toggleMetric('network')}
                className={cn("h-8 rounded-xl px-3", visibleMetrics.network && "bg-primary/10 text-primary hover:bg-primary/20")}
              >
                Net
              </Button>
            </div>
          </div>
          <div 
            ref={chartContainerRef}
            className="flex-1 w-full min-h-[350px] relative select-none cursor-crosshair outline-none ring-0 focus:outline-none focus:ring-0 active:outline-none active:ring-0"
          >
            <MonitoringOverlay 
              show={isBlockingError}
              hasData={performanceData.length > 0}
              message={t("winPerformance.connecting")}
              containerClassName="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-background/30 backdrop-blur-[3px] rounded-3xl transition-all duration-500"
              iconClassName="h-10 w-10 text-primary animate-spin mb-4 opacity-50"
              textClassName="text-sm font-black text-primary/80 tracking-[0.3em] uppercase animate-pulse"
            />


            
            <div className="w-full h-full px-[20px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={analyticsData} 
                  margin={{ bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsla(var(--border) / 0.3)" />
                  <XAxis dataKey="DisplayTime" fontSize={10} tickLine={false} axisLine={false} stroke="hsla(var(--muted-foreground) / 0.5)" minTickGap={40} />
                  <YAxis yAxisId="left" domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} stroke="hsla(var(--muted-foreground) / 0.5)" tickFormatter={(v) => `%${v}`} />
                  <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} axisLine={false} stroke="hsla(var(--muted-foreground) / 0.5)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line yAxisId="left" type="monotone" dataKey="CPU" stroke="hsl(var(--info))" strokeWidth={3} dot={false} hide={!visibleMetrics.cpu} isAnimationActive={false} />
                  <Line yAxisId="left" type="monotone" dataKey="RAM.Percent" stroke="hsl(var(--warning))" strokeWidth={3} dot={false} hide={!visibleMetrics.ram} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="IO.DiskRW" stroke="hsl(var(--success))" strokeWidth={3} dot={false} hide={!visibleMetrics.disk} isAnimationActive={false} />
                  <Line yAxisId="right" type="monotone" dataKey="IO.Network" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} hide={!visibleMetrics.network} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={cn(
               "absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-all duration-500 z-30 pointer-events-none flex items-center gap-3",
               !isLive ? "bg-warning/10 border-warning/30 opacity-100 scale-100" 
                 : isTransientError ? "bg-info/10 border-info/30 opacity-100 scale-100 animate-pulse" 
                 : "bg-primary/5 border-primary/10 opacity-60 scale-90"
            )}>
                {!isLive ? (
                  <><History className="h-4 w-4 text-warning animate-in zoom-in-50 duration-300" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-warning">{t("winPerformance.historyModeBadge")}</span></>
                ) : isTransientError ? (
                  <><RefreshCw className="h-3 w-3 text-info animate-spin" /><span className="text-[10px] font-black uppercase tracking-[0.2em] text-info">{t("winPerformance.retrying", "TEKRAR DENENİYOR...")}</span></>
                ) : (
                  <><Activity className="h-3 w-3 text-primary" /><span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/80">{t("winPerformance.liveBadge")}</span></>
                )}
            </div>

            {!isLive && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground/60 uppercase tracking-[0.1em] animate-in fade-in slide-in-from-top-2 duration-700">
                {t("winPerformance.historyModeDesc")}
              </div>
            )}
          </div>
        </div>

        {/* Disk Usage List */}
        <div className="flex flex-col gap-4 relative">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <HardDrive className="h-3 w-3" />
            {t("winPerformance.drivesTitle")}
          </h4>
          <div className="relative min-h-[100px] rounded-2xl overflow-hidden">
            <MonitoringOverlay 
                show={isBlockingError} 
                hasData={performanceData.length > 0}
                message={status === "retrying" ? t("winPerformance.retrying", "Retrying...") : (status === "error" ? t("winPerformance.connectionFailed", "Connection Failed") : t("winPerformance.refreshing"))} 
                containerClassName="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[4px] rounded-2xl animate-in fade-in duration-500"
                iconClassName={cn("h-8 w-8 mb-3 text-primary/60", status !== "error" && "animate-spin")}
                textClassName="text-[11px] font-black uppercase tracking-[0.2em] text-primary/80 mb-2"
            >
                {lastError && (
                    <p className="text-[10px] text-muted-foreground/70 max-w-[80%] text-center mb-4 italic">
                        {lastError}
                    </p>
                )}
                {(status === "retrying" || status === "error") && (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleManualReconnect}
                        className="h-7 px-4 text-[9px] font-bold uppercase tracking-widest bg-primary/5 hover:bg-primary/10 border-primary/20"
                    >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        {t("winPerformance.retryNow", "Try Now")}
                    </Button>
                )}
            </MonitoringOverlay>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {(Array.isArray(currentStats?.Disks) ? currentStats.Disks : (currentStats?.Disks ? [currentStats.Disks] : [])).map((disk: any) => (
                <div key={disk.ID} className="bg-card/20 border border-border/40 p-4 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{disk.Name ? `${disk.Name} (${disk.ID})` : t("winPerformance.gbTotal", { count: disk.ID })}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted/50">{disk.Percent}%</Badge>
                    </div>
                    <div className="w-full bg-muted/30 h-1.5 rounded-full overflow-hidden">
                    <div
                        className={cn(
                        "h-full transition-all duration-1000",
                        disk.Percent > 90 ? "bg-destructive" : disk.Percent > 75 ? "bg-warning" : "bg-success"
                        )}
                        style={{ width: `${disk.Percent}%` }}
                    />
                    </div>
                    <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground/50 font-medium">{t("winPerformance.gbFree", { count: disk.Free })}</span>
                    <span className="text-[9px] text-muted-foreground/50 font-medium">{t("winPerformance.gbTotal", { count: disk.Total })}</span>
                    </div>
                </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>

  );
}
