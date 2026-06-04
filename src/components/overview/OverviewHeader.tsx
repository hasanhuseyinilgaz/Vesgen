import { LayoutDashboard, Database, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tenant } from "@/types";
import { cn } from "@/lib/utils";

interface OverviewHeaderProps {
  tenant: Tenant | null;
  dbCount: number;
  activeDbCount: number;
  serverCount: number;
  activeServerCount: number;
}

export default function OverviewHeader({
  tenant,
  dbCount,
  activeDbCount,
  serverCount,
  activeServerCount
}: OverviewHeaderProps) {
  const { t } = useTranslation();

  const getStatusClasses = (active: number, total: number) => {
    if (total === 0) return { icon: "text-muted-foreground/40 bg-muted/40", text: "text-muted-foreground/40" };
    if (active === total) return { icon: "text-success bg-success/10", text: "text-success" };
    if (active > 0) return { icon: "text-warning bg-warning/10", text: "text-warning" };
    return { icon: "text-destructive bg-destructive/10", text: "text-destructive" };
  };

  const dbStatus = getStatusClasses(activeDbCount, dbCount);
  const serverStatus = getStatusClasses(activeServerCount, serverCount);

  return (
    <div className="relative rounded-[2rem] bg-card border border-border/50 p-5 md:p-8 flex flex-col justify-center min-h-[120px] shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden shrink-0">
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between w-full gap-6">
        <div className="space-y-2 max-w-md xl:max-w-lg">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/20">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-[0.1em]">
              {t("dashboard.systemOverview")}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground leading-tight">
              {tenant?.name || "---"}
            </h1>
            <p className="text-muted-foreground text-sm font-medium max-w-lg opacity-60">
              {t("dashboard.overviewDescription")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex items-center gap-4 group">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
              dbStatus.icon
            )}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-foreground tabular-nums">{dbCount}</span>
                <span className={cn("text-xs font-bold opacity-60 tabular-nums", dbStatus.text)}>
                  /{activeDbCount}
                </span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-0.5">{t("dashboard.databases")}</div>
            </div>
          </div>

          <div className="w-px h-12 bg-border/30 hidden md:block" />

          <div className="flex items-center gap-4 group">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300",
              serverStatus.icon
            )}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-foreground tabular-nums">{serverCount}</span>
                <span className={cn("text-xs font-bold opacity-60 tabular-nums", serverStatus.text)}>
                  /{activeServerCount}
                </span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-0.5">{t("dashboard.servers")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
