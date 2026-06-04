import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Building2,
  Database,
  Plus,
  ChevronRight,
  Monitor,
  TerminalSquare,
  Loader2,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Save,
  Globe,
  Info,
  Github,
  Twitter,
  Bell,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Layers,
  Server,
  Eye,
  EyeOff,
  Check,
  Activity,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tenant } from "@/types";

import { useTenants } from "@/hooks/useTenants";
import { useNotifications } from "@/contexts/NotificationContext";
import { useHealth } from "@/contexts/HealthContext";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { APP_INFO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import ActionTooltip from "@/components/ui/action-tooltip";
import iconUrl from "@assets/icon.png";

interface TenantsPageProps {
  onSelectTenant: (tenantId: string) => void;
}

function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
    case "error":
      return <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />;
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
    default:
      return <Info className="h-5 w-5 text-primary shrink-0" />;
  }
}

export default function TenantsPage({ onSelectTenant }: TenantsPageProps) {
  const { t, i18n } = useTranslation();
  const { tenants, isLoading, isSaving, isUpdating, isDeleting, createTenant, updateTenant, deleteTenant } = useTenants();
  const { notifications, unreadCount, toggleRead, markAllAsRead, clearAll } = useNotifications();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

  const [tenantName, setTenantName] = useState("");
  const [tenantDescription, setTenantDescription] = useState("");

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedTenantForSettings, setSelectedTenantForSettings] = useState<Tenant | null>(null);
  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantDescription, setEditTenantDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    fleetStatus,
    isScanning,
    refreshHealth,
  } = useHealth();

  const allDatabases = useMemo(() => tenants.flatMap(t => t.databases || []), [tenants]);
  const allWindowsServers = useMemo(() => tenants.flatMap(t => t.windowsServers || []), [tenants]);

  // Data is now handled globally in HealthProvider
  const onlineDbs = useMemo(() => allDatabases.filter(db => fleetStatus[db.id] === 'online').length, [allDatabases, fleetStatus]);
  const onlineServers = useMemo(() => allWindowsServers.filter(s => fleetStatus[s.id] === 'online').length, [allWindowsServers, fleetStatus]);

  const stats = useMemo(() => {
    const dbs = tenants.reduce((a, t) => a + (t.databases?.length || 0), 0);
    const win = tenants.reduce((a, t) => a + (t.windowsServers?.length || 0), 0);
    const lin = tenants.reduce((a, t) => a + (t.linuxServers?.length || 0), 0);
    return { envs: tenants.length, dbs, servers: win + lin, total: dbs + win + lin };
  }, [tenants]);

  const hasUnread = unreadCount > 0;

  const handleSaveTenant = async () => {
    try {
      const ok = await createTenant(tenantName, tenantDescription);
      if (ok) {
        setTenantName("");
        setTenantDescription("");
        setIsAddModalOpen(false);
        toast.success(t("tenants.createSuccess"));
      } else {
        toast.error(t("tenants.createError"));
      }
    } catch {
      toast.error(t("tenants.systemErrorCreation"));
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenantForSettings) return;
    try {
      const ok = await updateTenant(selectedTenantForSettings, editTenantName, editTenantDescription);
      if (ok) {
        setIsSettingsModalOpen(false);
        toast.success(t("tenants.updateSuccess"));
      } else {
        toast.error(t("tenants.updateError"));
      }
    } catch {
      toast.error(t("tenants.systemErrorUpdate"));
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenantForSettings) return;
    try {
      const ok = await deleteTenant(selectedTenantForSettings.id);
      if (ok) {
        setIsSettingsModalOpen(false);
        setShowDeleteConfirm(false);
        setSelectedTenantForSettings(null);
        toast.success(t("tenants.deleteSuccess"));
      } else {
        toast.error(t("tenants.deleteError"));
      }
    } catch {
      toast.error(t("tenants.systemErrorDeletion"));
    }
  };

  const openTenantSettings = (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    setSelectedTenantForSettings(tenant);
    setEditTenantName(tenant.name);
    setEditTenantDescription(tenant.description || "");
    setShowDeleteConfirm(false);
    setIsSettingsModalOpen(true);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem("appLanguage", lang);
  };

  return (
    <div className="flex h-full w-full overflow-y-auto custom-scrollbar bg-background">
      <div className="w-full px-6 md:px-8 xl:px-12 py-8 flex flex-col gap-8">

        {/* ── HEADER / HERO ── */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center p-2.5 shadow-md shadow-primary/5 group relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
              <img src={iconUrl} alt="Vesgen" className="w-full h-full object-contain relative z-10 drop-shadow-md" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {APP_INFO.NAME}
              </h1>
              <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed">
                {t("tenants.heroSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/40">
            <ActionTooltip label={t("recentNotifications") || "Bildirimler"} side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsNotifModalOpen(true)}
                className={cn(
                  "relative h-10 w-10 rounded-xl transition-all",
                  hasUnread ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "text-muted-foreground hover:bg-muted/80"
                )}
              >
                <Bell
                  className={cn("w-4 h-4", hasUnread && "animate-bell-ring")}
                  style={{ transformOrigin: "top center" }}
                />
                {hasUnread && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-background" />
                )}
              </Button>
            </ActionTooltip>

            <ActionTooltip label={t("settings.title") || "Ayarlar"} side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGlobalSettingsOpen(true)}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </ActionTooltip>

            <ActionTooltip label={t("common.aboutApp") || "Hakkında"} side="bottom">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsInfoModalOpen(true)}
                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                <Info className="w-4 h-4" />
              </Button>
            </ActionTooltip>
          </div>
        </div>

        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500 delay-75">
          {[
            { value: stats.envs, sub: "Tümü", label: t("tenants.heroStatEnvs"), icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", indicator: "bg-blue-500" },
            { value: stats.dbs, sub: isScanning ? "Kontrol ediliyor..." : `${onlineDbs} Online`, label: t("tenants.heroStatDbs"), icon: Database, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", indicator: onlineDbs > 0 ? "bg-emerald-500" : (stats.dbs > 0 ? "bg-red-500" : "bg-emerald-500/30") },
            { value: stats.servers, sub: isScanning ? "Kontrol ediliyor..." : `${onlineServers} Online`, label: t("tenants.heroStatServers"), icon: Server, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", indicator: onlineServers > 0 ? "bg-amber-500" : (stats.servers > 0 ? "bg-red-500" : "bg-amber-500/30") },
            { value: stats.total, sub: "Toplam Kaynak", label: t("tenants.heroStatTotal"), icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20", indicator: "bg-purple-500" },
          ].map(({ value, sub, label, icon: Icon, color, bg, border, indicator }) => (
            <Card key={label} className="relative flex items-center gap-4 p-4 rounded-2xl glass-card border-border/40 shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <div className={cn("absolute right-0 top-0 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-10 transition-opacity -mr-8 -mt-8 pointer-events-none", indicator)} />
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border relative", bg, color, border)}>
                <Icon className="w-5 h-5 relative z-10" />
                {isScanning && <div className="absolute inset-0 rounded-xl border border-current animate-ping opacity-20" />}
              </div>
              <div className="z-10 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-foreground leading-none">
                    {isLoading ? "—" : value}
                  </p>
                  {!isLoading && <span className={cn("text-[10px] whitespace-nowrap font-bold", isScanning ? "text-muted-foreground/60 animate-pulse" : color)}>{sub}</span>}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── WORKSPACE GRID ── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">{t("tenants.selectEnvironment") || "Ortam Seçin"}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t("tenants.selectEnvironmentDesc")}</p>
            </div>
            <Button
              className="gap-2 h-10 px-5 font-bold rounded-xl text-sm shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all hover:-translate-y-0.5"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              {t("tenants.newTenant")}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20 pb-40">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 pb-40 gap-5 text-center">
              <div className="p-6 rounded-3xl border border-border/30 bg-muted/20">
                <Building2 className="w-12 h-12 text-muted-foreground/30" />
              </div>
              <div className="space-y-1.5">
                <p className="text-lg font-bold text-foreground">{t("tenants.noTenantYet")}</p>
                <p className="text-sm text-muted-foreground">{t("tenants.clickToCreate")}</p>
              </div>
              <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="rounded-xl px-8 h-11 font-bold mt-2">
                <Plus className="w-4 h-4 mr-2" />
                {t("tenants.newTenant")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {tenants.map((tenant, i) => {
                const tenantDbs = tenant.databases || [];
                const tenantServers = [...(tenant.windowsServers || []), ...(tenant.linuxServers || [])];

                const onlineTenantDbs = tenantDbs.filter(db => fleetStatus[db.id] === 'online').length;
                const onlineTenantServers = (tenant.windowsServers || []).filter(s => fleetStatus[s.id] === 'online').length;

                return (
                  <Card
                    key={tenant.id}
                    onClick={() => onSelectTenant(tenant.id)}
                    className={cn(
                      "group flex flex-col p-6 cursor-pointer border-border/30 glass-card relative overflow-hidden transition-all duration-300 active:scale-[0.98] rounded-2xl hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 animate-in slide-in-from-bottom-6",
                      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/10 before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity"
                    )}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className={cn("absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-0 group-hover:opacity-[0.12] blur-[60px] transition-all duration-700 pointer-events-none", tenant.color)} />

                    <ActionTooltip label={t("tenants.settings")} side="left">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-xl z-10"
                        onClick={(e) => openTenantSettings(e, tenant)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </ActionTooltip>

                    <div className="flex items-start gap-4 pr-12">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg shrink-0 relative overflow-hidden",
                        "group-hover:scale-110 group-hover:rotate-3 transition-all duration-500",
                        tenant.color
                      )}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-white/5 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 border-t border-l border-white/30 rounded-2xl pointer-events-none" />
                        <span className="relative z-10 drop-shadow-md">{tenant.shortName}</span>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="text-lg font-black text-foreground truncate group-hover:text-primary transition-colors duration-200 tracking-tight">
                          {tenant.name}
                        </h3>
                        <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed min-h-[40px] font-medium">
                          {tenant.description || t("tenants.noDescription")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-border/30 flex items-center justify-between relative z-10 w-full transition-all duration-300">
                      <div className="flex flex-wrap gap-2">
                        {/* DB Badge */}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-500/5 group-hover:bg-blue-500/10 border border-blue-500/10 group-hover:border-blue-500/20 transition-colors">
                          <div className={cn("relative flex items-center justify-center shrink-0", tenantDbs.length > 0 ? "text-blue-500" : "text-blue-500/40")}>
                            <Database className="w-3.5 h-3.5" />
                            {tenantDbs.length > 0 && <span className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full border border-background shadow-xs", isScanning ? "bg-amber-500 animate-pulse" : (onlineTenantDbs > 0 ? "bg-emerald-500" : "bg-red-500"))} />}
                          </div>
                          <div className="flex flex-col items-start pr-1 min-w-0 justify-center min-h-[22px]">
                            <span className={cn("text-[10px] font-black uppercase tracking-wider leading-none whitespace-nowrap", tenantDbs.length > 0 ? "text-foreground" : "text-muted-foreground/60")}>{tenantDbs.length} DB</span>
                            {tenantDbs.length > 0 && (
                              <span className={cn("text-[9px] font-bold mt-1 leading-none uppercase tracking-wider whitespace-nowrap", isScanning ? "text-amber-500" : (onlineTenantDbs > 0 ? "text-emerald-500" : "text-red-500/70"))}>
                                {isScanning ? "Sınanıyor" : `${onlineTenantDbs} Aktif`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Server Badge */}
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-cyan-500/5 group-hover:bg-cyan-500/10 border border-cyan-500/10 group-hover:border-cyan-500/20 transition-colors">
                          <div className={cn("relative flex items-center justify-center shrink-0", tenantServers.length > 0 ? "text-cyan-500" : "text-cyan-500/40")}>
                            <Server className="w-3.5 h-3.5" />
                            {tenantServers.length > 0 && <span className={cn("absolute -top-1 -right-1 w-2 h-2 rounded-full border border-background shadow-xs", isScanning ? "bg-amber-500 animate-pulse" : (onlineTenantServers > 0 ? "bg-emerald-500" : "bg-red-500"))} />}
                          </div>
                          <div className="flex flex-col items-start pr-1 min-w-0 justify-center min-h-[22px]">
                            <span className={cn("text-[10px] font-black uppercase tracking-wider leading-none whitespace-nowrap", tenantServers.length > 0 ? "text-foreground" : "text-muted-foreground/60")}>{tenantServers.length} SVR</span>
                            {tenantServers.length > 0 && (
                              <span className={cn("text-[9px] font-bold mt-1 leading-none uppercase tracking-wider whitespace-nowrap", isScanning ? "text-amber-500" : (onlineTenantServers > 0 ? "text-emerald-500" : "text-red-500/70"))}>
                                {isScanning ? "Sınanıyor" : `${onlineTenantServers} Aktif`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center bg-muted/50 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-1 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300 ml-2">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════╗
           GLOBAL SETTINGS    ║
          ════════════════════╝ */}
      <Dialog open={isGlobalSettingsOpen} onOpenChange={setIsGlobalSettingsOpen}>
        <DialogContent className="sm:max-w-[420px] bg-background/95 backdrop-blur-2xl border-border/40 rounded-3xl">
          <DialogHeader className="space-y-3 pb-2">
            <div className="h-12 w-12 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center">
              <Settings className="w-6 h-6 text-foreground" />
            </div>
            <DialogTitle className="text-xl font-black">{t("settings.title") || "Genel Ayarlar"}</DialogTitle>
            <DialogDescription className="text-sm">
              {t("settings.description") || "Dil ve tema tercihlerini yönetin. Gelişmiş ayarlar için bir çalışma ortamı seçin."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Dil / Language
              </Label>
              <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full h-12 bg-muted/20 border-border/40 rounded-xl font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-xl border-border/40 rounded-xl">
                  <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                Tema / Theme
              </Label>
              <div className="pt-2">
                <ThemeSwitcher />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════╗
           NOTIFICATIONS      ║
          ════════════════════╝ */}
      <Dialog open={isNotifModalOpen} onOpenChange={setIsNotifModalOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-3xl border-border/40 rounded-[2rem] overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-5 border-b border-border/20 shrink-0 bg-muted/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl border flex items-center justify-center", hasUnread ? "bg-red-500/10 border-red-500/20" : "bg-muted border-border/40")}>
                  <Bell className={cn("w-5 h-5", hasUnread ? "text-red-500" : "text-foreground")} />
                </div>
                <div className="flex flex-col">
                  <DialogTitle className="text-xl font-black leading-tight">{t("notifications.title") || "Bildirimler"}</DialogTitle>
                  {hasUnread && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-500/80">
                        {unreadCount} {t("notifications.unreadCount", { count: unreadCount })?.split(" ")[1] || "yeni"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2 pr-10">
                {hasUnread && (
                  <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl text-xs font-bold border-primary/20 hover:bg-primary/5 text-primary" onClick={markAllAsRead}>
                    <Check className="w-4 h-4 mr-2" />{t("notifications.markAllAsRead")}
                  </Button>
                )}
                {notifications.length > 0 && (
                  <ActionTooltip label={t("notifications.clearHistory")}>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl text-muted-foreground/60 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5" onClick={clearAll}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </ActionTooltip>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="p-6 rounded-3xl bg-muted/30 border border-border/20">
                  <Bell className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-muted-foreground">{t("notifications.emptyHistory")}</p>
                  <p className="text-sm font-medium text-muted-foreground/60">{t("notifications.emptyHistoryDesc")}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-4">
                {notifications.map((notif) => {
                  const title = notif.titleKey ? t(notif.titleKey, notif.data) : notif.title;
                  const body = notif.bodyKey ? t(notif.bodyKey, notif.data) : notif.body;
                  return (
                    <div key={notif.id} className={cn(
                      "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer",
                      !notif.read
                        ? "bg-card border-primary/20 shadow-sm"
                        : "bg-muted/10 border-border/40 opacity-80"
                    )} onClick={() => toggleRead(notif.id)}>
                      {!notif.read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 rounded-r-full bg-primary shadow-sm shadow-primary/20" />}

                      {/* Left Icon Container */}
                      <div className="shrink-0 p-2.5 rounded-xl bg-background/80 border border-border/40 shadow-sm flex items-center justify-center">
                        <NotifIcon type={notif.type} />
                      </div>

                      {/* Text Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-0.5">
                          <p className={cn("text-base font-bold truncate tracking-tight", !notif.read ? "text-foreground" : "text-foreground/80")}>
                            {title}
                          </p>
                          <span className="text-[10px] font-medium text-muted-foreground/40 whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-md">
                            {new Date(notif.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 md:line-clamp-3 font-medium">
                          {body}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 flex items-center justify-center ml-1 border-l border-border/20 pl-4 h-10">
                        <ActionTooltip label={notif.read ? t("notifications.markAsUnread") : t("notifications.markAsRead")} side="left">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-9 w-9 rounded-full transition-all duration-200",
                              "opacity-0 group-hover:opacity-100",
                              notif.read ? "hover:bg-primary/10 text-muted-foreground/60 hover:text-primary" : "hover:bg-primary/5 text-primary"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRead(notif.id);
                            }}
                          >
                            {notif.read ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </Button>
                        </ActionTooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════╗
           OTHER MODALS       ║
          ════════════════════╝ */}

      {/* Create Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-background/95 backdrop-blur-3xl border-border/40 rounded-3xl p-6">
          <DialogHeader className="space-y-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">{t("tenants.createModalTitle")}</DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1">{t("tenants.createModalDesc")}</DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("tenants.tenantNameLabel")} <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={t("tenants.tenantNamePlaceholder")}
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="h-12 focus-visible:ring-primary rounded-xl px-4 text-base bg-muted/10"
                onKeyDown={(e) => e.key === "Enter" && handleSaveTenant()}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("tenants.descriptionLabel")}</Label>
              <Textarea
                placeholder={t("tenants.descriptionPlaceholder")}
                value={tenantDescription}
                onChange={(e: any) => setTenantDescription(e.target.value)}
                className="resize-none h-28 focus-visible:ring-primary rounded-xl p-4 text-base bg-muted/10"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSaving} className="flex-1 h-12 rounded-xl font-bold text-sm">
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSaveTenant} disabled={!tenantName.trim() || isSaving} className="flex-[2] h-12 rounded-xl font-bold text-sm">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : t("common.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-background/95 backdrop-blur-3xl border-border/40 rounded-3xl p-6">
          <DialogHeader className="space-y-3 mb-4">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg relative overflow-hidden shadow-lg", selectedTenantForSettings?.color)}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
              <span className="relative z-10">{selectedTenantForSettings?.shortName}</span>
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">{t("tenants.settingsModalTitle")}</DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1">{t("tenants.settingsModalDesc")}</DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("tenants.tenantNameLabel")}</Label>
              <Input value={editTenantName} onChange={(e) => setEditTenantName(e.target.value)} className="h-12 focus-visible:ring-primary rounded-xl px-4 text-base bg-muted/10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("tenants.descriptionLabel")}</Label>
              <Textarea value={editTenantDescription} onChange={(e: any) => setEditTenantDescription(e.target.value)} className="resize-none h-28 focus-visible:ring-primary rounded-xl p-4 text-base bg-muted/10" />
            </div>
            <Button className="w-full h-12 rounded-xl font-bold text-sm" onClick={handleUpdateTenant} disabled={isUpdating || !editTenantName.trim()}>
              {isUpdating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
              {t("common.saveChanges")}
            </Button>
          </div>
          <div className="pt-6 mt-6 border-t border-border/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3">{t("tenants.dangerZone")}</p>
            {!showDeleteConfirm ? (
              <Button variant="ghost" className="w-full h-12 text-destructive hover:bg-destructive/10 hover:text-destructive border border-destructive/20 font-bold rounded-xl" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> {t("tenants.deleteTenant")}
              </Button>
            ) : (
              <div className="flex flex-col gap-4 p-5 bg-destructive/5 border border-destructive/20 rounded-2xl animate-in zoom-in-95">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/10 rounded-xl shrink-0"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                  <div>
                    <p className="text-base font-bold text-destructive leading-tight">{t("tenants.areYouSure")}</p>
                    <p className="text-xs font-medium text-destructive/80 mt-1">{t("tenants.deleteWarning")}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>{t("common.giveUp")}</Button>
                  <Button variant="destructive" className="flex-1 h-10 rounded-xl font-bold" onClick={handleDeleteTenant} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("tenants.deletePermanently")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Modal */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-background/95 backdrop-blur-3xl border-border/40 rounded-3xl">
          <DialogHeader className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted/40 rounded-2xl border border-border/30 shadow-sm">
                <img src={iconUrl} alt="Vesgen" className="w-10 h-10 object-contain" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">{APP_INFO.NAME}</DialogTitle>
                <p className="text-sm font-bold text-muted-foreground/60 font-mono mt-0.5">v{APP_INFO.VERSION}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <p className="text-[15px] text-muted-foreground leading-relaxed font-medium">
              Vesgen, modern veritabanı yönetimi ve sunucu izleme araçlarını tek bir arayüzde toplayan gelişmiş bir yönetim panelidir.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-11 gap-2 rounded-xl font-bold"><Github className="w-4 h-4" /> GitHub</Button>
              <Button variant="outline" className="flex-1 h-11 gap-2 rounded-xl font-bold"><Twitter className="w-4 h-4" /> Twitter</Button>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button onClick={() => setIsInfoModalOpen(false)} className="w-full h-11 rounded-xl font-bold">{t("common.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
