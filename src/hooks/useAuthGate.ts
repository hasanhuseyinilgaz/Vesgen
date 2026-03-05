import { useState } from "react";

export function useAuthGate() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [modalContext, setModalContext] = useState({
    title: "",
    description: "",
  });

  const executeWithAuth = async (
    configKey: string,
    action: () => void,
    modalInfo: { title: string; description: string },
  ) => {
    try {
      const res = await (window as any).electronAPI.configGet();
      const requiresAuth = res?.data?.security?.requirePasswordFor?.[configKey];

      if (requiresAuth) {
        setPendingAction(() => action);
        setModalContext(modalInfo);
        setIsPasswordModalOpen(true);
      } else {
        action();
      }
    } catch (error) {
      console.error("Config okunamadı, güvenlik gereği şifre sorulacak.");
      setPendingAction(() => action);
      setModalContext(modalInfo);
      setIsPasswordModalOpen(true);
    }
  };

  const handlePasswordSuccess = () => {
    setIsPasswordModalOpen(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  return {
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    modalContext,
    executeWithAuth,
    handlePasswordSuccess,
  };
}
