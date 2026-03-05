const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  configGet: () => ipcRenderer.invoke("config:get"),
  configSet: (newConfig) => ipcRenderer.invoke("config:set", newConfig),
  authVerifyAdmin: (password) =>
    ipcRenderer.invoke("auth:verifyAdmin", password),

  dbConnect: (config) => ipcRenderer.invoke("db:connect", config),
  dbGetLastConnection: () => ipcRenderer.invoke("db:getLastConnection"),
  dbDisconnect: () => ipcRenderer.invoke("db:disconnect"),
  dbGetTables: () => ipcRenderer.invoke("db:getTables"),
  dbGetTableData: (args) => ipcRenderer.invoke("db:getTableData", args),
  dbGetTableColumns: (tableName) =>
    ipcRenderer.invoke("db:getTableColumns", tableName),
  dbGetViews: () => ipcRenderer.invoke("db:getViews"),
  dbGetViewDefinition: (viewName) =>
    ipcRenderer.invoke("db:getViewDefinition", viewName),
  dbGetStoredProcedures: () => ipcRenderer.invoke("db:getStoredProcedures"),
  dbGetSPParameters: (spName) =>
    ipcRenderer.invoke("db:getSPParameters", spName),
  dbExecuteSP: (args) => ipcRenderer.invoke("db:executeSP", args),
  dbExecuteQuery: (query) => ipcRenderer.invoke("db:executeQuery", query),
  dbUpdateRecord: (args) => ipcRenderer.invoke("db:updateRecord", args),

  fsReadQueries: () => ipcRenderer.invoke("fs:readQueries"),
  fsSaveQuery: (args) => ipcRenderer.invoke("fs:saveQuery", args),
  fsDeleteQuery: (filename) => ipcRenderer.invoke("fs:deleteQuery", filename),
  fsReadPresets: () => ipcRenderer.invoke("fs:readPresets"),
  fsSavePresets: (presets) => ipcRenderer.invoke("fs:savePresets", presets),

  dbGetActivity: () => ipcRenderer.invoke("db:getActivity"),
  dbGetServerHealth: () => ipcRenderer.invoke("db:getServerHealth"),
  dbGetTableRelations: (tableName) =>
    ipcRenderer.invoke("db:getTableRelations", tableName),

  fsReadTenants: () => ipcRenderer.invoke("fs:readTenants"),
  fsSaveTenant: (tenant) => ipcRenderer.invoke("fs:saveTenant", tenant),
  fsDeleteTenant: (tenantId) => ipcRenderer.invoke("fs:deleteTenant", tenantId),

  dbGetFragmentedIndexes: () => ipcRenderer.invoke("db:getFragmentedIndexes"),
  dbFixIndex: (args) => ipcRenderer.invoke("db:fixIndex", args),
  dbGetDbSpaceInfo: () => ipcRenderer.invoke("db:getDbSpaceInfo"),
  dbShrinkLogFile: () => ipcRenderer.invoke("db:shrinkLogFile"),
  dbGetStatisticsInfo: () => ipcRenderer.invoke("db:getStatisticsInfo"),
  dbUpdateTableStatistics: (tableName) =>
    ipcRenderer.invoke("db:updateTableStatistics", tableName),
  dbUpdateAllStatistics: () => ipcRenderer.invoke("db:updateAllStatistics"),

  dbGetSqlJobs: () => ipcRenderer.invoke("db:getSqlJobs"),
  dbExecuteJobAction: (data) => ipcRenderer.invoke("db:executeJobAction", data),
  dbToggleSqlJob: (data) => ipcRenderer.invoke("db:toggleSqlJob", data),
  dbGetSqlJobHistory: (jobName) =>
    ipcRenderer.invoke("db:getSqlJobHistory", jobName),
  dbGetSqlJobDetails: (jobName) =>
    ipcRenderer.invoke("db:getSqlJobDetails", jobName),
  dbCreateSqlJob: (data) => ipcRenderer.invoke("db:createSqlJob", data),
  dbGetCurrentDbName: () => ipcRenderer.invoke("db:getCurrentDbName"),
  dbSaveJobMaster: (data) => ipcRenderer.invoke("db:saveJobMaster", data),

  windowMinimize: () => ipcRenderer.send("window:minimize"),
  windowMaximize: () => ipcRenderer.send("window:maximize"),
  windowClose: () => ipcRenderer.send("window:close"),
});
