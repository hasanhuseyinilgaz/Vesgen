import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
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
  Info,
  Github,
  Twitter,
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
import PageLayout from "@/components/PageLayout";
import { APP_INFO } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedTenantForSettings, setSelectedTenantForSettings] =
    useState<Tenant | null>(null);

  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantDescription, setEditTenantDescription] = useState("");
  const [showDeleteConfirm, setshowDeleteConfirm] = useState(false);

  const handleSaveTenant = async () => {
    try {
      const success = await createTenant(tenantName, tenantDescription);
      if (success) {
        setTenantName("");
        setTenantDescription("");
        setIsAddModalOpen(false);
        toast.success(
          t("tenants.createSuccess") || "Ortam başarıyla oluşturuldu.",
        );
      } else {
        toast.error(
          t("tenants.createError") ||
          "Ortam oluşturulamadı. Logları kontrol edin.",
        );
      }
    } catch (error) {
      console.error("Tenant oluşturulurken sistem hatası:", error);
      toast.error(t("tenants.systemErrorCreation") || "Sistem Hatası: İşlem arka planda çöktü!");
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenantForSettings) return;
    try {
      const success = await updateTenant(
        selectedTenantForSettings,
        editTenantName,
        editTenantDescription,
      );
      if (success) {
        setIsSettingsModalOpen(false);
        toast.success(t("tenants.updateSuccess") || "Değişiklikler başarıyla kaydedildi.");
      } else {
        toast.error(t("tenants.updateError") || "Güncelleme işlemi başarısız oldu.");
      }
    } catch (error) {
      console.error("Tenant güncellenirken sistem hatası:", error);
      toast.error(t("tenants.systemErrorUpdate") || "Sistem Hatası: Güncelleme yapılamadı!");
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenantForSettings) return;
    try {
      const success = await deleteTenant(selectedTenantForSettings.id);
      if (success) {
        setIsSettingsModalOpen(false);
        setshowDeleteConfirm(false);
        setSelectedTenantForSettings(null);
        toast.success(t("tenants.deleteSuccess") || "Ortam sistemden başarıyla silindi.");
      } else {
        toast.error(t("tenants.deleteError") || "Ortam silinemedi.");
      }
    } catch (error) {
      console.error("Tenant silinirken sistem hatası:", error);
      toast.error(t("tenants.systemErrorDeletion") || "Sistem Hatası: Silme işlemi sırasında çökme yaşandı!");
    }
  };

  const openSettings = (e: React.MouseEvent, tenant: Tenant) => {
    e.stopPropagation();
    setSelectedTenantForSettings(tenant);
    setEditTenantName(tenant.name);
    setEditTenantDescription(tenant.description || "");
    setshowDeleteConfirm(false);
    setIsSettingsModalOpen(true);
  };

  const handleLanguageChange = (newLang: string) => {
    i18n.changeLanguage(newLang);
    localStorage.setItem("appLanguage", newLang);
  };

  return (
    <PageLayout className="!bg-transparent">
      <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
        <div className="max-w-[1600px] mx-auto px-8 py-12 flex flex-col gap-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 animate-in slide-in-from-top-6 duration-700">
            <div className="space-y-3">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                {APP_INFO.NAME} {t("dashboard.overview")}
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground flex items-center gap-4">
                <Building2 className="w-10 h-10 sm:w-12 h-12 text-primary" />{" "}
                {t("tenants.title")}
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg max-w-2xl">
                {t("tenants.description")}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <ActionTooltip label={t("common.info")} side="bottom">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 bg-background/50 backdrop-blur-md border-border/50 hover:bg-primary/10 hover:text-primary transition-all rounded-xl"
                  onClick={() => setIsInfoModalOpen(true)}
                >
                  <Info className="w-5 h-5" />
                </Button>
              </ActionTooltip>

              <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[140px] h-10 bg-background/50 backdrop-blur-md border-border/50 rounded-xl">
                  <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="backdrop-blur-xl bg-background/90 border-border/40">
                  <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>

              <ThemeSwitcher />

              <Button
                className="shadow-lg shadow-primary/20 gap-2 h-10 px-6 font-bold rounded-xl transition-transform active:scale-95"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="w-4 h-4" /> {t("tenants.newTenant")}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-48 text-muted-foreground animate-pulse">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-32 glass-card rounded-3xl border-2 border-dashed border-border/40 text-muted-foreground flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-500">
              <div className="p-6 bg-primary/5 rounded-full border border-primary/10">
                <Building2 className="w-16 h-16 opacity-20" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-foreground">
                  {t("tenants.noTenantYet")}
                </p>
                <p className="text-sm">
                  {t("tenants.clickToCreate")}
                </p>
              </div>
              <Button onClick={() => setIsAddModalOpen(true)} variant="secondary" className="rounded-xl px-8">
                {t("tenants.newTenant")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tenants.map((tenant, index) => (
                <Card
                  key={tenant.id}
                  onClick={() => onSelectTenant(tenant.id)}
                  className={cn(
                    "group flex flex-col p-6 cursor-pointer border-border/30 hover:border-primary/40 shadow-xl glass-card relative overflow-hidden transition-all duration-300 active:scale-[0.98] animate-in slide-in-from-bottom-6",
                    "rounded-[2rem] sm:rounded-[2.5rem]",
                    "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/10 before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity",
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Inner Glow Absorption Effect */}
                  <div
                    className={cn(
                      "absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-[0.05] group-hover:opacity-[0.15] blur-[60px] transition-all duration-700",
                      tenant.color
                    )}
                  />
                  <div
                    className={cn(
                      "absolute -bottom-24 -left-24 w-48 h-48 rounded-full opacity-0 group-hover:opacity-[0.08] blur-[40px] transition-all duration-700",
                      tenant.color
                    )}
                  />

                  <ActionTooltip label={t("tenants.settings")} side="left">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-background/20 rounded-lg z-10"
                      onClick={(e) => openSettings(e, tenant)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </ActionTooltip>

                  <div className="flex items-start gap-5 pr-8">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0 relative overflow-hidden",
                        tenant.color
                      )}
                    >
                      {/* Shine Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/5 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 border-t border-l border-white/40 rounded-2xl pointer-events-none" />
                      <span className="relative z-10">{tenant.shortName}</span>
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h2 className="text-xl font-black text-foreground truncate group-hover:text-primary transition-colors tracking-tight">
                        {tenant.name}
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 min-h-[40px] leading-relaxed">
                        {tenant.description || t("tenants.noDescription")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-border/20 flex flex-wrap items-center justify-between gap-3 relative z-10">
                    <div className="flex flex-wrap gap-2.5">
                      <ActionTooltip label={t("tenants.dbCount")} side="top">
                        <div className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/10 hover:bg-blue-500/20 transition-colors">
                          <Database className="w-3.5 h-3.5" />
                          {tenant.databases?.length || 0} DB
                        </div>
                      </ActionTooltip>

                      <ActionTooltip label={t("tenants.winCount")} side="top">
                        <div className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-600 border border-cyan-500/10 hover:bg-cyan-500/20 transition-colors">
                          <Monitor className="w-3.5 h-3.5" />
                          {tenant.windowsServers?.length || 0} Win
                        </div>
                      </ActionTooltip>

                      <ActionTooltip label={t("tenants.linCount")} side="top">
                        <div className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/10 hover:bg-orange-500/20 transition-colors">
                          <TerminalSquare className="w-3.5 h-3.5" />
                          {tenant.linuxServers?.length || 0} Lin
                        </div>
                      </ActionTooltip>
                    </div>

                    <div className="p-2 rounded-xl bg-muted/40 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-1 transition-all duration-300">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[450px] backdrop-blur-2xl bg-background/90 border-border/40">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black">{t("tenants.createModalTitle")}</DialogTitle>
            <DialogDescription className="text-base">
              {t("tenants.createModalDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {t("tenants.tenantNameLabel")}{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={t("tenants.tenantNamePlaceholder")}
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="h-12 focus-visible:ring-primary rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("tenants.descriptionLabel")}</Label>
              <Textarea
                placeholder={t("tenants.descriptionPlaceholder")}
                value={tenantDescription}
                onChange={(e: any) => setTenantDescription(e.target.value)}
                className="resize-none h-28 focus-visible:ring-primary rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSaving}
              className="h-11 px-8 rounded-xl font-bold"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveTenant}
              disabled={!tenantName.trim() || isSaving}
              className="h-11 px-8 rounded-xl font-extrabold shadow-lg shadow-primary/20"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                t("common.create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="sm:max-w-[450px] backdrop-blur-2xl bg-background/90 border-border/40">
          <DialogHeader className="space-y-3">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg",
                selectedTenantForSettings?.color
              )}
            >
              {selectedTenantForSettings?.shortName}
            </div>
            <DialogTitle className="text-2xl font-black">
              {t("tenants.settingsModalTitle")}
            </DialogTitle>
            <DialogDescription className="text-base">
              {t("tenants.settingsModalDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("tenants.tenantNameLabel")}</Label>
              <Input
                value={editTenantName}
                onChange={(e) => setEditTenantName(e.target.value)}
                className="h-12 focus-visible:ring-primary rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("tenants.descriptionLabel")}</Label>
              <Textarea
                value={editTenantDescription}
                onChange={(e: any) => setEditTenantDescription(e.target.value)}
                className="resize-none h-28 focus-visible:ring-primary rounded-xl"
              />
            </div>

            <Button
              className="w-full h-12 rounded-xl font-black mt-4 shadow-lg"
              onClick={handleUpdateTenant}
              disabled={isUpdating || !editTenantName.trim()}
            >
              {isUpdating ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-3" />
              )}
              {t("common.saveChanges")}
            </Button>
          </div>

          <div className="pt-6 mt-4 border-t border-border/40 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 w-full text-left">
              {t("tenants.dangerZone")}
            </span>

            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                className="w-full h-11 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white border-none shadow-none font-bold rounded-xl"
                onClick={() => setshowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> {t("tenants.deleteTenant")}
              </Button>
            ) : (
              <div className="flex flex-col items-center text-center space-y-4 p-6 bg-destructive/5 border border-destructive/20 rounded-2xl w-full animate-in zoom-in-95">
                <div className="p-3 bg-destructive/10 rounded-full">
                  <AlertTriangle className="w-10 h-10 text-destructive animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-destructive text-lg">
                    {t("tenants.areYouSure")}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("tenants.deleteWarning")}
                  </p>
                </div>
                <div className="flex w-full gap-3 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-bold"
                    onClick={() => setshowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    {t("common.giveUp")}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 h-11 rounded-xl font-black shadow-lg shadow-destructive/20"
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

      {/* INFO MODAL */}
      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="sm:max-w-[500px] backdrop-blur-2xl bg-background/90 border-border/40 p-0 overflow-hidden rounded-3xl">
          <div className="relative h-32 bg-primary/20 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
            <div className="bg-glow-spotlight w-64 h-64 opacity-30 animate-float" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="p-3 bg-background rounded-2xl shadow-xl border border-primary/20 mb-2">
                <Database className="w-10 h-10 text-primary" />
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-foreground tracking-tight">{APP_INFO.NAME}</h2>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">v{APP_INFO.VERSION}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary/70">{t("common.aboutApp") || "HAKKINDA"}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vesgen, modern veritabanı yönetimi ve sunucu izleme araçlarını tek bir arayüzde toplayan gelişmiş bir yönetim panelidir. SQL Server sistemlerini optimize etmek, izlemek ve güvenli bir şekilde yönetmek için tasarlanmıştır.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <Button variant="outline" className="h-12 gap-2 rounded-2xl font-bold border-border/40 hover:bg-primary/5 hover:text-primary transition-all">
                <Github className="w-4 h-4" /> GitHub
              </Button>
              <Button variant="outline" className="h-12 gap-2 rounded-2xl font-bold border-border/40 hover:bg-info/5 hover:text-info transition-all">
                <Twitter className="w-4 h-4" /> Twitter
              </Button>
            </div>

            <div className="pt-6 border-t border-border/30 flex justify-between items-center text-[11px] text-muted-foreground">
              <span className="font-bold">© 2026 {APP_INFO.AUTHOR}</span>
              <div className="flex gap-4">
                <span className="hover:text-primary cursor-pointer transition-colors font-medium">Gizlilik</span>
                <span className="hover:text-primary cursor-pointer transition-colors font-medium">Kullanım Şartları</span>
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 pt-2">
            <Button onClick={() => setIsInfoModalOpen(false)} className="w-full h-12 rounded-2xl font-black">
              {t("common.close") || "Kapat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
