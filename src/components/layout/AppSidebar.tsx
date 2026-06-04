import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Database,
    Table,
    Eye,
    Settings,
    FileCode,
    LogOut,
    Menu,
    LayoutDashboard,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    PlusCircle,
    Monitor,
    TerminalSquare,
    Activity,
    HeartPulse,
    ServerCog,
    MoreVertical,
} from "lucide-react";
import { Tenant } from "@/types";
import { cn } from "@/lib/utils";
import ActionTooltip from "@/components/ui/action-tooltip";
import { useModals } from "@/contexts/ModalContext";
import { APP_INFO } from "@/lib/constants";
import { useNotifications } from "@/contexts/NotificationContext";
import { Bell } from "lucide-react";

interface AppSidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    tenant: Tenant | null;
    activeDatabaseId: string | null;
    setActiveDatabaseId: (id: string | null) => void;
    isConnectingDb: boolean;
    activeWinServerId: string | null;
    setActiveWinServerId: (id: string | null) => void;
    onDisconnect: () => void;
}

export default function AppSidebar({
    sidebarOpen,
    setSidebarOpen,
    tenant,
    activeDatabaseId,
    setActiveDatabaseId,
    isConnectingDb,
    activeWinServerId,
    setActiveWinServerId,
    onDisconnect,
}: AppSidebarProps) {
    const modals = useModals();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { unreadCount } = useNotifications();

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
        "db-management": true,
        "win-servers": true,
        "lin-servers": true,
    });

    const handleAccordionClick = (menuId: string) => {
        setOpenMenus((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
    };

    const SidebarTooltip = ({
        children,
        label,
    }: {
        children: React.ReactNode;
        label: string;
    }) => {
        if (sidebarOpen) return <>{children}</>;
        return (
            <ActionTooltip label={label} side="right">
                {children}
            </ActionTooltip>
        );
    };

    const MenuItem = ({
        path,
        icon: Icon,
        label,
        badge,
    }: {
        path: string;
        icon: any;
        label: string;
        badge?: number;
    }) => {
        const isActive = location.pathname === path;
        return (
            <SidebarTooltip label={label}>
                <Button
                    variant="ghost"
                    className={cn(
                        "flex items-center justify-start p-0 h-10 font-medium transition-colors duration-200 ease-in-out rounded-lg group active:scale-95 outline-none antialiased relative",
                        sidebarOpen ? "w-full" : "w-10 mx-auto",
                        isActive
                            ? "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                            : (badge !== undefined && badge > 0)
                                ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                    onClick={() => {
                        if (isActive) return;
                        navigate(path);
                    }}
                >
                    <div className={cn(
                        "h-full shrink-0 flex items-center justify-center transition-all duration-75",
                        sidebarOpen ? "w-[56px]" : "w-full"
                    )}>
                        <Icon
                            className={cn(
                                "transition-colors duration-200 ease-in-out",
                                sidebarOpen ? "h-4 w-4" : "h-5 w-5",
                                isActive
                                    ? "text-primary group-hover:text-white"
                                    : (badge !== undefined && badge > 0)
                                        ? "text-destructive animate-bell-ring"
                                        : "text-muted-foreground group-hover:text-foreground",
                            )}
                        />
                    </div>
                    <div
                        className={cn(
                            "flex-1 flex items-center justify-between overflow-hidden transition-all duration-75 whitespace-nowrap",
                            sidebarOpen ? "opacity-100 pr-3" : "opacity-0 w-0",
                        )}
                    >
                        <span className="truncate text-sm">{label}</span>
                        {badge !== undefined && badge > 0 && sidebarOpen && (
                            <span className="flex items-center justify-center h-4.5 min-w-[18px] px-1 bg-destructive text-white text-[10px] font-black rounded-full shadow-sm">
                                {badge > 99 ? '99+' : badge}
                            </span>
                        )}
                    </div>
                    {!sidebarOpen && badge !== undefined && badge > 0 && (
                        <div className="absolute -top-1 -right-1 flex items-center justify-center h-4 min-w-[16px] px-1 bg-destructive text-white text-[9px] font-black rounded-full border-2 border-card shadow-sm z-10 animate-in zoom-in duration-300">
                            {badge > 9 ? '9+' : badge}
                        </div>
                    )}
                </Button>
            </SidebarTooltip>
        );
    };

    const activeDbData = tenant?.databases?.find(
        (d) => d.id === activeDatabaseId,
    );
    const activeDbName = activeDbData ? activeDbData.name : "";

    return (
        <aside
            className={cn(
                "bg-card border-r transition-all duration-300 ease-in-out flex flex-col shrink-0 z-20 relative",
                sidebarOpen ? "w-64" : "w-[72px]",
            )}
        >
            {/* Floating Toggle Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={cn(
                    "absolute -right-3 w-6 h-6 rounded-full border bg-card shadow-sm flex items-center justify-center z-50 hover:bg-primary hover:text-white transition-all duration-300 group/toggle",
                    sidebarOpen ? "top-[77px]" : "top-[61px]"
                )}
            >
                {sidebarOpen ? (
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover/toggle:text-white transition-colors" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover/toggle:text-white transition-colors" />
                )}
            </button>
            <div className="p-4 border-b flex flex-col gap-4">
                {tenant && (
                    <div
                        className={cn(
                            "relative flex items-center transition-all duration-300 w-full rounded-2xl",
                            sidebarOpen
                                ? "bg-muted/40 border shadow-sm p-2"
                                : "bg-transparent border-transparent p-0 justify-center",
                        )}
                    >
                        {sidebarOpen ? (
                            <div
                                className={cn(
                                    "relative flex items-center gap-3 w-full transition-all duration-300",
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg transition-all duration-300 relative overflow-hidden shrink-0",
                                        tenant.color,
                                    )}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/5 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 border-t border-l border-white/30 rounded-xl pointer-events-none" />
                                    <span className="relative z-10">{tenant.shortName}</span>
                                </div>

                                <div className="flex flex-col min-w-0 flex-1 overflow-hidden transition-all duration-300">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight truncate">
                                        {t("dashboard.activeEnv")}
                                    </span>
                                    <span className="text-sm font-black text-foreground truncate">
                                        {tenant.name}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <ActionTooltip
                                label={`${t("dashboard.activeEnv")}: ${tenant.name}`}
                                side="right"
                            >
                                <div className="flex items-center justify-center w-full">
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg transition-all duration-300 relative overflow-hidden shrink-0 ring-2 ring-background ring-offset-2 ring-offset-muted/20",
                                            tenant.color,
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-white/5 to-transparent pointer-events-none" />
                                        <div className="absolute inset-0 border-t border-l border-white/30 rounded-xl pointer-events-none" />
                                        <span className="relative z-10">{tenant.shortName}</span>
                                    </div>
                                </div>
                            </ActionTooltip>
                        )}
                    </div>
                )}
            </div>

            <nav className={cn(
                "flex-1 py-4 space-y-6 overflow-y-auto overflow-x-hidden scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-300",
                sidebarOpen ? "px-3" : "px-2"
            )}>
                <div className="flex flex-col gap-1">
                    <div className={cn(
                        "relative flex items-center w-full h-8 mb-1 px-3 transition-opacity duration-300",
                        !sidebarOpen && "justify-center"
                    )}>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/50",
                            !sidebarOpen && "hidden"
                        )}>
                            {t("common.global")}
                        </span>
                        {!sidebarOpen && (
                            <div className="h-px w-6 bg-muted-foreground/20" />
                        )}
                    </div>
                    <MenuItem
                        path="/overview"
                        icon={LayoutDashboard}
                        label={t("dashboard.overview")}
                    />
                    <MenuItem
                        path="/notifications"
                        icon={Bell}
                        label={t("notifications.title")}
                        badge={unreadCount}
                    />
                    <MenuItem
                        path="/settings"
                        icon={Settings}
                        label={t("settings.title")}
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <SidebarTooltip label={t("dashboard.dbManagement")}>
                        <div
                            className={cn(
                                "relative flex items-center w-full h-10 cursor-pointer rounded-lg mb-1 overflow-hidden transition-all duration-300",
                                sidebarOpen && "hover:bg-muted/50"
                            )}
                            onClick={() => handleAccordionClick("db-management")}
                        >
                            <div
                                className={cn(
                                    "absolute inset-0 flex items-center justify-center transition-all duration-300",
                                    sidebarOpen
                                        ? "-translate-x-full opacity-0"
                                        : "translate-x-0 opacity-100",
                                )}
                            >
                                <div className={cn(
                                    "transition-all duration-150 active:scale-95",
                                    !sidebarOpen && "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20"
                                )}>
                                    <Database
                                        className={cn(
                                            "h-5 w-5 transition-colors duration-150",
                                            openMenus["db-management"]
                                                ? "text-primary"
                                                : "text-muted-foreground/60 hover:text-primary",
                                        )}
                                    />
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "flex items-center justify-between w-full h-full px-3 transition-all duration-300 whitespace-nowrap",
                                    sidebarOpen
                                        ? "translate-x-0 opacity-100"
                                        : "translate-x-full opacity-0",
                                )}
                            >
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                    {t("dashboard.dbManagement")}
                                </span>
                                {openMenus["db-management"] ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                            </div>
                        </div>
                    </SidebarTooltip>

                    <div
                        className={cn(
                            "grid transition-all duration-300 ease-in-out",
                            openMenus["db-management"]
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0",
                        )}
                    >
                        <div className="overflow-hidden">
                            <div
                                className={cn(
                                    "flex flex-col gap-0.5 transition-all duration-300 overflow-hidden",
                                    !sidebarOpen
                                        ? "bg-muted/30 border border-border/40 rounded-xl py-1 shadow-inner"
                                        : "bg-muted/10 border border-border/30 rounded-xl py-1 px-1 mt-1 mb-2 mx-2",
                                )}
                            >
                                <div className="relative w-full h-9 mb-1 shrink-0 overflow-hidden">
                                    <div
                                        className={cn(
                                            "absolute inset-0 flex items-center w-full transition-all duration-300 px-1 pt-1",
                                            sidebarOpen
                                                ? "opacity-100 z-10 translate-x-0"
                                                : "opacity-0 -z-10 -translate-x-4 pointer-events-none",
                                        )}
                                    >
                                        {!tenant?.databases || tenant.databases.length === 0 ? (
                                            <div className="w-full h-8 px-2 flex items-center justify-center text-[11px] text-muted-foreground/60 italic border border-dashed rounded-md bg-transparent whitespace-nowrap">
                                                {t("dashboard.noDatabase")}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 w-full">
                                                <Select
                                                    value={activeDatabaseId || ""}
                                                    onValueChange={(val) => {
                                                        if (val) {
                                                            setActiveDatabaseId(val);
                                                            navigate("/overview");
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full h-8 text-xs bg-background border-input focus:ring-1 focus:ring-primary shadow-sm font-medium">
                                                        <SelectValue
                                                            placeholder={t("dashboard.selectDb")}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {tenant.databases.map((db: any) => (
                                                            <SelectItem
                                                                key={db.id}
                                                                value={db.id}
                                                                className="text-xs font-medium cursor-pointer"
                                                            >
                                                                🗄️ {db.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {activeDatabaseId && (
                                                    <ActionTooltip
                                                        label={t("dashboard.dbSettings")}
                                                        side="top"
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground shadow-sm bg-background transition-all active:scale-90"
                                                            onClick={modals.openDbSettings}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </ActionTooltip>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div
                                        className={cn(
                                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                                            !sidebarOpen
                                                ? "opacity-100 z-10 translate-x-0"
                                                : "opacity-0 -z-10 translate-x-4 pointer-events-none",
                                        )}
                                    >
                                        {!tenant?.databases || tenant.databases.length === 0 ? (
                                            <ActionTooltip
                                                label={t("dashboard.noDatabase")}
                                                side="right"
                                            >
                                                <div className="w-9 h-9 rounded-full border border-dashed flex items-center justify-center cursor-help">
                                                    <Database className="w-4 h-4 text-muted-foreground/40" />
                                                </div>
                                            </ActionTooltip>
                                        ) : (
                                            <ActionTooltip
                                                label={
                                                    activeDbName
                                                        ? `${t("dashboard.activeEnv")}: ${activeDbName}`
                                                        : t("dashboard.selectDb")
                                                }
                                                side="right"
                                            >
                                                <div
                                                    onClick={() => setSidebarOpen(true)}
                                                    className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                                                >
                                                    <Database className="w-4 h-4" />
                                                </div>
                                            </ActionTooltip>
                                        )}
                                    </div>
                                </div>

                                {tenant?.databases && tenant.databases.length > 0 && (
                                    <>
                                        <MenuItem
                                            path="/database/queries"
                                            icon={TerminalSquare}
                                            label={t("dashboard.queryConsole")}
                                        />
                                        <MenuItem
                                            path="/database/tables"
                                            icon={Table}
                                            label={t("dashboard.tables")}
                                        />
                                        <MenuItem
                                            path="/database/views"
                                            icon={Eye}
                                            label={t("dashboard.views")}
                                        />
                                        <MenuItem
                                            path="/database/procedures"
                                            icon={FileCode}
                                            label={t("dashboard.procedures")}
                                        />
                                        <MenuItem
                                            path="/database/jobs"
                                            icon={ServerCog}
                                            label={t("dashboard.jobs")}
                                        />
                                        <MenuItem
                                            path="/database/activity"
                                            icon={Activity}
                                            label={t("dashboard.activityMonitor")}
                                        />
                                        <MenuItem
                                            path="/database/maintenance"
                                            icon={HeartPulse}
                                            label={t("dashboard.maintenance")}
                                        />
                                    </>
                                )}

                                <SidebarTooltip label={t("dashboard.addDatabase")}>
                                    <Button
                                        onClick={modals.openAddDatabase}
                                        variant="ghost"
                                        className={cn(
                                            "flex items-center justify-start p-0 h-10 font-medium transition-all duration-150 rounded-lg group text-primary hover:bg-primary/10 mt-1 active:scale-95 focus:ring-0 focus-visible:ring-0 outline-none antialiased",
                                            sidebarOpen ? "w-full" : "w-10 mx-auto"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-full shrink-0 flex items-center justify-center transition-all duration-75",
                                            sidebarOpen ? "w-[56px]" : "w-full"
                                        )}>
                                            <PlusCircle
                                                className={cn(
                                                    "transition-colors duration-150",
                                                    sidebarOpen ? "h-4 w-4" : "h-5 w-5",
                                                )}
                                            />
                                        </div>
                                        <div
                                            className={cn(
                                                "flex-1 flex items-center overflow-hidden transition-all duration-300 whitespace-nowrap",
                                                sidebarOpen
                                                    ? "opacity-100 pr-3"
                                                    : "opacity-0 w-0 hidden",
                                            )}
                                        >
                                            <span className="truncate text-sm font-medium">
                                                {t("dashboard.addDatabase")}
                                            </span>
                                        </div>
                                    </Button>
                                </SidebarTooltip>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <SidebarTooltip label={t("dashboard.winServers")}>
                        <div
                            className={cn(
                                "relative flex items-center w-full h-10 cursor-pointer rounded-lg mb-1 overflow-hidden transition-all duration-300",
                                sidebarOpen && "hover:bg-muted/50"
                            )}
                            onClick={() => handleAccordionClick("win-servers")}
                        >
                            <div
                                className={cn(
                                    "absolute inset-0 flex items-center justify-center transition-all duration-300",
                                    sidebarOpen
                                        ? "-translate-x-full opacity-0"
                                        : "translate-x-0 opacity-100",
                                )}
                            >
                                <div className={cn(
                                    "transition-all duration-150 active:scale-95",
                                    !sidebarOpen && "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20"
                                )}>
                                    <Monitor
                                        className={cn(
                                            "h-5 w-5 transition-colors duration-150",
                                            openMenus["win-servers"]
                                                ? "text-primary"
                                                : "text-muted-foreground/60 hover:text-primary",
                                        )}
                                    />
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "flex items-center justify-between w-full h-full px-3 transition-all duration-300 whitespace-nowrap",
                                    sidebarOpen
                                        ? "translate-x-0 opacity-100"
                                        : "translate-x-full opacity-0",
                                )}
                            >
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                    {t("dashboard.winServers")}
                                </span>
                                {openMenus["win-servers"] ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                            </div>
                        </div>
                    </SidebarTooltip>

                    <div
                        className={cn(
                            "grid transition-all duration-300 ease-in-out",
                            openMenus["win-servers"]
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0",
                        )}
                    >
                        <div className="overflow-hidden">
                            <div
                                className={cn(
                                    "flex flex-col gap-1 transition-all duration-300 overflow-hidden",
                                    !sidebarOpen
                                        ? "bg-muted/30 border border-border/40 rounded-xl py-1 shadow-inner"
                                        : "bg-muted/10 border border-border/30 rounded-xl py-1 px-1 mt-1 mb-2 mx-2",
                                )}
                            >
                                <div className="relative w-full h-9 mb-1 shrink-0 overflow-hidden">
                                    <div
                                        className={cn(
                                            "absolute inset-0 flex items-center w-full transition-all duration-300 px-1 pt-1",
                                            sidebarOpen
                                                ? "opacity-100 z-10 translate-x-0"
                                                : "opacity-0 -z-10 -translate-x-4 pointer-events-none",
                                        )}
                                    >
                                        {!tenant?.windowsServers ||
                                            tenant.windowsServers.length === 0 ? (
                                            <div className="w-full h-8 px-2 flex items-center justify-center text-[11px] text-muted-foreground/60 italic border border-dashed rounded-md bg-transparent whitespace-nowrap">
                                                {t("dashboard.noServer")}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 w-full">
                                                <Select
                                                    value={activeWinServerId || ""}
                                                    onValueChange={(val) => {
                                                        if (val) {
                                                            setActiveWinServerId(val);
                                                            navigate("/win/performance");
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full h-8 text-xs bg-background border-input focus:ring-1 focus:ring-primary shadow-sm font-medium">
                                                        <SelectValue
                                                            placeholder={t("dashboard.selectServer")}
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {tenant.windowsServers.map((server: any) => (
                                                            <SelectItem
                                                                key={server.id}
                                                                value={server.id}
                                                                className="text-xs font-medium cursor-pointer"
                                                            >
                                                                🖥️ {server.alias}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {activeWinServerId && (
                                                    <ActionTooltip
                                                        label={t("dashboard.editWinServerTitle")}
                                                        side="top"
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground shadow-sm bg-background transition-all active:scale-90"
                                                            onClick={modals.openEditWinServer}
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </ActionTooltip>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                                            !sidebarOpen
                                                ? "opacity-100 z-10 translate-x-0"
                                                : "opacity-0 -z-10 translate-x-4 pointer-events-none",
                                        )}
                                    >
                                        {!tenant?.windowsServers ||
                                            tenant.windowsServers.length === 0 ? (
                                            <ActionTooltip
                                                label={t("dashboard.noServer")}
                                                side="right"
                                            >
                                                <div className="w-9 h-9 rounded-full border border-dashed flex items-center justify-center cursor-help">
                                                    <Monitor className="w-4 h-4 text-muted-foreground/40" />
                                                </div>
                                            </ActionTooltip>
                                        ) : (
                                            <ActionTooltip
                                                label={t("dashboard.selectServer")}
                                                side="right"
                                            >
                                                <div
                                                    onClick={() => setSidebarOpen(true)}
                                                    className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                                                >
                                                    <Monitor className="w-4 h-4" />
                                                </div>
                                            </ActionTooltip>
                                        )}
                                    </div>
                                </div>

                                {activeWinServerId && (
                                    <div className="flex flex-col gap-1 mt-1 border-t border-border/20 pt-1 px-1">
                                        <MenuItem path="/win/performance" icon={Activity} label={t("dashboard.performance")} />
                                        <MenuItem path="/win/services" icon={ServerCog} label={t("dashboard.services")} />
                                        <MenuItem path="/win/terminal" icon={TerminalSquare} label={t("dashboard.terminal")} />
                                    </div>
                                )}

                                <SidebarTooltip label={t("dashboard.addWinServer")}>
                                    <Button
                                        onClick={modals.openAddWinServer} variant="ghost"
                                        className={cn(
                                            "flex items-center justify-start p-0 h-10 font-medium transition-all duration-150 rounded-lg group text-info hover:bg-info/10 mt-1 active:scale-95 focus:ring-0 focus-visible:ring-0 outline-none antialiased",
                                            sidebarOpen ? "w-full" : "w-10 mx-auto"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "h-full shrink-0 flex items-center justify-center transition-all duration-75",
                                                sidebarOpen ? "w-[56px]" : "w-full"
                                            )}
                                        >
                                            <PlusCircle
                                                className={cn(
                                                    "transition-colors duration-150",
                                                    sidebarOpen ? "h-4 w-4" : "h-5 w-5",
                                                )}
                                            />
                                        </div>
                                        <div
                                            className={cn(
                                                "flex-1 flex items-center overflow-hidden transition-all duration-300 whitespace-nowrap",
                                                sidebarOpen
                                                    ? "opacity-100 pr-3"
                                                    : "opacity-0 w-0 hidden",
                                            )}
                                        >
                                            <span className="truncate text-sm font-medium">
                                                {t("dashboard.addWinServer")}
                                            </span>
                                        </div>
                                    </Button>
                                </SidebarTooltip>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <SidebarTooltip label={t("dashboard.linServers")}>
                        <div
                            className={cn(
                                "relative flex items-center w-full h-10 cursor-pointer rounded-lg mb-1 overflow-hidden transition-all duration-300",
                                sidebarOpen && "hover:bg-muted/50"
                            )}
                            onClick={() => handleAccordionClick("lin-servers")}
                        >
                            <div
                                className={cn(
                                    "absolute inset-0 flex items-center justify-center transition-all duration-300",
                                    sidebarOpen
                                        ? "-translate-x-full opacity-0"
                                        : "translate-x-0 opacity-100",
                                )}
                            >
                                <div className={cn(
                                    "transition-all duration-150 active:scale-95",
                                    !sidebarOpen && "w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20"
                                )}>
                                    <TerminalSquare
                                        className={cn(
                                            "h-5 w-5 transition-colors duration-150",
                                            openMenus["lin-servers"]
                                                ? "text-primary"
                                                : "text-muted-foreground/60 hover:text-primary",
                                        )}
                                    />
                                </div>
                            </div>
                            <div
                                className={cn(
                                    "flex items-center justify-between w-full h-full px-3 transition-all duration-300 whitespace-nowrap",
                                    sidebarOpen
                                        ? "translate-x-0 opacity-100"
                                        : "translate-x-full opacity-0",
                                )}
                            >
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                    {t("dashboard.linServers")}
                                </span>
                                {openMenus["lin-servers"] ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                            </div>
                        </div>
                    </SidebarTooltip>

                    <div
                        className={cn(
                            "grid transition-all duration-300 ease-in-out",
                            openMenus["lin-servers"]
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0",
                        )}
                    >
                        <div className="overflow-hidden">
                            <div
                                className={cn(
                                    "flex flex-col gap-1 transition-all duration-300 overflow-hidden",
                                    !sidebarOpen
                                        ? "bg-muted/30 border border-border/40 rounded-xl py-1 shadow-inner"
                                        : "bg-muted/10 border border-border/30 rounded-xl py-1 px-1 mt-1 mb-2 mx-2",
                                )}
                            >
                                <div className="relative w-full h-9 mb-1 shrink-0 overflow-hidden">
                                    <div
                                        className={cn(
                                            "absolute inset-0 flex items-center w-full transition-all duration-300 px-1 pt-1",
                                            sidebarOpen
                                                ? "opacity-100 z-10 translate-x-0"
                                                : "opacity-0 -z-10 -translate-x-4 pointer-events-none",
                                        )}
                                    >
                                        {!tenant?.linuxServers ||
                                            tenant.linuxServers.length === 0 ? (
                                            <div className="w-full h-8 px-2 flex items-center justify-center text-[11px] text-muted-foreground/60 italic border border-dashed rounded-md bg-transparent whitespace-nowrap">
                                                {t("dashboard.noServer")}
                                            </div>
                                        ) : (
                                            <Select disabled>
                                                <SelectTrigger className="w-full h-8 text-xs bg-background">
                                                    <SelectValue
                                                        placeholder={t("dashboard.selectServer")}
                                                    />
                                                </SelectTrigger>
                                            </Select>
                                        )}
                                    </div>
                                    <div
                                        className={cn(
                                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                                            !sidebarOpen
                                                ? "opacity-100 z-10 translate-x-0"
                                                : "opacity-0 -z-10 translate-x-4 pointer-events-none",
                                        )}
                                    >
                                        {!tenant?.linuxServers ||
                                            tenant.linuxServers.length === 0 ? (
                                            <ActionTooltip
                                                label={t("dashboard.noServer")}
                                                side="right"
                                            >
                                                <div className="w-9 h-9 rounded-full border border-dashed flex items-center justify-center cursor-help">
                                                    <TerminalSquare className="w-4 h-4 text-muted-foreground/40" />
                                                </div>
                                            </ActionTooltip>
                                        ) : (
                                            <ActionTooltip
                                                label={t("dashboard.selectServer")}
                                                side="right"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center cursor-help">
                                                    <TerminalSquare className="w-4 h-4" />
                                                </div>
                                            </ActionTooltip>
                                        )}
                                    </div>
                                </div>

                                <SidebarTooltip label={t("dashboard.addLinServer")}>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "flex items-center justify-start p-0 h-10 font-medium transition-all duration-150 rounded-lg group text-warning hover:bg-warning/10 mt-1 active:scale-95 focus:ring-0 focus-visible:ring-0 outline-none antialiased",
                                            sidebarOpen ? "w-full" : "w-10 mx-auto"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "h-full shrink-0 flex items-center justify-center transition-all duration-75",
                                                sidebarOpen ? "w-[56px]" : "w-full"
                                            )}
                                        >
                                            <PlusCircle
                                                className={cn(
                                                    "transition-colors duration-150",
                                                    sidebarOpen ? "h-4 w-4" : "h-5 w-5",
                                                )}
                                            />
                                        </div>
                                        <div
                                            className={cn(
                                                "flex-1 flex items-center overflow-hidden transition-all duration-300 whitespace-nowrap",
                                                sidebarOpen
                                                    ? "opacity-100 pr-3"
                                                    : "opacity-0 w-0 hidden",
                                            )}
                                        >
                                            <span className="truncate text-sm font-medium">
                                                {t("dashboard.addLinServer")}
                                            </span>
                                        </div>
                                    </Button>
                                </SidebarTooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <div className={cn(
                "p-3 border-t bg-muted/5 shrink-0 flex flex-col gap-2 transition-all duration-300",
                !sidebarOpen && "items-center"
            )}>
                <div className={cn(
                    "flex gap-2 w-full transition-all duration-300",
                    sidebarOpen ? "flex-col" : "flex-col items-center"
                )}>
                    {/* Removed Notifications and Settings buttons from bottom */}

                    <SidebarTooltip label={t("dashboard.backToEnvs")}>
                         <Button
                             variant="ghost"
                             className={cn(
                                 "flex items-center justify-start p-0 h-10 font-bold transition-all duration-300 rounded-xl group overflow-hidden bg-destructive/10 text-destructive hover:bg-destructive hover:text-white focus:ring-0 focus-visible:ring-0 outline-none antialiased active:scale-95",
                                 sidebarOpen ? "w-full" : "w-10 mx-auto"
                             )}
                             onClick={onDisconnect}
                         >
                            <div className={cn(
                                "h-full shrink-0 flex items-center justify-center transition-all duration-75",
                                sidebarOpen ? "w-[48px]" : "w-full"
                            )}>
                                <LogOut className="h-5 w-5 transition-colors duration-150" />
                            </div>
                            {sidebarOpen && (
                                <span className="truncate text-xs pr-3">
                                    {t("dashboard.backToEnvs")}
                                </span>
                            )}
                        </Button>
                    </SidebarTooltip>
                </div>
            </div>
        </aside>
    );
}
