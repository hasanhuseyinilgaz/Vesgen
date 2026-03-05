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

function App() {
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

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
