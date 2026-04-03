import { LayoutDashboard, Database, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tenant } from "@/types";

interface OverviewHeaderProps {
  tenant: Tenant | null;
  dbCount: number;
  serverCount: number;
}

export default function OverviewHeader({ tenant, dbCount, serverCount }: OverviewHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="relative rounded-[2rem] bg-gradient-to-br from-primary/10 via-background/20 to-info/5 border border-primary/20 p-6 md:p-10 mb-8 group min-h-[160px] flex items-center overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-32 h-32 bg-info/10 rounded-full blur-3xl opacity-30 group-hover:scale-110 transition-transform duration-1000" />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between w-full gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary animate-in fade-in slide-in-from-left-4 duration-500">
            <LayoutDashboard className="w-3 h-3" />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              {t("dashboard.systemOverview")}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground leading-tight animate-in fade-in slide-in-from-left-6 duration-700">
            {t("dashboard.welcomeBack")}, <span className="text-primary italic">{tenant?.name || "User"}</span>
          </h1>

          <p className="text-muted-foreground text-sm font-medium max-w-lg animate-in fade-in slide-in-from-left-8 duration-1000 opacity-80">
            {t("dashboard.overviewDescription")}
          </p>
        </div>

        <div className="flex items-center gap-3 md:gap-4 animate-in fade-in zoom-in duration-1000 delay-300 self-end lg:self-center">
          <div className="glass-card border border-border/50 p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center min-w-[100px] md:min-w-[120px] hover:border-primary/50 transition-all group/stat shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2 group-hover/stat:scale-110 group-hover/stat:rotate-3 transition-all">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black tracking-tighter">{dbCount}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{t("dashboard.databases")}</span>
          </div>

          <div className="glass-card border border-border/50 p-4 md:p-5 rounded-2xl flex flex-col items-center justify-center min-w-[100px] md:min-w-[120px] hover:border-primary/50 transition-all group/stat shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info mb-2 group-hover/stat:scale-110 group-hover/stat:-rotate-3 transition-all">
              <Server className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black tracking-tighter">{serverCount}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{t("dashboard.servers")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
