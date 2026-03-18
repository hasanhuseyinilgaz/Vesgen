import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Search,
  X,
  Check,
  ChevronsUpDown,
  Network,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import ActionTooltip from "@/components/ActionTooltip";

export interface FilterColumn {
  COLUMN_NAME: string;
  DATA_TYPE: string;
}

export interface FilterRule {
  id: string;
  logicalOperator: "AND" | "OR";
  column: string;
  operator: string;
  value: string;
  value2?: string;
}

export interface JoinRule {
  id: string;
  type?: string;
  targetTable: string;
  localColumn: string;
  targetColumn: string;
}

interface FilterPanelProps {
  tableName: string;
  columns: FilterColumn[];
  allTables?: { TABLE_NAME: string }[];
  isApplied?: boolean;
  onApplyFilter: (whereClause: string, joins?: JoinRule[]) => void;
  onClearFilter: () => void;
}

export default function FilterPanel({
  tableName,
  columns,
  allTables = [],
  isApplied = false,
  onApplyFilter,
  onClearFilter,
}: FilterPanelProps) {
  const { t } = useTranslation();

  const [rules, setRules] = useState<FilterRule[]>([]);

  const [joins, setJoins] = useState<JoinRule[]>([]);
  const [joinTargetColumns, setJoinTargetColumns] = useState<
    Record<string, FilterColumn[]>
  >({});

  const [openComboboxes, setOpenComboboxes] = useState<Record<string, boolean>>(
    {},
  );
  const [openTargetTableComboboxes, setOpenTargetTableComboboxes] = useState<
    Record<string, boolean>
  >({});

  const addRule = () => {
    setRules([
      ...rules,
      {
        id: Date.now().toString(),
        logicalOperator: "AND",
        column: "",
        operator: "=",
        value: "",
        value2: "",
      },
    ]);
  };

  const removeRule = (id: string) => {
    const newRules = rules.filter((rule) => rule.id !== id);
    setRules(newRules);
    if (newRules.length === 0 && joins.length === 0) {
      onClearFilter();
    }
  };

  const updateRule = (
    id: string,
    field: keyof FilterRule,
    newValue: string,
  ) => {
    setRules(
      rules.map((rule) =>
        rule.id === id ? { ...rule, [field]: newValue } : rule,
      ),
    );
  };

  const handleApply = () => {
    // Validate rules
    for (const rule of rules) {
      const isCompletelyEmpty =
        !rule.column &&
        !rule.value &&
        (rule.operator !== "BETWEEN" || !rule.value2);

      if (isCompletelyEmpty) {
        if (rules.length > 1) {
          toast.error(t("components.filterPanel.validationEmptyRule"));
          return;
        } else if (joins.length === 0) {
          // Eğer sadece 1 kural varsa ve tamamen boşsa, VE join de yoksa kullanıcı filtrelemek istiyor ama hiçbir şey seçmemiş demektir.
          toast.error(t("components.filterPanel.validationColRequired"));
          return;
        }
        continue;
      }

      if (!rule.column) {
        toast.error(t("components.filterPanel.validationColRequired"));
        return;
      }

      if (rule.operator === "BETWEEN") {
        if (!rule.value || !rule.value2) {
          toast.error(t("components.filterPanel.validationValRequired"));
          return;
        }
      } else {
        const requireValue = !["IS NULL", "IS NOT NULL"].includes(
          rule.operator,
        );
        if (requireValue && !rule.value) {
          toast.error(t("components.filterPanel.validationValRequired"));
          return;
        }
      }
    }

    // Validate joins
    for (const join of joins) {
      if (!join.targetTable || !join.localColumn || !join.targetColumn) {
        toast.error(t("components.filterPanel.validationJoinRequired"));
        return;
      }
    }

    const validRules = rules.filter((r) => r.column && r.value !== "");
    const validJoins = joins.filter(
      (j) => j.targetTable && j.localColumn && j.targetColumn,
    );

    if (validRules.length === 0 && validJoins.length === 0) {
      return;
    }

    const finalWhereClause = validRules
      .map((rule, idx) => {
        const colMeta = columns.find((c) => c.COLUMN_NAME === rule.column);
        const isString =
          colMeta?.DATA_TYPE.includes("char") ||
          colMeta?.DATA_TYPE.includes("text") ||
          colMeta?.DATA_TYPE.includes("date") ||
          colMeta?.DATA_TYPE.includes("time");

        const formatValue = (val: string) =>
          isString ? `'${val.replace(/'/g, "''")}'` : val;

        const tablePrefix = validJoins.length > 0 ? `[${tableName}].` : "";
        let condition = "";

        if (rule.operator === "BETWEEN" && rule.value2) {
          condition = `${tablePrefix}[${rule.column}] BETWEEN ${formatValue(rule.value)} AND ${formatValue(rule.value2)}`;
        } else if (rule.operator === "LIKE") {
          condition = `${tablePrefix}[${rule.column}] LIKE '%${rule.value.replace(/'/g, "''")}%'`;
        } else if (rule.operator === "IN") {
          const inValues = rule.value
            .split(",")
            .map((v) => formatValue(v.trim()))
            .join(",");
          condition = `${tablePrefix}[${rule.column}] IN (${inValues})`;
        } else {
          condition = `${tablePrefix}[${rule.column}] ${rule.operator} ${formatValue(rule.value)}`;
        }

        if (idx === 0) return condition;
        return `${rule.logicalOperator} ${condition}`;
      })
      .join(" ");

    onApplyFilter(finalWhereClause, validJoins);
  };

  const handleReset = () => {
    setRules([]);
    setJoins([]);
    onClearFilter();
  };

  const handleDeactivate = () => {
    onClearFilter();
  };

  const loadTargetColumns = async (targetTable: string) => {
    if (joinTargetColumns[targetTable]) return;

    try {
      const res = await (window as any).electronAPI.dbGetTableColumns(
        targetTable,
      );
      if (res.success) {
        setJoinTargetColumns((prev) => ({
          ...prev,
          [targetTable]: res.data,
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const addJoin = () => {
    setJoins([
      ...joins,
      {
        id: Date.now().toString(),
        type: "INNER JOIN",
        targetTable: "",
        localColumn: "",
        targetColumn: "",
      },
    ]);
  };

  const removeJoin = (id: string) => {
    const newJoins = joins.filter((j) => j.id !== id);
    setJoins(newJoins);
    if (
      newJoins.length === 0 &&
      rules.filter((r) => r.column && r.value !== "").length === 0
    ) {
      onClearFilter();
    }
  };

  const updateJoin = (id: string, field: keyof JoinRule, newValue: string) => {
    setJoins(
      joins.map((join) => {
        if (join.id === id) {
          const updated = { ...join, [field]: newValue };
          if (field === "targetTable" && newValue !== "") {
            loadTargetColumns(newValue);
            updated.targetColumn = "";
          }
          return updated;
        }
        return join;
      }),
    );
  };

  const toggleCombobox = (id: string, isOpen: boolean) => {
    setOpenComboboxes((prev) => ({ ...prev, [id]: isOpen }));
  };

  const toggleTargetTableCombobox = (id: string, isOpen: boolean) => {
    setOpenTargetTableComboboxes((prev) => ({ ...prev, [id]: isOpen }));
  };

  return (
    <div
      className={cn(
        "space-y-4 p-5 border shadow-sm rounded-xl mb-4 transition-all duration-300",
        isApplied
          ? "border-warning/30 bg-warning/5"
          : "border-border/50 bg-card",
      )}
    >
      {(rules.length > 0 || joins.length > 0) && (
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground flex items-center">
            <ActionTooltip label={t("components.filterPanel.title")} side="top">
              <Search className="w-4 h-4 mr-2 text-warning cursor-help" />
            </ActionTooltip>
            {rules.length > 0 || joins.length > 0
              ? t("components.filterPanel.panelTitle")
              : t("components.filterPanel.panelTitle")}
          </h3>
          <ActionTooltip label={t("components.filterPanel.reset")} side="left">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />{" "}
              {t("components.filterPanel.reset")}
            </Button>
          </ActionTooltip>
        </div>
      )}

      {rules.length === 0 && joins.length === 0 && (
        <div className="py-8 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/40 rounded-lg bg-muted/5">
          <Search className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm">{t("components.filterPanel.emptyState")}</p>
        </div>
      )}

      {(rules.length > 0 || joins.length > 0) && (
        <div className="pt-2">
          {rules.length > 0 && (
            <div className="space-y-4 relative border-l-2 border-info/30 pl-4 ml-2 my-2 mb-6">
              <h4 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" />
                {t("components.filterPanel.rulesSectionTitle")}
              </h4>
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="flex flex-wrap md:flex-nowrap gap-3 items-end transition-colors group"
                >
                  {index > 0 && (
                    <div className="flex items-center justify-center w-24">
                      <Select
                        value={rule.logicalOperator}
                        onValueChange={(val: "AND" | "OR") =>
                          updateRule(rule.id, "logicalOperator", val)
                        }
                      >
                        <SelectTrigger className="bg-background h-8 text-xs font-bold text-muted-foreground border-dashed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex-1 min-w-[200px] flex flex-col space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                      {tableName
                        ? `${tableName} Kolonu`
                        : t("components.filterPanel.column")}
                    </Label>
                    <Popover
                      open={openComboboxes[rule.id] || false}
                      onOpenChange={(open) => toggleCombobox(rule.id, open)}
                    >
                      <ActionTooltip
                        label={t("components.filterPanel.searchColumn")}
                        side="top"
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openComboboxes[rule.id]}
                            className="h-9 w-full justify-between font-normal bg-background"
                          >
                            {rule.column
                              ? columns.find(
                                (col) => col.COLUMN_NAME === rule.column,
                              )?.COLUMN_NAME
                              : t("components.filterPanel.searchColumn")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                      </ActionTooltip>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder={t(
                              "components.filterPanel.searchPlaceholder",
                            )}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {t("components.filterPanel.columnNotFound")}
                            </CommandEmpty>
                            <CommandGroup>
                              {columns.map((col) => (
                                <CommandItem
                                  key={col.COLUMN_NAME}
                                  value={col.COLUMN_NAME}
                                  onSelect={(currentValue) => {
                                    updateRule(
                                      rule.id,
                                      "column",
                                      currentValue === rule.column
                                        ? ""
                                        : currentValue,
                                    );
                                    toggleCombobox(rule.id, false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      rule.column === col.COLUMN_NAME
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {col.COLUMN_NAME}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="w-[140px]">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                      {t("components.filterPanel.operator")}
                    </Label>
                    <ActionTooltip
                      label={t("components.filterPanel.operator")}
                      side="top"
                    >
                      <div className="cursor-help">
                        <Select
                          value={rule.operator}
                          onValueChange={(val) =>
                            updateRule(rule.id, "operator", val)
                          }
                        >
                          <SelectTrigger className="bg-background h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="=">
                              {t("components.filterPanel.opEquals")}
                            </SelectItem>
                            <SelectItem value="!=">
                              {t("components.filterPanel.opNotEquals")}
                            </SelectItem>
                            <SelectItem value=">">
                              {t("components.filterPanel.opGreater")}
                            </SelectItem>
                            <SelectItem value="<">
                              {t("components.filterPanel.opLess")}
                            </SelectItem>
                            <SelectItem value="LIKE">
                              {t("components.filterPanel.opLike")}
                            </SelectItem>
                            <SelectItem value="BETWEEN">
                              {t("components.filterPanel.opBetween")}
                            </SelectItem>
                            <SelectItem value="IN">
                              {t("components.filterPanel.opIn")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </ActionTooltip>
                  </div>

                  <div className="flex-1 min-w-[150px]">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                      {rule.operator === "BETWEEN"
                        ? t("components.filterPanel.startValue")
                        : t("components.filterPanel.value")}
                    </Label>
                    <Input
                      className="h-9 bg-background focus-visible:ring-warning"
                      value={rule.value}
                      onChange={(e) =>
                        updateRule(rule.id, "value", e.target.value)
                      }
                      placeholder={t("components.filterPanel.valuePlaceholder")}
                      onKeyDown={(e) => e.key === "Enter" && handleApply()}
                    />
                  </div>

                  {rule.operator === "BETWEEN" && (
                    <div className="flex-1 min-w-[150px]">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">
                        {t("components.filterPanel.endValue")}
                      </Label>
                      <Input
                        className="h-9 bg-background focus-visible:ring-warning"
                        value={rule.value2 || ""}
                        onChange={(e) =>
                          updateRule(rule.id, "value2", e.target.value)
                        }
                        placeholder={t(
                          "components.filterPanel.endValuePlaceholder",
                        )}
                        onKeyDown={(e) => e.key === "Enter" && handleApply()}
                      />
                    </div>
                  )}

                  <ActionTooltip label={t("common.delete")} side="top">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeRule(rule.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </ActionTooltip>
                </div>
              ))}
            </div>
          )}

          {joins.length > 0 && (
            <div className="space-y-4 relative border-l-2 border-warning/30 pl-4 ml-2 my-2 mb-6">
              <h4 className="text-xs font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Network className="w-3.5 h-3.5" />
                {t("components.filterPanel.joinsTitle")}
              </h4>
              {joins.map((join) => (
                <div
                  key={join.id}
                  className="flex flex-wrap md:flex-nowrap gap-3 items-end transition-colors group"
                >
                  <div className="w-32 flex flex-col space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                      {t("components.filterPanel.joinType")}
                    </Label>
                    <Select
                      value={join.type || "INNER JOIN"}
                      onValueChange={(val) => updateJoin(join.id, "type", val)}
                    >
                      <SelectTrigger className="bg-background h-8 text-xs font-bold text-muted-foreground border-dashed">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INNER JOIN">INNER JOIN</SelectItem>
                        <SelectItem value="LEFT JOIN">LEFT JOIN</SelectItem>
                        <SelectItem value="RIGHT JOIN">RIGHT JOIN</SelectItem>
                        <SelectItem value="FULL JOIN">FULL JOIN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-[1.5] min-w-[200px] flex flex-col space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-info/80 block">
                      {t("components.filterPanel.targetTable")}
                    </Label>
                    <Popover
                      open={openTargetTableComboboxes[join.id] || false}
                      onOpenChange={(open) =>
                        toggleTargetTableCombobox(join.id, open)
                      }
                    >
                      <ActionTooltip
                        label={t("components.filterPanel.searchTable")}
                        side="top"
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openTargetTableComboboxes[join.id]}
                            className="h-8 w-full justify-between font-normal bg-background text-xs"
                          >
                            {join.targetTable ||
                              t("components.filterPanel.selectTable")}
                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                      </ActionTooltip>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder={t(
                              "components.filterPanel.searchTable",
                            )}
                          />
                          <CommandList>
                            <CommandEmpty>Tablo bulunamadı.</CommandEmpty>
                            <CommandGroup>
                              {allTables.map((t) => (
                                <CommandItem
                                  key={t.TABLE_NAME}
                                  value={t.TABLE_NAME}
                                  disabled={t.TABLE_NAME === tableName}
                                  onSelect={(currentValue) => {
                                    updateJoin(
                                      join.id,
                                      "targetTable",
                                      currentValue,
                                    );
                                    toggleTargetTableCombobox(join.id, false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      join.targetTable === t.TABLE_NAME
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  {t.TABLE_NAME}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex-1 min-w-[150px] flex flex-col space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                      {t("components.filterPanel.localColumn")} ({tableName})
                    </Label>
                    <Select
                      value={join.localColumn}
                      onValueChange={(val) =>
                        updateJoin(join.id, "localColumn", val)
                      }
                    >
                      <SelectTrigger className="h-8 bg-background text-xs">
                        <SelectValue
                          placeholder={t("components.filterPanel.selectColumn")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((c) => (
                          <SelectItem key={c.COLUMN_NAME} value={c.COLUMN_NAME}>
                            {c.COLUMN_NAME}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-center font-bold text-muted-foreground px-1 pb-1">
                    =
                  </div>

                  <div className="flex-1 min-w-[150px] flex flex-col space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                      {t("components.filterPanel.targetColumn")} (
                      {join.targetTable ||
                        t("components.filterPanel.selectTable")}
                      )
                    </Label>
                    <Select
                      value={join.targetColumn}
                      onValueChange={(val) =>
                        updateJoin(join.id, "targetColumn", val)
                      }
                      disabled={
                        !join.targetTable ||
                        !joinTargetColumns[join.targetTable]
                      }
                    >
                      <SelectTrigger className="h-8 bg-background text-xs">
                        <SelectValue
                          placeholder={t("components.filterPanel.selectColumn")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {join.targetTable &&
                          joinTargetColumns[join.targetTable]?.map((c) => (
                            <SelectItem
                              key={c.COLUMN_NAME}
                              value={c.COLUMN_NAME}
                            >
                              {c.COLUMN_NAME}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ActionTooltip label={t("common.delete")} side="top">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeJoin(join.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </ActionTooltip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-3 mt-1">
        <div className="flex gap-2">
          <ActionTooltip
            label={t("components.filterPanel.addRule")}
            side="right"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={addRule}
              className="text-warning hover:text-warning hover:bg-warning/10 border-warning/30"
            >
              <Plus className="w-4 h-4 mr-1.5" />{" "}
              {t("components.filterPanel.addRule")}
            </Button>
          </ActionTooltip>

          <ActionTooltip
            label={t("components.filterPanel.addJoin")}
            side="right"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={addJoin}
              className="text-info hover:text-info hover:bg-info/10 border-info/30"
            >
              <Plus className="w-4 h-4 mr-1.5" />{" "}
              {t("components.filterPanel.addJoin")}
            </Button>
          </ActionTooltip>
        </div>

        <div className="flex gap-2">
          {isApplied && (
            <ActionTooltip
              label={t("components.filterPanel.removeFilter")}
              side="left"
            >
              <Button
                variant="outline"
                onClick={handleDeactivate}
                className="min-w-[120px] text-destructive hover:bg-destructive/10 border-destructive/30 shadow-sm"
              >
                {t("components.filterPanel.removeFilter")}
              </Button>
            </ActionTooltip>
          )}

          <ActionTooltip
            label={t("components.filterPanel.applyFilter")}
            side="left"
          >
            <Button
              onClick={handleApply}
              className="min-w-[120px] bg-warning hover:bg-warning/90 text-warning-foreground shadow-sm"
            >
              {t("components.filterPanel.applyFilter")}
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
}
