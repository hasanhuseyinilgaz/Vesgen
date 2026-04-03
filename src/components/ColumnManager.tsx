import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Columns, GripVertical, Search, RotateCcw } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ActionTooltip from "@/components/ui/action-tooltip";
import { cn } from "@/lib/utils";

interface ColumnManagerProps {
  columns: string[];
  visibleColumns: Record<string, boolean>;
  columnOrder: string[];
  onVisibilityChange: (column: string, isVisible: boolean) => void;
  onOrderChange: (newOrder: string[]) => void;
  onReset: () => void;
}

interface SortableColumnItemProps {
  column: string;
  isVisible: boolean;
  onToggle: (checked: boolean) => void;
}

function SortableColumnItem({ column, isVisible, onToggle }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between p-2 mb-1 rounded-md border bg-card transition-colors",
        isDragging ? "opacity-50 border-primary" : "border-border hover:bg-muted/50",
      )}
    >
      <div className="flex items-center gap-2 flex-1 overflow-hidden">
        <button
          className="cursor-move text-muted-foreground hover:text-foreground touch-none p-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span
          className={cn(
            "text-sm font-medium truncate",
            !isVisible && "text-muted-foreground line-through opacity-70"
          )}
          title={column}
        >
          {column}
        </span>
      </div>
      <Switch
        checked={isVisible}
        onCheckedChange={onToggle}
        className="ml-2 data-[state=checked]:bg-primary"
      />
    </div>
  );
}

export default function ColumnManager({
  visibleColumns,
  columnOrder,
  onVisibilityChange,
  onOrderChange,
  onReset,
}: ColumnManagerProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as string);
      const newIndex = columnOrder.indexOf(over.id as string);
      onOrderChange(arrayMove(columnOrder, oldIndex, newIndex));
    }
  };

  const filteredColumns = columnOrder.filter((col) =>
    col.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover>
      <ActionTooltip label={t("components.columnManager.title") || "Manage Columns"} side="top">
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 shadow-sm">
            <Columns className="w-4 h-4 mr-2 text-primary" />
            <span className="hidden sm:inline-block">
              {t("components.columnManager.columns") || "Columns"}
            </span>
          </Button>
        </PopoverTrigger>
      </ActionTooltip>

      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between bg-muted/30">
          <h4 className="font-semibold text-sm">
            {t("components.columnManager.manageColumns") || "Manage Columns"}
          </h4>
          <ActionTooltip label={t("components.columnManager.reset") || "Reset View"} side="left">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onReset}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </ActionTooltip>
        </div>

        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("components.columnManager.searchPlaceholder") || "Search columns..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/50"
            />
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
              {filteredColumns.map((col) => (
                <SortableColumnItem
                  key={col}
                  column={col}
                  isVisible={visibleColumns[col] ?? true}
                  onToggle={(checked) => onVisibilityChange(col, checked)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {filteredColumns.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t("components.columnManager.noResults") || "No columns found."}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
