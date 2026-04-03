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
import { APP_INFO } from "@/lib/constants";

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
    openAddDbModal: () => void;
    openDbSettingsModal: () => void;
    openAddWinServerModal: () => void;
    handleEditWinServer: () => void;
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
    openAddDbModal,
    openDbSettingsModal,
    openAddWinServerModal,
    handleEditWinServer,
}: AppSidebarProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

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
    }: {
        path: string;
        icon: any;
        label: string;
    }) => {
        const isActive = location.pathname === path;
        return (
            <SidebarTooltip label={label}>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full flex items-center justify-start p-0 h-10 font-normal transition-colors rounded-lg group overflow-hidden",
                        isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                    onClick={() => navigate(path)}
                >
                    <div className={cn(
                        "h-full shrink-0 flex items-center justify-center transition-colors",
                        sidebarOpen ? "w-[56px]" : "w-[72px]"
                    )}>
                        <Icon
                            className={cn(
                                "transition-colors duration-300",
                                sidebarOpen ? "h-4 w-4" : "h-5 w-5",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground group-hover:text-foreground",
                            )}
                        />
                    </div>
                    <div
                        className={cn(
                            "flex-1 flex items-center overflow-hidden transition-all duration-300 whitespace-nowrap",
                            sidebarOpen ? "opacity-100 pr-3" : "opacity-0 w-0",
                        )}
                    >
                        <span className="truncate text-sm">{label}</span>
                    </div>
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
                "bg-card border-r transition-all duration-300 ease-in-out flex flex-col shrink-0 z-20 overflow-hidden",
                sidebarOpen ? "w-64" : "w-[72px]",
            )}
        >
            <div className="p-4 border-b flex flex-col gap-4">
                <div className="relative flex items-center justify-between h-8">
                    <div
                        className={cn(
                            "absolute left-0 flex items-center gap-2 transition-all duration-300 whitespace-nowrap",
                            sidebarOpen
                                ? "opacity-100 translate-x-0"
                                : "opacity-0 -translate-x-4 pointer-events-none",
                        )}
                    >
                        <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
                            <Database className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-bold text-lg text-foreground tracking-tight">
                            {APP_INFO.NAME}
                        </span>
                    </div>

                    <ActionTooltip
                        label={sidebarOpen ? "Menüyü Daralt" : "Menüyü Genişlet"}
                        side="right"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={cn(
                                "absolute transition-all duration-300 shrink-0 h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary",
                                sidebarOpen ? "right-0" : "left-1/2 -translate-x-1/2",
                            )}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    </ActionTooltip>
                </div>

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
                "flex-1 py-4 space-y-4 overflow-y-auto overflow-x-hidden scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-all duration-300",
                sidebarOpen ? "px-2" : "px-0"
            )}>
                <div className="flex flex-col">
                    <MenuItem
                        path="/overview"
                        icon={LayoutDashboard}
                        label={t("dashboard.overview")}
                    />
                </div>

                <div className="flex flex-col">
                    <SidebarTooltip label={t("dashboard.dbManagement")}>
                        <div
                            className="relative flex items-center w-full h-9 cursor-pointer hover:bg-muted/50 rounded-lg mb-1 overflow-hidden"
                            onClick={() => handleAccordionClick("db-management")}
                        >
                            <div
                                className={cn(
                                    "absolute left-0 w-[56px] h-full flex items-center justify-center transition-all duration-300",
                                    sidebarOpen
                                        ? "-translate-x-full opacity-0"
                                        : "translate-x-0 opacity-100",
                                )}
                            >
                                <Database
                                    className={cn(
                                        "h-5 w-5 transition-colors",
                                        openMenus["db-management"]
                                            ? "text-primary"
                                            : "text-muted-foreground/60",
                                    )}
                                />
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
                                                            navigate("/dashboard");
                                                        }
                                                    }}
                                                    disabled={isConnectingDb}
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
                                                            onClick={openDbSettingsModal}
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
                                        onClick={openAddDbModal}
                                        variant="ghost"
                                        className="w-full flex items-center justify-start p-0 h-10 font-normal transition-colors duration-300 rounded-lg group text-primary hover:bg-primary/10 mt-1"
                                    >
                                        <div className={cn(
                                            "h-full shrink-0 flex items-center justify-center transition-all duration-300",
                                            sidebarOpen ? "w-[56px]" : "w-[72px]"
                                        )}>
                                            <PlusCircle
                                                className={cn(
                                                    "transition-colors duration-300",
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

                <div className="flex flex-col">
                    <SidebarTooltip label={t("dashboard.winServers")}>
                        <div
                            className="relative flex items-center w-full h-9 cursor-pointer hover:bg-muted/50 rounded-lg mb-1 overflow-hidden"
                            onClick={() => handleAccordionClick("win-servers")}
                        >
                            <div
                                className={cn(
                                    "absolute left-0 w-[56px] h-full flex items-center justify-center transition-all duration-300",
                                    sidebarOpen
                                        ? "-translate-x-full opacity-0"
                                        : "translate-x-0 opacity-100",
                                )}
                            >
                                <Monitor
                                    className={cn(
                                        "h-5 w-5 transition-colors",
                                        openMenus["win-servers"]
                                            ? "text-primary"
                                            : "text-muted-foreground/60",
                                    )}
                                />
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
                                                            onClick={handleEditWinServer}
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
                                    <div className="flex flex-col gap-0.5 mt-1 border-t border-border/20 pt-1 px-1">
                                        <MenuItem path="/win/performance" icon={Activity} label={t("dashboard.performance")} />
                                        <MenuItem path="/win/services" icon={ServerCog} label={t("dashboard.services")} />
                                        <MenuItem path="/win/terminal" icon={TerminalSquare} label={t("dashboard.terminal")} />
                                    </div>
                                )}

                                <SidebarTooltip label={t("dashboard.addWinServer")}>
                                    <Button
                                        onClick={openAddWinServerModal} variant="ghost"
                                        className="w-full flex items-center justify-start p-0 h-10 font-normal transition-colors duration-300 rounded-lg group text-info hover:bg-info/10 mt-1"
                                    >
                                        <div
                                            className={cn(
                                                "w-[56px] h-full shrink-0 flex items-center justify-center transition-colors duration-300",
                                            )}
                                        >
                                            <PlusCircle
                                                className={cn(
                                                    "transition-colors duration-300",
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

                <div className="flex flex-col">
                    <SidebarTooltip label={t("dashboard.linServers")}>
                        <div
                            className="relative flex items-center w-full h-9 cursor-pointer hover:bg-muted/50 rounded-lg mb-1 overflow-hidden"
                            onClick={() => handleAccordionClick("lin-servers")}
                        >
                            <div
                                className={cn(
                                    "absolute left-0 w-[56px] h-full flex items-center justify-center transition-all duration-300",
                                    sidebarOpen
                                        ? "-translate-x-full opacity-0"
                                        : "translate-x-0 opacity-100",
                                )}
                            >
                                <TerminalSquare
                                    className={cn(
                                        "h-5 w-5 transition-colors",
                                        openMenus["lin-servers"]
                                            ? "text-primary"
                                            : "text-muted-foreground/60",
                                    )}
                                />
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
                                        className="w-full flex items-center justify-start p-0 h-10 font-normal transition-colors duration-300 rounded-lg group text-warning hover:bg-warning/10 mt-1"
                                    >
                                        <div
                                            className={cn(
                                                "w-[56px] h-full shrink-0 flex items-center justify-center transition-colors duration-300",
                                            )}
                                        >
                                            <PlusCircle
                                                className={cn(
                                                    "transition-colors duration-300",
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
                "p-3 border-t bg-muted/20 shrink-0 flex flex-col gap-2 transition-all duration-300",
                !sidebarOpen && "items-center"
            )}>
                <div className={cn(
                    "flex gap-2 w-full transition-all duration-300",
                    sidebarOpen ? "flex-row" : "flex-col items-center"
                )}>
                    <SidebarTooltip label={t("dashboard.backToEnvs")}>
                        <Button
                            variant="ghost"
                            className={cn(
                                "flex items-center justify-start p-0 h-10 font-bold transition-all duration-300 rounded-xl group overflow-hidden bg-destructive/10 text-destructive hover:bg-destructive hover:text-white",
                                sidebarOpen ? "flex-1" : "w-10"
                            )}
                            onClick={onDisconnect}
                        >
                            <div className={cn(
                                "h-full shrink-0 flex items-center justify-center transition-all duration-300",
                                sidebarOpen ? "w-[48px]" : "w-full"
                            )}>
                                <LogOut className="h-5 w-5" />
                            </div>
                            {sidebarOpen && (
                                <span className="truncate text-xs pr-3">
                                    {t("dashboard.backToEnvs")}
                                </span>
                            )}
                        </Button>
                    </SidebarTooltip>

                    <SidebarTooltip label={t("dashboard.settings")}>
                        <Button
                            variant="ghost"
                            className={cn(
                                "flex items-center justify-center p-0 h-10 transition-all duration-300 rounded-xl group overflow-hidden bg-primary/10 text-primary hover:bg-primary/20",
                                sidebarOpen ? "w-10" : "w-10"
                            )}
                            onClick={() => navigate("/settings")}
                        >
                            <div className="h-full w-full flex items-center justify-center">
                                <Settings className="h-5 w-5" />
                            </div>
                        </Button>
                    </SidebarTooltip>
                </div>
            </div>
        </aside>
    );
}
