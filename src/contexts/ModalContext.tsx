import React, { createContext, useContext, useState } from "react";

interface ModalContextType {
  isAddDatabaseOpen: boolean;
  openAddDatabase: () => void;
  closeAddDatabase: () => void;
  
  isAddWinServerOpen: boolean;
  openAddWinServer: () => void;
  closeAddWinServer: () => void;

  isDbSettingsOpen: boolean;
  openDbSettings: () => void;
  closeDbSettings: () => void;

  isEditWinServerOpen: boolean;
  openEditWinServer: () => void;
  closeEditWinServer: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAddDatabaseOpen, setIsAddDatabaseOpen] = useState(false);
  const [isAddWinServerOpen, setIsAddWinServerOpen] = useState(false);
  const [isDbSettingsOpen, setIsDbSettingsOpen] = useState(false);
  const [isEditWinServerOpen, setIsEditWinServerOpen] = useState(false);

  const openAddDatabase = () => setIsAddDatabaseOpen(true);
  const closeAddDatabase = () => setIsAddDatabaseOpen(false);

  const openAddWinServer = () => setIsAddWinServerOpen(true);
  const closeAddWinServer = () => setIsAddWinServerOpen(false);

  const openDbSettings = () => setIsDbSettingsOpen(true);
  const closeDbSettings = () => setIsDbSettingsOpen(false);

  const openEditWinServer = () => setIsEditWinServerOpen(true);
  const closeEditWinServer = () => setIsEditWinServerOpen(false);

  return (
    <ModalContext.Provider
      value={{
        isAddDatabaseOpen,
        openAddDatabase,
        closeAddDatabase,
        isAddWinServerOpen,
        openAddWinServer,
        closeAddWinServer,
        isDbSettingsOpen,
        openDbSettings,
        closeDbSettings,
        isEditWinServerOpen,
        openEditWinServer,
        closeEditWinServer,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModals = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModals must be used within a ModalProvider");
  }
  return context;
};
