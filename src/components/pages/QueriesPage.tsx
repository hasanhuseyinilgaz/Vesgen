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
  FileSpreadsheet
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
import PageHeader from "@/components/PageHeader";

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

  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // 🚀 ÇÖZÜM 1: Sayaç (Counter) artık bir State değil, Ref! Böylece Ctrl+T her zaman en güncel sayıyı bilir.
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
    
    // Commit the final dragged height to React state to persist it
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
        // Direct DOM manipulation entirely bypasses costly React re-renders for buttery smooth dragging
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

  // Yeni Sorgu Açma Fonksiyonu (Referans ile çalışır)
  const startNewQuery = useCallback(() => {
    const newName = `SQLQuery_${tabCounter.current}`;
    tabCounter.current += 1; // Her çağrıldığında referansı gizlice 1 artırır
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
    if (!isInitialized.current) {
      loadQueries();
      loadDatabaseSchema();
      startNewQuery();
      isInitialized.current = true;
    }
  }, [startNewQuery]);

  // --- KLAVYE KISAYOLLARI (F5, CTRL+T, CTRL+W) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        if (activeTabRef.current && activeTabRef.current.content.trim()) {
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
  }, [startNewQuery]);

  useEffect(() => {
    setResult(null);
    setShowLivePanel(false);
  }, [activeTabId]);

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
        const res = await (window as any).electronAPI.dbExecuteQuery(schemaQuery);
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
    if (!activeTabRef.current) return;
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
    if (!currentTab || !currentTab.content.trim()) return;

    if (!isSilent) {
      setLoading(true);
      setSortConfig(null);
    }

    try {
      const execResult = await (window as any).electronAPI.dbExecuteQuery(currentTab.content);
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
      const res = await (window as any).electronAPI.fsSaveQuery({
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
      const res = await (window as any).electronAPI.fsSaveQuery({
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
      const res = await (window as any).electronAPI.fsDeleteQuery(currentTab.filename);
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

  const handleLiveRefresh = useCallback(() => {
    executeQuery(true);
  }, [activeTab, sortConfig]);

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
        <SearchableSidebar
          title={t("queries.title", "Sorgular")}
          icon={FileCode}
          items={queries.map((q) => ({ id: q.filename, label: q.name }))}
          selectedItemId={activeTab?.filename || null}
          onSelect={handleSelectQueryFromSidebar}
          onRefresh={() => {
            loadQueries();
            loadDatabaseSchema();
          }}
          loading={loading}
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
              : [])
          ]}
          showLimitSelector={false}
          showFilterButton={false}
          showRefreshButton={false}
          showLiveButton={false}
          showRecordCount={false}
          customActions={activeTab && (
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

          {/* 🚀 ÇÖZÜM 2: Sabit (+) Butonu İçin Özel Flexbox Mimarisi */}
          <div 
            className="flex w-full items-end border-b shrink-0 z-30 glass-card backdrop-blur-xl rounded-none"
          >

            {/* Sol Taraf - Kaydırılabilir Sekmeler */}
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

            {/* Sağ Taraf - Sabit ve Asla Kaybolmayan (+) Butonu */}
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
              {/* Divider / Resizer Handle */}
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
                              data={result.data || []}
                              columns={Object.keys(result.data?.[0] || {}).map((k) => ({ name: k }))}
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
                          )
                        ) : (
                          <div className="absolute inset-0 flex flex-col bg-background p-6 overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed">
                            {result.messages && result.messages.length > 0 ? (
                              <div className="space-y-4">
                                {result.messages.map((msg: any, i: number) => {
                                  const isObj = typeof msg === 'object' && msg !== null;
                                  const messageText = isObj ? msg.message : msg;
                                  const messageLine = isObj ? msg.line : undefined;
                                  
                                  return (
                                    <div 
                                      key={i} 
                                      className="group flex gap-3 items-start border-l-2 border-border/20 pl-4 py-1.5 hover:border-success/40 hover:bg-success/5 transition-all cursor-pointer rounded-r-lg"
                                      onClick={() => messageLine && setTargetLine({ line: messageLine, timestamp: Date.now() })}
                                    >
                                      <div className="mt-2 shrink-0 h-1.5 w-1.5 rounded-full bg-muted-foreground/30 group-hover:bg-success/50 transition-colors" />
                                      {messageLine && (
                                        <span className="mt-0.5 shrink-0 text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 group-hover:bg-success/10 group-hover:text-success group-hover:border-success/20 transition-colors">
                                          Satır {messageLine}
                                        </span>
                                      )}
                                      <span className="text-foreground/80 whitespace-pre-wrap flex-1 mt-0.5 leading-relaxed">{messageText}</span>
                                    </div>
                                  );
                                })}
                                <div className="pt-4 border-t border-border/10 text-[10px] text-muted-foreground uppercase tracking-widest pl-4">
                                  {t("queries.executionFinished", "Sorgu yürütme tamamlandı.")}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-30">
                                <TerminalSquare className="w-12 h-12 mb-3" />
                                <p>{t("queries.noMessages", "Yazdırılacak mesaj yok.")}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full bg-background flex flex-col h-full overflow-hidden">
                    <div className="px-4 py-2 border-b border-destructive/20 bg-destructive/5 flex items-center gap-3 shrink-0 h-[52px]">
                      <ActionTooltip label={isResultsCollapsed ? t("common.expand", "Genişlet") : t("common.collapse", "Daralt")} side="right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => setIsResultsCollapsed(!isResultsCollapsed)}
                        >
                          {isResultsCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </ActionTooltip>

                      <div className="w-px h-4 bg-destructive/20 shrink-0" />

                      <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <Bug className="w-4 h-4 text-destructive shrink-0" />
                        <span className="font-bold text-destructive truncate">{t("queries.sqlErrorOutput")}</span>
                      </div>

                      {result.errorLine && (
                        <span className="text-[10px] font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded font-bold border border-destructive/20 shrink-0">
                          {t("queries.line")} {result.errorLine}
                        </span>
                      )}
                    </div>

                    {!isResultsCollapsed && (
                      <div 
                        className="p-5 glass-card border-t-4 border-destructive flex-1 overflow-y-auto custom-scrollbar rounded-none bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                        onClick={() => result.errorLine && setTargetLine({ line: result.errorLine, timestamp: Date.now() })}
                      >
                        <div className="flex items-start gap-4">
                          <TerminalSquare className="w-5 h-5 text-destructive opacity-50 shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-2">
                            <p className="font-mono text-[13px] text-destructive leading-relaxed whitespace-pre-wrap selection:bg-destructive/30">
                              {result.rawError}
                            </p>
                            {result.errorLine && (
                              <span className="text-[10px] text-destructive font-mono bg-destructive/10 px-2 py-0.5 rounded w-fit border border-destructive/20 font-bold">
                                Jump to Error (Line {result.errorLine})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {activeTabId && showLivePanel && (
          <div className="shrink-0 border rounded-xl glass-card overflow-hidden">
            <LiveMonitoringPanel onRefresh={handleLiveRefresh} onStatusChange={() => { }} />
          </div>
        )}
      </div>

      <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} onSuccess={handlePasswordSuccess} title={modalContext.title} description={modalContext.description} />

      <Dialog open={!!tabToClose} onOpenChange={(open) => !open && setTabToClose(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-warning flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Kaydedilmemiş Değişiklikler
            </DialogTitle>
            <DialogDescription className="pt-2">
              <strong className="text-foreground">{tabToClose?.name}</strong> isimli sekmede kaydedilmemiş değişiklikleriniz var. Kaydetmek ister misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-between">
            <Button variant="outline" onClick={() => setTabToClose(null)}>
              {t("common.cancel", "İptal")}
            </Button>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => tabToClose && closeTabForcefully(tabToClose.id)} className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive">
                Kaydetmeden Kapat
              </Button>
              <Button
                onClick={() => {
                  if (tabToClose) {
                    setActiveTabId(tabToClose.id);
                    if (tabToClose.filename) {
                      handleUpdateCurrentQuery();
                      closeTabForcefully(tabToClose.id);
                    } else {
                      handleSaveInitiate();
                    }
                  }
                }}
              >
                Değişiklikleri Kaydet
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("queries.saveQueryTitle")}</DialogTitle>
            <DialogDescription>{t("queries.saveQueryDesc")}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>{t("queries.queryNameLabel")}</Label>
            <Input placeholder={t("queries.queryNamePlaceholder")} value={newQueryName} onChange={(e) => setNewQueryName(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveQuery} disabled={!newQueryName.trim() || loading}>{t("queries.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {t("queries.deleteQueryTitle")}</DialogTitle>
            <DialogDescription className="pt-2">
              <strong className="text-foreground">{activeTab?.name}</strong> {t("queries.deleteQueryDesc1")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteQuery} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("queries.yesDelete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}