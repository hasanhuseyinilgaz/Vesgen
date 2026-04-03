import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Database,
  Table as TableIcon,
  Network,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

import { exportToExcel } from "@/lib/exportUtils";
import { useTableData } from "@/hooks/useTableData";
import DataSelectionPanel from "@/components/DataSelectionPanel";
import ActivityMonitorRefreshPanel from "@/components/ActivityMonitorRefreshPanel";
import DataTable from "@/components/DataTable";
import EmptyState from "@/components/EmptyState";
import SearchableListPanel from "@/components/SearchableListPanel";
import PageHeader from "@/components/PageHeader";
import PageLayout from "@/components/PageLayout";
import CustomTabs from "@/components/ui/custom-tabs";
import SchemaDiagram from "@/components/schema/SchemaDiagram";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface Table {
  TABLE_NAME: string;
}

export default function TablesPage() {
  const { t } = useTranslation();
  const [tables, setTables] = useState<Table[]>([]);
  const [activeTab, setActiveTab] = useState<"data" | "schema">("data");
  const [isDiagramModalOpen, setIsDiagramModalOpen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [updateResultModal, setUpdateResultModal] = useState({
    isOpen: false,
    success: false,
    message: "",
  });

  const {
    data: tableData,
    columns,
    loading,
    setLoading,
    activeItem: selectedTable,
    topRows,
    setTopRows,
    activeWhereClause,
    activeJoins,
    sortConfig,
    showFilter,
    setShowFilter,
    showLivePanel,
    setShowLivePanel,
    isLiveActive,
    setIsLiveActive,
    loadData: loadTableData,
    handleSort,
    resetState,
  } = useTableData({
    fetchDataApi: window.electronAPI?.dbGetTableData,
    fetchColumnsApi: window.electronAPI?.dbGetTableColumns,
  });

  const { config, loadConfig } = useSettings();

  useEffect(() => {
    loadTables();
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (selectedTable && activeTab === "schema")
      loadSchemaDiagram(selectedTable);

    // Tablo görünümünden çıkıldığında panelleri kapat ve canlı izlemeyi durdur
    if (activeTab !== "data") {
      setShowFilter(false);
      setShowLivePanel(false);
      setIsLiveActive(false);
    }
  }, [selectedTable, activeTab]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI?.dbGetTables();
      if (result?.success) setTables(result.data || []);
    } finally {
      setLoading(false);
    }
  };

  const loadSchemaDiagram = async (tableName: string) => {
    setLoading(true);
    try {
      const relResult = await window.electronAPI.dbGetTableRelations(tableName);
      if (!relResult?.success) return;

      const relations = relResult.data;
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Komşu tabloların sütunlarını topla
      const neighbors = relations.map((r: any) =>
        r.SourceTable === tableName ? r.TargetTable : r.SourceTable,
      );
      const uniqueNeighbors = Array.from(new Set(neighbors)).filter(
        (n) => n !== tableName,
      ) as string[];

      // Komşu sütunları fetch et
      const neighborColumns: Record<string, any[]> = {};
      await Promise.all(
        uniqueNeighbors.map(async (nName) => {
          const colRes = await window.electronAPI.dbGetTableColumns(nName);
          neighborColumns[nName] = colRes?.success && colRes.data ? colRes.data : [];
        }),
      );

      // --- NODE YERLEŞİM ALGORİTMASI ---
      // Ana tablo: ortada (x=0, y=0)
      // Kaynak tablolar (SourceTable=tableName → targetTable): sağ sütun
      // Referans tablolar (ana tablo referenced): sol sütun
      const NODE_WIDTH = 320;
      const NODE_V_GAP = 80; // node'lar arası dikey boşluk (px)

      // Sütunları tahmin ederek node yüksekliğini hesapla
      const estimateHeight = (colCount: number) => 48 + colCount * 40 + 16;

      const mainColCount = columns?.length ?? 8;
      const mainHeight = estimateHeight(mainColCount);

      // Ana tablo merkeze
      newNodes.push({
        id: tableName,
        type: "tableNode",
        position: { x: 0, y: -(mainHeight / 2) },
        data: { label: tableName, columns: columns },
      });

      // Komşuları iki gruba ayır: ana tablodan çıkanlar (sağ) ve ana tabloya girenler (sol)
      const rightNeighbors: string[] = [];
      const leftNeighbors: string[] = [];
      const seen = new Set<string>();

      relations.forEach((rel: any) => {
        const other = rel.SourceTable === tableName ? rel.TargetTable : rel.SourceTable;
        if (seen.has(other) || other === tableName) return;
        seen.add(other);
        if (rel.SourceTable === tableName) {
          rightNeighbors.push(other);
        } else {
          leftNeighbors.push(other);
        }
      });

      // Sağ sütun (ana tablodan çıkan FK'lar - target)
      const H_GAP = 160; // node'lar arası yatay boşluk
      let rightY = 0;
      const rightTotalH = rightNeighbors.reduce(
        (acc, n) => acc + estimateHeight(neighborColumns[n]?.length ?? 5) + NODE_V_GAP,
        0,
      );
      rightY = -(rightTotalH / 2);

      rightNeighbors.forEach((nName) => {
        const h = estimateHeight(neighborColumns[nName]?.length ?? 5);
        newNodes.push({
          id: nName,
          type: "tableNode",
          position: { x: NODE_WIDTH + H_GAP, y: rightY },
          data: { label: nName, columns: neighborColumns[nName] },
        });
        rightY += h + NODE_V_GAP;
      });

      // Sol sütun (ana tabloya giren FK'lar - source)
      let leftY = 0;
      const leftTotalH = leftNeighbors.reduce(
        (acc, n) => acc + estimateHeight(neighborColumns[n]?.length ?? 5) + NODE_V_GAP,
        0,
      );
      leftY = -(leftTotalH / 2);

      leftNeighbors.forEach((nName) => {
        const h = estimateHeight(neighborColumns[nName]?.length ?? 5);
        newNodes.push({
          id: nName,
          type: "tableNode",
          position: { x: -(NODE_WIDTH + H_GAP), y: leftY },
          data: { label: nName, columns: neighborColumns[nName] },
        });
        leftY += h + NODE_V_GAP;
      });

      // --- EDGE'LER ---
      // sourceHandle / targetHandle kaldırıldı → oklar node kenarından çıkar (karışıklık yok)
      const edgeIds = new Set<string>();
      relations.forEach((rel: any) => {
        const edgeId = `e-${rel.SourceTable}-${rel.TargetTable}-${rel.SourceColumn}-${rel.TargetColumn}`;
        if (edgeIds.has(edgeId)) return;
        edgeIds.add(edgeId);

        newEdges.push({
          id: edgeId,
          source: rel.SourceTable,
          target: rel.TargetTable,
          sourceHandle: `${rel.SourceTable}-${rel.SourceColumn}`,
          targetHandle: `${rel.TargetTable}-${rel.TargetColumn}`,
          type: "default", // Bezier curves avoid overlapping straight segments
          animated: false,
          label: `${rel.SourceColumn} → ${rel.TargetColumn}`,
          markerEnd: { type: "arrowclosed" as any, color: "hsl(var(--primary))", width: 20, height: 20 },
        });
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } finally {
      setLoading(false);
    }
  };


  const handleTableSelect = (tableName: string) => {
    resetState();
    loadTableData(tableName, "", null);
    setActiveTab("data");
  };

  const handleUpdateRecord = async (originalRecord: any, changedData: any) => {
    if (!selectedTable) return false;
    const identityCol = columns.find((c: any) => c.IS_IDENTITY === 1);
    if (!identityCol) return false;
    try {
      const result = await window.electronAPI.dbUpdateRecord({
        tableName: selectedTable,
        idColumn: identityCol.COLUMN_NAME,
        idValue: originalRecord[identityCol.COLUMN_NAME],
        newData: changedData,
      });
      if (result.success) {
        setUpdateResultModal({
          isOpen: true,
          success: true,
          message: t("tables.recordUpdated"),
        });
        loadTableData(selectedTable, activeWhereClause, sortConfig, true);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  return (
    <PageLayout
      sidebar={
        <SearchableListPanel
          title={t("tables.title")}
          icon={Database}
          items={tables.map((t) => ({ id: t.TABLE_NAME, label: t.TABLE_NAME }))}
          selectedItemId={selectedTable}
          onSelect={handleTableSelect}
          onRefresh={loadTables}
          loading={loading}
        />
      }
    >
      <div className="flex flex-col h-full bg-transparent overflow-hidden">
        <div
          className={cn(
            "flex-1 flex flex-col gap-6 p-6 min-h-0 min-w-0 w-full",
            activeTab === "schema" ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden custom-scrollbar",
          )}
        >
          <PageHeader
            title={t("tables.pageTitle")}
            icon={TableIcon}
            description={t("tables.pageDescription")}
            badges={selectedTable ? [
              {
                label: t("tables.activeTable"),
                value: selectedTable,
              },
              {
                label: "MODE",
                value: activeTab === "data"
                  ? `${tableData.length} ${t("components.dataToolbar.records").toUpperCase()}`
                  : t("tables.tabSchema").toUpperCase(),
              },
            ] : undefined}
            recordCount={selectedTable ? tableData.length : undefined}
            onRefresh={selectedTable ? () =>
              loadTableData(selectedTable, activeWhereClause, sortConfig) : undefined
            }
            showFilter={showFilter}
            onToggleFilter={() => {
              setShowLivePanel(false);
              setShowFilter(!showFilter);
            }}
            isFilterActive={activeWhereClause.trim().length > 0 || activeJoins.length > 0}
            showFilterButton={!!selectedTable && activeTab === "data"}
            showLiveButton={!!selectedTable && activeTab === "data"}
            showRefreshButton={!!selectedTable}
            showLimitSelector={!!selectedTable}
            showRecordCount={!!selectedTable}
            showLivePanel={showLivePanel}
            onToggleLivePanel={() => {
              setShowFilter(false);
              setShowLivePanel(!showLivePanel);
            }}
            isLiveActive={isLiveActive}
            loading={loading}
            onExport={selectedTable ? () => exportToExcel(tableData, selectedTable) : undefined}
            topRows={topRows}
            onTopRowsChange={selectedTable ? (val) => {
              setTopRows(val);
              loadTableData(selectedTable, activeWhereClause, sortConfig);
            } : undefined}
          />

          {selectedTable ? (
            <>
              <div className={cn("mt-0", !showFilter && "hidden")}>
                <DataSelectionPanel
                  tableName={selectedTable}
                  columns={columns}
                  allTables={tables}
                  isApplied={activeWhereClause.trim().length > 0 || activeJoins.length > 0}
                  onApplyFilter={(wc, joins) =>
                    loadTableData(selectedTable, wc, sortConfig, false, joins)
                  }
                  onClearFilter={() =>
                    loadTableData(selectedTable, "", sortConfig, false, [])
                  }
                />
              </div>
              <div className={cn("mt-0", !showLivePanel && "hidden")}>
                <ActivityMonitorRefreshPanel
                  onRefresh={() =>
                    loadTableData(
                      selectedTable,
                      activeWhereClause,
                      sortConfig,
                      true,
                    )
                  }
                  onStatusChange={setIsLiveActive}
                  onAutoSort={() => {
                    const primaryKeyCol = columns.find(
                      (c: any) => c.IS_PRIMARY_KEY === true || c.IS_PRIMARY_KEY === 1
                    );

                    const sortColumn = primaryKeyCol
                      ? primaryKeyCol.COLUMN_NAME
                      : columns[0]?.COLUMN_NAME;

                    if (sortColumn) {
                      handleSort(sortColumn, "DESC");
                    }
                  }}
                />
              </div>

              <CustomTabs
                activeTab={activeTab}
                onTabChange={setActiveTab as any}
                tabs={[
                  { value: "data", label: t("tables.tabData"), icon: TableIcon },
                  {
                    value: "schema",
                    label: t("tables.tabSchema"),
                    icon: Network,
                  },
                ]}
              />

              <div
                className={cn(
                  "w-full",
                  activeTab === "schema" ? "flex-1 min-h-0" : "shrink-0",
                )}
              >
                {activeTab === "data" ? (
                  <DataTable
                    data={tableData}
                    columns={columns.map((c: any) => ({
                      name: c.COLUMN_NAME,
                      type: c.DATA_TYPE,
                      isIdentity: c.IS_IDENTITY === 1,
                    }))}
                    title={selectedTable}
                    sortConfig={sortConfig}
                    enableUpdate={activeJoins.length === 0}
                    persistSettings={activeJoins.length === 0}
                    onSort={handleSort}
                    onUpdateRecord={handleUpdateRecord}
                    defaultPageSize={config?.ui?.table?.defaultPageSize}
                  />
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 relative border rounded-xl overflow-hidden bg-muted/5">
                      <SchemaDiagram
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onFullScreen={() => setIsDiagramModalOpen(true)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center -mt-20 w-full">
              <EmptyState
                icon={TableIcon}
                title={t("tables.readyToTable")}
                description={t("tables.selectToStart")}
              />
            </div>
          )}
        </div>

        <Dialog
          open={updateResultModal.isOpen}
          onOpenChange={(open) =>
            setUpdateResultModal((prev) => ({ ...prev, isOpen: open }))
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle
                className={
                  updateResultModal.success
                    ? "text-success flex items-center"
                    : "text-destructive flex items-center"
                }
              >
                {updateResultModal.success ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2" />
                )}
                {updateResultModal.success
                  ? t("common.success")
                  : t("common.error")}
              </DialogTitle>
              <DialogDescription className="pt-2">
                {updateResultModal.message}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button
                onClick={() =>
                  setUpdateResultModal((prev) => ({ ...prev, isOpen: false }))
                }
              >
                {t("tables.ok")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDiagramModalOpen} onOpenChange={setIsDiagramModalOpen}>
          <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] p-0 border-none shadow-2xl overflow-hidden flex flex-col bg-background">
            <div className="flex-1 relative">
              <SchemaDiagram
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 z-50 bg-background/80 shadow-sm"
                onClick={() => setIsDiagramModalOpen(false)}
              >
                {t("tables.close")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
