import { useTranslation } from "react-i18next";
import { RefreshCw, Filter, Activity, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ActionTooltip from "@/components/ActionTooltip";

interface DataToolbarProps {
  title: string;
  recordCount: number;
  topRows?: string;
  onTopRowsChange?: (val: string) => void;
  onRefresh: () => void;
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

export default function DataToolbar({
  title,
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
}: DataToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card p-4 rounded-xl border shadow-sm gap-4 relative z-20">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          {title}
        </h2>
        {showRecordCount && (
          <span className="px-2.5 py-1 bg-muted/50 text-muted-foreground text-xs font-semibold rounded-full border">
            {recordCount} {t("components.dataToolbar.records")}
          </span>
        )}
      </div>

      <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
        {showLimitSelector && onTopRowsChange && (
          <div className="flex items-center">
            <Select value={topRows} onValueChange={onTopRowsChange}>
              <SelectTrigger className="h-9 w-[110px] bg-background font-normal text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">
                  {t("components.dataToolbar.firstN", { count: 100 })}
                </SelectItem>
                <SelectItem value="500">
                  {t("components.dataToolbar.firstN", { count: 500 })}
                </SelectItem>
                <SelectItem value="1000">
                  {t("components.dataToolbar.firstN", { count: 1000 })}
                </SelectItem>
                <SelectItem value="5000">
                  {t("components.dataToolbar.firstN", { count: 5000 })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {showLiveButton && onToggleLivePanel && (
          <ActionTooltip
            label={t("components.dataToolbar.liveMonitorMode")}
            side="bottom"
          >
            <Button
              variant={showLivePanel ? "default" : "outline"}
              size="sm"
              onClick={onToggleLivePanel}
              className={cn(
                "h-9 w-9 p-0 transition-colors",
                showLivePanel
                  ? "bg-info hover:bg-info/90 text-info-foreground shadow-md shadow-info/20 border-info"
                  : isLiveActive
                    ? "border-info/50 text-info bg-info/10"
                    : "bg-background",
              )}
            >
              <Activity
                className={cn(
                  "w-4 h-4",
                  isLiveActive && !showLivePanel && "animate-pulse",
                )}
              />
            </Button>
          </ActionTooltip>
        )}

        {showFilterButton && onToggleFilter && (
          <ActionTooltip
            label={t("components.dataToolbar.filtering")}
            side="bottom"
          >
            <Button
              variant={showFilter ? "default" : "outline"}
              size="sm"
              onClick={onToggleFilter}
              className={cn(
                "h-9 w-9 p-0 transition-colors",
                showFilter
                  ? "bg-warning hover:bg-warning/90 text-warning-foreground shadow-md shadow-warning/20 border-warning"
                  : isFilterActive
                    ? "border-warning/50 text-warning bg-warning/10 hover:bg-warning/20"
                    : "bg-background",
              )}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </ActionTooltip>
        )}

        {onExport && (
          <ActionTooltip
            label={t("components.dataToolbar.downloadExcel")}
            side="bottom"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              disabled={loading || recordCount === 0}
              className="h-9 w-9 p-0 bg-background transition-colors"
            >
              <Download className="w-4 h-4" />
            </Button>
          </ActionTooltip>
        )}

        {showRefreshButton && (
          <Button
            variant="default"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 shadow-sm hidden sm:flex ml-1 min-w-[120px] justify-center items-center transition-none"
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
            />
            <span className="w-[75px] text-center">
              {loading
                ? t("components.dataToolbar.loading")
                : t("components.dataToolbar.refresh")}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
