import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import AppSidebar from "./AppSidebar";
import { useDatabase } from "@/hooks/useDatabase";
import { useWinServer } from "@/hooks/useWinServer";
import { useModals } from "@/contexts/ModalContext";
import { DatabaseProvider } from "@/contexts/DatabaseContext";
import { Tenant } from "@/types";

// Modals
import AddDatabaseModal from "@/components/modals/AddDatabaseModal";
import DatabaseSettingsModal from "@/components/modals/DatabaseSettingsModal";
import AddWinServerModal from "@/components/modals/AddWinServerModal";
import EditWinServerModal from "@/components/modals/EditWinServerModal";

// Pages
import OverviewPage from "@/components/pages/OverviewPage";
import WinPerformancePage from "@/components/pages/WinPerformancePage";
import WinServicesPage from "@/components/pages/WinServicesPage";
import WinTerminalPage from "@/components/pages/WinTerminalPage";
import TablesPage from "@/components/pages/TablesPage";
import ViewsPage from "@/components/pages/ViewsPage";
import QueriesPage from "@/components/pages/QueriesPage";
import StoredProceduresPage from "@/components/pages/StoredProceduresPage";
import SqlJobsPage from "@/components/pages/SqlJobsPage";
import ActivityMonitorPage from "@/components/pages/ActivityMonitorPage";
import DatabaseMaintenancePage from "@/components/pages/DatabaseMaintenancePage";
import SettingsPage from "@/components/pages/SettingsPage";
import NotificationsPage from "@/components/pages/NotificationsPage";

interface AppLayoutProps {
  activeTenantId: string;
  onDisconnect: () => void;
}

export default function AppLayout({ activeTenantId, onDisconnect }: AppLayoutProps) {

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const modals = useModals();

  const loadTenantInfo = useCallback(async () => {
    try {
      const res = await (window as any).electronAPI.fsReadTenants();
      if (res.success) {
        const currentTenant = res.data.find((t: Tenant) => t.id === activeTenantId);
        setTenant(currentTenant || null);
      }
    } catch (error) {
      console.error("Tenant info load error:", error);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadTenantInfo();
  }, [loadTenantInfo]);

  const dbConfig = useDatabase(tenant, loadTenantInfo);
  const winConfig = useWinServer(tenant, loadTenantInfo);

  const activeWinServer = tenant?.windowsServers?.find(s => s.id === winConfig.activeWinServerId);

  const location = useLocation();
  useEffect(() => {
    if ((window as any).electronAPI?.appPageChanged) {
      (window as any).electronAPI.appPageChanged(location.pathname);
    }

    if (location.pathname.startsWith("/database") && !dbConfig.isDbConnected && !dbConfig.isConnectingDb) {
      console.log("Database page detected while disconnected, attempting auto-reconnect...");
      dbConfig.connectToActiveDatabase();
    }
  }, [location.pathname, dbConfig.isDbConnected, dbConfig.isConnectingDb, dbConfig.connectToActiveDatabase]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <DatabaseProvider value={{
        isDbConnected: dbConfig.isDbConnected,
        isConnectingDb: dbConfig.isConnectingDb,
        activeDatabaseId: dbConfig.activeDatabaseId,
        refreshConnection: dbConfig.refreshConnection
      }}>
        <AppSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          tenant={tenant}
          activeDatabaseId={dbConfig.activeDatabaseId}
          setActiveDatabaseId={dbConfig.setActiveDatabaseId}
          isConnectingDb={dbConfig.isConnectingDb}
          activeWinServerId={winConfig.activeWinServerId}
          setActiveWinServerId={winConfig.setActiveWinServerId}
          onDisconnect={onDisconnect}
        />

        <main className="flex-1 min-w-0 relative flex flex-col h-full overflow-hidden">
          <Routes>
            {/* Overview Routes */}
            <Route path="/" element={<OverviewPage tenant={tenant} />} />
            <Route path="/overview" element={<OverviewPage tenant={tenant} />} />

            {/* Windows Server Routes */}
            <Route path="/win/performance" element={activeWinServer ? <WinPerformancePage server={activeWinServer} /> : <Navigate to="/" replace />} />
            <Route path="/win/services" element={activeWinServer ? <WinServicesPage server={activeWinServer} tenantId={tenant?.id || ""} /> : <Navigate to="/" replace />} />
            <Route path="/win/terminal" element={activeWinServer ? <WinTerminalPage server={activeWinServer} /> : <Navigate to="/" replace />} />

            {/* Database Routes */}
            <Route path="/database/tables" element={<TablesPage />} />
            <Route path="/database/views" element={<ViewsPage />} />
            <Route path="/database/queries" element={<QueriesPage />} />
            <Route path="/database/procedures" element={<StoredProceduresPage />} />
            <Route path="/database/jobs" element={<SqlJobsPage />} />
            <Route path="/database/activity" element={<ActivityMonitorPage />} />
            <Route path="/database/maintenance" element={<DatabaseMaintenancePage />} />

            {/* Global Routes */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
      </DatabaseProvider>

      {/* Modals */}
      <AddDatabaseModal
        isOpen={modals.isAddDatabaseOpen}
        onClose={modals.closeAddDatabase}
        onSave={dbConfig.handleSaveDatabase}
        isSaving={dbConfig.isSaving}
        isTesting={dbConfig.isTesting}
        testResult={dbConfig.testResult}
        onTest={dbConfig.handleTestConnection}
      />

      <DatabaseSettingsModal
        isOpen={modals.isDbSettingsOpen}
        onClose={modals.closeDbSettings}
        tenant={tenant}
        activeDatabaseId={dbConfig.activeDatabaseId}
        onUpdate={dbConfig.handleUpdateDatabase}
        onDelete={dbConfig.handleDeleteDatabase}
        isUpdating={dbConfig.isUpdatingDb}
        isDeleting={dbConfig.isDeletingDb}
        isTesting={dbConfig.isTesting}
        testResult={dbConfig.testResult}
        onTest={dbConfig.handleTestConnection}
      />

      <AddWinServerModal
        isOpen={modals.isAddWinServerOpen}
        onClose={modals.closeAddWinServer}
        onSave={winConfig.handleSaveWinServer}
        isSaving={winConfig.isSaving}
        isTesting={winConfig.isTesting}
        testResult={winConfig.testResult}
        onTest={winConfig.handleTestWinConnection}
      />

      <EditWinServerModal
        isOpen={modals.isEditWinServerOpen}
        onClose={modals.closeEditWinServer}
        tenant={tenant}
        activeWinServerId={winConfig.activeWinServerId}
        onUpdate={winConfig.handleUpdateWinServer}
        onDelete={winConfig.handleDeleteWinServer}
        isUpdating={winConfig.isUpdatingWinServer}
        isDeleting={winConfig.isDeletingWinServer}
        isTesting={winConfig.isTesting}
        testResult={winConfig.testResult}
        onTest={winConfig.handleTestWinConnection}
      />
    </div>
  );
}
