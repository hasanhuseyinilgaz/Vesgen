import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tenant } from "@/types";

export function useWinServer(tenant: Tenant | null, loadTenantInfo: () => Promise<void>) {
    const { t } = useTranslation();
    const [activeWinServerId, setActiveWinServerId] = useState<string | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingWinServer, setIsUpdatingWinServer] = useState(false);
    const [isDeletingWinServer, setIsDeletingWinServer] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    // Initial Active Win Server Selection
    useEffect(() => {
        if (tenant?.windowsServers && tenant.windowsServers.length > 0) {
            const stillExists = tenant.windowsServers.some((s: any) => s.id === activeWinServerId);
            if (!stillExists) setActiveWinServerId(tenant.windowsServers[0].id);
        } else {
            setActiveWinServerId(null);
        }
    }, [tenant, activeWinServerId]);

    const handleTestWinConnection = async (winParams: { alias: string, host: string, username: string, password?: string }): Promise<boolean> => {
        const { host, username, password } = winParams;
        if (!host || !username || !password) {
            setTestResult({ success: false, message: t("dashboard.fillAllFields") });
            return false;
        }
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await window.electronAPI.winTestConnection({
                id: "",
                alias: winParams.alias || "",
                host,
                username,
                password: password || "",
            });
            if (result.success) {
                setTestResult({
                    success: true,
                    message: `${t("dashboard.connSuccess")} ${result.data.Caption}`,
                });
                return true;
            } else {
                setTestResult({
                    success: false,
                    message: result.message || t("dashboard.connFailed"),
                });
                return false;
            }
        } catch (err: any) {
            setTestResult({ success: false, message: err.message });
            return false;
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveWinServer = async (winParams: { alias: string, host: string, username: string, password?: string }) => {
        if (!tenant || !winParams.alias) return false;
        setIsSaving(true);
        const isConnected = await handleTestWinConnection(winParams);
        if (!isConnected) {
            setIsSaving(false);
            return false;
        }
        const newServer = {
            id: `win-${Date.now()}`,
            alias: winParams.alias,
            host: winParams.host,
            username: winParams.username,
            password: winParams.password,
        };
        const updatedTenant = {
            ...tenant,
            windowsServers: [...(tenant.windowsServers || []), newServer],
        };
        try {
            const res = await window.electronAPI.fsSaveTenant(updatedTenant);
            if (res.success) {
                setActiveWinServerId(newServer.id);
                await loadTenantInfo();
                return true;
            } else {
                setTestResult({ success: false, message: res.message || "" });
            }
        } catch (e: any) {
            setTestResult({ success: false, message: e.message });
        } finally {
            setIsSaving(false);
        }
        return false;
    };

    const handleUpdateWinServer = async (serverId: string, winParams: { alias: string, host: string, username: string, password?: string }) => {
        if (!tenant || !serverId) return false;
        setIsUpdatingWinServer(true);
        try {
            const updatedServers = tenant.windowsServers.map((s) =>
                s.id === serverId
                    ? {
                        ...s,
                        alias: winParams.alias,
                        host: winParams.host,
                        username: winParams.username,
                        password: winParams.password,
                    }
                    : s,
            );
            const updatedTenant = { ...tenant, windowsServers: updatedServers };
            const res = await window.electronAPI.fsSaveTenant(updatedTenant);
            if (res.success) {
                await loadTenantInfo();
                return true;
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsUpdatingWinServer(false);
        }
        return false;
    };

    const handleDeleteWinServer = async (serverId: string) => {
        if (!tenant || !serverId) return false;
        setIsDeletingWinServer(true);
        try {
            const updatedServers = tenant.windowsServers.filter(
                (s) => s.id !== serverId,
            );
            const updatedTenant = { ...tenant, windowsServers: updatedServers };
            const res = await window.electronAPI.fsSaveTenant(updatedTenant);
            if (res.success) {
                await loadTenantInfo();
                return true;
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeletingWinServer(false);
        }
        return false;
    };

    return {
        activeWinServerId,
        setActiveWinServerId,
        isTesting,
        isSaving,
        isUpdatingWinServer,
        isDeletingWinServer,
        testResult,
        setTestResult,
        handleTestWinConnection,
        handleSaveWinServer,
        handleUpdateWinServer,
        handleDeleteWinServer,
    };
}
