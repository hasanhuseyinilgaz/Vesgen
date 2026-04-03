import { FilterRule, FilterColumn, JoinRule } from "@/types";

export const isDangerousOperation = (def: string): boolean => {
  if (!def) return false;
  const uDef = def.toUpperCase();
  return ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE"].some((op) =>
    uDef.includes(op),
  );
};

export const mapSqlType = (t: string): string => {
  const map: Record<string, string> = {
    int: "Int",
    bigint: "BigInt",
    varchar: "VarChar",
    nvarchar: "NVarChar",
    datetime: "DateTime",
    bit: "Bit",
    decimal: "Decimal",
    float: "Float",
  };
  return map[t?.toLowerCase()] || "VarChar";
};

export const extractLineNumber = (msg: string) => {
  if (!msg) return 1;
  const match = msg.match(/line\s*(\d+)/i) || msg.match(/sat[ıi]r\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
};

/**
 * Filtre kuralları ve JOIN bilgilerinden SQL WHERE clause metni oluşturur.
 * DataSelectionPanel'deki UI state'ini saf bir SQL string'e dönüştürür.
 */
export const buildWhereClause = (
  validRules: FilterRule[],
  columns: FilterColumn[],
  validJoins: JoinRule[],
): string => {
  return validRules
    .map((rule, idx) => {
      const colMeta = columns.find((c) => c.COLUMN_NAME === rule.column);
      const isString =
        colMeta?.DATA_TYPE.includes("char") ||
        colMeta?.DATA_TYPE.includes("text") ||
        colMeta?.DATA_TYPE.includes("date") ||
        colMeta?.DATA_TYPE.includes("time");

      const formatValue = (val: string) =>
        isString ? `'${val.replace(/'/g, "''")}'` : val;

      const tablePrefix =
        validJoins.length > 0 && colMeta?.tableName
          ? `[${colMeta.tableName}].`
          : "";
      const colName = colMeta?.originalName || rule.column;
      let condition = "";

      if (rule.operator === "BETWEEN" && rule.value2) {
        condition = `${tablePrefix}[${colName}] BETWEEN ${formatValue(rule.value)} AND ${formatValue(rule.value2)}`;
      } else if (rule.operator === "LIKE") {
        condition = `${tablePrefix}[${colName}] LIKE '%${rule.value.replace(/'/g, "''")}%'`;
      } else if (rule.operator === "IN") {
        const inValues = rule.value
          .split(",")
          .map((v: string) => formatValue(v.trim()))
          .join(",");
        condition = `${tablePrefix}[${colName}] IN (${inValues})`;
      } else {
        condition = `${tablePrefix}[${colName}] ${rule.operator} ${formatValue(rule.value)}`;
      }

      if (idx === 0) return condition;
      return `${rule.logicalOperator} ${condition}`;
    })
    .join(" ");
};

/**
 * Veritabanındaki tüm tablo, view, prosedür ve kolon isimlerini
 * döndüren şema keşif sorgusu. Monaco Editor otomatik tamamlama
 * önerilerini oluşturmak için kullanılır.
 */
export const SCHEMA_QUERY = `
  SELECT name AS ItemName, 'TABLE' AS ItemType FROM sys.tables WHERE is_ms_shipped = 0
  UNION ALL
  SELECT name AS ItemName, 'VIEW' AS ItemType FROM sys.views WHERE is_ms_shipped = 0
  UNION ALL
  SELECT name AS ItemName, 'PROCEDURE' AS ItemType FROM sys.procedures WHERE is_ms_shipped = 0
  UNION ALL
  SELECT DISTINCT name AS ItemName, 'COLUMN' AS ItemType FROM sys.columns
`;
