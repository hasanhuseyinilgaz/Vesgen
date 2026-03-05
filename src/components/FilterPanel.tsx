import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { Plus, Trash2, Search, X, Check, ChevronsUpDown } from "lucide-react";
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
  column: string;
  operator: string;
  value: string;
  value2?: string;
}

interface FilterPanelProps {
  columns: FilterColumn[];
  onApplyFilter: (whereClause: string) => void;
  onClearFilter: () => void;
}

export default function FilterPanel({
  columns,
  onApplyFilter,
  onClearFilter,
}: FilterPanelProps) {
  const { t } = useTranslation();

  const [rules, setRules] = useState<FilterRule[]>([
    {
      id: Date.now().toString(),
      column: "",
      operator: "=",
      value: "",
      value2: "",
    },
  ]);

  const [openComboboxes, setOpenComboboxes] = useState<Record<string, boolean>>(
    {},
  );

  const addRule = () => {
    setRules([
      ...rules,
      {
        id: Date.now().toString(),
        column: "",
        operator: "=",
        value: "",
        value2: "",
      },
    ]);
  };

  const removeRule = (id: string) => {
    if (rules.length === 1) {
      setRules([
        {
          id: Date.now().toString(),
          column: "",
          operator: "=",
          value: "",
          value2: "",
        },
      ]);
      onClearFilter();
    } else {
      setRules(rules.filter((rule) => rule.id !== id));
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
    const validRules = rules.filter((r) => r.column && r.value !== "");

    if (validRules.length === 0) {
      onApplyFilter("");
      return;
    }

    const whereParts = validRules.map((rule) => {
      const colMeta = columns.find((c) => c.COLUMN_NAME === rule.column);
      const isString =
        colMeta?.DATA_TYPE.includes("char") ||
        colMeta?.DATA_TYPE.includes("text") ||
        colMeta?.DATA_TYPE.includes("date") ||
        colMeta?.DATA_TYPE.includes("time");

      const formatValue = (val: string) =>
        isString ? `'${val.replace(/'/g, "''")}'` : val;

      if (rule.operator === "BETWEEN" && rule.value2) {
        return `[${rule.column}] BETWEEN ${formatValue(rule.value)} AND ${formatValue(rule.value2)}`;
      } else if (rule.operator === "LIKE") {
        return `[${rule.column}] LIKE '%${rule.value.replace(/'/g, "''")}%'`;
      } else if (rule.operator === "IN") {
        const inValues = rule.value
          .split(",")
          .map((v) => formatValue(v.trim()))
          .join(",");
        return `[${rule.column}] IN (${inValues})`;
      } else {
        return `[${rule.column}] ${rule.operator} ${formatValue(rule.value)}`;
      }
    });

    const finalWhereClause = whereParts.join(" AND ");
    onApplyFilter(finalWhereClause);
  };

  const handleClear = () => {
    setRules([
      {
        id: Date.now().toString(),
        column: "",
        operator: "=",
        value: "",
        value2: "",
      },
    ]);
    onClearFilter();
  };

  const toggleCombobox = (id: string, isOpen: boolean) => {
    setOpenComboboxes((prev) => ({ ...prev, [id]: isOpen }));
  };

  return (
    <div className="space-y-4 p-5 bg-card border border-warning/30 shadow-sm rounded-xl mb-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <h3 className="text-sm font-semibold text-foreground flex items-center">
          <ActionTooltip label={t("components.filterPanel.title")} side="top">
            <Search className="w-4 h-4 mr-2 text-warning cursor-help" />
          </ActionTooltip>
          {t("components.filterPanel.title")}
        </h3>
        <ActionTooltip label={t("components.filterPanel.reset")} side="left">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />{" "}
            {t("components.filterPanel.reset")}
          </Button>
        </ActionTooltip>
      </div>

      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div
            key={rule.id}
            className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-muted/20 p-3 rounded-lg border border-border/40 hover:border-warning/30 transition-colors"
          >
            {index > 0 && (
              <div className="hidden md:flex items-center justify-center w-10 text-xs font-bold text-muted-foreground">
                AND
              </div>
            )}

            <div className="flex-1 min-w-[200px] flex flex-col space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                {t("components.filterPanel.column")}
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
                        ? columns.find((col) => col.COLUMN_NAME === rule.column)
                            ?.COLUMN_NAME
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
                onChange={(e) => updateRule(rule.id, "value", e.target.value)}
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
                  placeholder={t("components.filterPanel.endValuePlaceholder")}
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

      <div className="flex justify-between items-center pt-3 mt-1">
        <ActionTooltip label={t("components.filterPanel.addRule")} side="right">
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
  );
}
