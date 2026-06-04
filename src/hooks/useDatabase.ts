import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Tenant, DatabaseResource } from "@/types";

export function useDatabase(tenant: Tenant | null, loadTenantInfo: () => Promise<void>) {
    const { t } = useTranslation();
    const [activeDatabaseId, setActiveDatabaseId] = useState<string | null>(null);
    const [isConnectingDb, setIsConnectingDb] = useState(false);
    const [isDbConnected, setIsDbConnected] = useState(false);
    
    // Form & Status States
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingDb, setIsUpdatingDb] = useState(false);
    const [isDeletingDb, setIsDeletingDb] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    // Initial Active DB Selection
    useEffect(() => {
        if (tenant?.databases && tenant.databases.length > 0) {
            const stillExists = tenant.databases.some((d: any) => d.id === activeDatabaseId);
            if (!stillExists) setActiveDatabaseId(tenant.databases[0].id);
        } else {
            setActiveDatabaseId(null);
            setIsDbConnected(false);
        }
    }, [tenant, activeDatabaseId]);

    // Connection Effect
    const connectToActiveDatabase = useCallback(async () => {
        if (!activeDatabaseId || !tenant) return;
        const db = tenant.databases.find((d) => d.id === activeDatabaseId);
        if (!db) return;

        setIsConnectingDb(true);
        setIsDbConnected(false);

        try {
            await window.electronAPI.dbDisconnect();
            const result = await window.electronAPI.dbConnect({
                server: db.server,
                database: (db as any).databaseName || (db as any).database || "",
                user: db.user,
                password: db.password || "",
                encrypt: false,
                trustServerCertificate: true,
                saveConnection: true,
            });

            if (result.success) {
                setIsDbConnected(true);
            } else {
                console.error("Veritabanı bağlantı hatası:", result.message);
            }
        } catch (error) {
            console.error("Bağlantı sırasında hata:", error);
        } finally {
            setIsConnectingDb(false);
        }
    }, [activeDatabaseId, tenant]);

    useEffect(() => {
        connectToActiveDatabase();
    }, [connectToActiveDatabase]);

    const handleTestConnection = async (dbParams: { server: string, databaseName: string, user: string, password?: string }): Promise<boolean> => {
        const { server, databaseName, user, password } = dbParams;
        if (!server || !databaseName || !user || !password) {
            setTestResult({ success: false, message: t("dashboard.fillAllFields") });
            return false;
        }
        setIsTesting(true);
        setTestResult(null);
        try {
            const result = await window.electronAPI.dbConnect({
                server,
                database: databaseName,
                user,
                password: password || "",
                encrypt: false,
                trustServerCertificate: true,
                saveConnection: false,
            });

            if (result.success) {
                setTestResult({ success: true, message: t("dashboard.connSuccess") });
                await window.electronAPI.dbDisconnect();
                return true;
            } else {
                setTestResult({
                    success: false,
                    message: result.message || t("dashboard.connFailed"),
                });
                return false;
            }
        } catch (error: any) {
            setTestResult({
                success: false,
                message: error.message || t("dashboard.unknownError"),
            });
            return false;
        } finally {
            setIsTesting(false);
        }
    };

    const handleSaveDatabase = async (dbParams: { 
        alias: string, 
        server: string, 
        user: string, 
        password?: string, 
        databaseName: string,
        excludeFromMonitoring?: boolean 
    }) => {
        if (!tenant || !dbParams.alias) return false;
        setIsSaving(true);

        const newDb: DatabaseResource = {
            id: `db-${Date.now()}`,
            name: dbParams.alias,
            server: dbParams.server,
            user: dbParams.user,
            password: dbParams.password,
        };
        
        const updatedTenant: Tenant = {
            ...tenant,
            databases: [
                ...(tenant.databases || []),
                { 
                    ...newDb, 
                    databaseName: dbParams.databaseName,
                    excludeFromMonitoring: dbParams.excludeFromMonitoring || false 
                } as any,
            ],
        };

        try {
            const result = await window.electronAPI.fsSaveTenant(updatedTenant);
            if (result.success) {
                setActiveDatabaseId(newDb.id);
                await loadTenantInfo();
                return true;
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message });
        } finally {
            setIsSaving(false);
        }
        return false;
    };

    const handleUpdateDatabase = async (dbId: string, dbParams: { 
        alias: string, 
        server: string, 
        user: string, 
        password?: string, 
        databaseName: string,
        excludeFromMonitoring?: boolean 
    }) => {
        if (!tenant || !dbId || !dbParams.alias) return false;
        setIsUpdatingDb(true);

        const updatedDatabases = tenant.databases.map((db) => {
            if (db.id === dbId)
                return {
                    ...db,
                    name: dbParams.alias,
                    server: dbParams.server,
                    user: dbParams.user,
                    password: dbParams.password,
                    databaseName: dbParams.databaseName,
                    excludeFromMonitoring: dbParams.excludeFromMonitoring || false,
                } as any;
            return db;
        });

        const updatedTenant: Tenant = { ...tenant, databases: updatedDatabases };

        try {
            const result = await window.electronAPI.fsSaveTenant(updatedTenant);
            if (result.success) {
                const updatedConfig = updatedDatabases.find(d => d.id === dbId);
                if (updatedConfig) {
                    await window.electronAPI.monitoringUpdateConfig(dbId, updatedConfig);
                }
                await window.electronAPI.dbDisconnect();
                setIsDbConnected(false);
                await loadTenantInfo();
                return true;
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message });
        } finally {
            setIsUpdatingDb(false);
        }
        return false;
    };

    const handleDeleteDatabase = async (dbId: string) => {
        if (!tenant || !dbId) return false;
        setIsDeletingDb(true);

        const updatedDatabases = tenant.databases.filter((db) => db.id !== dbId);
        const updatedTenant: Tenant = { ...tenant, databases: updatedDatabases };

        try {
            const result = await window.electronAPI.fsSaveTenant(updatedTenant);
            if (result.success) {
                await window.electronAPI.dbDisconnect();
                await loadTenantInfo();
                return true;
            }
        } catch (error: any) {
            console.error(error);
        } finally {
            setIsDeletingDb(false);
        }
        return false;
    };

    return {
        activeDatabaseId,
        setActiveDatabaseId,
        isConnectingDb,
        isDbConnected,
        isTesting,
        isSaving,
        isUpdatingDb,
        isDeletingDb,
        testResult,
        setTestResult,
        handleTestConnection,
        handleSaveDatabase,
        handleUpdateDatabase,
        handleDeleteDatabase,
        connectToActiveDatabase,
        refreshConnection: connectToActiveDatabase,
    };
}
