import React, { createContext, useContext, ReactNode } from "react";

interface DatabaseContextType {
  isDbConnected: boolean;
  isConnectingDb: boolean;
  activeDatabaseId: string | null;
  refreshConnection: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ 
  children, 
  value 
}: { 
  children: ReactNode; 
  value: DatabaseContextType 
}) {
  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabaseContext() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error("useDatabaseContext must be used within a DatabaseProvider");
  }
  return context;
}
