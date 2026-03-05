import * as XLSX from "xlsx";

export const exportToExcel = (data: any[], fileName: string) => {
  if (!data || data.length === 0) return;

  try {
    const worksheet = XLSX.utils.json_to_sheet(data);

    const headers = Object.keys(data[0]);
    const colWidths = headers.map((header) => {
      let maxLength = header.length;

      data.forEach((row) => {
        const val = row[header] ? row[header].toString() : "";
        if (val.length > maxLength) {
          maxLength = val.length;
        }
      });

      return { wch: Math.min(maxLength + 2, 50) };
    });

    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Veriler");

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(workbook, `${fileName}_Export_${dateStr}.xlsx`);
  } catch (error) {
    console.error("Excel aktarma hatası:", error);
    throw error;
  }
};
