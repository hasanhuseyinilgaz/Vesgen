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
