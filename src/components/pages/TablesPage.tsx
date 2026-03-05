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
import FilterPanel from "@/components/FilterPanel";
import LiveMonitoringPanel from "@/components/LiveMonitoringPanel";
import DataTable from "@/components/DataTable";
import EmptyState from "@/components/EmptyState";
import SearchableSidebar from "@/components/SearchableSidebar";
import DataToolbar from "@/components/DataToolbar";
import PageLayout from "@/components/PageLayout";
import CustomTabs from "@/components/CustomTabs";
import SchemaDiagram from "@/components/SchemaDiagram";
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
    fetchDataApi: (window as any).electronAPI?.dbGetTableData,
    fetchColumnsApi: (window as any).electronAPI?.dbGetTableColumns,
  });

  useEffect(() => {
    loadTables();
  }, []);

  useEffect(() => {
    if (selectedTable && activeTab === "schema")
      loadSchemaDiagram(selectedTable);
  }, [selectedTable, activeTab]);

  const loadTables = async () => {
    setLoading(true);
    try {
      const result = await (window as any).electronAPI?.dbGetTables();
      if (result?.success) setTables(result.data || []);
    } finally {
      setLoading(false);
    }
  };

  const loadSchemaDiagram = async (tableName: string) => {
    setLoading(true);
    try {
      const relResult = await (window as any).electronAPI.dbGetTableRelations(
        tableName,
      );
      if (!relResult?.success) return;

      const relations = relResult.data;
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      newNodes.push({
        id: tableName,
        type: "tableNode",
        position: { x: 0, y: 0 },
        data: { label: tableName, columns: columns },
      });

      relations.forEach((rel: any) => {
        newEdges.push({
          id: `e-${rel.ForeignKeyName}`,
          source: rel.SourceTable,
          target: rel.TargetTable,
          sourceHandle: rel.SourceColumn,
          targetHandle: rel.TargetColumn,
          label: rel.ForeignKeyName,
          animated: true,
        });
      });

      const neighbors = relations.map((r: any) =>
        r.SourceTable === tableName ? r.TargetTable : r.SourceTable,
      );
      const uniqueNeighbors = Array.from(new Set(neighbors)).filter(
        (n) => n !== tableName,
      );

      const radius = 700;
      for (let i = 0; i < uniqueNeighbors.length; i++) {
        const nName = uniqueNeighbors[i] as string;
        const colRes = await (window as any).electronAPI.dbGetTableColumns(
          nName,
        );

        const angle = (i / uniqueNeighbors.length) * 2 * Math.PI;
        newNodes.push({
          id: nName,
          type: "tableNode",
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          },
          data: { label: nName, columns: colRes?.success ? colRes.data : [] },
        });
      }

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
      const result = await (window as any).electronAPI.dbUpdateRecord({
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
        <SearchableSidebar
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
      <div
        className={cn(
          "h-full bg-background custom-scrollbar",
          activeTab === "data"
            ? "overflow-y-auto"
            : "overflow-hidden flex flex-col",
        )}
      >
        {selectedTable ? (
          <div
            className={cn(
              "p-6 flex flex-col gap-6",
              activeTab === "schema" && "flex-1 overflow-hidden",
            )}
          >
            <div className="flex flex-col gap-0 shrink-0">
              <DataToolbar
                title={selectedTable}
                recordCount={tableData.length}
                onRefresh={() =>
                  loadTableData(selectedTable, activeWhereClause, sortConfig)
                }
                showFilter={showFilter}
                onToggleFilter={() => {
                  setShowLivePanel(false);
                  setShowFilter(!showFilter);
                }}
                isFilterActive={activeWhereClause.trim().length > 0}
                showLiveButton={activeTab === "data"}
                showLivePanel={showLivePanel}
                onToggleLivePanel={() => {
                  setShowFilter(false);
                  setShowLivePanel(!showLivePanel);
                }}
                isLiveActive={isLiveActive}
                loading={loading}
                onExport={() => exportToExcel(tableData, selectedTable)}
                topRows={topRows}
                onTopRowsChange={(val) => {
                  setTopRows(val);
                  loadTableData(selectedTable, activeWhereClause, sortConfig);
                }}
              />
              <div className={cn("mt-4", !showFilter && "hidden")}>
                <FilterPanel
                  columns={columns}
                  onApplyFilter={(wc) =>
                    loadTableData(selectedTable, wc, sortConfig)
                  }
                  onClearFilter={() =>
                    loadTableData(selectedTable, "", sortConfig)
                  }
                />
              </div>
              <div className={cn("mt-4", !showLivePanel && "hidden")}>
                <LiveMonitoringPanel
                  isVisible={showLivePanel}
                  onRefresh={() =>
                    loadTableData(
                      selectedTable,
                      activeWhereClause,
                      sortConfig,
                      true,
                    )
                  }
                  onStatusChange={setIsLiveActive}
                />
              </div>
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
                  enableUpdate={true}
                  onSort={handleSort}
                  onUpdateRecord={handleUpdateRecord}
                />
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex-1 relative border rounded-xl overflow-hidden shadow-inner bg-muted/5">
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
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <EmptyState
              icon={Database}
              title={t("tables.readyToView")}
              description={t("tables.selectToStart")}
            />
          </div>
        )}

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
