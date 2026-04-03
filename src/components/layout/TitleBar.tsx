import { Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";
import { APP_INFO } from "@/lib/constants";

export default function TitleBar() {
  const [isElectron, setIsElectron] = useState(false);
  const [platform, setPlatform] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.electronAPI) {
      setIsElectron(true);
      if (window.electronAPI) {
        setPlatform(window.electronAPI.platform);
      }
    } else {
      console.warn("Titlebar: ElectronAPI not found on window object");
    }
  }, []);

  if (!isElectron) {
    return null;
  }

  const isMac = platform === "darwin";

  const handleMinimize = () => {
    window.electronAPI?.windowMinimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.windowMaximize();
  };

  const handleClose = () => {
    window.electronAPI?.windowClose();
  };

  return (
    <div
      className={`h-8 w-full bg-background border-b border-border/50 flex items-center justify-between select-none z-50 shrink-0 ${isMac ? "pl-16" : ""}`}
      style={{ WebkitAppRegion: "drag" } as any}
    >
      <div className={`flex items-center ${isMac ? "" : "pl-4"}`}>
        <span className="text-xs font-semibold text-muted-foreground tracking-wider">
          {APP_INFO.NAME}
        </span>
      </div>

      {!isMac && (
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
      )}
    </div>
  );
}
