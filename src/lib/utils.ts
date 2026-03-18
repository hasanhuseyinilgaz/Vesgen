import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getThemeColorHex(variableName: string): string {
  if (typeof window === "undefined") return "#000000";

  const root = document.documentElement;
  const style = getComputedStyle(root);
  const colorStr = style.getPropertyValue(variableName).trim();

  if (!colorStr) return "#000000";

  // Format usually: "H S% L%" or "H S L"
  const parts = colorStr.split(/\s+/).map((p) => p.replace("%", ""));
  if (parts.length < 3) return colorStr.startsWith("#") ? colorStr : "#000000";

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);

  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
