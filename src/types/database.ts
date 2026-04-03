export interface DBConnection {
  server: string;
  database: string;
  user: string;
  password: string;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  saveConnection?: boolean;
}

export interface Table {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
  TABLE_TYPE: string;
}

export interface Column {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  CHARACTER_MAXIMUM_LENGTH: number | null;
  IS_NULLABLE: string;
  COLUMN_DEFAULT: string | null;
  IS_IDENTITY: number;
}

export interface FilterColumn {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  tableName?: string;
  originalName?: string;
}

export interface FilterRule {
  id: string;
  logicalOperator: "AND" | "OR";
  column: string;
  operator: string;
  value: string;
  value2?: string;
}

export interface JoinRule {
  id: string;
  type?: string;
  targetTable: string;
  localColumn: string;
  targetColumn: string;
}

export interface View {
  TABLE_SCHEMA: string;
  TABLE_NAME: string;
}

export interface StoredProcedure {
  ROUTINE_SCHEMA: string;
  ROUTINE_NAME: string;
  ROUTINE_DEFINITION: string;
}

export interface SPParameter {
  PARAMETER_NAME: string;
  DATA_TYPE: string;
  CHARACTER_MAXIMUM_LENGTH: number | null;
  PARAMETER_MODE: string;
}

export interface Query {
  name: string;
  filename: string;
  content: string;
}

export interface Preset {
  spName: string;
  parameters: Array<{
    name: string;
    value: any;
  }>;
}
