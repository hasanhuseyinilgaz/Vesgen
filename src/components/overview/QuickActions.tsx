import { Zap, Database, Server, Settings, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useModals } from "@/contexts/ModalContext";

export default function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const modals = useModals();
  const actions = [
    {
      id: "add-db",
      title: t("dashboard.addDatabaseAction"),
      desc: t("dashboard.addDatabaseDesc"),
      icon: Database,
      color: "primary",
      onClick: modals.openAddDatabase,
    },
    {
      id: "add-server",
      title: t("dashboard.addServerAction"),
      desc: t("dashboard.addServerDesc"),
      icon: Server,
      color: "info",
      onClick: modals.openAddWinServer,
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
        <Zap className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">{t("dashboard.quickActions")}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            onClick={action.onClick}
            className={cn(
              "group/btn glass-card h-auto w-full p-5 flex flex-row items-center justify-start gap-4 rounded-xl border border-border/40 transition-all duration-300 shadow-sm relative overflow-hidden min-h-[110px] whitespace-normal",
              action.color === "primary" && "hover:border-primary/40 hover:bg-primary/5",
              action.color === "info" && "hover:border-info/40 hover:bg-info/5",
              action.color === "warning" && "hover:border-warning/40 hover:bg-warning/5",
              action.color === "success" && "hover:border-success/40 hover:bg-success/5",
            )}
          >
            {/* Subtle Ghost Icon background */}
            <div className="absolute top-0 right-0 p-3 opacity-[0.02] group-hover/btn:opacity-[0.05] transition-opacity duration-500">
              <action.icon className="w-12 h-12" />
            </div>

            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover/btn:scale-105 flex-shrink-0 shadow-inner",
              action.color === "primary" && "bg-primary/10 text-primary",
              action.color === "info" && "bg-info/10 text-info",
              action.color === "warning" && "bg-warning/10 text-warning",
              action.color === "success" && "bg-success/10 text-success",
            )}>
              <action.icon className="w-5 h-5" />
            </div>
            
            <div className="text-left space-y-1 flex-1 min-w-0 relative z-10">
              <span className="font-bold text-xs block tracking-wide uppercase text-foreground leading-none">{action.title}</span>
              <span className="text-[10px] text-muted-foreground font-medium leading-relaxed opacity-70 block">
                {action.desc}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
