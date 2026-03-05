import { Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { APP_INFO } from "../lib/constants";

export default function Titlebar() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      setIsElectron(true);
    }
  }, []);

  if (!isElectron) {
    return null;
  }

  const handleMinimize = () => {
    (window as any).electronAPI?.windowMinimize();
  };

  const handleMaximize = () => {
    (window as any).electronAPI?.windowMaximize();
  };

  const handleClose = () => {
    (window as any).electronAPI?.windowClose();
  };

  return (
    <div
      className="h-8 w-full bg-background border-b border-border/50 flex items-center justify-between select-none z-50 shrink-0"
      style={{ WebkitAppRegion: "drag" } as any}
    >
      <div className="flex items-center pl-4">
        <span className="text-xs font-semibold text-muted-foreground tracking-wider">
          {APP_INFO.NAME}
        </span>
      </div>

      <div
        className="flex h-full"
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <button
          onClick={handleMinimize}
          className="h-full px-4 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 flex items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
