import { Handle, Position } from "@xyflow/react";
import { Key } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableNodeProps {
  data: {
    label: string;
    columns: any[];
  };
}

export default function TableNode({ data }: TableNodeProps) {
  return (
    <div className="bg-card border-2 border-border rounded-xl shadow-2xl min-w-[280px] overflow-hidden flex flex-col font-sans transition-all duration-300">
      <div className="bg-primary/10 border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/20 p-2 rounded-lg">
            <svg
              className="w-4 h-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 10h16M10 4v16"
              />
            </svg>
          </div>
          <h3 className="font-bold text-sm text-foreground tracking-tight uppercase">
            {data.label}
          </h3>
        </div>
      </div>

      <div className="flex flex-col py-1.5 bg-card">
        {data.columns?.map((col) => {
          const isPrimary = col.IS_IDENTITY === 1;

          return (
            <div
              key={col.COLUMN_NAME}
              className="relative px-4 py-2 flex items-center justify-between group hover:bg-muted/40 transition-colors"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={col.COLUMN_NAME}
                className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background -ml-1 transition-all group-hover:!bg-primary group-hover:!scale-125"
              />

              <div className="flex items-center gap-2.5">
                {isPrimary ? (
                  <Key className="w-3.5 h-3.5 text-warning fill-warning/10" />
                ) : (
                  <div className="w-3.5 h-3.5" />
                )}
                <span
                  className={cn(
                    "text-[13px] transition-colors",
                    isPrimary
                      ? "text-foreground font-black"
                      : "text-foreground/80 font-medium",
                  )}
                >
                  {col.COLUMN_NAME}
                </span>
              </div>

              <span className="text-[9px] font-mono font-bold text-muted-foreground/70 uppercase tracking-tighter bg-muted/30 px-1.5 py-0.5 rounded border border-border/20">
                {col.DATA_TYPE}
              </span>

              <Handle
                type="source"
                position={Position.Right}
                id={col.COLUMN_NAME}
                className="!w-2.5 !h-2.5 !bg-muted-foreground !border-2 !border-background -mr-1 transition-all group-hover:!bg-primary group-hover:!scale-125"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
