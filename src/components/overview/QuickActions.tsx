import { Zap, Database, Server, Settings, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    {
      id: "add-db",
      title: t("dashboard.addDatabaseAction"),
      desc: t("dashboard.addDatabaseDesc"),
      icon: Database,
      color: "primary",
      onClick: () => navigate("/database/tables"),
    },
    {
      id: "add-server",
      title: t("dashboard.addServerAction"),
      desc: t("dashboard.addServerDesc"),
      icon: Server,
      color: "info",
      onClick: () => navigate("/win/performance"),
    },
    {
      id: "logs",
      title: t("dashboard.viewLogs"),
      desc: t("dashboard.viewLogsDesc"),
      icon: FileText,
      color: "warning",
      onClick: () => { }, // Disabled for now to prevent crash
    },
    {
      id: "settings",
      title: t("dashboard.settingsAction"),
      desc: t("dashboard.settingsActionDesc"),
      icon: Settings,
      color: "success",
      onClick: () => navigate("/settings"),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-5 w-5 text-warning fill-warning/20 animate-pulse" />
        <h3 className="text-xl font-black tracking-tight uppercase tracking-widest text-muted-foreground/80">{t("dashboard.quickActions")}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            onClick={action.onClick}
            className={cn(
              "glass-card h-auto py-8 px-6 md:px-10 flex flex-col items-center justify-center gap-3 rounded-[2rem] border transition-all duration-500 group/btn shadow-lg",
              action.color === "primary" && "hover:border-primary/50 hover:bg-primary/5",
              action.color === "info" && "hover:border-info/50 hover:bg-info/5",
              action.color === "warning" && "hover:border-warning/50 hover:bg-warning/5",
              action.color === "success" && "hover:border-success/50 hover:bg-success/5",
            )}
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover/btn:scale-110 group-hover/btn:rotate-6", `text-${action.color}`)}>
              <action.icon className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1 w-full max-w-[240px]">
              <span className="font-black text-xs md:text-sm block tracking-tighter uppercase tracking-widest leading-none mb-1">{action.title}</span>
              <span className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed opacity-70 font-medium block">{action.desc}</span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
