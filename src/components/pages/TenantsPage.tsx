import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Database,
  Plus,
  ChevronRight,
  Monitor,
  TerminalSquare,
  Loader2,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Save,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tenant } from "@/types";

import { useTenants } from "@/hooks/useTenants";
import ThemeSwitcher from "@/components/ThemeSwitcher";

import ActionTooltip from "@/components/ActionTooltip";

interface TenantsPageProps {
  onSelectTenant: (tenantId: string) => void;
}

export default function TenantsPage({ onSelectTenant }: TenantsPageProps) {
  const { t, i18n } = useTranslation();
  const {
    tenants,
    isLoading,
    isSaving,
    isUpdating,
    isDeleting,
    createTenant,
    updateTenant,
    deleteTenant,
  } = useTenants();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantDescription, setTenantDescription] = useState("");

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedTenantForSettings, setSelectedTenantForSettings] =
    useState<Tenant | null>(null);

  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantDescription, setEditTenantDescription] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveTenant = async () => {
    const success = await createTenant(tenantName, tenantDescription);
    if (success) {
      setTenantName("");
      setTenantDescription("");
      setIsAddModalOpen(false);
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenantForSettings) return;
    const success = await updateTenant(
      selectedTenantForSettings,
      editTenantName,
      editTenantDescription,
    );
    if (success) {
      setIsSettingsModalOpen(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenantForSettings) return;
    const success = await deleteTenant(selectedTenantForSettings.id);
    if (success) {
      setIsSettingsModalOpen(false);
      setShowDeleteConfirm(false);
      setSelectedTenantForSettings(null);
    } else {
      alert(t("tenants.deleteError"));
    }
  };

  const openSettings = (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    setSelectedTenantForSettings(tenant);
    setEditTenantName(tenant.name);
    setEditTenantDescription(tenant.description || "");
    setShowDeleteConfirm(false);
    setIsSettingsModalOpen(true);
  };

  const handleLanguageChange = (newLang: string) => {
    i18n.changeLanguage(newLang);
    localStorage.setItem("appLanguage", newLang);
  };

  return (
    <div className="min-h-screen bg-muted/10 p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl flex flex-col gap-8 mt-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />{" "}
              {t("tenants.title")}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("tenants.description")}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Select value={i18n.language} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-[130px] h-10 bg-background border-border/50">
                <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>

            <ThemeSwitcher />

            <Button
              className="shadow-sm gap-2 h-10"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="w-4 h-4" /> {t("tenants.newTenant")}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-32 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-32 border-2 border-dashed rounded-xl bg-background text-muted-foreground flex flex-col items-center justify-center gap-4">
            <Building2 className="w-12 h-12 opacity-20" />
            <p>
              {t("tenants.noTenantYet")}
              <br />
              {t("tenants.clickToCreate")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {tenants.map((tenant) => (
              <Card
                key={tenant.id}
                onClick={() => onSelectTenant(tenant.id)}
                className="group flex flex-col p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200 bg-background h-full relative"
              >
                <ActionTooltip label={t("tenants.settings")} side="left">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => openSettings(e, tenant)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </ActionTooltip>

                <div className="flex items-start gap-4 pr-6">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 ${tenant.color}`}
                  >
                    {tenant.shortName}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {tenant.name}
                    </h2>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                      {tenant.description || t("tenants.noDescription")}
                    </p>
                  </div>
                </div>

                <div className="mt-auto pt-6 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <ActionTooltip label={t("tenants.dbCount")} side="top">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded bg-blue-500/10 text-blue-700 border border-blue-500/20 cursor-help">
                        <Database className="w-3.5 h-3.5" />
                        {tenant.databases?.length || 0} DB
                      </div>
                    </ActionTooltip>

                    <ActionTooltip label={t("tenants.winCount")} side="top">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded bg-cyan-500/10 text-cyan-700 border border-cyan-500/20 cursor-help">
                        <Monitor className="w-3.5 h-3.5" />
                        {tenant.windowsServers?.length || 0} Win
                      </div>
                    </ActionTooltip>

                    <ActionTooltip label={t("tenants.linCount")} side="top">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded bg-orange-500/10 text-orange-700 border border-orange-500/20 cursor-help">
                        <TerminalSquare className="w-3.5 h-3.5" />
                        {tenant.linuxServers?.length || 0} Lin
                      </div>
                    </ActionTooltip>
                  </div>

                  <div className="shrink-0 flex items-center text-muted-foreground group-hover:text-primary transition-colors ml-auto">
                    <div className="p-1.5 rounded-full bg-muted/50 group-hover:bg-primary/10">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("tenants.createModalTitle")}</DialogTitle>
            <DialogDescription>
              {t("tenants.createModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label>
                {t("tenants.tenantNameLabel")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={t("tenants.tenantNamePlaceholder")}
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("tenants.descriptionLabel")}</Label>
              <Textarea
                placeholder={t("tenants.descriptionPlaceholder")}
                value={tenantDescription}
                onChange={(e: any) => setTenantDescription(e.target.value)}
                className="resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSaving}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveTenant}
              disabled={!tenantName.trim() || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("common.create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded flex items-center justify-center text-[10px] text-white font-bold ${selectedTenantForSettings?.color}`}
              >
                {selectedTenantForSettings?.shortName}
              </div>
              {t("tenants.settingsModalTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("tenants.settingsModalDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>{t("tenants.tenantNameLabel")}</Label>
              <Input
                value={editTenantName}
                onChange={(e) => setEditTenantName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("tenants.descriptionLabel")}</Label>
              <Textarea
                value={editTenantDescription}
                onChange={(e: any) => setEditTenantDescription(e.target.value)}
                className="resize-none h-20"
              />
            </div>

            <Button
              className="w-full mt-2"
              onClick={handleUpdateTenant}
              disabled={isUpdating || !editTenantName.trim()}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t("common.saveChanges")}
            </Button>
          </div>

          <div className="pt-4 mt-2 border-t flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 w-full text-left">
              {t("tenants.dangerZone")}
            </span>

            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-none shadow-none"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> {t("tenants.deleteTenant")}
              </Button>
            ) : (
              <div className="flex flex-col items-center text-center space-y-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg w-full">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                <div>
                  <h4 className="font-bold text-destructive">
                    {t("tenants.areYouSure")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("tenants.deleteWarning")}
                  </p>
                </div>
                <div className="flex w-full gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    {t("common.giveUp")}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteTenant}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t("tenants.deletePermanently")
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
