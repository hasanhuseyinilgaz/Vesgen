import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, CheckCircle2, XCircle, AlertTriangle, Trash2, Save } from "lucide-react";
import { Tenant } from "@/types";

interface DatabaseSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant | null;
    activeDatabaseId: string | null;
    onUpdate: (dbId: string, params: any) => Promise<boolean>;
    onDelete: (dbId: string) => Promise<boolean>;
    onTest: (params: any) => Promise<boolean>;
    testResult: { success: boolean; message: string } | null;
    isTesting: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

export default function DatabaseSettingsModal({
    isOpen,
    onClose,
    tenant,
    activeDatabaseId,
    onUpdate,
    onDelete,
    onTest,
    testResult,
    isTesting,
    isUpdating,
    isDeleting,
}: DatabaseSettingsModalProps) {
    const { t } = useTranslation();
    const [dbAlias, setDbAlias] = useState("");
    const [dbServer, setDbServer] = useState("");
    const [dbName, setDbName] = useState("");
    const [dbUser, setDbUser] = useState("");
    const [dbPassword, setDbPassword] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && tenant && activeDatabaseId) {
            const activeDb = tenant.databases.find((d) => d.id === activeDatabaseId);
            if (activeDb) {
                setDbAlias(activeDb.name);
                setDbServer(activeDb.server);
                setDbName((activeDb as any).databaseName || "");
                setDbUser(activeDb.user);
                setDbPassword(activeDb.password || "");
                setShowDeleteConfirm(false);
            }
        }
    }, [isOpen, tenant, activeDatabaseId]);

    const getParams = () => ({
        alias: dbAlias,
        server: dbServer,
        databaseName: dbName,
        user: dbUser,
        password: dbPassword,
    });

    const handleUpdate = async () => {
        if (!activeDatabaseId) return;
        const success = await onUpdate(activeDatabaseId, getParams());
        if (success) onClose();
    };

    const handleDelete = async () => {
        if (!activeDatabaseId) return;
        const success = await onDelete(activeDatabaseId);
        if (success) {
            setShowDeleteConfirm(false);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />{" "}
                        {t("dashboard.editDbTitle")}
                    </DialogTitle>
                    <DialogDescription>{t("dashboard.editDbDesc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>{t("dashboard.dbAlias")}</Label>
                        <Input
                            value={dbAlias}
                            onChange={(e) => setDbAlias(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.serverIp")}</Label>
                            <Input
                                value={dbServer}
                                onChange={(e) => setDbServer(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("dashboard.dbName")}</Label>
                            <Input
                                value={dbName}
                                onChange={(e) => setDbName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.username")}</Label>
                            <Input
                                value={dbUser}
                                onChange={(e) => setDbUser(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("dashboard.password")}</Label>
                            <Input
                                type="password"
                                placeholder={t("dashboard.passwordPlaceholder")}
                                value={dbPassword}
                                onChange={(e) => setDbPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    {testResult && (
                        <div
                            className={`p-3 rounded-md flex items-start gap-2 text-sm ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                        >
                            {testResult.success ? (
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                            ) : (
                                <XCircle className="w-5 h-5 shrink-0" />
                            )}
                            <p className="leading-tight">{testResult.message}</p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 mt-2">
                        <Button
                            variant="secondary"
                            onClick={() => onTest(getParams())}
                            disabled={isUpdating || isTesting || !dbServer || !dbName || !dbUser || !dbPassword}
                        >
                            {isTesting && !isUpdating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}{" "}
                            {t("dashboard.testConnection")}
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={isUpdating || isTesting || !dbAlias || !dbServer || !dbName || !dbUser || !dbPassword}
                        >
                            {isUpdating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}{" "}
                            {t("dashboard.update")}
                        </Button>
                    </div>
                </div>
                <div className="pt-4 mt-2 border-t flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 w-full text-left">
                        {t("dashboard.dangerZone")}
                    </span>
                    {!showDeleteConfirm ? (
                        <Button
                            variant="destructive"
                            className="w-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-none shadow-none"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> {t("dashboard.removeDb")}
                        </Button>
                    ) : (
                        <div className="flex flex-col items-center text-center space-y-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg w-full">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                            <div>
                                <h4 className="font-bold text-destructive">
                                    {t("dashboard.areYouSure")}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("dashboard.removeDbWarning")}
                                </p>
                            </div>
                            <div className="flex w-full gap-2 mt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                >
                                    {t("dashboard.cancel")}
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        t("dashboard.remove")
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
