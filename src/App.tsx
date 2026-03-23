import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState } from "react";

import TenantsPage from "./components/pages/TenantsPage";
import Dashboard from "./components/Dashboard";
import { ThemeProvider } from "./components/ThemeProvider";
import Titlebar from "./components/Titlebar";
import { APP_INFO } from "./lib/constants";
import { useEffect } from "react";
import { Toaster } from "sonner";

function App() {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  useEffect(() => {
    const updateCSSVariables = async () => {
      try {
        if (!(window as any).electronAPI?.configGet) {
          console.warn("Electron API not yet available");
          return;
        }
        const config = await (window as any).electronAPI.configGet();
        const vibrancy = config?.data?.visuals?.vibrancy ?? 1.0;
        const glassOpacity = config?.data?.visuals?.glassOpacity ?? 0.05;

        // Sadece Ayarlar sayfasında değilsek senkronize et (SettingsPage zaten canlı güncelliyor)
        if (!window.location.hash.includes("/settings")) {
          document.documentElement.style.setProperty("--vibrancy", vibrancy.toString());
          document.documentElement.style.setProperty("--glass-opacity", glassOpacity.toString());
        }
      } catch (error) {
        console.error("CSS variables could not be loaded:", error);
      }
    };

    updateCSSVariables();
    const interval = setInterval(updateCSSVariables, 5000); // 5 saniye yaptık
    return () => clearInterval(interval);
  }, []);

  const handleTenantSelect = (tenantId: string) => {
    setActiveTenantId(tenantId);
  };

  const handleDisconnect = () => {
    setActiveTenantId(null);
  };

  return (
    <ThemeProvider
      defaultTheme="dark"
      storageKey={`${APP_INFO.NAME.toLowerCase()}-ui-theme`}
    >
      <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
        <Toaster
          position="bottom-right"
          richColors
          closeButton={false}
          swipeDirections={["right"]}
          toastOptions={{ duration: 3500 }}
        />
        <Titlebar />
        <div className="flex-1 relative overflow-hidden">
          <Router>
            <Routes>
              <Route
                path="/"
                element={
                  !activeTenantId ? (
                    <TenantsPage onSelectTenant={handleTenantSelect} />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="/dashboard/*"
                element={
                  activeTenantId ? (
                    <Dashboard
                      activeTenantId={activeTenantId}
                      onDisconnect={handleDisconnect}
                    />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route path="/login" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
