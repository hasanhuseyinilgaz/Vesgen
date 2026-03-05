import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Maximize2,
  Key,
  ChevronLeft,
  ChevronRight,
  Database,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Save,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import PasswordModal from "@/components/PasswordModal";
import ActionTooltip from "@/components/ActionTooltip";

export interface DataTableColumn {
  name: string;
  type?: string;
  isIdentity?: boolean;
}

export type SortDirection = "ASC" | "DESC";

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface DataTableProps {
  data: any[];
  columns: DataTableColumn[];
  title?: string;
  className?: string;
  sortConfig?: SortConfig | null;
  onSort?: (column: string, direction: SortDirection) => void;
  onUpdateRecord?: (
    originalRecord: any,
    updatedRecord: any,
  ) => Promise<boolean>;
  enableUpdate?: boolean;
}

const isDateColumn = (type?: string) => {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes("date") || t.includes("time");
};

const formatToDatetimeLocal = (val: any) => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val.toString();

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export default function DataTable({
  data = [],
  columns = [],
  title = "Veri Kaydı",
  className,
  sortConfig,
  onSort,
  onUpdateRecord,
  enableUpdate = false,
}: DataTableProps) {
  const { t } = useTranslation();
  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeInput, setPageSizeInput] = useState("20");

  const [selectedRowData, setSelectedRowData] = useState<any | null>(null);
  const [editData, setEditData] = useState<any | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [highlightedRowIndexes, setHighlightedRowIndexes] = useState<
    Set<number>
  >(new Set());
  const prevDataRef = useRef<any[]>([]);

  useEffect(() => {
    setCurrentPage(1);
  }, [safeData.length, pageSizeInput]);

  useEffect(() => {
    const prevData = prevDataRef.current;
    if (prevData.length > 0 && safeData.length > 0) {
      const identityCol = safeColumns.find((c) => c.isIdentity)?.name;
      if (identityCol) {
        const prevIds = new Set(prevData.map((row) => row[identityCol]));
        const newRowIndexes = new Set<number>();
        safeData.forEach((row, index) => {
          if (!prevIds.has(row[identityCol])) newRowIndexes.add(index);
        });
        if (newRowIndexes.size > 0) {
          setHighlightedRowIndexes(newRowIndexes);
          setTimeout(() => setHighlightedRowIndexes(new Set()), 2000);
        }
      } else {
        const prevStrings = new Set(prevData.map((row) => JSON.stringify(row)));
        const newRowIndexes = new Set<number>();
        safeData.forEach((row, index) => {
          if (!prevStrings.has(JSON.stringify(row))) newRowIndexes.add(index);
        });
        if (newRowIndexes.size > 0) {
          setHighlightedRowIndexes(newRowIndexes);
          setTimeout(() => setHighlightedRowIndexes(new Set()), 2000);
        }
      }
    }
    prevDataRef.current = safeData;
  }, [safeData, safeColumns]);

  const itemsPerPage = parseInt(pageSizeInput, 10) || 20;
  const totalPages = Math.ceil(safeData.length / itemsPerPage);
  const paginatedData = safeData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val === "") {
      setPageSizeInput("");
      return;
    }
    let num = parseInt(val, 10);
    if (num > 200) num = 200;
    setPageSizeInput(num.toString());
  };

  const handlePageSizeBlur = () => {
    if (pageSizeInput === "" || parseInt(pageSizeInput, 10) < 1) {
      setPageSizeInput("20");
    }
  };

  const handleSortClick = (columnName: string) => {
    if (!onSort) return;
    let newDirection: SortDirection = "ASC";
    if (sortConfig?.column === columnName && sortConfig.direction === "ASC") {
      newDirection = "DESC";
    }
    onSort(columnName, newDirection);
  };

  const openRowDetail = (row: any) => {
    const normalizedRow = { ...row };
    safeColumns.forEach((col) => {
      if (isDateColumn(col.type) && normalizedRow[col.name] !== null) {
        normalizedRow[col.name] = formatToDatetimeLocal(
          normalizedRow[col.name],
        );
      }
    });

    setSelectedRowData(normalizedRow);
    setEditData({ ...normalizedRow });
    setValidationErrors({});
  };

  const closeRowDetail = () => {
    setSelectedRowData(null);
    setEditData(null);
    setValidationErrors({});
  };

  const handleInputChange = (colName: string, value: string, type?: string) => {
    if (!editData || !enableUpdate) return;

    const newErrors = { ...validationErrors };
    if (
      type &&
      (type.toLowerCase().includes("int") ||
        type.toLowerCase().includes("decimal") ||
        type.toLowerCase().includes("float") ||
        type.toLowerCase().includes("numeric") ||
        type.toLowerCase().includes("money"))
    ) {
      if (value !== "" && isNaN(Number(value))) {
        newErrors[colName] = t("components.dataTable.numberError");
      } else {
        delete newErrors[colName];
      }
    } else {
      delete newErrors[colName];
    }

    setValidationErrors(newErrors);
    setEditData({ ...editData, [colName]: value });
  };

  const isDataChanged = () => {
    if (!selectedRowData || !editData || !enableUpdate) return false;
    for (const key of Object.keys(selectedRowData)) {
      const origVal =
        selectedRowData[key] === null ? "" : selectedRowData[key]?.toString();
      const editVal = editData[key] === null ? "" : editData[key]?.toString();
      if (origVal !== editVal) return true;
    }
    return false;
  };

  const hasErrors = Object.keys(validationErrors).length > 0;

  const handleSaveInitiate = async () => {
    try {
      const res = await (window as any).electronAPI.configGet();
      const requiresAuth =
        res?.data?.security?.requirePasswordFor?.updateRecord;

      if (requiresAuth) {
        setIsPasswordModalOpen(true);
      } else {
        setShowConfirmModal(true);
      }
    } catch (error) {
      console.error("Config okunamadı, güvenlik gereği şifre sorulacak.");
      setIsPasswordModalOpen(true);
    }
  };

  const executeUpdate = async () => {
    if (!onUpdateRecord || !selectedRowData || !editData || !enableUpdate)
      return;

    setIsPasswordModalOpen(false);
    setShowConfirmModal(false);
    setIsUpdating(true);

    const changedData: Record<string, any> = {};

    for (const key of Object.keys(editData)) {
      const origVal =
        selectedRowData[key] === null ? "" : selectedRowData[key]?.toString();
      const editVal = editData[key] === null ? "" : editData[key]?.toString();

      if (origVal !== editVal) {
        changedData[key] = editData[key];
      }
    }

    if (Object.keys(changedData).length === 0) {
      setIsUpdating(false);
      return;
    }

    const success = await onUpdateRecord(selectedRowData, changedData);

    setIsUpdating(false);

    if (success) {
      closeRowDetail();
    }
  };

  return (
    <div
      className={cn(
        "bg-card shadow-sm border rounded-xl flex flex-col w-full overflow-hidden relative z-0",
        className,
      )}
    >
      <div className="w-full overflow-x-auto relative">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="sticky top-0 z-10 shadow-sm">
            <tr className="bg-muted/95 backdrop-blur-md">
              <th className="w-10 px-4 py-3 border-b"></th>
              {safeColumns.map((col) => (
                <th
                  key={col.name}
                  onClick={() => handleSortClick(col.name)}
                  className={cn(
                    "px-4 py-3 font-semibold border-b whitespace-nowrap text-foreground transition-colors select-none",
                    onSort && "cursor-pointer hover:bg-muted/80",
                  )}
                >
                  <ActionTooltip
                    label={t("components.dataTable.clickToSort")}
                    side="top"
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.name}</span>
                      {onSort && (
                        <div className="flex items-center">
                          {sortConfig?.column === col.name ? (
                            sortConfig.direction === "ASC" ? (
                              <ChevronUp className="w-4 h-4 text-primary" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-primary" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground/30" />
                          )}
                        </div>
                      )}
                      {col.type && (
                        <span className="text-[10px] font-normal text-muted-foreground ml-1.5 uppercase tracking-wider">
                          ({col.type})
                        </span>
                      )}
                    </div>
                  </ActionTooltip>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/50">
            {safeData.length === 0 ? (
              <tr>
                <td
                  colSpan={safeColumns.length + 1}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  <Database className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  {t("components.dataTable.noData")}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + idx;
                const isHighlighted = highlightedRowIndexes.has(globalIndex);

                return (
                  <tr
                    key={idx}
                    className={cn(
                      "transition-all duration-1000 cursor-pointer group",
                      isHighlighted
                        ? "bg-info/10 hover:bg-info/20"
                        : "hover:bg-primary/5 bg-transparent",
                    )}
                  >
                    <td
                      className={cn(
                        "px-4 py-2 border-b text-muted-foreground/50 transition-colors",
                        isHighlighted
                          ? "bg-transparent text-info"
                          : "group-hover:text-primary bg-background/50",
                      )}
                      onClick={() => openRowDetail(row)}
                    >
                      <ActionTooltip
                        label={t("components.dataTable.viewDetail")}
                        side="right"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </ActionTooltip>
                    </td>
                    {safeColumns.map((col) => {
                      const value = row[col.name];

                      let displayValue =
                        value === null ? "NULL" : value?.toString() || "";
                      if (value !== null && isDateColumn(col.type)) {
                        const d = new Date(value);
                        if (!isNaN(d.getTime())) {
                          displayValue = d.toLocaleString("tr-TR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          });
                        }
                      }

                      return (
                        <td
                          key={col.name}
                          className={cn(
                            "px-4 py-2 whitespace-nowrap max-w-[250px] truncate border-b transition-colors",
                            value === null
                              ? "text-muted-foreground italic"
                              : isHighlighted
                                ? "text-info font-medium"
                                : "text-foreground/90",
                          )}
                          onClick={() => openRowDetail(row)}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {safeData.length > 0 && (
        <div className="flex flex-wrap items-center justify-between px-6 py-3 bg-muted/30 border-t shrink-0 gap-4">
          <div className="text-sm text-muted-foreground">
            {t("components.dataTable.totalRecords")}{" "}
            <span className="font-medium text-foreground">
              {safeData.length}
            </span>{" "}
            {t("components.dataTable.records")} (
            <span className="ml-1">
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, safeData.length)}
            </span>
            )
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">
                {t("components.dataTable.rowsPerPage")}
              </Label>
              <Input
                type="number"
                value={pageSizeInput}
                onChange={handlePageSizeChange}
                onBlur={handlePageSizeBlur}
                className="h-8 w-16 text-xs bg-background text-center font-medium"
              />
            </div>

            <div className="flex items-center space-x-2">
              <ActionTooltip
                label={t("components.dataTable.prevPage")}
                side="top"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </ActionTooltip>

              <div className="text-sm font-medium px-2">
                {currentPage} / {totalPages || 1}
              </div>

              <ActionTooltip
                label={t("components.dataTable.nextPage")}
                side="top"
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </ActionTooltip>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={!!selectedRowData}
        onOpenChange={(open) => !open && closeRowDetail()}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <DialogTitle className="text-xl flex items-center">
              {enableUpdate ? (
                <>
                  <Database className="w-5 h-5 mr-2 text-primary" />
                  {t("components.dataTable.rowDetailsTitleEdit")}
                </>
              ) : (
                <>
                  <Info className="w-5 h-5 mr-2 text-primary" />
                  {t("components.dataTable.rowDetailsTitleInfo")}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              <span
                dangerouslySetInnerHTML={{
                  __html: t("components.dataTable.viewingContent", {
                    title: title || "",
                  }),
                }}
              />
              {enableUpdate
                ? ` ${t("components.dataTable.editInstruction")}`
                : ` ${t("components.dataTable.infoInstruction")}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-background custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {safeColumns.map((col) => {
                const val = editData?.[col.name];
                const displayVal = val === null ? "" : val?.toString() || "";
                const isError = !!validationErrors[col.name];
                const isDate = isDateColumn(col.type);

                return (
                  <div key={col.name} className="space-y-1.5">
                    <div className="flex items-center justify-start gap-2 mb-1">
                      <Label className="text-xs font-semibold text-foreground flex items-center">
                        {col.isIdentity && (
                          <ActionTooltip
                            label={t("components.dataTable.primaryKeyTooltip")}
                            side="top"
                          >
                            <span className="flex items-center cursor-help">
                              <Key className="w-3 h-3 mr-1 text-warning" />
                            </span>
                          </ActionTooltip>
                        )}
                        {col.name}
                      </Label>

                      <div className="flex items-center space-x-1">
                        {col.type && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-medium bg-primary/10 text-primary uppercase border border-primary/20">
                            {col.type}
                          </span>
                        )}
                        {selectedRowData?.[col.name] === null && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-medium bg-muted text-muted-foreground uppercase border border-border">
                            NULL
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <Input
                        type={isDate ? "datetime-local" : "text"}
                        step={isDate ? "1" : undefined}
                        value={displayVal}
                        disabled={col.isIdentity || !enableUpdate}
                        onChange={(e) =>
                          handleInputChange(col.name, e.target.value, col.type)
                        }
                        className={cn(
                          "bg-card font-medium focus-visible:ring-primary",
                          (col.isIdentity || !enableUpdate) &&
                            "bg-muted/50 text-muted-foreground cursor-not-allowed border-transparent shadow-none",
                          isError &&
                            "border-destructive focus-visible:ring-destructive",
                        )}
                        placeholder={
                          selectedRowData?.[col.name] === null
                            ? t("components.dataTable.nullData")
                            : ""
                        }
                      />
                      {isError && (
                        <div
                          className="absolute right-2 top-2.5 text-destructive"
                          title={validationErrors[col.name]}
                        >
                          <AlertCircle className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    {isError && (
                      <p className="text-[10px] text-destructive mt-1">
                        {validationErrors[col.name]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center shrink-0">
            <div className="text-sm text-muted-foreground">
              {enableUpdate && isDataChanged() && !hasErrors ? (
                <span className="text-warning flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />{" "}
                  {t("components.dataTable.unsavedChanges")}
                </span>
              ) : enableUpdate && hasErrors ? (
                <span className="text-destructive flex items-center">
                  <XCircle className="w-4 h-4 mr-1" />{" "}
                  {t("components.dataTable.fixErrors")}
                </span>
              ) : null}
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={closeRowDetail}>
                {enableUpdate
                  ? t("components.dataTable.cancel")
                  : t("components.dataTable.close")}
              </Button>

              {enableUpdate && onUpdateRecord && (
                <ActionTooltip
                  label={t("components.dataTable.saveChangesTooltip")}
                  side="top"
                >
                  <Button
                    onClick={handleSaveInitiate}
                    disabled={!isDataChanged() || hasErrors || isUpdating}
                    className="bg-primary text-primary-foreground shadow-sm min-w-[120px]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isUpdating
                      ? t("components.dataTable.processing")
                      : t("components.dataTable.save")}
                  </Button>
                </ActionTooltip>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary text-xl">
              <AlertCircle className="w-5 h-5 mr-2" />
              {t("components.dataTable.updateDataTitle")}
            </DialogTitle>
            <DialogDescription className="pt-3 text-base leading-relaxed">
              <span
                dangerouslySetInnerHTML={{
                  __html: t("components.dataTable.updateDataDesc"),
                }}
              />
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4 space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              disabled={isUpdating}
            >
              {t("components.dataTable.giveUp")}
            </Button>
            <Button
              onClick={executeUpdate}
              disabled={isUpdating}
              className="bg-primary"
            >
              {isUpdating
                ? t("components.dataTable.updating")
                : t("components.dataTable.yesUpdate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={executeUpdate}
        title={t("components.dataTable.updateAuthTitle")}
        description={t("components.dataTable.updateAuthDesc")}
      />
    </div>
  );
}
