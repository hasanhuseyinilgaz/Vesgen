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
import { Settings, AlertTriangle, Trash2, Save, ShieldOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tenant } from "@/types";

interface EditWinServerModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenant: Tenant | null;
    activeWinServerId: string | null;
    onUpdate: (serverId: string, params: any) => Promise<boolean>;
    onDelete: (serverId: string) => Promise<boolean>;
    onTest: (params: any) => Promise<boolean>;
    testResult: { success: boolean; message: string } | null;
    isTesting: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

export default function EditWinServerModal({
    isOpen,
    onClose,
    tenant,
    activeWinServerId,
    onUpdate,
    onDelete,
    onTest,
    testResult,
    isTesting,
    isUpdating,
    isDeleting,
}: EditWinServerModalProps) {
    const { t } = useTranslation();
    const [winAlias, setWinAlias] = useState("");
    const [winHost, setWinHost] = useState("");
    const [winUser, setWinUser] = useState("");
    const [winPassword, setWinPassword] = useState("");
    const [excludeFromMonitoring, setExcludeFromMonitoring] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && tenant && activeWinServerId) {
            const server = tenant.windowsServers?.find((s) => s.id === activeWinServerId);
            if (server) {
                setWinAlias(server.alias);
                setWinHost(server.host);
                setWinUser(server.username);
                setWinPassword(server.password || "");
                setExcludeFromMonitoring(server.excludeFromMonitoring || false);
                setShowDeleteConfirm(false);
            }
        }
    }, [isOpen, tenant, activeWinServerId]);

    const getParams = () => ({
        alias: winAlias,
        host: winHost,
        username: winUser,
        password: winPassword,
        excludeFromMonitoring,
    });

    const handleUpdate = async () => {
        if (!activeWinServerId) return;
        const success = await onUpdate(activeWinServerId, getParams());
        if (success) onClose();
    };

    const handleDelete = async () => {
        if (!activeWinServerId) return;
        const success = await onDelete(activeWinServerId);
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
                        <Settings className="w-5 h-5 text-primary" /> {t("dashboard.editWinServerTitle")}
                    </DialogTitle>
                    <DialogDescription>{t("dashboard.editWinServerDesc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>{t("dashboard.winAlias")}</Label>
                        <Input value={winAlias} onChange={(e) => setWinAlias(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("dashboard.winHost")}</Label>
                        <Input value={winHost} onChange={(e) => setWinHost(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.winUser")}</Label>
                            <Input value={winUser} onChange={(e) => setWinUser(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("dashboard.winPassword")}</Label>
                            <Input type="password" placeholder={t("dashboard.passwordPlaceholder")} value={winPassword} onChange={(e) => setWinPassword(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-muted/5">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                <ShieldOff className="w-3.5 h-3.5 text-orange-500" />
                                {t("dashboard.excludeFromMonitoring")}
                            </Label>
                            <p className="text-[10px] text-muted-foreground font-medium">
                                {t("dashboard.excludeFromMonitoringDesc")}
                            </p>
                        </div>
                        <Switch 
                            checked={excludeFromMonitoring}
                            onCheckedChange={setExcludeFromMonitoring}
                        />
                    </div>
                    {testResult && (
                        <div className={`p-3 rounded-md text-sm ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {testResult.message}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 mt-2">
                        <Button
                            variant="secondary"
                            onClick={() => onTest(getParams())}
                            disabled={isUpdating || isTesting || !winHost || !winUser || !winPassword}
                        >
                            {isTesting && !isUpdating ? t("dashboard.testing") : t("dashboard.testConnection")}
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            disabled={isUpdating || isTesting || !winAlias || !winHost || !winUser || !winPassword}
                        >
                            {isUpdating ? t("dashboard.saving") : <><Save className="w-4 h-4 mr-2" /> {t("dashboard.update")}</>}
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
                            <Trash2 className="w-4 h-4 mr-2" /> {t("dashboard.removeWinServer")}
                        </Button>
                    ) : (
                        <div className="flex flex-col items-center text-center space-y-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg w-full">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                            <div>
                                <h4 className="font-bold text-destructive">{t("dashboard.areYouSure")}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{t("dashboard.removeWinServerWarning")}</p>
                            </div>
                            <div className="flex w-full gap-2 mt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                                    {t("dashboard.cancel")}
                                </Button>
                                <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={isDeleting}>
                                    {isDeleting ? t("dashboard.saving") : t("dashboard.remove")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
