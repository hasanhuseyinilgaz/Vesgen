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

  winTestConnection: (config) => ipcRenderer.invoke("win:testConnection", config),
  winGetPerformanceStats: (config) => ipcRenderer.invoke("win:getPerformanceStats", config),
  winGetServices: (config) => ipcRenderer.invoke("win:getServices", config),
  winStartService: (args) => ipcRenderer.invoke("win:startService", args),
  winStopService: (args) => ipcRenderer.invoke("win:stopService", args),
  winToggleServiceWatch: (args) => ipcRenderer.invoke("win:toggleServiceWatch", args),

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
  appPageChanged: (pagePath) => ipcRenderer.send("app:pageChanged", pagePath),
  appSetTrayLanguage: (langStrings) => ipcRenderer.send("app:setTrayLanguage", langStrings),

  // Notifications
  notificationsGet: () => ipcRenderer.invoke("notifications:get"),
  notificationsMarkAsRead: (id) => ipcRenderer.invoke("notifications:markAsRead", id),
  notificationsToggleRead: (id) => ipcRenderer.invoke("notifications:toggleRead", id),
  notificationsMarkAllAsRead: () => ipcRenderer.invoke("notifications:markAllAsRead"),
  notificationsClearAll: () => ipcRenderer.invoke("notifications:clearAll"),
  onAppNotification: (callback) => {
    const channel = "app:notification";
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Monitoring Service
  monitoringStart: (server) => ipcRenderer.invoke("monitoring:start", server),
  monitoringStop: (id) => ipcRenderer.invoke("monitoring:stop", id),
  monitoringUpdateInterval: (id, ms) => ipcRenderer.invoke("monitoring:updateInterval", { serverId: id, interval: ms }),
  monitoringUpdateConfig: (id, config) => ipcRenderer.invoke("monitoring:updateConfig", { serverId: id, config }),
  monitoringGetHistory: (args) => ipcRenderer.invoke("monitoring:getHistory", args),
  monitoringGetAvailableDates: (serverId) => ipcRenderer.invoke("monitoring:getAvailableDates", serverId),
  monitoringGenerateReport: (args) => ipcRenderer.invoke("monitoring:generateReport", args),
  monitoringRefresh: () => ipcRenderer.invoke("monitoring:refresh"),
  monitoringGetAllStatuses: () => ipcRenderer.invoke("monitoring:getAllStatuses"),
  onMonitoringUpdate: (serverId, callback) => {
    const channel = `monitoring:update:${serverId}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  onMonitoringStatus: (serverId, callback) => {
    const channel = `monitoring:status:${serverId}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  onTenantsUpdated: (callback) => {
    const channel = "tenants-updated";
    const listener = () => callback();
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  // Terminal Streams
  winStartTerminalSession: (serverId, config) => ipcRenderer.invoke("win:startTerminalSession", serverId, config),
  winTerminalInput: (serverId, input) => ipcRenderer.invoke("win:terminalInput", serverId, input),
  winResizeTerminal: (serverId, cols, rows) => ipcRenderer.invoke("win:resizeTerminal", serverId, cols, rows),
  winStopTerminalSession: (serverId) => ipcRenderer.invoke("win:stopTerminalSession", serverId),
  onTerminalData: (serverId, callback) => {
    const channel = `terminal:data:${serverId}`;
    const listener = (event, data) => callback(data);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },

  sendNetworkStatus: (online) => ipcRenderer.send("app:networkStatus", { online }),
  platform: process.platform,
});
