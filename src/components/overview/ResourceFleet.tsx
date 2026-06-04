import { useNavigate } from "react-router-dom";
import { Database, Server, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { DatabaseResource, WindowsServerResource } from "@/types";

interface MiniGaugeProps {
  value: number;
  label: string;
  color?: "primary" | "info" | "warning" | "destructive" | "success";
}

function MiniGauge({ value, label, color = "primary" }: MiniGaugeProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/10">
        <div
          className={cn(
            "h-full transition-all duration-1000 ease-out",
            color === "primary" && "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]",
            color === "info" && "bg-info shadow-[0_0_8px_rgba(var(--info),0.5)]",
            color === "warning" && "bg-warning shadow-[0_0_8px_rgba(var(--warning),0.5)]",
            color === "destructive" && "bg-destructive shadow-[0_0_8px_rgba(var(--destructive),0.5)]",
            color === "success" && "bg-success shadow-[0_0_8px_rgba(var(--success),0.5)]",
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

interface ResourceCardProps {
  type: "database" | "server";
  name: string;
  host?: string;
  status: "online" | "offline" | "connecting";
  stats?: { cpu?: number; ram?: number; disk?: number };
  sessionCount?: number;
  onClick?: () => void;
}

export function ResourceCard({ type, name, host, status, stats, sessionCount, onClick }: ResourceCardProps) {
  const { t } = useTranslation();
  return (
    <div
      className="group glass-card border border-border/40 p-5 rounded-2xl flex flex-col gap-4 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-125 duration-700">
        {type === "database" ? <Database className="w-16 h-16" /> : <Server className="w-16 h-16" />}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner shrink-0",
            type === "database" ? "bg-primary/10 text-primary" : "bg-info/10 text-info"
          )}>
            {type === "database" ? <Database className="w-5 h-5" /> : <Server className="w-5 h-5" />}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-black text-[13px] tracking-tight truncate uppercase tracking-wider text-foreground">{name}</span>
            <span className="text-[10px] text-muted-foreground font-medium opacity-60 tracking-wider font-mono truncate">{host || "Local"}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
          <div className={cn(
            "h-2 w-2 rounded-full animate-pulse shadow-[0_0_8px]",
            status === "online" ? "bg-success shadow-success/50" : status === "connecting" ? "bg-warning shadow-warning/50" : "bg-destructive shadow-destructive/50"
          )} />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{status}</span>
        </div>
      </div>

      {type === "server" && (
        <div className="grid grid-cols-1 gap-3 mt-1 relative z-10">
          <MiniGauge value={stats?.cpu || 0} label="CPU" color={(stats?.cpu || 0) > 80 ? "destructive" : "info"} />
          <MiniGauge value={stats?.ram || 0} label="RAM" color={(stats?.ram || 0) > 80 ? "destructive" : "primary"} />
        </div>
      )}

      {type === "database" && (
        <div className="flex items-center gap-4 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1.5 min-w-0">
            <Activity className={cn(
              "w-3.5 h-3.5 transition-colors",
              (sessionCount || 0) > 0 ? "text-success animate-pulse" : "text-primary/70"
            )} />
            <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest truncate">
              {t("activity.activeSessions")}: {sessionCount || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResourceFleet({
  databases,
  servers,
  showDatabases = true,
  showServers = true,
  fleetStatus = {},
  fleetMetrics = {},
  fleetSessions = {}
}: {
  databases: DatabaseResource[],
  servers: WindowsServerResource[],
  showDatabases?: boolean,
  showServers?: boolean,
  fleetStatus?: Record<string, "online" | "offline" | "connecting">,
  fleetMetrics?: Record<string, { cpu?: number; ram?: number }>,
  fleetSessions?: Record<string, number>
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-12">
      {/* Databases Section */}
      {showDatabases && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-black tracking-tight uppercase tracking-widest text-muted-foreground/80">{t("dashboard.databases")}</h3>
            </div>
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-black shrink-0">{databases.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {databases.map((db, i) => (
              <ResourceCard
                key={db.id || i}
                type="database"
                name={db.name}
                host={db.server}
                status={fleetStatus?.[db.id] || "offline"}
                sessionCount={fleetSessions?.[db.id]}
                onClick={() => navigate("/database/tables")}
              />
            ))}
            {databases.length === 0 && (
              <div className="col-span-full py-12 text-center glass-card rounded-2xl border-dashed border-2">
                <span className="text-muted-foreground text-sm font-black uppercase tracking-widest opacity-50">No Databases Linked</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Servers Section */}
      {showServers && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-info" />
              <h3 className="text-xl font-black tracking-tight uppercase tracking-widest text-muted-foreground/80">{t("dashboard.servers")}</h3>
            </div>
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-info/10 text-info text-[9px] font-black shrink-0">{servers.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {servers.map((server, i) => (
              <ResourceCard
                key={server.id || i}
                type="server"
                name={server.alias || server.name || "Server"}
                host={server.host}
                status={fleetStatus?.[server.id] || "offline"}
                stats={fleetMetrics?.[server.id]}
                onClick={() => navigate("/win/performance")}
              />
            ))}
            {servers.length === 0 && (
              <div className="col-span-full py-12 text-center glass-card rounded-2xl border-dashed border-2">
                <span className="text-muted-foreground text-sm font-black uppercase tracking-widest opacity-50">No Servers Linked</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
