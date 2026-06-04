import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, ShieldOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AddWinServerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (params: any) => Promise<boolean>;
    onTest: (params: any) => Promise<boolean>;
    testResult: { success: boolean; message: string } | null;
    isTesting: boolean;
    isSaving: boolean;
}

export default function AddWinServerModal({
    isOpen,
    onClose,
    onSave,
    onTest,
    testResult,
    isTesting,
    isSaving,
}: AddWinServerModalProps) {
    const { t } = useTranslation();
    const [winAlias, setWinAlias] = useState("");
    const [winHost, setWinHost] = useState("");
    const [winUser, setWinUser] = useState("");
    const [winPassword, setWinPassword] = useState("");
    const [excludeFromMonitoring, setExcludeFromMonitoring] = useState(false);

    const getParams = () => ({
        alias: winAlias,
        host: winHost,
        username: winUser,
        password: winPassword,
        excludeFromMonitoring,
    });

    const handleSave = async () => {
        const success = await onSave(getParams());
        if (success) {
            setWinAlias("");
            setWinHost("");
            setWinUser("");
            setWinPassword("");
            setExcludeFromMonitoring(false);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-info" /> {t("dashboard.addWinServerTitle")}
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>{t("dashboard.winAlias")}</Label>
                        <Input 
                            placeholder={t("dashboard.winAliasPlaceholder")}
                            value={winAlias} 
                            onChange={(e) => setWinAlias(e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("dashboard.winHost")}</Label>
                        <Input 
                            placeholder={t("dashboard.winHostPlaceholder")}
                            value={winHost} 
                            onChange={(e) => setWinHost(e.target.value)} 
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.winUser")}</Label>
                            <Input 
                                placeholder={t("dashboard.winUserPlaceholder")}
                                value={winUser} 
                                onChange={(e) => setWinUser(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("dashboard.winPassword")}</Label>
                            <Input 
                                type="password" 
                                placeholder={t("dashboard.winPasswordPlaceholder")}
                                value={winPassword} 
                                onChange={(e) => setWinPassword(e.target.value)} 
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
                        <div className={`p-3 rounded-md text-sm ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {testResult.message}
                        </div>
                    )}
                </div>
                <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
                    <Button variant="outline" onClick={onClose}>
                        {t("dashboard.cancel")}
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => onTest(getParams())}
                            disabled={isTesting || !winHost || !winUser || !winPassword}
                        >
                            {isTesting ? t("dashboard.testing") : t("dashboard.testConnection")}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isTesting || isSaving || !winAlias}
                            className="bg-info text-info-foreground hover:bg-info/90"
                        >
                            {isSaving ? t("dashboard.saving") : t("dashboard.save")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
