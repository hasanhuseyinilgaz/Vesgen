export interface DatabaseResource {
  id: string;
  name: string;
  server: string;
  user: string;
  password?: string;
}

export interface WindowsServerResource {
  id: string;
  name: string;
  host: string;
  user: string;
  password?: string;
}

export interface LinuxServerResource {
  id: string;
  name: string;
  host: string;
  user: string;
  privateKeyPath?: string;
}

export interface Tenant {
  id: string;
  name: string;
  description: string;
  shortName: string;
  color: string;
  databases: DatabaseResource[];
  windowsServers: WindowsServerResource[];
  linuxServers: LinuxServerResource[];
}

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

export interface IPCResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  rowsAffected?: number[];
}

export interface ElectronAPI {
  dbConnect: (config: DBConnection) => Promise<IPCResponse>;
  dbDisconnect: () => Promise<IPCResponse>;
  dbGetLastConnection: () => Promise<IPCResponse<DBConnection>>;

  dbGetTables: () => Promise<IPCResponse<Table[]>>;
  dbGetTableData: (params: {
    tableName: string;
    top?: number;
    whereClause?: string;
    orderBy?: string;
  }) => Promise<IPCResponse<any[]>>;
  dbGetTableColumns: (tableName: string) => Promise<IPCResponse<Column[]>>;

  dbGetViews: () => Promise<IPCResponse<View[]>>;
  dbGetViewDefinition: (viewName: string) => Promise<IPCResponse<string>>;

  dbGetStoredProcedures: () => Promise<IPCResponse<StoredProcedure[]>>;
  dbGetSPParameters: (spName: string) => Promise<IPCResponse<SPParameter[]>>;
  dbExecuteSP: (params: {
    spName: string;
    parameters: any[];
  }) => Promise<IPCResponse>;

  dbExecuteQuery: (query: string) => Promise<IPCResponse>;

  fsReadQueries: () => Promise<IPCResponse<Query[]>>;
  fsReadPresets: () => Promise<IPCResponse<Preset[]>>;
  fsSavePresets: (presets: Preset[]) => Promise<IPCResponse>;

  fsReadTenants: () => Promise<IPCResponse<Tenant[]>>;
  fsSaveTenant: (tenant: Tenant) => Promise<IPCResponse>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
