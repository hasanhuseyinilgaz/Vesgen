import { useEffect, useRef, useState } from "react";
import { TerminalSquare, Loader2, AlertCircle } from "lucide-react";
import { WindowsServerResource } from "@/types";
import PageHeader from "@/components/PageHeader";
import PageLayout from "@/components/PageLayout";
import { useTranslation } from "react-i18next";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { getThemeColorHex } from "@/lib/colorUtils";
import "xterm/css/xterm.css";

interface WinTerminalPageProps {
  server: WindowsServerResource;
}

export default function WinTerminalPage({ server }: WinTerminalPageProps) {
  const IS_BETA = true; // Set to false to enable Terminal page
  const { t } = useTranslation();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to get Hex colors from CSS variables using project utility
  const getTerminalTheme = () => {
    return {
      background: 'transparent',
      foreground: getThemeColorHex('--foreground'),
      cursor: getThemeColorHex('--primary'),
      cursorAccent: getThemeColorHex('--card'),
      selectionBackground: 'rgba(255, 255, 255, 0.15)',
      black: '#000000',
      red: getThemeColorHex('--destructive'),
      green: getThemeColorHex('--success'),
      yellow: getThemeColorHex('--warning'),
      blue: getThemeColorHex('--info'),
      magenta: '#a855f7',
      cyan: '#06b6d4',
      white: '#ffffff',
    };
  };

  useEffect(() => {
    if (IS_BETA || !server || !terminalRef.current) return;

    let isMounted = true;
    let cleanup: (() => void) | null = null;

    const initTerminal = async () => {
      try {
        setConnecting(true);
        setError(null);

        const serverId = server.id || server.host;
        console.log(`[Terminal] Starting session for ${serverId}`);

        // Start session on backend
        const res = await window.electronAPI.winStartTerminalSession(serverId, server);

        if (!res.success) {
          if (isMounted) {
            setError(res.message || t("dashboard.connFailed"));
            setConnecting(false);
          }
          return;
        }

        if (!isMounted) {
          window.electronAPI.winStopTerminalSession(serverId);
          return;
        }

        // Initialize xterm
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
          theme: getTerminalTheme(),
          allowTransparency: true,
          scrollback: 5000,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        
        // Initial fit
        fitAddon.fit();
        window.electronAPI.winResizeTerminal(serverId, term.cols, term.rows);

        // Use ResizeObserver for responsive fitting
        const resizeObserver = new ResizeObserver(() => {
          if (isMounted) {
            fitAddon.fit();
            window.electronAPI.winResizeTerminal(serverId, term.cols, term.rows);
          }
        });
        resizeObserver.observe(terminalRef.current);

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // Watch for theme changes
        const themeObserver = new MutationObserver(() => {
          term.options.theme = getTerminalTheme();
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        // Immediate focus and another one after a delay to be sure
        term.focus();
        setTimeout(() => term.focus(), 500);

        // Listen for data from backend
        const removeDataListener = window.electronAPI.onTerminalData(serverId, (data: string) => {
          if (isMounted) term.write(data);
        });

        // Send input to backend
        term.onData((data) => {
          window.electronAPI.winTerminalInput(serverId, data);
        });

        // Click to focus
        const handleContainerClick = () => {
          term.focus();
        };
        terminalRef.current.addEventListener("click", handleContainerClick);

        setConnecting(false);

        cleanup = () => {
          themeObserver.disconnect();
          resizeObserver.disconnect();
          terminalRef.current?.removeEventListener("click", handleContainerClick);
          removeDataListener();
          term.dispose();
          window.electronAPI.winStopTerminalSession(serverId);
        };
      } catch (err: any) {
        console.error("[Terminal] Init error:", err);
        if (isMounted) {
          setError(err.message);
          setConnecting(false);
        }
      }
    };

    initTerminal();

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, [server]);

  return (
    <PageLayout>
      <div className="flex-1 flex flex-col gap-6 p-8 min-h-0 min-w-0 w-full overflow-hidden">
        <PageHeader
          title={t("dashboard.terminal")}
          icon={TerminalSquare}
          description={`${server?.alias || server?.name || ''} SSH Terminal`}
          showRecordCount={false}
        />

        <div className="flex-1 relative bg-slate-950/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl shadow-black/50 group focus-within:ring-2 ring-primary/20 transition-all">
          {IS_BETA ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
              {/* Background glowing decorations */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
              <div className="absolute top-1/4 left-1/3 w-[250px] h-[250px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center gap-6">
                {/* Visual Icon Badge */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/25 rounded-[2.5rem] blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative p-7 rounded-[2.5rem] bg-gradient-to-b from-white/10 to-white/0 border border-white/10 shadow-2xl flex items-center justify-center backdrop-blur-xl">
                    <TerminalSquare className="w-16 h-16 text-primary animate-pulse" />
                  </div>
                  {/* Small Beta tag overlay */}
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg border border-amber-400/20">
                    BETA
                  </span>
                </div>

                <div className="space-y-3 mt-4">
                  <h3 className="text-3xl font-black tracking-tight text-white bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                    {t("dashboard.terminalUnderDevTitle", "Şu Anda Geliştirme Aşamasındadır")}
                  </h3>
                  <p className="text-base text-slate-400 leading-relaxed font-medium">
                    {t("dashboard.terminalUnderDevDesc", "Burası beta sürecinde kullanıma açılacaktır. Terminal modülü üzerinde çalışmalarımız devam ediyor.")}
                  </p>
                </div>

                {/* Info Pills */}
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  <span className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5 text-xs font-semibold text-slate-300 flex items-center gap-2 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    {t("dashboard.terminalBetaSpecial", "Beta'ya Özel")}
                  </span>
                  <span className="px-4 py-2 rounded-2xl bg-white/5 border border-white/5 text-xs font-semibold text-slate-300 flex items-center gap-2 backdrop-blur-md">
                    {t("dashboard.terminalServerPrefix", "Sunucu:")} {server?.alias || server?.name || 'SSH'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {connecting && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md gap-4">
                  <div className="p-4 rounded-3xl bg-primary/10">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-lg font-bold tracking-tight text-foreground">{t("dashboard.connectingDb", "Bağlanılıyor...")}</p>
                    <p className="text-sm text-muted-foreground">{t("dashboard.pleaseWait", "Lütfen bekleyin...")}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl p-8 text-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mb-2 border border-destructive/20 shadow-2xl shadow-destructive/10">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black tracking-tight text-foreground">{t("dashboard.connectionFailed")}</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">{error}</p>
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                  >
                    {t("winPerformance.retryNow")}
                  </button>
                </div>
              )}
            </>
          )}

          {/* We always keep the terminalRef div, but hide it if in Beta mode */}
          <div 
            ref={terminalRef} 
            className={`flex-1 w-full p-8 overflow-hidden ${IS_BETA ? 'hidden' : ''}`} 
            style={{ minHeight: 0 }}
          />
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .xterm-viewport::-webkit-scrollbar {
          width: 10px;
        }
        .xterm-viewport::-webkit-scrollbar-track {
          background: transparent;
        }
        .xterm-viewport::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .xterm-viewport::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .xterm {
          padding: 4px;
        }
        .xterm-screen {
           border-radius: 1.5rem;
           overflow: hidden;
        }
        .xterm-rows {
           font-variant-ligatures: normal;
        }
        .xterm-helper-textarea {
           user-select: text !important;
           -webkit-user-select: text !important;
        }
      `}} />
    </PageLayout>
  );
}
