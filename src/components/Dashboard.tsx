import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  Activity,
  HeartPulse,
  Trash2,
  ServerCog,
} from "lucide-react";

import TablesPage from "./pages/TablesPage";
import ViewsPage from "./pages/ViewsPage";
import StoredProceduresPage from "./pages/StoredProceduresPage";
import QueriesPage from "./pages/QueriesPage";
import ActivityMonitorPage from "./pages/ActivityMonitorPage";
import DatabaseMaintenancePage from "./pages/DatabaseMaintenancePage";
import SettingsPage from "./pages/SettingsPage";
import SqlJobsPage from "./pages/SqlJobsPage";
import { Tenant, DatabaseResource } from "@/types";
import { cn } from "@/lib/utils";

import ActionTooltip from "@/components/ActionTooltip";
import { APP_INFO } from "@/lib/constants";

interface DashboardProps {
  activeTenantId: string;
  onDisconnect: () => void;
}

export default function Dashboard({
  activeTenantId,
  onDisconnect,
}: DashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [activeDatabaseId, setActiveDatabaseId] = useState<string | null>(null);
  const [isConnectingDb, setIsConnectingDb] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "db-management": true,
    "win-servers": true,
    "lin-servers": true,
  });

  const [isAddDbModalOpen, setIsAddDbModalOpen] = useState(false);
  const [isDbSettingsModalOpen, setIsDbSettingsModalOpen] = useState(false);
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);
  const [isDeletingDb, setIsDeletingDb] = useState(false);
  const [showDbDeleteConfirm, setShowDbDeleteConfirm] = useState(false);

  const [dbAlias, setDbAlias] = useState("");
  const [dbServer, setDbServer] = useState("");
  const [dbName, setDbName] = useState("");
  const [dbUser, setDbUser] = useState("");
  const [dbPassword, setDbPassword] = useState("");

  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadTenantInfo();
  }, [activeTenantId]);

  const loadTenantInfo = async () => {
    try {
      if ((window as any).electronAPI?.fsReadTenants) {
        const result = await (window as any).electronAPI.fsReadTenants();
        if (result?.success && result.data) {
          const currentTenant = result.data.find(
            (t: Tenant) => t.id === activeTenantId,
          );
          setTenant(currentTenant || null);

          if (currentTenant?.databases && currentTenant.databases.length > 0) {
            const stillExists = currentTenant.databases.some(
              (d: any) => d.id === activeDatabaseId,
            );
            if (!stillExists)
              setActiveDatabaseId(currentTenant.databases[0].id);
          } else {
            setActiveDatabaseId(null);
            setIsDbConnected(false);
          }
        }
      }
    } catch (error) {
      console.error("Ortam bilgisi alınamadı:", error);
    }
  };

  useEffect(() => {
    const connectToActiveDatabase = async () => {
      if (!activeDatabaseId || !tenant) return;
      const db = tenant.databases.find((d) => d.id === activeDatabaseId);
      if (!db) return;

      setIsConnectingDb(true);
      setIsDbConnected(false);

      try {
        await (window as any).electronAPI.dbDisconnect();
        const result = await (window as any).electronAPI.dbConnect({
          server: db.server,
          database: (db as any).databaseName || (db as any).database || "",
          user: db.user,
          password: db.password,
          encrypt: false,
          trustServerCertificate: true,
        });

        if (result.success) {
          setIsDbConnected(true);
        } else {
          console.error("Veritabanı bağlantı hatası:", result.message);
        }
      } catch (error) {
        console.error("Bağlantı sırasında hata:", error);
      } finally {
        setIsConnectingDb(false);
      }
    };

    connectToActiveDatabase();
  }, [activeDatabaseId, tenant]);

  const handleDisconnect = async () => {
    try {
      if ((window as any).electronAPI)
        await (window as any).electronAPI.dbDisconnect();
    } catch (error) {}
    onDisconnect();
    navigate("/");
  };

  const handleAccordionClick = (menuId: string) => {
    setOpenMenus((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const resetForm = () => {
    setDbAlias("");
    setDbServer("");
    setDbName("");
    setDbUser("");
    setDbPassword("");
    setTestResult(null);
  };

  const openAddDbModal = () => {
    resetForm();
    setIsAddDbModalOpen(true);
  };

  const openDbSettingsModal = () => {
    if (!tenant || !activeDatabaseId) return;
    const activeDb = tenant.databases.find((d) => d.id === activeDatabaseId);
    if (!activeDb) return;

    setDbAlias(activeDb.name);
    setDbServer(activeDb.server);
    setDbName((activeDb as any).databaseName || "");
    setDbUser(activeDb.user);
    setDbPassword(activeDb.password || "");
    setTestResult(null);
    setShowDbDeleteConfirm(false);
    setIsDbSettingsModalOpen(true);
  };

  const handleTestConnection = async (): Promise<boolean> => {
    if (!dbServer || !dbName || !dbUser || !dbPassword) {
      setTestResult({ success: false, message: t("dashboard.fillAllFields") });
      return false;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await (window as any).electronAPI.dbConnect({
        server: dbServer,
        database: dbName,
        user: dbUser,
        password: dbPassword,
        encrypt: false,
        trustServerCertificate: true,
        saveConnection: false,
      });

      if (result.success) {
        setTestResult({ success: true, message: t("dashboard.connSuccess") });
        await (window as any).electronAPI.dbDisconnect();
        return true;
      } else {
        setTestResult({
          success: false,
          message: result.message || t("dashboard.connFailed"),
        });
        return false;
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || t("dashboard.unknownError"),
      });
      return false;
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveDatabase = async () => {
    if (!tenant || !dbAlias) return;
    setIsSaving(true);
    const isConnected = await handleTestConnection();
    if (!isConnected) {
      setIsSaving(false);
      return;
    }

    const newDb: DatabaseResource = {
      id: `db-${Date.now()}`,
      name: dbAlias,
      server: dbServer,
      user: dbUser,
      password: dbPassword,
    };
    const updatedTenant: Tenant = {
      ...tenant,
      databases: [
        ...(tenant.databases || []),
        { ...newDb, databaseName: dbName } as any,
      ],
    };

    try {
      const result = await (window as any).electronAPI.fsSaveTenant(
        updatedTenant,
      );
      if (result.success) {
        setIsAddDbModalOpen(false);
        setActiveDatabaseId(newDb.id);
        await loadTenantInfo();
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDatabase = async () => {
    if (!tenant || !activeDatabaseId || !dbAlias) return;
    setIsUpdatingDb(true);

    const isConnected = await handleTestConnection();
    if (!isConnected) {
      setIsUpdatingDb(false);
      return;
    }

    const updatedDatabases = tenant.databases.map((db) => {
      if (db.id === activeDatabaseId)
        return {
          ...db,
          name: dbAlias,
          server: dbServer,
          user: dbUser,
          password: dbPassword,
          databaseName: dbName,
        } as any;
      return db;
    });

    const updatedTenant: Tenant = { ...tenant, databases: updatedDatabases };

    try {
      const result = await (window as any).electronAPI.fsSaveTenant(
        updatedTenant,
      );
      if (result.success) {
        setIsDbSettingsModalOpen(false);
        await (window as any).electronAPI.dbDisconnect();
        setIsDbConnected(false);
        await loadTenantInfo();
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsUpdatingDb(false);
    }
  };

  const handleDeleteDatabase = async () => {
    if (!tenant || !activeDatabaseId) return;
    setIsDeletingDb(true);

    const updatedDatabases = tenant.databases.filter(
      (db) => db.id !== activeDatabaseId,
    );
    const updatedTenant: Tenant = { ...tenant, databases: updatedDatabases };

    try {
      const result = await (window as any).electronAPI.fsSaveTenant(
        updatedTenant,
      );
      if (result.success) {
        setIsDbSettingsModalOpen(false);
        setShowDbDeleteConfirm(false);
        await (window as any).electronAPI.dbDisconnect();
        await loadTenantInfo();
      }
    } catch (error: any) {
      alert(t("dashboard.deleteError"));
    } finally {
      setIsDeletingDb(false);
    }
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
            "w-full flex items-center justify-start p-0 h-9 font-normal transition-colors rounded-lg group overflow-hidden",
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
          onClick={() => navigate(path)}
        >
          <div className="w-[56px] h-full shrink-0 flex items-center justify-center transition-colors">
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
    <div className="flex h-full bg-background relative overflow-hidden">
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
                  "absolute transition-all duration-300 shrink-0 h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary",
                  sidebarOpen ? "right-0" : "left-1/2 -translate-x-1/2",
                )}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </ActionTooltip>
          </div>

          {tenant && (
            <div
              className={cn(
                "relative flex items-center h-10 transition-all duration-300 rounded-xl",
                sidebarOpen
                  ? "bg-muted/40 border shadow-sm px-2"
                  : "bg-transparent border-transparent px-0",
              )}
            >
              <ActionTooltip
                label={
                  !sidebarOpen
                    ? `${t("dashboard.activeEnv")}: ${tenant.name}`
                    : ""
                }
                side="right"
              >
                <div
                  className={cn(
                    "absolute transition-all duration-300 cursor-pointer",
                    sidebarOpen ? "left-2" : "left-1/2 -translate-x-1/2",
                  )}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm ${tenant.color}`}
                  >
                    {tenant.shortName}
                  </div>
                </div>
              </ActionTooltip>
              <div
                className={cn(
                  "absolute left-12 flex flex-col whitespace-nowrap transition-all duration-300",
                  sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
              >
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("dashboard.activeEnv")}
                </span>
                <span className="text-sm font-bold text-foreground truncate max-w-[130px]">
                  {tenant.name}
                </span>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto overflow-x-hidden scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col">
            <MenuItem
              path="/dashboard"
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
                      : "bg-transparent border-transparent py-0",
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
                            onValueChange={(val) => setActiveDatabaseId(val)}
                            disabled={isConnectingDb}
                          >
                            <SelectTrigger className="w-full h-8 text-xs bg-background border-input focus:ring-1 focus:ring-primary shadow-sm font-medium">
                              <SelectValue
                                placeholder={t("dashboard.selectDb")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {tenant.databases.map((db) => (
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
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground shadow-sm bg-background"
                                onClick={openDbSettingsModal}
                              >
                                <Settings className="h-4 w-4" />
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
                        path="/dashboard/queries"
                        icon={TerminalSquare}
                        label={t("dashboard.queryConsole")}
                      />
                      <MenuItem
                        path="/dashboard/tables"
                        icon={Table}
                        label={t("dashboard.tables")}
                      />
                      <MenuItem
                        path="/dashboard/views"
                        icon={Eye}
                        label={t("dashboard.views")}
                      />
                      <MenuItem
                        path="/dashboard/procedures"
                        icon={FileCode}
                        label={t("dashboard.procedures")}
                      />
                      <MenuItem
                        path="/dashboard/jobs"
                        icon={ServerCog}
                        label={t("dashboard.jobs")}
                      />
                      <MenuItem
                        path="/dashboard/activity"
                        icon={Activity}
                        label={t("dashboard.activityMonitor")}
                      />
                      <MenuItem
                        path="/dashboard/maintenance"
                        icon={HeartPulse}
                        label={t("dashboard.maintenance")}
                      />
                    </>
                  )}

                  <SidebarTooltip label={t("dashboard.addDatabase")}>
                    <Button
                      onClick={openAddDbModal}
                      variant="ghost"
                      className="w-full flex items-center justify-start p-0 h-9 font-normal transition-colors duration-300 rounded-lg group text-primary hover:bg-primary/10 mt-1"
                    >
                      <div className="w-[56px] h-full shrink-0 flex items-center justify-center">
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
                      : "bg-transparent border-transparent py-0",
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
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center cursor-help">
                            <Monitor className="w-4 h-4" />
                          </div>
                        </ActionTooltip>
                      )}
                    </div>
                  </div>

                  <SidebarTooltip label={t("dashboard.addWinServer")}>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-start p-0 h-9 font-normal transition-colors duration-300 rounded-lg group text-info hover:bg-info/10 mt-1"
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
                      : "bg-transparent border-transparent py-0",
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
                      className="w-full flex items-center justify-start p-0 h-9 font-normal transition-colors duration-300 rounded-lg group text-warning hover:bg-warning/10 mt-1"
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

        <div className="p-2 border-t bg-muted/10 shrink-0 flex flex-col gap-1 overflow-hidden">
          <MenuItem
            path="/dashboard/settings"
            icon={Settings}
            label={t("dashboard.settings")}
          />
          <SidebarTooltip label={t("dashboard.backToEnvs")}>
            <Button
              variant="ghost"
              className={cn(
                "w-full flex items-center justify-start p-0 h-9 font-normal transition-colors duration-300 rounded-lg group text-destructive hover:text-destructive hover:bg-destructive/10",
              )}
              onClick={handleDisconnect}
            >
              <div className="w-[56px] h-full shrink-0 flex items-center justify-center">
                <LogOut
                  className={cn(
                    "transition-colors duration-300",
                    sidebarOpen ? "h-4 w-4" : "h-5 w-5",
                  )}
                />
              </div>
              <div
                className={cn(
                  "flex-1 flex items-center overflow-hidden transition-all duration-300 whitespace-nowrap",
                  sidebarOpen ? "opacity-100 pr-3" : "opacity-0 w-0 hidden",
                )}
              >
                <span className="truncate text-sm">
                  {t("dashboard.backToEnvs")}
                </span>
              </div>
            </Button>
          </SidebarTooltip>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-hidden bg-muted/10 relative flex flex-col">
        {isConnectingDb ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <h2 className="text-lg font-semibold text-foreground">
              {t("dashboard.connectingDb")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.pleaseWait")}
            </p>
          </div>
        ) : activeDatabaseId && !isDbConnected ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <Database className="h-12 w-12 text-destructive opacity-30 mb-4" />
            <h2 className="text-lg font-semibold text-destructive">
              {t("dashboard.connectionFailed")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.connectionFailedDesc")}
            </p>
          </div>
        ) : null}

        {!isConnectingDb && isDbConnected ? (
          <Routes>
            <Route
              path="/"
              element={
                <div className="p-8">
                  <h1 className="text-2xl font-bold">
                    {t("dashboard.overview")}
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    {t("dashboard.overviewDesc")}
                  </p>
                </div>
              }
            />
            <Route
              path="/activity"
              element={<ActivityMonitorPage key={activeDatabaseId} />}
            />
            <Route
              path="/maintenance"
              element={<DatabaseMaintenancePage key={activeDatabaseId} />}
            />
            <Route
              path="/tables"
              element={<TablesPage key={activeDatabaseId} />}
            />
            <Route
              path="/views"
              element={<ViewsPage key={activeDatabaseId} />}
            />
            <Route
              path="/procedures"
              element={<StoredProceduresPage key={activeDatabaseId} />}
            />
            <Route
              path="/queries"
              element={<QueriesPage key={activeDatabaseId} />}
            />
            <Route
              path="/jobs"
              element={<SqlJobsPage key={activeDatabaseId} />}
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        ) : (
          <div className="flex-1 bg-muted/5"></div>
        )}
      </main>

      <Dialog open={isAddDbModalOpen} onOpenChange={setIsAddDbModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />{" "}
              {t("dashboard.addDbTitle")}
            </DialogTitle>
            <DialogDescription>{t("dashboard.addDbDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t("dashboard.dbAlias")}</Label>
              <Input
                placeholder={t("dashboard.dbAliasPlaceholder")}
                value={dbAlias}
                onChange={(e) => setDbAlias(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("dashboard.serverIp")}</Label>
                <Input
                  placeholder="192.168.1.100"
                  value={dbServer}
                  onChange={(e) => setDbServer(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.dbName")}</Label>
                <Input
                  placeholder="ERP_DB"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("dashboard.username")}</Label>
                <Input
                  placeholder="sa"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.password")}</Label>
                <Input
                  type="password"
                  placeholder="******"
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                />
              </div>
            </div>
            {testResult && (
              <div
                className={`p-3 rounded-md flex items-start gap-2 text-sm ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0" />
                )}
                <p className="leading-tight">{testResult.message}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <Button
              variant="outline"
              onClick={() => setIsAddDbModalOpen(false)}
              disabled={isTesting || isSaving}
            >
              {t("dashboard.cancel")}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handleTestConnection}
                disabled={
                  isTesting ||
                  isSaving ||
                  !dbServer ||
                  !dbName ||
                  !dbUser ||
                  !dbPassword
                }
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}{" "}
                {t("dashboard.testConnection")}
              </Button>
              <Button
                onClick={handleSaveDatabase}
                disabled={isTesting || isSaving || !dbAlias}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  t("dashboard.saveAndConnect")
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDbSettingsModalOpen}
        onOpenChange={setIsDbSettingsModalOpen}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />{" "}
              {t("dashboard.editDbTitle")}
            </DialogTitle>
            <DialogDescription>{t("dashboard.editDbDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t("dashboard.dbAlias")}</Label>
              <Input
                value={dbAlias}
                onChange={(e) => setDbAlias(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("dashboard.serverIp")}</Label>
                <Input
                  value={dbServer}
                  onChange={(e) => setDbServer(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.dbName")}</Label>
                <Input
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("dashboard.username")}</Label>
                <Input
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.password")}</Label>
                <Input
                  type="password"
                  placeholder={t("dashboard.passwordPlaceholder")}
                  value={dbPassword}
                  onChange={(e) => setDbPassword(e.target.value)}
                />
              </div>
            </div>
            {testResult && (
              <div
                className={`p-3 rounded-md flex items-start gap-2 text-sm ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 shrink-0" />
                )}
                <p className="leading-tight">{testResult.message}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="secondary"
                onClick={handleTestConnection}
                disabled={
                  isUpdatingDb ||
                  isTesting ||
                  !dbServer ||
                  !dbName ||
                  !dbUser ||
                  !dbPassword
                }
              >
                {isTesting && !isUpdatingDb ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}{" "}
                {t("dashboard.testConnection")}
              </Button>
              <Button
                onClick={handleUpdateDatabase}
                disabled={
                  isUpdatingDb ||
                  isTesting ||
                  !dbAlias ||
                  !dbServer ||
                  !dbName ||
                  !dbUser ||
                  !dbPassword
                }
              >
                {isUpdatingDb ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}{" "}
                {t("dashboard.update")}
              </Button>
            </div>
          </div>
          <div className="pt-4 mt-2 border-t flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 w-full text-left">
              {t("dashboard.dangerZone")}
            </span>
            {!showDbDeleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-none shadow-none"
                onClick={() => setShowDbDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> {t("dashboard.removeDb")}
              </Button>
            ) : (
              <div className="flex flex-col items-center text-center space-y-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg w-full">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <h4 className="font-bold text-destructive">
                    {t("dashboard.areYouSure")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("dashboard.removeDbWarning")}
                  </p>
                </div>
                <div className="flex w-full gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDbDeleteConfirm(false)}
                    disabled={isDeletingDb}
                  >
                    {t("dashboard.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteDatabase}
                    disabled={isDeletingDb}
                  >
                    {isDeletingDb ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("dashboard.remove")
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
