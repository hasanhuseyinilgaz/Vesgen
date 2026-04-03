import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Code,
  Database,
  FileCode2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { exportToExcel } from "@/lib/exportUtils";
import { useTableData } from "@/hooks/useTableData";
import DataSelectionPanel from "@/components/DataSelectionPanel";
import ActivityMonitorRefreshPanel from "@/components/ActivityMonitorRefreshPanel";
import DataTable from "@/components/DataTable";
import SqlCodeViewer from "@/components/SqlCodeViewer";
import EmptyState from "@/components/EmptyState";
import SearchableListPanel from "@/components/SearchableListPanel";
import CustomTabs from "@/components/ui/custom-tabs";
import PageHeader from "@/components/PageHeader";
import PageLayout from "@/components/PageLayout";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface View {
  TABLE_NAME: string;
}

export default function ViewsPage() {
  const { t } = useTranslation();
  const [views, setViews] = useState<View[]>([]);
  const [activeTab, setActiveTab] = useState<"data" | "code">("data");
  const [viewDefinition, setViewDefinition] = useState<string>("");

  const [updateResultModal, setUpdateResultModal] = useState({
    isOpen: false,
    success: false,
    message: "",
  });

  const {
    data: tableData,
    columns: columns,
    loading,
    setLoading,
    activeItem: selectedView,
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
    fetchDataApi: window.electronAPI.dbGetTableData,
    fetchColumnsApi: window.electronAPI.dbGetTableColumns,
  });

  const { config, loadConfig } = useSettings();

  useEffect(() => {
    loadViews();
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (selectedView) {
      loadViewDefinition(selectedView);
    }

    // Görünüm (View) verisinden çıkıldığında panelleri kapat ve canlı izlemeyi durdur
    if (activeTab !== "data") {
      setShowFilter(false);
      setShowLivePanel(false);
      setIsLiveActive(false);
    }
  }, [selectedView, activeTab]);

  const loadViews = async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.dbGetViews();
        if (result?.success) setViews(result.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadViewDefinition = async (viewName: string) => {
    if (window.electronAPI) {
      const defResult = await window.electronAPI.dbGetViewDefinition(
        viewName,
      );
      if (defResult?.success) setViewDefinition(defResult.data || "");
    }
  };

  const handleViewSelect = (viewName: string) => {
    resetState();
    loadTableData(viewName, "", null);
    setActiveTab("data");
  };

  const handleExportExcel = () => {
    if (!tableData?.length) {
      setUpdateResultModal({
        isOpen: true,
        success: false,
        message: t("views.exportEmptyError"),
      });
      return;
    }
    exportToExcel(tableData, `View_${selectedView}`);
  };

  return (
    <PageLayout
      sidebar={
        <SearchableListPanel
          title={t("views.title")}
          icon={Code}
          items={views.map((v) => ({ id: v.TABLE_NAME, label: v.TABLE_NAME }))}
          selectedItemId={selectedView}
          onSelect={handleViewSelect}
          onRefresh={loadViews}
          loading={loading}
        />
      }
    >
      <div className="flex flex-col h-full bg-transparent overflow-hidden">
        <div
          className={cn(
            "flex-1 flex flex-col gap-6 p-6 min-h-0 min-w-0 w-full",
            activeTab === "code" ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden custom-scrollbar",
          )}
        >
          <PageHeader
            title={t("views.pageTitle")}
            icon={Code}
            description={t("views.pageDescription")}
            recordCount={selectedView ? tableData.length : undefined}
            topRows={topRows}
            onTopRowsChange={selectedView ? (val) => {
              setTopRows(val);
              loadTableData(selectedView, activeWhereClause, sortConfig);
            } : undefined}
            onRefresh={selectedView ? () =>
              loadTableData(selectedView, activeWhereClause, sortConfig) : undefined
            }
            showFilter={showFilter}
            onToggleFilter={() => {
              setShowLivePanel(false);
              setShowFilter(!showFilter);
            }}
            isFilterActive={activeWhereClause.trim().length > 0 || activeJoins.length > 0}
            showFilterButton={!!selectedView && activeTab === "data"}
            showLiveButton={!!selectedView && activeTab === "data"}
            showRefreshButton={!!selectedView}
            showLimitSelector={!!selectedView}
            showRecordCount={!!selectedView}
            showLivePanel={showLivePanel}
            onToggleLivePanel={() => {
              setShowFilter(false);
              setShowLivePanel(!showLivePanel);
            }}
            isLiveActive={isLiveActive}
            loading={loading}
            onExport={selectedView ? handleExportExcel : undefined}
          />

          {selectedView ? (
            <>
              <div className={cn("mt-0", !showFilter && "hidden")}>
                <DataSelectionPanel
                  tableName={selectedView}
                  columns={columns}
                  allTables={views.map(v => ({ TABLE_NAME: v.TABLE_NAME }))}
                  isApplied={activeWhereClause.trim().length > 0 || activeJoins.length > 0}
                  onApplyFilter={(wc, joins) =>
                    loadTableData(selectedView, wc, sortConfig, false, joins)
                  }
                  onClearFilter={() =>
                    loadTableData(selectedView, "", sortConfig, false, [])
                  }
                />
              </div>
              <div className={cn("mt-0", !showLivePanel && "hidden")}>
                <ActivityMonitorRefreshPanel
                  onRefresh={() =>
                    loadTableData(
                      selectedView,
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
                  { value: "data", label: t("views.tabData"), icon: Database },
                  { value: "code", label: t("views.tabCode"), icon: FileCode2 },
                ]}
              />

              <div
                className={cn(
                  "w-full flex-1 min-h-0",
                  activeTab === "data" ? "mb-8 shrink-0 h-auto" : "mb-4",
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
                    title={selectedView}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    defaultPageSize={config?.ui?.table?.defaultPageSize}
                  />
                ) : (
                  <div className="h-full border rounded-xl overflow-hidden bg-muted/5">
                    <SqlCodeViewer code={viewDefinition} wordWrap="off" />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center -mt-20 w-full">
              <EmptyState
                icon={Code}
                title={t("views.readyToView")}
                description={t("views.selectToStart")}
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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle
                className={cn(
                  "flex items-center text-xl",
                  updateResultModal.success
                    ? "text-success"
                    : "text-destructive",
                )}
              >
                {updateResultModal.success ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertTriangle className="w-5 h-5 mr-2" />
                )}
                {updateResultModal.success
                  ? t("common.success")
                  : t("views.operationFailed")}
              </DialogTitle>
              <DialogDescription className="pt-3 text-base leading-relaxed text-foreground/80">
                {updateResultModal.message}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end pt-4">
              <Button
                onClick={() =>
                  setUpdateResultModal((prev) => ({ ...prev, isOpen: false }))
                }
              >
                {t("views.ok")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
