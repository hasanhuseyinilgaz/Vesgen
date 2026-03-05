import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Play, Square, Timer, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import ActionTooltip from "@/components/ActionTooltip";

interface LiveMonitoringPanelProps {
  isVisible: boolean;
  onRefresh: () => void;
  onStatusChange: (isActive: boolean) => void;
  onAutoSort?: () => void;
}

export default function LiveMonitoringPanel({
  isVisible,
  onRefresh,
  onStatusChange,
  onAutoSort,
}: LiveMonitoringPanelProps) {
  const { t } = useTranslation();
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    let fetchTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    if (isLiveActive) {
      fetchTimer = setInterval(
        () => {
          onRefresh();
        },
        Number(refreshInterval) * 1000,
      );

      countdownTimer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleStop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(fetchTimer);
      clearInterval(countdownTimer);
    };
  }, [isLiveActive, refreshInterval, onRefresh]);

  const handleStart = () => {
    setTimeLeft(600);
    setIsLiveActive(true);
    onStatusChange(true);
    if (onAutoSort) onAutoSort();
  };

  const handleStop = () => {
    setIsLiveActive(false);
    onStatusChange(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className={cn(
        "mt-4 border-t pt-4 shadow-sm border rounded-xl p-5 transition-colors duration-500",
        isLiveActive ? "border-info/30 bg-info/5" : "border-border bg-card",
      )}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ActionTooltip
            label={
              isLiveActive
                ? t("components.livePanel.statusActive")
                : t("components.livePanel.statusPassive")
            }
            side="top"
          >
            <div
              className={cn(
                "p-2 rounded-lg shrink-0 mt-0.5 transition-colors cursor-help",
                isLiveActive ? "bg-info/10" : "bg-muted",
              )}
            >
              <Activity
                className={cn(
                  "h-5 w-5",
                  isLiveActive
                    ? "text-info animate-pulse"
                    : "text-muted-foreground",
                )}
              />
            </div>
          </ActionTooltip>
          <div>
            <h4
              className={cn(
                "font-semibold",
                isLiveActive ? "text-info" : "text-foreground",
              )}
            >
              {t("components.livePanel.title")}
            </h4>
            <p
              className={cn(
                "text-xs max-w-md leading-relaxed mt-0.5",
                isLiveActive ? "text-info/80" : "text-muted-foreground",
              )}
              dangerouslySetInnerHTML={{
                __html: t("components.livePanel.description"),
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 bg-background p-1.5 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 pl-2">
            <Label className="text-xs text-muted-foreground font-medium">
              {t("components.livePanel.interval")}
            </Label>
            <ActionTooltip
              label={t("components.livePanel.intervalTooltip")}
              side="top"
            >
              <div className="cursor-help">
                <Select
                  value={refreshInterval}
                  onValueChange={setRefreshInterval}
                  disabled={isLiveActive}
                >
                  <SelectTrigger className="w-[110px] h-8 text-xs border-none shadow-none bg-muted/50 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">
                      {t("components.livePanel.seconds", { count: 5 })}
                    </SelectItem>
                    <SelectItem value="10">
                      {t("components.livePanel.seconds", { count: 10 })}
                    </SelectItem>
                    <SelectItem value="15">
                      {t("components.livePanel.seconds", { count: 15 })}
                    </SelectItem>
                    <SelectItem value="30">
                      {t("components.livePanel.seconds", { count: 30 })}
                    </SelectItem>
                    <SelectItem value="60">
                      {t("components.livePanel.seconds", { count: 60 })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ActionTooltip>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {!isLiveActive ? (
            <Button
              onClick={handleStart}
              size="sm"
              className="h-8 bg-info hover:bg-info/90 text-info-foreground gap-1.5 px-4"
            >
              <Play className="h-3.5 w-3.5 fill-current" />{" "}
              {t("components.livePanel.start")}
            </Button>
          ) : (
            <div className="flex items-center gap-3 pr-1">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-info bg-info/10 px-2 py-1 rounded border border-info/20">
                <Timer className="h-3.5 w-3.5" />
                {formatTime(timeLeft)}
              </div>
              <Button
                onClick={handleStop}
                size="sm"
                className="h-8 bg-info hover:bg-info/90 text-info-foreground gap-1.5 px-3"
              >
                <Square className="h-3.5 w-3.5 fill-current" />{" "}
                {t("components.livePanel.stop")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
