import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  FileCode,
  Play,
  Database,
  AlertTriangle,
  Bug,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  TerminalSquare,
} from "lucide-react";

import { exportToExcel } from "@/lib/exportUtils";
import { extractLineNumber } from "@/lib/sqlUtils";
import { useAuthGate } from "@/hooks/useAuthGate";

import LiveMonitoringPanel from "@/components/LiveMonitoringPanel";
import DataTable, { SortDirection, SortConfig } from "@/components/DataTable";
import SqlCodeViewer from "@/components/SqlCodeViewer";
import SearchableSidebar from "@/components/SearchableSidebar";
import PageLayout from "@/components/PageLayout";
import PasswordModal from "@/components/PasswordModal";

import ActionTooltip from "@/components/ActionTooltip";

export interface Query {
  filename: string;
  name: string;
  content: string;
}

export default function QueriesPage() {
  const { t } = useTranslation();
  const [queries, setQueries] = useState<Query[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);

  const [dbSchema, setDbSchema] = useState<{
    tables: string[];
    views: string[];
    procedures: string[];
    columns: string[];
  }>({ tables: [], views: [], procedures: [], columns: [] });

  const [editorCode, setEditorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const [showLivePanel, setShowLivePanel] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newQueryName, setNewQueryName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    modalContext,
    executeWithAuth,
    handlePasswordSuccess,
  } = useAuthGate();

  useEffect(() => {
    loadQueries();
    loadDatabaseSchema();
    startNewQuery();
  }, []);

  const loadQueries = async () => {
    setLoading(true);
    try {
      if ((window as any).electronAPI?.fsReadQueries) {
        const res = await (window as any).electronAPI.fsReadQueries();
        if (res && res.success) setQueries(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseSchema = async () => {
    try {
      if ((window as any).electronAPI?.dbExecuteQuery) {
        const schemaQuery = `
          SELECT name AS ItemName, 'TABLE' AS ItemType FROM sys.tables WHERE is_ms_shipped = 0
          UNION ALL
          SELECT name AS ItemName, 'VIEW' AS ItemType FROM sys.views WHERE is_ms_shipped = 0
          UNION ALL
          SELECT name AS ItemName, 'PROCEDURE' AS ItemType FROM sys.procedures WHERE is_ms_shipped = 0
          UNION ALL
          SELECT DISTINCT name AS ItemName, 'COLUMN' AS ItemType FROM sys.columns
        `;
        const res = await (window as any).electronAPI.dbExecuteQuery(
          schemaQuery,
        );

        if (res?.success && res.data) {
          const schema = {
            tables: [] as string[],
            views: [] as string[],
            procedures: [] as string[],
            columns: [] as string[],
          };
          res.data.forEach((row: any) => {
            if (row.ItemType === "TABLE") schema.tables.push(row.ItemName);
            else if (row.ItemType === "VIEW") schema.views.push(row.ItemName);
            else if (row.ItemType === "PROCEDURE")
              schema.procedures.push(row.ItemName);
            else if (row.ItemType === "COLUMN")
              schema.columns.push(row.ItemName);
          });
          setDbSchema(schema);
        }
      }
    } catch (error) {
      console.error("Şema yüklenemedi:", error);
    }
  };

  const handleSelectQueryFromSidebar = (filename: string) => {
    const query = queries.find((q) => q.filename === filename);
    if (query) {
      setSelectedQuery(query);
      setEditorCode(query.content);
      setResult(null);
      setIsLiveActive(false);
      setShowLivePanel(false);
    }
  };

  const startNewQuery = () => {
    setSelectedQuery(null);
    setEditorCode("");
    setResult(null);
    setIsLiveActive(false);
  };

  const handleExecuteInitiate = () => {
    const isUntouchedSavedQuery =
      selectedQuery && editorCode === selectedQuery.content;
    if (isUntouchedSavedQuery) {
      executeQuery(false);
    } else {
      executeWithAuth("customQueryExecution", () => executeQuery(false), {
        title: t("queries.customQueryAuthTitle"),
        description: t("queries.customQueryAuthDesc"),
      });
    }
  };

  const handleSaveInitiate = () => {
    executeWithAuth(
      "queryManagement",
      () => {
        setNewQueryName("");
        setIsSaveModalOpen(true);
      },
      {
        title: t("queries.saveAuthTitle"),
        description: t("queries.saveAuthDesc"),
      },
    );
  };

  const handleUpdateInitiate = () => {
    executeWithAuth("queryManagement", handleUpdateCurrentQuery, {
      title: t("queries.updateAuthTitle"),
      description: t("queries.updateAuthDesc"),
    });
  };

  const handleDeleteInitiate = () => {
    executeWithAuth("queryManagement", () => setIsDeleteModalOpen(true), {
      title: t("queries.deleteAuthTitle"),
      description: t("queries.deleteAuthDesc"),
    });
  };

  const executeQuery = async (isSilent: boolean = false) => {
    if (!editorCode.trim()) return;
    if (!isSilent) {
      setLoading(true);
      setSortConfig(null);
    }

    try {
      const execResult = await (window as any).electronAPI.dbExecuteQuery(
        editorCode,
      );
      if (execResult?.success) {
        setResult({
          success: true,
          data: execResult.data,
          rowsAffected: execResult.rowsAffected,
        });
      } else {
        const rawMsg = execResult?.message || t("common.error");
        setResult({
          success: false,
          rawError: rawMsg,
          errorLine: extractLineNumber(rawMsg),
        });
        setIsLiveActive(false);
      }
    } catch (error: any) {
      setResult({
        success: false,
        rawError: error.message,
        errorLine: extractLineNumber(error.message),
      });
      setIsLiveActive(false);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSaveQuery = async () => {
    if (!newQueryName.trim() || !editorCode.trim()) return;
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.fsSaveQuery({
        filename: newQueryName,
        content: editorCode,
      });
      if (res?.success) {
        setIsSaveModalOpen(false);
        await loadQueries();
        const savedName = newQueryName.endsWith(".sql")
          ? newQueryName
          : `${newQueryName}.sql`;
        setSelectedQuery({
          filename: savedName,
          name: newQueryName,
          content: editorCode,
        });
      } else {
        alert(`${t("queries.saveError")} ` + res.message);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCurrentQuery = async () => {
    if (!selectedQuery || !editorCode.trim()) return;
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.fsSaveQuery({
        filename: selectedQuery.filename,
        content: editorCode,
      });
      if (res?.success) {
        await loadQueries();
        setSelectedQuery({ ...selectedQuery, content: editorCode });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuery = async () => {
    if (!selectedQuery) return;
    setLoading(true);
    try {
      const res = await (window as any).electronAPI.fsDeleteQuery(
        selectedQuery.filename,
      );
      if (res?.success) {
        setIsDeleteModalOpen(false);
        await loadQueries();
        startNewQuery();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (!result?.data?.length) return;
    exportToExcel(result.data, `Sorgu_Sonucu`);
  };

  const handleLiveRefresh = useCallback(() => {
    executeQuery(true);
  }, [editorCode, sortConfig]);

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

  const handleEditorChange = (val: string) => {
    setEditorCode(val);
    if (result && !result.success) setResult(null);
  };

  return (
    <PageLayout
      sidebar={
        <SearchableSidebar
          title={t("queries.title")}
          icon={FileCode}
          items={queries.map((q) => ({ id: q.filename, label: q.name }))}
          selectedItemId={selectedQuery?.filename || null}
          onSelect={handleSelectQueryFromSidebar}
          onRefresh={() => {
            loadQueries();
            loadDatabaseSchema();
          }}
          loading={loading}
        />
      }
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/5 custom-scrollbar flex flex-col gap-6 scroll-smooth">
        <div className="bg-card border rounded-xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileCode className="w-5 h-5 text-primary" />
              {selectedQuery ? selectedQuery.name : t("queries.newQuery")}
            </h2>
            {selectedQuery && editorCode !== selectedQuery.content && (
              <span className="text-[10px] bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {t("queries.modified")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={startNewQuery}
              className="h-9"
            >
              <Plus className="w-4 h-4 mr-1.5" /> {t("queries.newQuery")}
            </Button>

            {selectedQuery ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateInitiate}
                  disabled={editorCode === selectedQuery.content || loading}
                  className={cn(
                    "h-9",
                    editorCode !== selectedQuery.content &&
                      "border-primary/50 text-primary hover:bg-primary/10",
                  )}
                >
                  <Save className="w-4 h-4 mr-1.5" /> {t("queries.overwrite")}
                </Button>

                <ActionTooltip
                  label={t("queries.deleteQueryTitle")}
                  side="bottom"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteInitiate}
                    className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </ActionTooltip>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveInitiate}
                disabled={!editorCode.trim()}
                className="h-9"
              >
                <Save className="w-4 h-4 mr-1.5" /> {t("queries.save")}
              </Button>
            )}

            <div className="w-px h-6 bg-border mx-1" />

            <Button
              onClick={handleExecuteInitiate}
              disabled={loading || !editorCode.trim()}
              className="h-9 px-6 shadow-sm"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2 fill-current" />
              )}
              {t("queries.run")}
            </Button>
          </div>
        </div>

        <div className="bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden shrink-0 min-h-[calc(100vh-220px)] relative">
          <SqlCodeViewer
            code={editorCode}
            onChange={(val) => handleEditorChange(val || "")}
            wordWrap="on"
            errorLine={result?.success === false ? result.errorLine : null}
            errorMessage={result?.success === false ? result.rawError : null}
            dbSchema={dbSchema}
          />
          {!editorCode.trim() && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-muted-foreground/30 font-mono text-lg select-none">
              {t("queries.editorPlaceholder")}
            </div>
          )}
        </div>

        {showLivePanel && (
          <div className="shrink-0 border rounded-xl bg-card shadow-sm overflow-hidden mt-2">
            <LiveMonitoringPanel
              isVisible={showLivePanel}
              onRefresh={handleLiveRefresh}
              onStatusChange={setIsLiveActive}
            />
          </div>
        )}

        {result && (
          <div
            className={cn(
              "bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden shrink-0 transition-all mt-2 mb-10",
              result.success ? "min-h-[500px]" : "h-fit",
            )}
          >
            {result.success ? (
              <>
                <div className="shrink-0 px-5 py-3 border-b flex justify-between items-center bg-success/10 border-success/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-sm font-bold text-success">
                      {t("queries.querySuccess")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {result.rowsAffected && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded bg-background border text-muted-foreground shadow-sm">
                        {t("queries.rowsAffected", {
                          count: result.rowsAffected[0],
                        })}
                      </span>
                    )}
                    {result.data?.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-background"
                        onClick={handleExportExcel}
                      >
                        {t("queries.exportExcel")}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden relative bg-muted/5">
                  {result.data?.length > 0 ? (
                    <DataTable
                      data={result.data}
                      columns={Object.keys(result.data[0]).map((k) => ({
                        name: k,
                      }))}
                      title=""
                      sortConfig={sortConfig}
                      onSort={handleSort}
                      className="border-0 rounded-none shadow-none h-full bg-transparent"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground py-16">
                      <Database className="w-12 h-12 mb-3 opacity-20" />
                      <p>{t("queries.noData")}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full bg-background flex flex-col">
                <div className="p-4 border-b border-destructive/20 bg-destructive/5 flex items-center gap-2 shrink-0">
                  <Bug className="w-5 h-5 text-destructive" />
                  <span className="font-semibold text-destructive">
                    {t("queries.sqlErrorOutput")}
                  </span>
                  {result.errorLine && (
                    <span className="ml-auto text-xs font-mono bg-destructive/10 text-destructive px-2 py-1 rounded font-bold border border-destructive/20">
                      {t("queries.line")} {result.errorLine}
                    </span>
                  )}
                </div>
                <div className="p-5 bg-card border-t-4 border-destructive max-h-[300px] overflow-y-auto custom-scrollbar">
                  <div className="flex items-start gap-3">
                    <TerminalSquare className="w-5 h-5 text-destructive opacity-50 shrink-0 mt-0.5" />
                    <p className="font-mono text-[13px] text-destructive leading-relaxed whitespace-pre-wrap selection:bg-destructive/30">
                      {result.rawError}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
        title={modalContext.title}
        description={modalContext.description}
      />

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("queries.saveQueryTitle")}</DialogTitle>
            <DialogDescription>{t("queries.saveQueryDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>{t("queries.queryNameLabel")}</Label>
            <Input
              placeholder={t("queries.queryNamePlaceholder")}
              value={newQueryName}
              onChange={(e) => setNewQueryName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveQuery}
              disabled={!newQueryName.trim() || loading}
            >
              {t("queries.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />{" "}
              {t("queries.deleteQueryTitle")}
            </DialogTitle>
            <DialogDescription className="pt-2">
              <strong className="text-foreground">{selectedQuery?.name}</strong>{" "}
              {t("queries.deleteQueryDesc1")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteQuery}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("queries.yesDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
