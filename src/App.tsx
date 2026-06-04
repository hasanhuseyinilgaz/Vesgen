import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState } from "react";

import TenantsPage from "./components/pages/TenantsPage";
import AppLayout from "./components/layout/AppLayout";
import { ThemeProvider } from "./components/ThemeProvider";
import TitleBar from "./components/layout/TitleBar";
import { APP_INFO } from "./lib/constants";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { ModalProvider } from "./contexts/ModalContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { HealthProvider } from "./contexts/HealthContext";
import { useTranslation } from "react-i18next";

function App() {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if ((window as any).electronAPI?.appSetTrayLanguage) {
      (window as any).electronAPI.appSetTrayLanguage({
        show: t("tray.show", "Vesgen'i Göster"),
        quit: t("tray.quit", "Çıkış Yap (Tamamen Kapat)")
      });
    }
  }, [i18n.language, t]);

  useEffect(() => {
    const updateCSSVariables = async () => {
      try {
        if (!window.electronAPI) {
          console.warn("Electron API not yet available");
          return;
        }
        const config = await window.electronAPI.configGet();
        const vibrancy = config?.data?.visuals?.vibrancy ?? 1.0;
        const glassOpacity = config?.data?.visuals?.glassOpacity ?? 0.05;

        // Sadece Ayarlar sayfasında değilsek senkronize et (SettingsPage zaten canlı güncelliyor)
        if (!window.location.pathname.includes("/settings")) {
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
      <ModalProvider>
        <NotificationProvider>
          <HealthProvider>
            <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
              <TitleBar />
              <div className="flex-1 relative overflow-hidden">
                <Router>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        !activeTenantId ? (
                          <TenantsPage onSelectTenant={handleTenantSelect} />
                        ) : (
                          <Navigate to="/overview" replace />
                        )
                      }
                    />
                    <Route
                      path="/*"
                      element={
                        activeTenantId ? (
                          <AppLayout
                            activeTenantId={activeTenantId}
                            onDisconnect={handleDisconnect}
                          />
                        ) : (
                          <Navigate to="/" replace />
                        )
                      }
                    />
                  </Routes>
                </Router>
                <Toaster
                  position="bottom-right"
                  richColors
                  closeButton={false}
                  swipeDirections={["right"]}
                  toastOptions={{ duration: 3500 }}
                />
              </div>
            </div>
          </HealthProvider>
        </NotificationProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}

export default App;
