import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Palette, Check } from "lucide-react";

import ActionTooltip from "@/components/ActionTooltip";

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleNativeWheel);
    };
  }, []);

  const themes = [
    {
      id: "light",
      name: t("components.themeSwitcher.light"),
      color: "bg-white border-gray-300",
    },
    {
      id: "dark",
      name: t("components.themeSwitcher.dark"),
      color: "bg-slate-900 border-slate-700",
    },
    {
      id: "theme-ocean",
      name: t("components.themeSwitcher.ocean"),
      color: "bg-[#0f172a] border-[#38bdf8]",
    },
    {
      id: "theme-nord",
      name: t("components.themeSwitcher.nord"),
      color: "bg-[#2e3440] border-[#88c0d0]",
    },
    {
      id: "theme-tokyo",
      name: t("components.themeSwitcher.tokyo"),
      color: "bg-[#1a1b26] border-[#7aa2f7]",
    },
    {
      id: "theme-sunset",
      name: t("components.themeSwitcher.sunset"),
      color: "bg-[#1c1326] border-[#ff7b54]",
    },
    {
      id: "theme-vanta",
      name: t("components.themeSwitcher.vanta"),
      color: "bg-[#000000] border-[#ffffff]",
    },
    {
      id: "theme-mint",
      name: t("components.themeSwitcher.mint"),
      color: "bg-[#000d08] border-[#00e676]",
    },
    {
      id: "theme-amethyst",
      name: t("components.themeSwitcher.amethyst"),
      color: "bg-[#1f0f29] border-[#b066ff]",
    },
  ];

  return (
    <div className="flex items-center gap-3 bg-card border border-border/50 px-3 rounded-full shadow-sm w-full transition-all">
      <ActionTooltip label={t("components.themeSwitcher.title")} side="top">
        <Palette className="w-4 h-4 text-muted-foreground shrink-0 cursor-help" />
      </ActionTooltip>

      <div className="w-px h-4 bg-border shrink-0"></div>

      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto flex-nowrap scroll-smooth flex-1 py-3 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {themes.map((t) => (
          <ActionTooltip key={t.id} label={t.name} side="top">
            <button
              onClick={() => setTheme(t.id as any)}
              className={cn(
                "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110",
                t.color,
                theme === t.id
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              {theme === t.id && (
                <Check
                  className={cn(
                    "w-3 h-3 transition-colors",
                    t.id === "light" ? "text-black" : "text-white",
                  )}
                />
              )}
            </button>
          </ActionTooltip>
        ))}
      </div>
    </div>
  );
}
