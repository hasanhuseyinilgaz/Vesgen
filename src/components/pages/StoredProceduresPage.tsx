import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw,
  Settings,
  AlertTriangle,
  Play,
  FileCode2,
  Database,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { exportToExcel } from "@/lib/exportUtils";
import { isDangerousOperation, mapSqlType } from "@/lib/sqlUtils";

import DataTable, { SortDirection, SortConfig } from "@/components/DataTable";
import SqlCodeViewer from "@/components/SqlCodeViewer";
import EmptyState from "@/components/EmptyState";
import SearchableSidebar from "@/components/SearchableSidebar";
import CustomTabs from "@/components/CustomTabs";
import DataToolbar from "@/components/DataToolbar";
import PageLayout from "@/components/PageLayout";

import ActionTooltip from "@/components/ActionTooltip";

export interface StoredProcedure {
  ROUTINE_NAME: string;
  ROUTINE_DEFINITION?: string;
}
export interface SPParameter {
  PARAMETER_NAME: string;
  DATA_TYPE: string;
}
export interface Preset {
  spName: string;
  parameters: { name: string; value: any }[];
}

export default function StoredProceduresPage() {
  const { t } = useTranslation();
  const [procedures, setProcedures] = useState<StoredProcedure[]>([]);
  const [selectedSP, setSelectedSP] = useState<string | null>(null);
  const [spDefinition, setSpDefinition] = useState<string>("");

  const [parameters, setParameters] = useState<SPParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [presets, setPresets] = useState<Preset[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"execute" | "code">("execute");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    message: "",
  });

  useEffect(() => {
    loadProcedures();
    loadPresets();
  }, []);

  const loadProcedures = async () => {
    setLoading(true);
    try {
      if ((window as any).electronAPI?.dbGetStoredProcedures) {
        const res = await (window as any).electronAPI.dbGetStoredProcedures();
        if (res?.success) setProcedures(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      if ((window as any).electronAPI?.fsReadPresets) {
        const res = await (window as any).electronAPI.fsReadPresets();
        if (res?.success) setPresets(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSPDetails = async (spName: string) => {
    setLoading(true);
    setSelectedSP(spName);
    setResult(null);
    setSortConfig(null);
    setActiveTab("execute");

    const sp = procedures.find((p) => p.ROUTINE_NAME === spName);
    setSpDefinition(
      sp?.ROUTINE_DEFINITION || t("procedures.definitionNotFound"),
    );

    try {
      if ((window as any).electronAPI?.dbGetSPParameters) {
        const res = await (window as any).electronAPI.dbGetSPParameters(spName);
        if (res?.success && res.data) {
          setParameters(res.data);

          const initialValues: Record<string, any> = {};
          res.data.forEach((p: SPParameter) => {
            initialValues[p.PARAMETER_NAME] = "";
          });

          const preset = presets.find((p) => p.spName === spName);
          if (preset?.parameters) {
            preset.parameters.forEach((p) => {
              initialValues[p.name] = p.value;
            });
          }
          setParamValues(initialValues);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteInitiate = () => {
    if (!selectedSP) return;

    if (isDangerousOperation(spDefinition)) {
      setAlertConfig({
        isOpen: true,
        message: t("procedures.dangerousOpWarning"),
      });
    } else {
      executeStoredProcedure();
    }
  };

  const executeStoredProcedure = async () => {
    if (!selectedSP) return;

    setLoading(true);
    setAlertConfig({ isOpen: false, message: "" });
    setSortConfig(null);

    const params = parameters.map((p) => ({
      name: p.PARAMETER_NAME,
      type: mapSqlType(p.DATA_TYPE),
      value: paramValues[p.PARAMETER_NAME],
    }));

    try {
      const execRes = await (window as any).electronAPI.dbExecuteSP({
        spName: selectedSP,
        parameters: params,
      });

      if (execRes?.success) {
        setResult({
          success: true,
          data: execRes.data,
          rowsAffected: execRes.rowsAffected,
        });
      } else {
        setResult({
          success: false,
          error: execRes?.message || t("procedures.executionFailed"),
        });
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!result?.data?.length) return;
    exportToExcel(result.data, `SP_${selectedSP}`);
  };

  const handleSort = (column: string, direction: SortDirection) => {
    setSortConfig({ column, direction });
    if (result?.data) {
      const sorted = [...result.data].sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === valB) return 0;
        if (valA === null) return direction === "ASC" ? -1 : 1;
        if (valB === null) return direction === "ASC" ? 1 : -1;
        return direction === "ASC"
          ? valA < valB
            ? -1
            : 1
          : valA > valB
            ? -1
            : 1;
      });
      setResult({ ...result, data: sorted });
    }
  };

  return (
    <PageLayout
      sidebar={
        <SearchableSidebar
          title={t("procedures.title")}
          icon={Settings}
          items={procedures.map((p) => ({
            id: p.ROUTINE_NAME,
            label: p.ROUTINE_NAME,
          }))}
          selectedItemId={selectedSP}
          onSelect={loadSPDetails}
          onRefresh={loadProcedures}
          loading={loading}
        />
      }
    >
      <div
        className={cn(
          "h-full bg-background custom-scrollbar",
          activeTab === "execute"
            ? "overflow-y-auto"
            : "overflow-hidden flex flex-col",
        )}
      >
        {selectedSP ? (
          <div
            className={cn(
              "p-6 flex flex-col gap-6",
              activeTab === "code" && "flex-1 overflow-hidden",
            )}
          >
            <div className="flex flex-col gap-0 shrink-0">
              <DataToolbar
                title={selectedSP}
                onRefresh={handleExecuteInitiate}
                loading={loading}
                showLimitSelector={false}
                showFilterButton={false}
                showRecordCount={!!result?.data}
                recordCount={result?.data?.length || 0}
                showRefreshButton={false}
                onExport={handleExportExcel}
              />
              {isDangerousOperation(spDefinition) && (
                <ActionTooltip
                  label={t("procedures.dangerousOpWarning")}
                  side="right"
                >
                  <div className="flex items-center space-x-1.5 text-warning mt-2 px-2 bg-warning/10 py-1.5 rounded-md border border-warning/20 cursor-help w-max">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      {t("procedures.dangerousOpBadge")}
                    </span>
                  </div>
                </ActionTooltip>
              )}
            </div>

            <CustomTabs
              activeTab={activeTab}
              onTabChange={setActiveTab as any}
              tabs={[
                {
                  value: "execute",
                  label: t("procedures.tabExecute"),
                  icon: Play,
                },
                {
                  value: "code",
                  label: t("procedures.tabCode"),
                  icon: FileCode2,
                },
              ]}
            />

            <div
              className={cn(
                "w-full",
                activeTab === "code" ? "flex-1 min-h-0 mb-4" : "shrink-0 mb-8",
              )}
            >
              {activeTab === "execute" ? (
                <div className="flex flex-col gap-6">
                  <Card className="shrink-0 shadow-sm border-border/50">
                    <div className="p-4 border-b bg-muted/30">
                      <h3 className="text-sm font-semibold text-foreground">
                        {t("procedures.inputParams")}
                      </h3>
                    </div>
                    <CardContent className="p-6">
                      {parameters.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {parameters.map((p) => (
                            <div key={p.PARAMETER_NAME} className="space-y-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {p.PARAMETER_NAME}{" "}
                                <span className="text-[10px] lowercase font-mono opacity-60">
                                  ({p.DATA_TYPE})
                                </span>
                              </Label>
                              <Input
                                value={paramValues[p.PARAMETER_NAME] || ""}
                                onChange={(e) =>
                                  setParamValues((prev) => ({
                                    ...prev,
                                    [p.PARAMETER_NAME]: e.target.value,
                                  }))
                                }
                                placeholder={t("procedures.enterValue")}
                                className="bg-background focus-visible:ring-primary"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4 text-sm bg-muted/20 rounded-lg border border-dashed">
                          {t("procedures.noParams")}
                        </div>
                      )}

                      <div className="pt-6 mt-6 border-t flex justify-end">
                        <Button
                          onClick={handleExecuteInitiate}
                          disabled={loading}
                          className="w-full sm:w-auto min-w-[150px] font-semibold shadow-md"
                        >
                          {loading ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4 fill-current" />
                          )}
                          {loading
                            ? t("procedures.executing")
                            : t("procedures.runSp")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {result && (
                    <Card className="flex flex-col shadow-sm border-border/50 overflow-hidden">
                      <div
                        className={cn(
                          "p-4 border-b flex justify-between items-center",
                          result.success
                            ? "bg-success/5 border-success/20"
                            : "bg-destructive/5 border-destructive/20",
                        )}
                      >
                        <h3
                          className={cn(
                            "text-sm font-bold flex items-center",
                            result.success
                              ? "text-success"
                              : "text-destructive",
                          )}
                        >
                          {result.success ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />{" "}
                              {t("procedures.operationSuccess")}
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 mr-2" />{" "}
                              {t("procedures.operationFailed")}
                            </>
                          )}
                        </h3>
                        {result.success && result.rowsAffected && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded bg-background border text-muted-foreground shadow-sm">
                            {t("procedures.rowsAffected", {
                              count: result.rowsAffected[0],
                            })}
                          </span>
                        )}
                      </div>

                      <div className="bg-muted/5">
                        {result.success ? (
                          result.data?.length > 0 ? (
                            <DataTable
                              data={result.data}
                              columns={Object.keys(result.data[0]).map((k) => ({
                                name: k,
                              }))}
                              title=""
                              sortConfig={sortConfig}
                              onSort={handleSort}
                              className="border-0 rounded-none shadow-none"
                            />
                          ) : (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                              <Database className="w-12 h-12 mb-3 opacity-20" />
                              {t("procedures.noDataReturned")}
                            </div>
                          )
                        ) : (
                          <div className="p-8 text-destructive bg-destructive/5 flex flex-col items-center">
                            <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
                            <span className="text-sm font-medium text-center bg-background px-4 py-2 rounded-md border border-destructive/20 shadow-sm">
                              {result.error}
                            </span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="h-full border rounded-xl overflow-hidden shadow-sm bg-muted/5">
                  <SqlCodeViewer code={spDefinition} wordWrap="on" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon={Settings}
              title={t("procedures.readyToRun")}
              description={t("procedures.selectToStart")}
            />
          </div>
        )}
      </div>

      <AlertDialog
        open={alertConfig.isOpen}
        onOpenChange={(open) =>
          setAlertConfig((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{t("procedures.dangerousOpTitle")}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2 text-foreground/80">
              {alertConfig.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>{t("procedures.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeStoredProcedure}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {t("procedures.runAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
