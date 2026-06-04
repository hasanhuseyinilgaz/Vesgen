import { useState, useEffect, useCallback, useRef } from "react";
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
  X,
  FileText,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  WifiOff
} from "lucide-react";

import { exportToExcel } from "@/lib/exportUtils";
import { extractLineNumber, SCHEMA_QUERY } from "@/lib/sqlUtils";
import { useAuthGate } from "@/hooks/useAuthGate";

import ActivityMonitorRefreshPanel from "@/components/ActivityMonitorRefreshPanel";
import DataTable, { SortDirection, SortConfig } from "@/components/DataTable";
import SqlCodeViewer from "@/components/SqlCodeViewer";
import SearchableListPanel from "@/components/SearchableListPanel";
import PageLayout from "@/components/PageLayout";
import PasswordModal from "@/components/PasswordModal";
import ActionTooltip from "@/components/ui/action-tooltip";
import PageHeader from "@/components/PageHeader";
import { useDatabaseContext } from "@/contexts/DatabaseContext";
import ConnectionRequired from "@/components/ConnectionRequired";

export interface OpenTab {
  id: string;
  filename: string | null;
  name: string;
  content: string;
  originalContent: string;
}

export interface Query {
  filename: string;
  name: string;
  content: string;
}

interface QueryResult {
  success: boolean;
  data?: any[];
  rowsAffected?: number | number[];
  messages?: { message: string, line?: number }[];
  rawError?: string;
  errorLine?: number | null;
}

