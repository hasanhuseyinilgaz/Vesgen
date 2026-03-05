import { APP_INFO } from "@/lib/constants";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme =
  | "dark"
  | "light"
  | "theme-mint"
  | "theme-amethyst"
  | "theme-ocean"
  | "theme-nord"
  | "theme-tokyo"
  | "theme-vanta"
  | "theme-sunset";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = `${APP_INFO.NAME.toLowerCase()}-ui-theme`,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove(
      "light",
      "dark",
      "theme-ocean",
      "theme-nord",
      "theme-tokyo",
      "theme-vanta",
      "theme-sunset",
      "theme-mint",
      "theme-amethyst",
    );

    root.classList.add(theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
