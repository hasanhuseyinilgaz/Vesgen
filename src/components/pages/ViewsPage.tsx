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
import FilterPanel from "@/components/FilterPanel";
import LiveMonitoringPanel from "@/components/LiveMonitoringPanel";
import DataTable from "@/components/DataTable";
import SqlCodeViewer from "@/components/SqlCodeViewer";
import EmptyState from "@/components/EmptyState";
import SearchableSidebar from "@/components/SearchableSidebar";
import CustomTabs from "@/components/CustomTabs";
import DataToolbar from "@/components/DataToolbar";
import PageLayout from "@/components/PageLayout";
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
    data: viewData,
    columns: columnsData,
    loading,
    setLoading,
    activeItem: selectedView,
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
    loadData: loadViewData,
    handleSort,
    resetState,
  } = useTableData({
    fetchDataApi: (window as any).electronAPI?.dbGetTableData,
    fetchColumnsApi: (window as any).electronAPI?.dbGetTableColumns,
  });

  useEffect(() => {
    loadViews();
  }, []);

  useEffect(() => {
    if (selectedView) {
      loadViewDefinition(selectedView);
    }
  }, [selectedView]);

  const loadViews = async () => {
    setLoading(true);
    try {
      if ((window as any).electronAPI?.dbGetViews) {
        const result = await (window as any).electronAPI.dbGetViews();
        if (result?.success) setViews(result.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadViewDefinition = async (viewName: string) => {
    if ((window as any).electronAPI?.dbGetViewDefinition) {
      const defResult = await (window as any).electronAPI.dbGetViewDefinition(
        viewName,
      );
      if (defResult?.success) setViewDefinition(defResult.data || "");
    }
  };

  const handleViewSelect = (viewName: string) => {
    resetState();
    loadViewData(viewName, "", null);
    setActiveTab("data");
  };

  const handleExportExcel = () => {
    if (!viewData?.length) {
      setUpdateResultModal({
        isOpen: true,
        success: false,
        message: t("views.exportEmptyError"),
      });
      return;
    }
    exportToExcel(viewData, `View_${selectedView}`);
  };

  return (
    <PageLayout
      sidebar={
        <SearchableSidebar
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
      <div
        className={cn(
          "h-full bg-background custom-scrollbar",
          activeTab === "data"
            ? "overflow-y-auto"
            : "overflow-hidden flex flex-col",
        )}
      >
        {selectedView ? (
          <div
            className={cn(
              "p-6 flex flex-col gap-6",
              activeTab === "code" && "flex-1 overflow-hidden",
            )}
          >
            <div className="flex flex-col gap-0 shrink-0">
              <DataToolbar
                title={selectedView}
                recordCount={viewData.length}
                topRows={topRows}
                onTopRowsChange={(val) => {
                  setTopRows(val);
                  loadViewData(selectedView, activeWhereClause, sortConfig);
                }}
                onRefresh={() =>
                  loadViewData(selectedView, activeWhereClause, sortConfig)
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
                showRefreshButton={false}
                onExport={handleExportExcel}
              />

              <div className={cn("mt-4", !showFilter && "hidden")}>
                <FilterPanel
                  columns={columnsData}
                  onApplyFilter={(wc) =>
                    loadViewData(selectedView, wc, sortConfig)
                  }
                  onClearFilter={() =>
                    loadViewData(selectedView, "", sortConfig)
                  }
                />
              </div>
              <div className={cn("mt-4", !showLivePanel && "hidden")}>
                <LiveMonitoringPanel
                  isVisible={showLivePanel}
                  onRefresh={() =>
                    loadViewData(
                      selectedView,
                      activeWhereClause,
                      sortConfig,
                      true,
                    )
                  }
                  onStatusChange={setIsLiveActive}
                  onAutoSort={() => {}}
                />
              </div>
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
                "w-full",
                activeTab === "code" ? "flex-1 min-h-0 mb-4" : "shrink-0 mb-8",
              )}
            >
              {activeTab === "data" ? (
                <DataTable
                  data={viewData}
                  columns={columnsData.map((c: any) => ({
                    name: c.COLUMN_NAME,
                    type: c.DATA_TYPE,
                    isIdentity: c.IS_IDENTITY === 1,
                  }))}
                  title={selectedView}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              ) : (
                <div className="h-full border rounded-xl overflow-hidden shadow-sm bg-muted/5">
                  <SqlCodeViewer code={viewDefinition} wordWrap="off" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <EmptyState
              icon={Code}
              title={t("views.readyToView")}
              description={t("views.selectToStart")}
            />
          </div>
        )}

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
