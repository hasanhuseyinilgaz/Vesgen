import {
  DBConnection,
  Table,
  Column,
  View,
  StoredProcedure,
  SPParameter,
  Query,
  Preset
} from "./database";
import { Tenant, WindowsServerResource } from "./resources";

export interface IPCResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  rowsAffected?: number[];
  lineNumber?: number;
  newFragmentation?: number;
  newHealthScore?: number;
  action?: string;
  messages?: { message: string, line?: number }[];
  cpu?: any;
  disks?: any[];
}

export interface ElectronAPI {
  configGet: () => Promise<IPCResponse<any>>;
  configSet: (newConfig: any) => Promise<IPCResponse>;
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
  dbUpdateRecord: (data: any) => Promise<IPCResponse>;

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
  fsSaveQuery: (query: { filename: string, content: string }) => Promise<IPCResponse>;
  fsReadPresets: () => Promise<IPCResponse<Preset[]>>;
  fsSavePresets: (presets: Preset[]) => Promise<IPCResponse>;

  fsReadTenants: () => Promise<IPCResponse<Tenant[]>>;
  fsSaveTenant: (tenant: Tenant) => Promise<IPCResponse>;

  winTestConnection: (config: WindowsServerResource) => Promise<IPCResponse<any>>;
  winGetPerformanceStats: (config: WindowsServerResource) => Promise<IPCResponse<any>>;
  winGetServices: (config: WindowsServerResource) => Promise<IPCResponse<any[]>>;

  // Monitoring Service
  monitoringStart: (server: WindowsServerResource) => Promise<IPCResponse>;
  monitoringGetHistory: (serverId: string, dateStr?: string) => Promise<IPCResponse<any[]>>;
  monitoringGetAvailableDates: (serverId: string) => Promise<IPCResponse<string[]>>;
  monitoringStop: (serverId: string) => Promise<IPCResponse>;
  monitoringUpdateInterval: (serverId: string, intervalMs: number) => Promise<IPCResponse>;
  monitoringGenerateReport: (args: { server: WindowsServerResource, range?: string, lang?: string, dateStr?: string, dateRange?: { start?: string, end?: string } }) => Promise<{ success: boolean; message: string; path?: string }>;
  onMonitoringUpdate: (serverId: string, callback: (data: any) => void) => () => void;
  onMonitoringStatus: (serverId: string, callback: (data: any) => void) => () => void;

  authVerifyAdmin: (password: string) => Promise<IPCResponse>;
  dbGetActivity: () => Promise<IPCResponse<any>>;
  dbGetServerHealth: () => Promise<IPCResponse<any>>;
  dbGetTableRelations: (tableName: string) => Promise<IPCResponse<any>>;
  fsDeleteQuery: (filename: string) => Promise<IPCResponse>;
  fsDeleteTenant: (tenantId: string) => Promise<IPCResponse>;

  dbGetFragmentedIndexes: () => Promise<IPCResponse<any[]>>;
  dbFixIndex: (args: { tableName: string; indexName: string; action?: 'REORGANIZE' | 'REBUILD'; fragmentation?: number; }) => Promise<IPCResponse>;
  dbGetDbSpaceInfo: () => Promise<IPCResponse<any>>;
  dbShrinkLogFile: () => Promise<IPCResponse>;
  dbGetStatisticsInfo: () => Promise<IPCResponse<any[]>>;
  dbUpdateTableStatistics: (tableName: string) => Promise<IPCResponse>;
  dbUpdateAllStatistics: () => Promise<IPCResponse>;

  dbGetSqlJobs: () => Promise<IPCResponse<any[]>>;
  dbExecuteJobAction: (data: { jobName: string; action: 'start' | 'stop' }) => Promise<IPCResponse>;
  dbToggleSqlJob: (data: { jobName: string; enabled: boolean }) => Promise<IPCResponse>;
  dbGetSqlJobHistory: (jobName: string) => Promise<IPCResponse<any[]>>;
  dbGetSqlJobDetails: (jobName: string) => Promise<IPCResponse<any>>;
  dbCreateSqlJob: (data: any) => Promise<IPCResponse>;
  dbGetCurrentDbName: () => Promise<IPCResponse<string>>;
  dbSaveJobMaster: (data: any) => Promise<IPCResponse>;

  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;

  platform: string;
}


