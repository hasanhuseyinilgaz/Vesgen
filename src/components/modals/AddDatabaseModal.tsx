import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Loader2, CheckCircle2, XCircle, ShieldOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AddDatabaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (params: any) => Promise<boolean>;
    onTest: (params: any) => Promise<boolean>;
    testResult: { success: boolean; message: string } | null;
    isTesting: boolean;
    isSaving: boolean;
}

export default function AddDatabaseModal({
    isOpen,
    onClose,
    onSave,
    onTest,
    testResult,
    isTesting,
    isSaving,
}: AddDatabaseModalProps) {
    const { t } = useTranslation();
    const [dbAlias, setDbAlias] = useState("");
    const [dbServer, setDbServer] = useState("");
    const [dbName, setDbName] = useState("");
    const [dbUser, setDbUser] = useState("");
    const [dbPassword, setDbPassword] = useState("");
    const [excludeFromMonitoring, setExcludeFromMonitoring] = useState(false);

    const getParams = () => ({
        alias: dbAlias,
        server: dbServer,
        databaseName: dbName,
        user: dbUser,
        password: dbPassword,
        excludeFromMonitoring,
    });

    const handleSave = async () => {
        const success = await onSave(getParams());
        if (success) {
            setDbAlias("");
            setDbServer("");
            setDbName("");
            setDbUser("");
            setDbPassword("");
            setExcludeFromMonitoring(false);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-primary" />{" "}
                        {t("dashboard.addDbTitle")}
                    </DialogTitle>
                    <DialogDescription>{t("dashboard.addDbDesc")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>{t("dashboard.dbAlias")}</Label>
                        <Input
                            placeholder={t("dashboard.dbAliasPlaceholder")}
                            value={dbAlias}
                            onChange={(e) => setDbAlias(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.serverIp")}</Label>
                            <Input
                                placeholder="192.168.1.100"
                                value={dbServer}
                                onChange={(e) => setDbServer(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("dashboard.dbName")}</Label>
                            <Input
                                placeholder="ERP_DB"
                                value={dbName}
                                onChange={(e) => setDbName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.username")}</Label>
                            <Input
                                placeholder="sa"
                                value={dbUser}
                                onChange={(e) => setDbUser(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("dashboard.password")}</Label>
                            <Input
                                type="password"
                                placeholder="******"
                                value={dbPassword}
                                onChange={(e) => setDbPassword(e.target.value)}
                            />
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
                </div>
                <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isTesting || isSaving}
                    >
                        {t("dashboard.cancel")}
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => onTest(getParams())}
                            disabled={
                                isTesting ||
                                isSaving ||
                                !dbServer ||
                                !dbName ||
                                !dbUser ||
                                !dbPassword
                            }
                        >
                            {isTesting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}{" "}
                            {t("dashboard.testConnection")}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isTesting || isSaving || !dbAlias}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                t("dashboard.saveAndConnect")
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
