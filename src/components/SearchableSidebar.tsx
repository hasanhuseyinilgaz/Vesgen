import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import ActionTooltip from "@/components/ActionTooltip";

export interface SidebarItem {
  id: string;
  label: string;
}

interface SearchableSidebarProps {
  title: string;
  icon: LucideIcon;
  items: SidebarItem[];
  selectedItemId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
  searchPlaceholder?: string;
}

export default function SearchableSidebar({
  title,
  icon: Icon,
  items,
  selectedItemId,
  onSelect,
  onRefresh,
  loading,
  searchPlaceholder,
}: SearchableSidebarProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="w-80 border-r flex flex-col bg-card shadow-sm z-10 h-full shrink-0">
      <div className="p-5 border-b space-y-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center text-primary">
            <Icon className="w-5 h-5 mr-2" /> {title}
          </h2>

          <ActionTooltip label={t("common.refresh")} side="right">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="hover:bg-primary/10 hover:text-primary transition-colors"
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </ActionTooltip>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              searchPlaceholder ||
              t("components.searchableSidebar.searchPlaceholder")
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {filteredItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn(
              "w-full justify-start text-sm font-medium truncate transition-colors",
              selectedItemId === item.id
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
            )}
            onClick={() => onSelect(item.id)}
          >
            <Icon className="h-4 w-4 mr-2 opacity-70 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Button>
        ))}
        {filteredItems.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t("components.searchableSidebar.noResults")}
          </div>
        )}
      </div>
    </div>
  );
}
