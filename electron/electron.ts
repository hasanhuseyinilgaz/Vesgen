import {
  DBConnection,
  IPCResponse,
  Table,
  Column,
  View,
  StoredProcedure,
  SPParameter,
  Query,
  Preset,
  Tenant,
} from "src/types";

const { ipcRenderer } = window.require
  ? window.require("electron")
  : { ipcRenderer: null };

export const electronAPI = {
  configGet: (): Promise<IPCResponse<any>> => ipcRenderer.invoke("config:get"),

  configSet: (newConfig: any): Promise<IPCResponse> =>
    ipcRenderer.invoke("config:set", newConfig),

  authVerifyAdmin: (password: string): Promise<IPCResponse> =>
    ipcRenderer.invoke("auth:verifyAdmin", password),

  dbConnect: (config: DBConnection): Promise<IPCResponse> =>
    ipcRenderer.invoke("db:connect", config),

  dbDisconnect: (): Promise<IPCResponse> => ipcRenderer.invoke("db:disconnect"),

  dbGetLastConnection: (): Promise<IPCResponse<DBConnection>> =>
    ipcRenderer.invoke("db:getLastConnection"),

  dbGetTables: (): Promise<IPCResponse<Table[]>> =>
    ipcRenderer.invoke("db:getTables"),

  dbGetTableData: (params: {
    tableName: string;
    top?: number;
    whereClause?: string;
    orderBy?: string;
  }): Promise<IPCResponse<any[]>> =>
    ipcRenderer.invoke("db:getTableData", params),

  dbGetTableColumns: (tableName: string): Promise<IPCResponse<Column[]>> =>
    ipcRenderer.invoke("db:getTableColumns", tableName),

  dbUpdateRecord: (params: {
    tableName: string;
    idColumn: string;
    idValue: any;
    newData: Record<string, any>;
  }): Promise<IPCResponse> => ipcRenderer.invoke("db:updateRecord", params),

  dbGetViews: (): Promise<IPCResponse<View[]>> =>
    ipcRenderer.invoke("db:getViews"),

  dbGetViewDefinition: (viewName: string): Promise<IPCResponse<string>> =>
    ipcRenderer.invoke("db:getViewDefinition", viewName),

  dbGetStoredProcedures: (): Promise<IPCResponse<StoredProcedure[]>> =>
    ipcRenderer.invoke("db:getStoredProcedures"),

  dbGetSPParameters: (spName: string): Promise<IPCResponse<SPParameter[]>> =>
    ipcRenderer.invoke("db:getSPParameters", spName),

  dbExecuteSP: (params: {
    spName: string;
    parameters: any[];
  }): Promise<IPCResponse> => ipcRenderer.invoke("db:executeSP", params),

  dbExecuteQuery: (query: string): Promise<IPCResponse> =>
    ipcRenderer.invoke("db:executeQuery", query),

  fsReadQueries: (): Promise<IPCResponse<Query[]>> =>
    ipcRenderer.invoke("fs:readQueries"),

  fsSaveQuery: (params: {
    filename: string;
    content: string;
  }): Promise<IPCResponse> => ipcRenderer.invoke("fs:saveQuery", params),

  fsDeleteQuery: (filename: string): Promise<IPCResponse> =>
    ipcRenderer.invoke("fs:deleteQuery", filename),

  fsReadPresets: (): Promise<IPCResponse<Preset[]>> =>
    ipcRenderer.invoke("fs:readPresets"),

  fsSavePresets: (presets: Preset[]): Promise<IPCResponse> =>
    ipcRenderer.invoke("fs:savePresets", presets),

  fsReadTenants: (): Promise<IPCResponse<Tenant[]>> =>
    ipcRenderer.invoke("fs:readTenants"),

  fsSaveTenant: (tenant: Tenant): Promise<IPCResponse> =>
    ipcRenderer.invoke("fs:saveTenant", tenant),

  fsDeleteTenant: (tenantId: string) =>
    ipcRenderer.invoke("fs:deleteTenant", tenantId),

  dbGetActivity: (): Promise<IPCResponse<any[]>> =>
    ipcRenderer.invoke("db:getActivity"),

  dbGetServerHealth: (): Promise<IPCResponse<any>> =>
    ipcRenderer.invoke("db:getServerHealth"),

  dbGetTableRelations: (tableName: string): Promise<IPCResponse<any[]>> =>
    ipcRenderer.invoke("db:getTableRelations", tableName),

  dbGetFragmentedIndexes: (): Promise<IPCResponse<any[]>> =>
    ipcRenderer.invoke("db:getFragmentedIndexes"),

  dbFixIndex: (params: {
    tableName: string;
    indexName: string;
    fragmentation: number;
  }): Promise<IPCResponse> => ipcRenderer.invoke("db:fixIndex", params),

  dbGetDbSpaceInfo: (): Promise<IPCResponse<any>> =>
    ipcRenderer.invoke("db:getDbSpaceInfo"),

  dbShrinkLogFile: (): Promise<IPCResponse> =>
    ipcRenderer.invoke("db:shrinkLogFile"),

  dbGetStatisticsInfo: (): Promise<IPCResponse<any>> =>
    ipcRenderer.invoke("db:getStatisticsInfo"),

  dbUpdateTableStatistics: (tableName: string): Promise<IPCResponse> =>
    ipcRenderer.invoke("db:updateTableStatistics", tableName),

  dbUpdateAllStatistics: (): Promise<IPCResponse> =>
    ipcRenderer.invoke("db:updateAllStatistics"),

  dbGetSqlJobs: (): Promise<IPCResponse<any[]>> =>
    ipcRenderer.invoke("db:getSqlJobs"),

  dbExecuteJobAction: (params: {
    jobName: string;
    action: "start" | "stop";
  }): Promise<IPCResponse> => ipcRenderer.invoke("db:executeJobAction", params),

  dbToggleSqlJob: (params: {
    jobName: string;
    enabled: boolean;
  }): Promise<IPCResponse> => ipcRenderer.invoke("db:toggleSqlJob", params),

  dbGetSqlJobHistory: (jobName: string): Promise<IPCResponse<any[]>> =>
    ipcRenderer.invoke("db:getSqlJobHistory", jobName),

  dbGetSqlJobDetails: (jobName: string): Promise<IPCResponse<any>> =>
    ipcRenderer.invoke("db:getSqlJobDetails", jobName),

  dbCreateSqlJob: (data: any): Promise<IPCResponse> =>
    ipcRenderer.invoke("db:createSqlJob", data),

  dbGetCurrentDbName: (): Promise<IPCResponse<string>> =>
    ipcRenderer.invoke("db:getCurrentDbName"),

  dbSaveJobMaster: (params: {
    isEdit: boolean;
    originalName: string;
    jobData: any;
  }): Promise<IPCResponse> => ipcRenderer.invoke("db:saveJobMaster", params),

  windowMinimize: () => ipcRenderer.send("window:minimize"),
  windowMaximize: () => ipcRenderer.send("window:maximize"),
  windowClose: () => ipcRenderer.send("window:close"),
};
