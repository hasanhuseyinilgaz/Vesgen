import { useState, useEffect, useCallback } from "react";
import { Tenant } from "@/types";

const TAILWIND_COLORS = [
  "bg-blue-600",
  "bg-amber-500",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-rose-500",
  "bg-indigo-600",
  "bg-cyan-600",
];

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      if ((window as any).electronAPI?.fsReadTenants) {
        const result = await (window as any).electronAPI.fsReadTenants();
        if (result?.success) {
          setTenants(result.data || []);
        }
      }
    } catch (error) {
      console.error("Ortamlar yüklenemedi:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const createTenant = async (
    name: string,
    description: string,
  ): Promise<boolean> => {
    if (!name.trim()) return false;
    setIsSaving(true);

    const slugId = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const shortName = name.substring(0, 2).toUpperCase();
    const randomColor =
      TAILWIND_COLORS[Math.floor(Math.random() * TAILWIND_COLORS.length)];

    const newTenant: Tenant = {
      id: `${slugId}-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      description: description.trim(),
      shortName,
      color: randomColor,
      databases: [],
      windowsServers: [],
      linuxServers: [],
    };

    try {
      if ((window as any).electronAPI?.fsSaveTenant) {
        const result = await (window as any).electronAPI.fsSaveTenant(
          newTenant,
        );
        if (result.success) {
          await loadTenants();
          return true;
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
    return false;
  };

  const updateTenant = async (
    tenant: Tenant,
    newName: string,
    newDescription: string,
  ): Promise<boolean> => {
    if (!tenant || !newName.trim()) return false;
    setIsUpdating(true);

    const updatedTenant: Tenant = {
      ...tenant,
      name: newName.trim(),
      description: newDescription.trim(),
    };

    try {
      if ((window as any).electronAPI?.fsSaveTenant) {
        const result = await (window as any).electronAPI.fsSaveTenant(
          updatedTenant,
        );
        if (result.success) {
          await loadTenants();
          return true;
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
    return false;
  };

  const deleteTenant = async (id: string): Promise<boolean> => {
    if (!id) return false;
    setIsDeleting(true);

    try {
      if ((window as any).electronAPI?.fsDeleteTenant) {
        const result = await (window as any).electronAPI.fsDeleteTenant(id);
        if (result.success) {
          await loadTenants();
          return true;
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
    return false;
  };

  return {
    tenants,
    isLoading,
    isSaving,
    isUpdating,
    isDeleting,
    loadTenants,
    createTenant,
    updateTenant,
    deleteTenant,
  };
}
