import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AppSidebar from "./AppSidebar";
import { useDatabase } from "@/hooks/useDatabase";
import { useWinServer } from "@/hooks/useWinServer";
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

interface AppLayoutProps {
  activeTenantId: string;
  onDisconnect: () => void;
}

export default function AppLayout({ activeTenantId, onDisconnect }: AppLayoutProps) {
  const { t } = useTranslation();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Modal States
  const [isAddDbModalOpen, setIsAddDbModalOpen] = useState(false);
  const [isDbSettingsModalOpen, setIsDbSettingsModalOpen] = useState(false);
  const [isAddWinServerModalOpen, setIsAddWinServerModalOpen] = useState(false);
  const [isEditWinServerModalOpen, setIsEditWinServerModalOpen] = useState(false);

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

  // Hooks
  const dbConfig = useDatabase(tenant, loadTenantInfo);
  const winConfig = useWinServer(tenant, loadTenantInfo);

  const activeWinServer = tenant?.windowsServers?.find(s => s.id === winConfig.activeWinServerId);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
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
        openAddDbModal={() => setIsAddDbModalOpen(true)}
        openDbSettingsModal={() => setIsDbSettingsModalOpen(true)}
        openAddWinServerModal={() => setIsAddWinServerModalOpen(true)}
        handleEditWinServer={() => setIsEditWinServerModalOpen(true)}
      />

      <main className="flex-1 min-w-0 relative flex flex-col h-full overflow-hidden">
        <Routes>
          {/* Overview Routes */}
          <Route path="/" element={<OverviewPage tenant={tenant} />} />
          <Route path="/overview" element={<OverviewPage tenant={tenant} />} />

          {/* Windows Server Routes */}
          <Route path="/win/performance" element={activeWinServer ? <WinPerformancePage server={activeWinServer} /> : <Navigate to="/" replace />} />
          <Route path="/win/services" element={activeWinServer ? <WinServicesPage server={activeWinServer} /> : <Navigate to="/" replace />} />
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

          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>

      {/* Modals */}
      <AddDatabaseModal
        isOpen={isAddDbModalOpen}
        onClose={() => setIsAddDbModalOpen(false)}
        onSave={dbConfig.handleSaveDatabase}
        isSaving={dbConfig.isSaving}
        isTesting={dbConfig.isTesting}
        testResult={dbConfig.testResult}
        onTest={dbConfig.handleTestConnection}
      />

      <DatabaseSettingsModal
        isOpen={isDbSettingsModalOpen}
        onClose={() => setIsDbSettingsModalOpen(false)}
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
        isOpen={isAddWinServerModalOpen}
        onClose={() => setIsAddWinServerModalOpen(false)}
        onSave={winConfig.handleSaveWinServer}
        isSaving={winConfig.isSaving}
        isTesting={winConfig.isTesting}
        testResult={winConfig.testResult}
        onTest={winConfig.handleTestWinConnection}
      />

      <EditWinServerModal
        isOpen={isEditWinServerModalOpen}
        onClose={() => setIsEditWinServerModalOpen(false)}
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
