import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS sınıf isimlerini birleştiren yardımcı fonksiyon.
 * Renk ve tema yardımcıları için: @/lib/colorUtils
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
