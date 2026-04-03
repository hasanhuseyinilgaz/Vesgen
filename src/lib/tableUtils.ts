/**
 * Tablo verisi görüntüleme ve düzenleme için yardımcı fonksiyonlar.
 * DataTable component'ı ve tablo verisi işleyen diğer bileşenler tarafından kullanılır.
 */

/**
 * Bir sütunun tarih/zaman tipi içerip içermediğini kontrol eder.
 */
export const isDateColumn = (type?: string): boolean => {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes("date") || t.includes("time");
};

/**
 * Bir değeri HTML datetime-local input'unun beklediği formata dönüştürür.
 * Örnek çıktı: "2024-03-31T14:30:00"
 */
export const formatToDatetimeLocal = (val: any): string => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val.toString();

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * BigInt değerleri de dahil olmak üzere herhangi bir nesneyi JSON string'e çevirir.
 * JSON.stringify'ın BigInt tipinde fırlattığı hatayı engeller.
 */
export const safeStringify = (obj: any): string => {
  try {
    return JSON.stringify(obj, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
  } catch (e) {
    console.error("Stringify error:", e);
    return "";
  }
};

/**
 * Bir sütunun uzun metin alanı olup olmadığını belirler.
 * Textarea renderer'ın devreye girmesi için kullanılır.
 */
export const isLongTextField = (
  name: string,
  type?: string,
  value?: string,
): boolean => {
  const n = name.toLowerCase();
  const t = type?.toLowerCase() || "";
  return (
    t.includes("max") ||
    t.includes("text") ||
    t.includes("xml") ||
    n.includes("sql") ||
    n.includes("desc") ||
    n.includes("comment") ||
    n.includes("note") ||
    n.includes("query") ||
    (!!value && value.length > 50) ||
    (!!value && value.includes("\n"))
  );
};
