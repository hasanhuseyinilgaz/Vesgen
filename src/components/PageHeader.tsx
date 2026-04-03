import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, SlidersHorizontal, Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ActionTooltip from "@/components/ui/action-tooltip";

interface PageHeaderProps {
  title: string;
  icon?: React.ElementType;
  description?: string;
  badges?: Array<{ label: string; value?: string | number }>;
  customActions?: React.ReactNode;
  variant?: "card" | "ghost";
  className?: string;

  recordCount?: number;
  topRows?: string;
  onTopRowsChange?: (val: string) => void;
  onRefresh?: () => void;
  showFilter?: boolean;
  onToggleFilter?: () => void;
  isFilterActive?: boolean;
  showLiveButton?: boolean;
  showLivePanel?: boolean;
  onToggleLivePanel?: () => void;
  isLiveActive?: boolean;
  loading?: boolean;
  showLimitSelector?: boolean;
  showFilterButton?: boolean;
  showRefreshButton?: boolean;
  showRecordCount?: boolean;
  onExport?: () => void;
}

export default function PageHeader({
  title,
  icon: Icon,
  description,
  badges,
  customActions,
  variant = "card",
  className,

  recordCount,
  topRows = "100",
  onTopRowsChange,
  onRefresh,
  showFilter = false,
  onToggleFilter,
  isFilterActive = false,
  showLiveButton = true,
  showLivePanel = false,
  onToggleLivePanel,
  isLiveActive = false,
  loading = false,
  showLimitSelector = true,
  showFilterButton = true,
  showRefreshButton = true,
  showRecordCount = true,
  onExport,
}: PageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between gap-3 relative z-20 w-full transition-all duration-300 shrink-0",
        variant === "card"
          ? "p-2.5 sm:p-4 rounded-xl border glass-card overflow-hidden"
          : "bg-transparent p-0",
        className
      )}
    >
      {}

      {}
      <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">

        {}
        {Icon && (
          <div className="flex-shrink-0 p-2.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
            <Icon className="w-5 h-5" />
          </div>
        )}

        <div className="flex flex-col min-w-0 gap-0.5 sm:gap-1 flex-1">
          {}
          <div className="flex items-center gap-2 w-full min-w-0">
            <h2
              className="text-base sm:text-lg lg:text-xl font-bold text-foreground tracking-tight truncate cursor-default flex-shrink min-w-[100px]"
              title={title}
            >
              {title}
            </h2>

            {}
            {badges && badges.length > 0 && (
              <div className="flex items-center gap-1 min-w-0">
                {badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className={cn(
                      "inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-md border truncate transition-all duration-300",
                      badge.value === "MODIFIED" || badge.value === "DEĞİŞTİRİLDİ"
                        ? "bg-warning/10 text-warning border-warning/20"
                        : "bg-muted text-muted-foreground",
                      "max-w-[100px] sm:max-w-[180px] md:max-w-xs"
                    )}
                    title={badge.label ? `${badge.label}: ${badge.value}` : String(badge.value)}
                  >
                    {badge.value !== undefined && (
                      <span className="truncate">{badge.value}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {}
          <div className="flex items-center gap-2 min-w-0">
            {description && (
              <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground truncate opacity-80" title={description}>
                {description}
              </p>
            )}

            {}
            {!badges && showRecordCount && recordCount !== undefined && (
              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] sm:text-[11px] font-semibold rounded-md border mt-0.5 whitespace-nowrap shrink-0">
                {recordCount} {t("components.dataToolbar.records")}
              </span>
            )}
          </div>
        </div>
      </div>

      {}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">

        {customActions && (
          <div className="flex items-center gap-2 mr-2">
            {customActions}
          </div>
        )}

        {showLimitSelector && onTopRowsChange && (
          <div className="flex items-center">
            <Select value={topRows} onValueChange={onTopRowsChange}>
              <SelectTrigger className="h-9 w-auto min-w-[50px] sm:min-w-[110px] bg-background font-normal text-muted-foreground px-2 sm:px-3 gap-0 sm:gap-2">
                <div className="flex items-center justify-center">
                  <span className="hidden 2xl:inline-block">
                    <SelectValue />
                  </span>
                  <span className="2xl:hidden text-[11px] font-bold">
                    {topRows}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">{t("components.dataToolbar.firstN", { count: 100 })}</SelectItem>
                <SelectItem value="500">{t("components.dataToolbar.firstN", { count: 500 })}</SelectItem>
                <SelectItem value="1000">{t("components.dataToolbar.firstN", { count: 1000 })}</SelectItem>
                <SelectItem value="5000">{t("components.dataToolbar.firstN", { count: 5000 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {showLiveButton && onToggleLivePanel && (
          <ActionTooltip label={t("components.dataToolbar.liveMonitorMode")} side="bottom">
            <Button
              variant={showLivePanel ? "default" : "outline"}
              size="sm"
              onClick={onToggleLivePanel}
              className={cn(
                "h-9 w-9 p-0 transition-colors",
                showLivePanel ? "bg-info hover:bg-info/90 text-info-foreground border-info" : isLiveActive ? "border-info/50 text-info bg-info/10" : "bg-background"
              )}
            >
              <Activity className={cn("w-4 h-4", isLiveActive && !showLivePanel && "animate-pulse")} />
            </Button>
          </ActionTooltip>
        )}

        {showFilterButton && onToggleFilter && (
          <ActionTooltip label={t("components.dataToolbar.dataSelection")} side="bottom">
            <Button
              variant={showFilter ? "default" : "outline"}
              size="sm"
              onClick={onToggleFilter}
              className={cn(
                "h-9 w-9 p-0 transition-colors",
                showFilter ? "bg-warning hover:bg-warning/90 text-warning-foreground border-warning" : isFilterActive ? "border-warning/50 text-warning bg-warning/10" : "bg-background"
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </ActionTooltip>
        )}

        {onExport && (
          <ActionTooltip label={t("components.dataToolbar.downloadExcel")} side="bottom">
            <Button variant="outline" size="sm" onClick={onExport} disabled={loading || recordCount === 0} className="h-9 w-9 p-0 bg-background transition-colors">
              <Download className="w-4 h-4" />
            </Button>
          </ActionTooltip>
        )}

        {showRefreshButton && onRefresh && (
          <ActionTooltip label={t("components.dataToolbar.refresh")} side="bottom">
            <Button
              variant="default"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className={cn(
                "h-9 flex justify-center items-center transition-all duration-300",
                "w-9 2xl:w-auto 2xl:min-w-[120px] p-0 2xl:px-3 ml-1"
              )}
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin", "2xl:mr-2")} />
              <span className="hidden 2xl:inline-block w-[75px] text-center">
                {loading ? t("components.dataToolbar.loading") : t("components.dataToolbar.refresh")}
              </span>
            </Button>
          </ActionTooltip>
        )}
      </div>
    </div>
  );
}
