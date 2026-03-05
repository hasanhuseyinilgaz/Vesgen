import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

interface CustomTabsProps {
  activeTab: string;
  onTabChange: (value: any) => void;
  tabs: TabItem[];
}

export default function CustomTabs({
  activeTab,
  onTabChange,
  tabs,
}: CustomTabsProps) {
  return (
    <div className="flex space-x-2 bg-muted/50 p-1 rounded-lg w-fit shrink-0 border border-border/40">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
              isActive
                ? "bg-background shadow-sm text-foreground ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4 mr-2",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