export default function QueriesPage() {
  const { t } = useTranslation();
  const { isDbConnected } = useDatabaseContext();

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const tabCounter = useRef(1);

  const [tabToClose, setTabToClose] = useState<OpenTab | null>(null);

  const [queries, setQueries] = useState<Query[]>([]);
  const [dbSchema, setDbSchema] = useState<{
    tables: string[];
    views: string[];
    procedures: string[];
    columns: string[];
  }>({ tables: [], views: [], procedures: [], columns: [] });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const [showLivePanel, setShowLivePanel] = useState(false);

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

  // --- RESIZING STATE ---
  const [splitHeight, setSplitHeight] = useState(60); // Percentage for Editor
  const [isResizing, setIsResizing] = useState(false);
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<"results" | "messages">("results");
  const [targetLine, setTargetLine] = useState<{ line: number; timestamp: number } | null>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const startResizing = useCallback(() => {
    setIsResizing(true);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    if (editorPaneRef.current) {
      const inlineHeight = editorPaneRef.current.style.height;
      if (inlineHeight && inlineHeight.endsWith('%')) {
        setSplitHeight(parseFloat(inlineHeight));
      }
    }
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || !splitContainerRef.current || !editorPaneRef.current) return;
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    rafRef.current = requestAnimationFrame(() => {
      if (!splitContainerRef.current || !editorPaneRef.current) return;
      const containerRect = splitContainerRef.current.getBoundingClientRect();
      const relativeY = e.clientY - containerRect.top;
      const newHeight = (relativeY / containerRect.height) * 100;
      if (newHeight > 5 && newHeight < 95) {
        editorPaneRef.current.style.height = `${newHeight}%`;
      }
    });
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const activeTab = openTabs.find((t) => t.id === activeTabId) || null;
  const editorCode = activeTab?.content || "";
  const isModified = activeTab ? activeTab.content !== activeTab.originalContent : false;

  const activeTabRef = useRef(activeTab);
  const activeTabIdRef = useRef(activeTabId);
  const isInitialized = useRef(false);

  useEffect(() => {
    activeTabRef.current = activeTab;
    activeTabIdRef.current = activeTabId;
  }, [activeTab, activeTabId]);

  const startNewQuery = useCallback(() => {
    const newName = `SQLQuery_${tabCounter.current}`;
    tabCounter.current += 1;
    const newTab: OpenTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      filename: null,
      name: newName,
      content: "",
      originalContent: "",
    };
    setOpenTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  useEffect(() => {
    if (isDbConnected) {
      loadQueries();
      loadDatabaseSchema();
    }
    if (!isInitialized.current) {
      startNewQuery();
      isInitialized.current = true;
    }
  }, [startNewQuery, isDbConnected]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        if (isDbConnected && activeTabRef.current && activeTabRef.current.content.trim()) {
          handleExecuteInitiate();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "t") {
        e.preventDefault();
        startNewQuery();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (activeTabRef.current) {
          handleCloseTabRequest({ stopPropagation: () => { } } as any, activeTabRef.current);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startNewQuery, isDbConnected]);

  useEffect(() => {
    setResult(null);
    setShowLivePanel(false);
  }, [activeTabId]);

  const loadQueries = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.fsReadQueries();
        if (res && res.success) setQueries(res.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseSchema = async () => {
    if (!isDbConnected) return;
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.dbExecuteQuery(SCHEMA_QUERY);
        if (res?.success && res.data) {
          const schema = { tables: [] as string[], views: [] as string[], procedures: [] as string[], columns: [] as string[] };
          res.data.forEach((row: any) => {
            if (row.ItemType === "TABLE") schema.tables.push(row.ItemName);
            else if (row.ItemType === "VIEW") schema.views.push(row.ItemName);
            else if (row.ItemType === "PROCEDURE") schema.procedures.push(row.ItemName);
            else if (row.ItemType === "COLUMN") schema.columns.push(row.ItemName);
          });
          setDbSchema(schema);
        }
      }
    } catch (error) {
      console.error("Şema yüklenemedi:", error);
    }
  };

  const handleSelectQueryFromSidebar = (filename: string) => {
    const existingTab = openTabs.find((t) => t.filename === filename);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    const query = queries.find((q) => q.filename === filename);
    if (query) {
      const newTab: OpenTab = {
        id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        filename: query.filename,
        name: query.name,
        content: query.content,
        originalContent: query.content,
      };
      setOpenTabs([...openTabs, newTab]);
      setActiveTabId(newTab.id);
    }
  };

  const handleCloseTabRequest = (e: React.MouseEvent, tab: OpenTab) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (tab.content !== tab.originalContent || (!tab.filename && tab.content.trim() !== "")) {
      setTabToClose(tab);
    } else {
      closeTabForcefully(tab.id);
    }
  };

  const handleTabMouseDown = (e: React.MouseEvent, tab: OpenTab) => {
    if (e.button === 1) {
      e.preventDefault();
      handleCloseTabRequest(e, tab);
    }
  };

  const closeTabForcefully = (idToClose: string) => {
    setOpenTabs((prevTabs) => {
      const newTabs = prevTabs.filter((t) => t.id !== idToClose);

      if (activeTabIdRef.current === idToClose) {
        if (newTabs.length > 0) {
          const closedIndex = prevTabs.findIndex(t => t.id === idToClose);
          const nextActive = newTabs[closedIndex - 1] || newTabs[0];
          setActiveTabId(nextActive.id);
        } else {
          setActiveTabId(null);
        }
      }
      return newTabs;
    });
    setTabToClose(null);
  };

  const handleEditorChange = (val: string) => {
    if (!activeTabId) return;
    setOpenTabs((tabs) =>
      tabs.map((t) => (t.id === activeTabId ? { ...t, content: val } : t))
    );
    if (result && !result.success) setResult(null);
  };

  const handleExecuteInitiate = () => {
    if (!activeTabRef.current || !isDbConnected) return;
    const currentTab = activeTabRef.current;

    const isUntouchedSavedQuery = currentTab.filename && currentTab.content === currentTab.originalContent;

    if (isUntouchedSavedQuery) {
      executeQuery(false);
    } else {
      executeWithAuth("customQueryExecution", () => executeQuery(false), {
        title: t("queries.customQueryAuthTitle", "Sorgu Çalıştırma Yetkisi"),
        description: t("queries.customQueryAuthDesc", "Bu sorguyu çalıştırmak için şifrenizi girin."),
      });
    }
  };

  const handleSaveInitiate = () => {
    if (!activeTabRef.current) return;
    const currentTab = activeTabRef.current;

    executeWithAuth(
      "queryManagement",
      () => {
        setNewQueryName(currentTab.filename ? currentTab.name : currentTab.name.replace("SQLQuery_", "Sorgu "));
        setIsSaveModalOpen(true);
      },
      {
        title: t("queries.saveAuthTitle", "Sorgu Kaydetme Yetkisi"),
        description: t("queries.saveAuthDesc", "Sorguyu kaydetmek için şifrenizi girin."),
      }
    );
  };

  const handleUpdateInitiate = () => {
    executeWithAuth("queryManagement", handleUpdateCurrentQuery, {
      title: t("queries.updateAuthTitle", "Sorgu Güncelleme Yetkisi"),
      description: t("queries.updateAuthDesc", "Sorguyu güncellemek için şifrenizi girin."),
    });
  };

  const handleDeleteInitiate = () => {
    executeWithAuth("queryManagement", () => setIsDeleteModalOpen(true), {
      title: t("queries.deleteAuthTitle", "Sorgu Silme Yetkisi"),
      description: t("queries.deleteAuthDesc", "Sorguyu silmek için şifrenizi girin."),
    });
  };

  const executeQuery = async (isSilent: boolean = false) => {
    const currentTab = activeTabRef.current;
    if (!currentTab || !currentTab.content.trim() || !isDbConnected) return;

    if (!isSilent) {
      setLoading(true);
      setSortConfig(null);
    }

    try {
      const execResult = await window.electronAPI.dbExecuteQuery(currentTab.content);
      if (execResult?.success) {
        setResult({ 
          success: true, 
          data: execResult.data, 
          rowsAffected: execResult.rowsAffected,
          messages: execResult.messages
        });
        if (execResult.messages && execResult.messages.length > 0 && (!execResult.data || execResult.data.length === 0)) {
          setActiveResultTab("messages");
        } else {
          setActiveResultTab("results");
        }
      } else {
        const rawMsg = execResult?.message || t("common.error");
        setResult({ success: false, rawError: rawMsg, errorLine: execResult?.lineNumber || extractLineNumber(rawMsg) });
      }
    } catch (error: any) {
      setResult({ success: false, rawError: error.message, errorLine: error.lineNumber || extractLineNumber(error.message) });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSaveQuery = async () => {
    const currentTab = activeTabRef.current;
    if (!currentTab || !newQueryName.trim() || !currentTab.content.trim()) return;

    setLoading(true);
    try {
      const savedName = newQueryName.endsWith(".sql") ? newQueryName : `${newQueryName}.sql`;
      const res = await window.electronAPI.fsSaveQuery({
        filename: savedName,
        content: currentTab.content,
      });
      if (res?.success) {
        setIsSaveModalOpen(false);
        await loadQueries();

        setOpenTabs((tabs) =>
          tabs.map((t) =>
            t.id === currentTab.id
              ? { ...t, filename: savedName, name: newQueryName, originalContent: currentTab.content }
              : t
          )
        );

        if (tabToClose && tabToClose.id === currentTab.id) {
          closeTabForcefully(tabToClose.id);
        }

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
    const currentTab = activeTabRef.current;
    if (!currentTab || !currentTab.filename || !currentTab.content.trim()) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.fsSaveQuery({
        filename: currentTab.filename,
        content: currentTab.content,
      });
      if (res?.success) {
        await loadQueries();
        setOpenTabs((tabs) =>
          tabs.map((t) => (t.id === currentTab.id ? { ...t, originalContent: currentTab.content } : t))
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuery = async () => {
    const currentTab = activeTabRef.current;
    if (!currentTab || !currentTab.filename) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.fsDeleteQuery(currentTab.filename);
      if (res?.success) {
        setIsDeleteModalOpen(false);
        await loadQueries();
        closeTabForcefully(currentTab.id);
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

  const handleSort = (column: string, direction: SortDirection) => {
    setSortConfig({ column, direction });
    if (result?.data) {
      const sorted = [...result.data].sort((a, b) => {
        const valA = a[column];
        const valB = b[column];
        if (valA === valB) return 0;
        if (valA === null) return direction === "ASC" ? -1 : 1;
        if (valB === null) return direction === "ASC" ? 1 : -1;
        return direction === "ASC" ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
      });
      setResult({ ...result, data: sorted });
    }
  };

  return (
    <PageLayout
      sidebar={
        <SearchableListPanel
          title={t("queries.title", "Sorgular")}
          icon={FileCode}
          items={queries.map((q) => ({ id: q.filename, label: q.name }))}
          selectedItemId={activeTab?.filename || null}
          onSelect={isDbConnected ? handleSelectQueryFromSidebar : () => {}}
          onRefresh={isDbConnected ? () => {
            loadQueries();
            loadDatabaseSchema();
          } : undefined}
          loading={loading}
          description={!isDbConnected ? t("common.noConnection", "Bağlantı Yok") : undefined}
        />
      }
    >
      <div className="flex-1 overflow-hidden p-4 md:p-6 bg-muted/5 flex flex-col gap-4">

        <div className="shrink-0">

        <PageHeader
          title={t("queries.pageTitle", "Sorgu Konsolu")}
          icon={FileCode}
          description={t("queries.pageDescription", "Özel SQL sorguları oluşturun, çalıştırın ve sonuçları inceleyin.")}
          badges={[
            {
              label: t("queries.activeQuery", "Aktif Sekme"),
              value: activeTab ? activeTab.name : "Hiçbiri"
            },
            ...(isModified
              ? [{ label: t("queries.statusBadge", "DURUM"), value: t("queries.modified", "DEĞİŞTİRİLDİ").toUpperCase() }]
              : []),
            ...(!isDbConnected ? [{ label: "CONNECTION", value: "DISCONNECTED", className: "bg-destructive text-destructive-foreground" }] : [])
          ]}
          showLimitSelector={false}
          showFilterButton={false}
          showRefreshButton={false}
          showLiveButton={false}
          showRecordCount={false}
          customActions={activeTab && isDbConnected && (
            <div className="flex items-center gap-2">
              {activeTab.filename ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateInitiate}
                    disabled={!isModified || loading}
                    className={cn("h-9", isModified && "border-primary/50 text-primary hover:bg-primary/10")}
                  >
                    <Save className="w-4 h-4 mr-1.5" /> {t("queries.overwrite", "Kaydet")}
                  </Button>

                  <ActionTooltip label={t("queries.deleteQueryTitle", "Sil")} side="bottom">
                    <Button variant="ghost" size="icon" onClick={handleDeleteInitiate} className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </ActionTooltip>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleSaveInitiate} disabled={!editorCode.trim()} className="h-9">
                  <Save className="w-4 h-4 mr-1.5" /> {t("queries.save", "Farklı Kaydet")}
                </Button>
              )}

              <div className="w-px h-6 bg-border mx-1" />

              <ActionTooltip label="Kısayol: F5" side="bottom">
                <Button onClick={handleExecuteInitiate} disabled={loading || !editorCode.trim()} className="h-9 px-6">
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2 fill-current" />}
                  {t("queries.run", "Çalıştır")}
                </Button>
              </ActionTooltip>
            </div>
          )}
        />
      </div>

        {!isDbConnected ? (
          <ConnectionRequired />
        ) : (
          <div
            ref={splitContainerRef}
            className="flex-1 flex flex-col overflow-hidden min-h-0 gap-1.5 select-none"
          >
            <div
              ref={editorPaneRef}
              className={cn(
                "border rounded-xl flex flex-col overflow-hidden relative shrink-0 min-h-0",
                !isResizing && "transition-all duration-300"
              )}
              style={{
                height: !result
                  ? "100%"
                  : isResultsCollapsed
                    ? "calc(100% - 60px)"
                    : `${splitHeight}%`
              }}
            >

            <div 
              className="flex w-full items-end border-b shrink-0 z-30 glass-card backdrop-blur-xl rounded-none"
            >
              <div className="flex-1 flex items-center overflow-x-auto overflow-y-hidden gap-1 custom-scrollbar pt-2 pl-2">
                {openTabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    onMouseDown={(e) => handleTabMouseDown(e, tab)}
                    className={cn(
                      "group relative flex items-center h-10 px-4 min-w-[140px] max-w-[250px] border-t border-x rounded-t-lg cursor-pointer transition-all select-none mb-[-1px]",
                      activeTabId === tab.id
                        ? "bg-background border-border text-foreground z-10 before:absolute before:bottom-0 before:left-0 before:right-0 before:h-[2px] before:bg-background"
                        : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <FileText className={cn("w-3.5 h-3.5 mr-2 shrink-0", activeTabId === tab.id ? "text-primary" : "opacity-50")} />
                    <span className="truncate text-sm font-medium flex-1">
                      {tab.name}
                      {(tab.content !== tab.originalContent || (!tab.filename && tab.content.trim() !== "")) && (
                        <span className="ml-1.5 text-warning inline-block w-2 h-2 rounded-full bg-warning" title="Kaydedilmemiş değişiklikler"></span>
                      )}
                    </span>

                    <ActionTooltip label={t("queries.closeTab", "Sekmeyi Kapat (Ctrl + W)")} side="bottom">
                      <div
                        className="ml-2 w-5 h-5 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                        onClick={(e) => handleCloseTabRequest(e, tab)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </div>
                    </ActionTooltip>
                  </div>
                ))}
              </div>

              <div className="shrink-0 flex items-center justify-center px-3 border-l border-border/40 bg-muted/20 h-10">
                <ActionTooltip label={t("queries.newQueryShortcut", "Yeni Sekme (Ctrl + T)")} side="left">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startNewQuery}
                    className="h-7 w-7 p-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border/50"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </ActionTooltip>
              </div>

            </div>

            <div className="flex-1 relative flex flex-col bg-background min-h-0">
              {!activeTabId ? (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50 glass-card backdrop-blur-lg z-20 rounded-none border-0"
                >
                  <FileCode className="w-16 h-16 mb-4 opacity-30" />
                  <p>{t("queries.noTabMessage", "Yeni bir sorgu sekmesi açın veya sol menüden seçin.")}</p>
                  <Button variant="outline" className="mt-4" onClick={startNewQuery}>
                    <Plus className="w-4 h-4 mr-2" /> {t("queries.newQuery")}
                  </Button>
                </div>
              ) : (
                <>
                  <div 
                    className="flex-1 w-full h-full relative min-h-0"
                    style={{ pointerEvents: isResizing ? 'none' : 'auto' }}
                  >
                    <SqlCodeViewer
                      code={editorCode}
                      onChange={(val) => handleEditorChange(val || "")}
                      wordWrap="on"
                      errorLine={result?.success === false ? result.errorLine : null}
                      errorMessage={result?.success === false ? result.rawError : null}
                      dbSchema={dbSchema}
                      targetLine={targetLine}
                    />
                    {!editorCode.trim() && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-muted-foreground/30 font-mono text-lg select-none">
                        {t("queries.editorPlaceholder")}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            </div>

            {activeTabId && result && (
              <>
                <div
                  className={cn(
                    "h-1.5 shrink-0 rounded-full cursor-row-resize transition-all duration-200 flex items-center justify-center group",
                    isResizing ? "bg-primary" : "bg-border/40 hover:bg-primary/40",
                    isResultsCollapsed && "hidden"
                  )}
                  onMouseDown={startResizing}
                >
                  <div className={cn(
                    "w-12 h-1 rounded-full transition-colors",
                    isResizing ? "bg-primary-foreground/30" : "bg-muted-foreground/20 group-hover:bg-primary/40"
                  )} />
                </div>

                <div
                  className={cn(
                    "glass-card border rounded-xl flex flex-col overflow-hidden transition-all duration-300",
                    isResultsCollapsed ? "flex-none h-[48px]" : "flex-1 min-h-0",
                    !result.success && !isResultsCollapsed && "flex-initial h-fit max-h-[40%]"
                  )}
                >
                  {result.success ? (
                    <>
                      <div className="shrink-0 px-4 py-2 border-b flex justify-between items-center bg-success/10 border-success/20 h-[52px]">
                        <div className="flex items-center gap-3">
                          <ActionTooltip label={isResultsCollapsed ? t("common.expand", "Genişlet") : t("common.collapse", "Daralt")} side="right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:bg-success/20 shrink-0"
                              onClick={() => setIsResultsCollapsed(!isResultsCollapsed)}
                            >
                              {isResultsCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </ActionTooltip>

                          <div className="w-px h-4 bg-success/20 shrink-0" />

                          <div className="flex items-center gap-2 mr-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            <span className="text-sm font-bold text-success whitespace-nowrap">{t("queries.querySuccess")}</span>
                          </div>

                          {!isResultsCollapsed && (
                            <div className="flex items-center bg-background/40 p-0.5 rounded-lg border border-success/20 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveResultTab("results")}
                                className={cn(
                                  "h-7 px-3 text-xs font-medium transition-all",
                                  activeResultTab === "results"
                                    ? "bg-success text-success-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-success"
                                )}
                              >
                                {t("queries.results", "Sonuçlar")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveResultTab("messages")}
                                className={cn(
                                  "h-7 px-3 text-xs font-medium transition-all flex items-center gap-1.5",
                                  activeResultTab === "messages"
                                    ? "bg-success text-success-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-success"
                                )}
                              >
                                {t("queries.messages", "Mesajlar")}
                                {result.messages && result.messages.length > 0 && (
                                  <span className={cn("flex h-1.5 w-1.5 rounded-full", activeResultTab === "messages" ? "bg-success-foreground/60" : "bg-muted-foreground/40")} />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {result.rowsAffected && (
                            <span className="hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded bg-background border border-success/20 text-success/70">
                              {t("queries.rowsAffected", { count: Array.isArray(result.rowsAffected) ? result.rowsAffected[0] : result.rowsAffected })}
                            </span>
                          )}
                          {result.data && result.data.length > 0 && activeResultTab === "results" && !isResultsCollapsed && (
                            <Button variant="outline" size="sm" className="h-8 text-xs bg-background border-success/20 text-success hover:bg-success/5" onClick={handleExportExcel}>
                              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                              {t("queries.exportExcel")}
                            </Button>
                          )}
                        </div>
                      </div>

                      {!isResultsCollapsed && (
                        <div className="flex-1 overflow-hidden relative bg-muted/5">
                          {activeResultTab === "results" ? (
                            result.data && result.data.length > 0 ? (
                              <DataTable
                                data={result.data}
                                columns={Object.keys(result.data[0] || {}).map((key) => ({ name: key }))}
                                title={activeTab?.name || ""}
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                className="border-0 rounded-none shadow-none"
                              />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50">
                                <Database className="w-12 h-12 mb-3 opacity-20" />
                                {t("queries.noDataReturned")}
                              </div>
                            )
                          ) : (
                            <div className="p-6 font-mono text-xs whitespace-pre-wrap overflow-auto h-full custom-scrollbar">
                              {result.messages && result.messages.length > 0 ? (
                                result.messages.map((m, idx) => (
                                  <div key={idx} className="mb-2 py-1.5 px-3 rounded bg-background border border-border/40 hover:border-primary/30 transition-colors group cursor-default">
                                    <span className="text-primary/70 font-bold mr-2 select-none opacity-50">[{new Date().toLocaleTimeString()}]</span>
                                    <span className="text-foreground/90">{m.message}</span>
                                    {m.line && (
                                      <Button 
                                        variant="link" 
                                        className="h-auto p-0 ml-2 text-[10px] text-primary/50 group-hover:text-primary transition-colors"
                                        onClick={() => setTargetLine({ line: m.line!, timestamp: Date.now() })}
                                      >
                                        Line {m.line}
                                      </Button>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-muted-foreground/40 italic">{t("queries.noMessages")}</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-6 flex flex-col h-full bg-destructive/5 overflow-hidden">
                      <div className="flex items-center gap-3 mb-4 shrink-0">
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <Bug className="w-4 h-4 text-destructive" />
                        </div>
                        <h3 className="text-sm font-bold text-destructive">{t("queries.queryFailed")}</h3>
                      </div>
                      <div className="flex-1 bg-background rounded-lg border border-destructive/20 p-4 overflow-auto custom-scrollbar shadow-inner">
                        <pre className="text-xs font-mono text-destructive/80 leading-relaxed whitespace-pre-wrap italic">
                          {result.rawError}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("queries.saveQuery")}</DialogTitle>
            <DialogDescription>{t("queries.saveQueryDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>{t("queries.queryName")}</Label>
              <Input
                value={newQueryName}
                onChange={(e) => setNewQueryName(e.target.value)}
                placeholder={t("queries.queryNamePlaceholder")}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveQuery} disabled={loading || !newQueryName.trim()}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t("queries.deleteQuery")}
            </DialogTitle>
            <DialogDescription>{t("queries.deleteQueryDesc", { name: activeTab?.name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuery} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tabToClose} onOpenChange={(open) => !open && setTabToClose(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("queries.unsavedChanges")}</DialogTitle>
            <DialogDescription>{t("queries.unsavedChangesDesc", { name: tabToClose?.name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <div className="flex-1 flex gap-2">
              <Button variant="destructive" onClick={() => tabToClose && closeTabForcefully(tabToClose.id)}>
                {t("queries.dontSave")}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTabToClose(null)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={() => {
                if (tabToClose) {
                  if (tabToClose.filename) {
                    handleUpdateCurrentQuery();
                  } else {
                    handleSaveInitiate();
                  }
                }
              }}>
                {t("common.save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={handlePasswordSuccess}
        title={modalContext?.title}
        description={modalContext?.description}
      />
    </PageLayout>
  );
}
