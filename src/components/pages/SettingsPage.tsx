import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings,
  Save,
  ShieldAlert,
  Wrench,
  LayoutTemplate,
  CheckCircle2,
  RefreshCw,
  Key,
  DatabaseBackup,
  Activity,
  Edit3,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  FileCode,
  TerminalSquare,
  Unlock,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import PageLayout from "@/components/PageLayout";
import { cn } from "@/lib/utils";

import { useSettings } from "@/hooks/useSettings";
import ThemeSwitcher from "@/components/ThemeSwitcher";

import ActionTooltip from "@/components/ActionTooltip";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    config,
    loading,
    saving,
    saveMessage,
    loadConfig,
    saveConfig,
    handleNestedChange,
    handlePermissionChange,
  } = useSettings();

  useEffect(() => {
    loadConfig();
  }, []);

  const handleAuthentication = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);

    try {
      const res = await (window as any).electronAPI.authVerifyAdmin(
        authPassword,
      );
      if (res?.success) {
        setIsAuthenticated(true);
      } else {
        setAuthError(res?.message || t("settings.wrongPassword"));
      }
    } catch (err: any) {
      setAuthError(t("settings.authError"));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    i18n.changeLanguage(newLang);
    localStorage.setItem("appLanguage", newLang);
  };

  if (loading || !config) {
    return (
      <PageLayout>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground h-full bg-muted/5">
          <RefreshCw className="w-10 h-10 animate-spin mb-4 opacity-20" />
          <p className="font-medium animate-pulse">
            {t("settings.loadingConfig")}
          </p>
        </div>
      </PageLayout>
    );
  }

  const permissionItems = [
    {
      key: "updateRecord",
      label: t("settings.permissions.updateRecord"),
      desc: t("settings.permissions.updateRecordDesc"),
      icon: Edit3,
    },
    {
      key: "indexOptimize",
      label: t("settings.permissions.indexOptimize"),
      desc: t("settings.permissions.indexOptimizeDesc"),
      icon: Wrench,
    },
    {
      key: "logShrink",
      label: t("settings.permissions.logShrink"),
      desc: t("settings.permissions.logShrinkDesc"),
      icon: DatabaseBackup,
    },
    {
      key: "statsUpdate",
      label: t("settings.permissions.statsUpdate"),
      desc: t("settings.permissions.statsUpdateDesc"),
      icon: Activity,
    },
    {
      key: "customQueryExecution",
      label: t("settings.permissions.customQueryExecution"),
      desc: t("settings.permissions.customQueryExecutionDesc"),
      icon: TerminalSquare,
    },
    {
      key: "queryManagement",
      label: t("settings.permissions.queryManagement"),
      desc: t("settings.permissions.queryManagementDesc"),
      icon: FileCode,
    },
  ];

  return (
    <PageLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-32 bg-muted/5 custom-scrollbar flex justify-center relative">
        <div className="max-w-5xl w-full space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl p-4 -mx-4 sm:-mx-6 px-4 sm:px-6 rounded-2xl border border-border/50 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Settings className="w-6 h-6" />
                </div>
                {t("settings.title")}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 ml-12">
                {t("settings.description")}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {saveMessage.show && (
                <span
                  className={cn(
                    "text-sm font-bold flex items-center mr-2 animate-in fade-in slide-in-from-right-4",
                    saveMessage.type === "success"
                      ? "text-success"
                      : saveMessage.type === "info"
                        ? "text-warning"
                        : "text-destructive",
                  )}
                >
                  {saveMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  ) : saveMessage.type === "info" ? (
                    <AlertCircle className="w-4 h-4 mr-1.5" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                  )}
                  {saveMessage.text}
                </span>
              )}
              <Button
                onClick={saveConfig}
                disabled={saving}
                className="shadow-md w-full sm:w-auto font-semibold px-6 h-11"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? t("settings.saving") : t("settings.saveSettings")}
              </Button>
            </div>
          </div>

          <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden relative z-10">
            <CardHeader className="bg-success/5 border-b border-border/40 pb-5">
              <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                <ActionTooltip label={t("settings.uiDescription")} side="top">
                  <LayoutTemplate className="w-6 h-6 text-success cursor-help" />
                </ActionTooltip>
                {t("settings.uiAppearance")}
              </CardTitle>
              <CardDescription className="text-sm">
                {t("settings.uiDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4 bg-card p-5 rounded-xl border shadow-sm">
                <Label className="font-bold text-foreground text-base flex items-center gap-2">
                  {t("settings.appTheme")}
                </Label>
                <p className="text-[12px] text-muted-foreground leading-relaxed h-10">
                  {t("settings.appThemeDesc")}
                </p>
                <div className="pt-2">
                  <ThemeSwitcher />
                </div>
              </div>

              <div className="space-y-4 bg-card p-5 rounded-xl border shadow-sm">
                <Label className="font-bold text-foreground text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />{" "}
                  {t("settings.language")}
                </Label>
                <p className="text-[12px] text-muted-foreground leading-relaxed h-10">
                  {t("settings.languageDesc")}
                </p>
                <div className="pt-2">
                  <Select
                    value={i18n.language}
                    onValueChange={handleLanguageChange}
                  >
                    <SelectTrigger className="w-full bg-background border-border/50">
                      <SelectValue placeholder={t("settings.selectLanguage")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tr">🇹🇷 Türkçe</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 bg-card p-5 rounded-xl border shadow-sm">
                <Label className="font-bold text-foreground text-base">
                  {t("settings.defaultPageSize")}
                </Label>
                <p className="text-[12px] text-muted-foreground leading-relaxed h-10">
                  {t("settings.defaultPageSizeDesc")}
                </p>
                <div className="pt-2">
                  <Input
                    type="number"
                    className="h-10 text-base max-w-[150px] focus-visible:ring-primary"
                    value={config.ui.table.defaultPageSize}
                    onChange={(e) =>
                      handleNestedChange("ui", "table", {
                        ...config.ui.table,
                        defaultPageSize: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative mt-12">
            {!isAuthenticated && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/50 backdrop-blur-md rounded-2xl border border-border/50 shadow-inner transition-all duration-500">
                <Card className="w-full max-w-sm shadow-2xl border-primary/20 bg-card animate-in zoom-in-95 duration-300">
                  <CardHeader className="text-center pb-6">
                    <div className="mx-auto bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mb-2">
                      <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">
                      {t("settings.lockedArea")}
                    </CardTitle>
                    <CardDescription>
                      {t("settings.lockedAreaDesc")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAuthentication} className="space-y-4">
                      <div className="relative">
                        <Input
                          type={showAuthPassword ? "text" : "password"}
                          placeholder={t("settings.adminPasswordPlaceholder")}
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="pr-10 h-11 focus-visible:ring-primary"
                        />
                        <ActionTooltip
                          label={showAuthPassword ? "Gizle" : "Göster"}
                          side="top"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1.5 h-8 w-8 text-muted-foreground"
                            onClick={() =>
                              setShowAuthPassword(!showAuthPassword)
                            }
                          >
                            {showAuthPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </ActionTooltip>
                      </div>
                      {authError && (
                        <p className="text-xs font-medium text-destructive flex items-center">
                          <AlertCircle className="w-3.5 h-3.5 mr-1" />{" "}
                          {authError}
                        </p>
                      )}
                      <Button
                        type="submit"
                        disabled={isAuthLoading || !authPassword}
                        className="w-full h-11 font-semibold bg-primary text-primary-foreground"
                      >
                        {isAuthLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />{" "}
                            {t("settings.verifying")}
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />{" "}
                            {t("settings.unlock")}
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            <div
              className={cn(
                "space-y-8 transition-all duration-700",
                !isAuthenticated &&
                  "blur-[6px] pointer-events-none select-none opacity-60",
              )}
            >
              <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
                <CardHeader className="bg-warning/5 border-b border-border/40 pb-5">
                  <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                    <ActionTooltip
                      label={t("settings.securityAuthDesc")}
                      side="top"
                    >
                      <ShieldAlert className="w-6 h-6 text-warning cursor-help" />
                    </ActionTooltip>
                    {t("settings.securityAuth")}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t("settings.securityAuthDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="max-w-md space-y-3 bg-card p-5 rounded-xl border shadow-sm">
                    <Label className="font-bold text-foreground flex items-center text-sm">
                      <Key className="w-4 h-4 mr-2 text-primary" />{" "}
                      {t("settings.newAdminPassword")}
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={config.security.adminPassword}
                        onChange={(e) =>
                          handleNestedChange(
                            "security",
                            "adminPassword",
                            e.target.value,
                          )
                        }
                        className="font-mono bg-muted/30 border-border/50 h-11 text-base focus-visible:ring-warning pr-12"
                      />
                      <ActionTooltip
                        label={showPassword ? "Gizle" : "Göster"}
                        side="top"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1.5 top-1.5 h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </ActionTooltip>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Label className="font-bold text-foreground block mb-4 text-base">
                      {t("settings.requireAdminApproval")}
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {permissionItems.map((item) => {
                        const isChecked =
                          !!config.security.requirePasswordFor[item.key];
                        return (
                          <label
                            key={item.key}
                            className={cn(
                              "flex items-start space-x-4 cursor-pointer p-4 rounded-xl border-2 transition-all duration-300",
                              isChecked
                                ? "border-warning/50 bg-warning/5 shadow-sm"
                                : "border-border/40 bg-card hover:bg-muted/50 hover:border-border/80",
                            )}
                          >
                            <div className="mt-0.5">
                              <div
                                className={cn(
                                  "w-5 h-5 rounded flex items-center justify-center border-2 transition-colors",
                                  isChecked
                                    ? "border-warning bg-warning"
                                    : "border-muted-foreground/30 bg-background",
                                )}
                              >
                                {isChecked && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-warning-foreground" />
                                )}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isChecked}
                                onChange={(e) =>
                                  handlePermissionChange(
                                    item.key,
                                    e.target.checked,
                                  )
                                }
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-bold text-foreground flex items-center gap-1.5 transition-colors">
                                <item.icon
                                  className={cn(
                                    "w-4 h-4 transition-colors",
                                    isChecked
                                      ? "text-warning"
                                      : "text-muted-foreground",
                                  )}
                                />{" "}
                                {item.label}
                              </span>
                              <span
                                className={cn(
                                  "text-[11px] leading-tight transition-colors",
                                  isChecked
                                    ? "text-warning/50"
                                    : "text-muted-foreground",
                                )}
                              >
                                {item.desc}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border/60 rounded-2xl overflow-hidden">
                <CardHeader className="bg-info/5 border-b border-border/40 pb-5">
                  <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                    <ActionTooltip
                      label={t("settings.maintenanceDesc")}
                      side="top"
                    >
                      <Wrench className="w-6 h-6 text-info cursor-help" />
                    </ActionTooltip>
                    {t("settings.maintenanceThresholds")}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t("settings.maintenanceDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5 bg-card p-5 rounded-xl border shadow-sm">
                    <h4 className="font-bold text-sm border-b pb-2 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-muted-foreground" />{" "}
                      {t("settings.indexOptimization")}
                    </h4>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        {t("settings.warningLevel")}
                      </Label>
                      <Input
                        type="number"
                        className="h-10 focus-visible:ring-primary"
                        value={config.maintenance.index.warningThreshold}
                        onChange={(e) =>
                          handleNestedChange("maintenance", "index", {
                            ...config.maintenance.index,
                            warningThreshold: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        {t("settings.criticalLevel")}
                      </Label>
                      <Input
                        type="number"
                        className="h-10 border-destructive/30 focus-visible:ring-destructive"
                        value={config.maintenance.index.criticalThreshold}
                        onChange={(e) =>
                          handleNestedChange("maintenance", "index", {
                            ...config.maintenance.index,
                            criticalThreshold: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-5 bg-card p-5 rounded-xl border shadow-sm">
                    <h4 className="font-bold text-sm border-b pb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />{" "}
                      {t("settings.statisticsGeneral")}
                    </h4>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        {t("settings.staleThreshold")}
                      </Label>
                      <Input
                        type="number"
                        className="h-10 focus-visible:ring-primary"
                        value={config.maintenance.statistics.staleThreshold}
                        onChange={(e) =>
                          handleNestedChange("maintenance", "statistics", {
                            ...config.maintenance.statistics,
                            staleThreshold: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
