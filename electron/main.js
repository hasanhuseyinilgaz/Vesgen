const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const sql = require("mssql");
const Store = require("electron-store");
const fs = require("fs").promises;
const bcrypt = require("bcryptjs");

const store = new Store();
let mainWindow;
let pool = null;

const configPath = path.join(app.getPath("userData"), "app_config.json");

const DEFAULT_CONFIG = {
  security: {
    adminPassword: "admin",
    requirePasswordFor: {
      updateRecord: true,
      indexOptimize: true,
      logShrink: true,
      statsUpdate: false,
    },
  },
  maintenance: {
    index: { warningThreshold: 10, criticalThreshold: 30 },
    statistics: { staleThreshold: 20 },
  },
  ui: {
    primaryColor: "#f59e0b",
    table: { defaultPageSize: 20 },
  },
};

async function ensureConfig() {
  try {
    await fs.access(configPath);
  } catch {
    await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log("Yeni config dosyası oluşturuldu:", configPath);
  }
}
ensureConfig();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,

    frame: false,
    titleBarStyle: "hidden",

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../assets/icon.png"),
  });

  mainWindow.setMenu(null);

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("window:maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("window:close", () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle("config:get", async () => {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("config:set", async (event, newConfig) => {
  try {
    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("auth:verifyAdmin", async (event, password) => {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content);
    const isValid = password === config.security.adminPassword;
    return {
      success: isValid,
      message: isValid ? "Yetki onaylandı." : "Hatalı admin şifresi!",
    };
  } catch (error) {
    return { success: false, message: "Ayarlar dosyasına erişilemedi." };
  }
});

ipcMain.handle("db:connect", async (event, config) => {
  try {
    if (pool) await pool.close();

    const dbConfig = {
      server: config.server,
      database: config.database,
      user: config.user,
      password: config.password,
      options: {
        encrypt: config.encrypt || false,
        trustServerCertificate: config.trustServerCertificate || true,
        enableArithAbort: true,
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };

    pool = await sql.connect(dbConfig);

    if (config.saveConnection) {
      const hashedPassword = await bcrypt.hash(config.password, 10);
      store.set("lastConnection", {
        server: config.server,
        database: config.database,
        user: config.user,
        password: hashedPassword,
        encrypt: config.encrypt,
        trustServerCertificate: config.trustServerCertificate,
      });
    }

    return { success: true, message: "Bağlantı başarılı!" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getLastConnection", async () => {
  try {
    const lastConnection = store.get("lastConnection");
    if (lastConnection) return { success: true, data: lastConnection };
    return { success: false };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:disconnect", async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getTables", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const result = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME
    `);
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "db:getTableData",
  async (event, { tableName, top, whereClause, orderBy }) => {
    try {
      if (!pool) throw new Error("Veritabanı bağlantısı yok");

      const colResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${tableName}'
    `);

      const columns = colResult.recordset;

      const selectColumns = columns
        .map((col) => {
          const type = col.DATA_TYPE.toLowerCase();
          if (
            type === "varbinary" ||
            type === "image" ||
            type === "geometry" ||
            type === "geography"
          ) {
            return `CAST('<Binary/Spatial Data>' AS VARCHAR(50)) AS [${col.COLUMN_NAME}]`;
          }
          if (type === "xml" || type === "text" || type === "ntext") {
            return `CAST(LEFT([${col.COLUMN_NAME}], 500) + '...' AS VARCHAR(503)) AS [${col.COLUMN_NAME}]`;
          }
          return `[${col.COLUMN_NAME}]`;
        })
        .join(", ");

      const finalSelect = selectColumns.length > 0 ? selectColumns : "*";
      const topClause = top ? `TOP ${top}` : "TOP 100";
      const where = whereClause ? `WHERE ${whereClause}` : "";
      const order = orderBy ? `ORDER BY ${orderBy}` : "";

      const query = `SELECT ${topClause} ${finalSelect} FROM [${tableName}] ${where} ${order}`;
      const result = await pool.request().query(query);

      return { success: true, data: result.recordset };
    } catch (error) {
      console.error("Tablo veri çekme hatası:", error);
      return { success: false, message: error.message };
    }
  },
);

ipcMain.handle("db:getTableColumns", async (event, tableName) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT,
      COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IS_IDENTITY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}' ORDER BY ORDINAL_POSITION
    `);
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "db:updateRecord",
  async (event, { tableName, idColumn, idValue, newData }) => {
    try {
      if (!pool) throw new Error("Veritabanı bağlantısı yok");

      const request = pool.request();

      const colMetaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${tableName}'
    `);
      const colMeta = colMetaResult.recordset;

      let setClauses = [];

      Object.keys(newData).forEach((key) => {
        if (key !== idColumn) {
          setClauses.push(`[${key}] = @${key}`);

          let value = newData[key];

          const columnInfo = colMeta.find((c) => c.COLUMN_NAME === key);
          const dataType = columnInfo ? columnInfo.DATA_TYPE.toLowerCase() : "";
          const isDateType =
            dataType.includes("date") || dataType.includes("time");

          if (value === "" || value === "NULL" || value === null) {
            value = null;
          } else if (isDateType) {
            const dateObj = new Date(value);
            if (!isNaN(dateObj.getTime())) {
              value = dateObj;
            }
          }

          request.input(key, value);
        }
      });

      if (setClauses.length === 0) {
        return { success: false, message: "Güncellenecek veri bulunamadı." };
      }

      request.input("PrimaryKey_ID", idValue);

      const updateQuery = `
      UPDATE [${tableName}]
      SET ${setClauses.join(", ")}
      WHERE [${idColumn}] = @PrimaryKey_ID
    `;

      const result = await request.query(updateQuery);

      return {
        success: true,
        message: "Veri başarıyla güncellendi.",
        rowsAffected: result.rowsAffected,
      };
    } catch (error) {
      console.error("Güncelleme Hatası:", error);
      return { success: false, message: error.message };
    }
  },
);

ipcMain.handle("db:getViews", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const result = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS ORDER BY TABLE_NAME
    `);
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getViewDefinition", async (event, viewName) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const result = await pool.request().query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('${viewName}')) as definition
    `);
    return { success: true, data: result.recordset[0]?.definition };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getStoredProcedures", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const result = await pool.request().query(`
      SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_DEFINITION
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE' ORDER BY ROUTINE_NAME
    `);
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getSPParameters", async (event, spName) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const result = await pool.request().query(`
      SELECT PARAMETER_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, PARAMETER_MODE
      FROM INFORMATION_SCHEMA.PARAMETERS
      WHERE SPECIFIC_NAME = '${spName}' ORDER BY ORDINAL_POSITION
    `);
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:executeSP", async (event, { spName, parameters }) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const request = pool.request();
    for (const param of parameters) {
      request.input(param.name.replace("@", ""), sql[param.type], param.value);
    }
    const result = await request.execute(spName);
    return {
      success: true,
      data: result.recordset,
      rowsAffected: result.rowsAffected,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:executeQuery", async (event, query) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const result = await pool.request().query(query);
    return {
      success: true,
      data: result.recordset,
      rowsAffected: result.rowsAffected,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:readQueries", async () => {
  try {
    const queriesPath = path.join(__dirname, "../queries");
    const files = await fs.readdir(queriesPath);
    const sqlFiles = files.filter((file) => file.endsWith(".sql"));
    const queries = await Promise.all(
      sqlFiles.map(async (file) => {
        const content = await fs.readFile(
          path.join(queriesPath, file),
          "utf-8",
        );
        return { name: file.replace(".sql", ""), filename: file, content };
      }),
    );
    return { success: true, data: queries };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:saveQuery", async (event, { filename, content }) => {
  try {
    const safeName = filename.endsWith(".sql") ? filename : `${filename}.sql`;
    const filePath = path.join(__dirname, "../queries", safeName);
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true, message: "Sorgu başarıyla kaydedildi." };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:deleteQuery", async (event, filename) => {
  try {
    const filePath = path.join(__dirname, "../queries", filename);
    await fs.unlink(filePath);
    return { success: true, message: "Sorgu silindi." };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:readPresets", async () => {
  try {
    const presetsPath = path.join(__dirname, "../configs/presets.json");
    const content = await fs.readFile(presetsPath, "utf-8");
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    return { success: false, message: error.message, data: [] };
  }
});

ipcMain.handle("fs:savePresets", async (event, presets) => {
  try {
    const presetsPath = path.join(__dirname, "../configs/presets.json");
    await fs.writeFile(presetsPath, JSON.stringify(presets, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

const tenantsDirPath = path.join(__dirname, "../configs/tenants");

async function ensureTenantsDir() {
  try {
    await fs.access(tenantsDirPath);
  } catch {
    await fs.mkdir(tenantsDirPath, { recursive: true });
  }
}

ipcMain.handle("fs:readTenants", async () => {
  try {
    await ensureTenantsDir();
    const files = await fs.readdir(tenantsDirPath);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const tenants = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(
          path.join(tenantsDirPath, file),
          "utf-8",
        );
        return JSON.parse(content);
      }),
    );

    return { success: true, data: tenants };
  } catch (error) {
    console.error("Ortamlar okunurken hata:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:saveTenant", async (event, tenantData) => {
  try {
    await ensureTenantsDir();
    const filePath = path.join(tenantsDirPath, `${tenantData.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(tenantData, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Ortam kaydedilirken hata:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:deleteTenant", async (event, tenantId) => {
  try {
    const filePath = path.join(tenantsDirPath, `${tenantId}.json`);
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error("Ortam silinirken hata:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getActivity", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");

    const result = await pool.request().query(`
      SELECT 
        s.session_id AS [SPID],
        DB_NAME(s.database_id) AS [DB Name],
        s.login_name AS [Login],
        s.host_name AS [Host],
        s.program_name AS [Application],
        COALESCE(r.status, s.status) AS [Status],
        r.command AS [Command],
        r.cpu_time AS [CPU],
        r.total_elapsed_time AS [Elapsed Time],
        r.logical_reads AS [Reads],
        st.text AS [Query Text],
        r.wait_type AS [Wait Type],
        r.blocking_session_id AS [Blocked By],
        s.last_request_start_time AS [Last Start]
      FROM sys.dm_exec_sessions s
      LEFT JOIN sys.dm_exec_requests r ON s.session_id = r.session_id
      OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) st
      WHERE s.is_user_process = 1
      AND s.session_id <> @@SPID
      ORDER BY r.cpu_time DESC, r.total_elapsed_time DESC
    `);

    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getServerHealth", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");

    const cpuResult = await pool.request().query(`
      SELECT TOP 1 
        record.value('(./Record/SchedulerMonitorEvent/SystemHealth/ProcessUtilization)[1]', 'int') AS [SQLCPU]
      FROM (
        SELECT TIMESTAMP, CONVERT(xml, record) AS record 
        FROM sys.dm_os_ring_buffers 
        WHERE ring_buffer_type = N'RING_BUFFER_SCHEDULER_MONITOR' 
        AND record LIKE '%<SystemHealth>%') AS x 
      ORDER BY TIMESTAMP DESC
    `);

    const diskResult = await pool.request().query(`
      SELECT DISTINCT
        dovs.volume_mount_point AS [Drive],
        CAST(dovs.available_bytes * 1.0 / 1024 / 1024 / 1024 AS DECIMAL(10,2)) AS [FreeGB],
        CAST(dovs.total_bytes * 1.0 / 1024 / 1024 / 1024 AS DECIMAL(10,2)) AS [TotalGB],
        CAST((dovs.total_bytes - dovs.available_bytes) * 1.0 / dovs.total_bytes * 100 AS DECIMAL(10,2)) AS [UsedPercent]
      FROM sys.master_files AS mf
      CROSS APPLY sys.dm_os_volume_stats(mf.database_id, mf.file_id) AS dovs
    `);

    return {
      success: true,
      cpu: cpuResult.recordset[0]?.SQLCPU || 0,
      disks: diskResult.recordset,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getTableRelations", async (event, tableName) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");

    const result = await pool.request().query(`
      SELECT 
        obj.name AS ForeignKeyName,
        sch.name AS SchemaName,
        parentTable.name AS SourceTable,
        parentCol.name AS SourceColumn,
        referencedTable.name AS TargetTable,
        referencedCol.name AS TargetColumn
      FROM sys.foreign_key_columns fkc
      INNER JOIN sys.objects obj ON fkc.constraint_object_id = obj.object_id
      INNER JOIN sys.tables parentTable ON fkc.parent_object_id = parentTable.object_id
      INNER JOIN sys.schemas sch ON parentTable.schema_id = sch.schema_id
      INNER JOIN sys.columns parentCol ON fkc.parent_object_id = parentCol.object_id AND fkc.parent_column_id = parentCol.column_id
      INNER JOIN sys.tables referencedTable ON fkc.referenced_object_id = referencedTable.object_id
      INNER JOIN sys.columns referencedCol ON fkc.referenced_object_id = referencedCol.object_id AND fkc.referenced_column_id = referencedCol.column_id
      WHERE parentTable.name = '${tableName}' OR referencedTable.name = '${tableName}'
    `);

    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getFragmentedIndexes", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");

    const indexesResult = await pool.request().query(`
      SELECT 
        OBJECT_NAME(ips.OBJECT_ID) AS TableName, 
        i.name AS IndexName, 
        ROUND(ips.avg_fragmentation_in_percent, 2) AS Fragmentation, 
        ips.page_count AS PageCount
      FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
      INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
      WHERE ips.avg_fragmentation_in_percent > 10 
        AND i.name IS NOT NULL 
        AND ips.page_count > 50
      ORDER BY ips.avg_fragmentation_in_percent DESC
    `);

    const healthResult = await pool.request().query(`
      SELECT ROUND(100 - ISNULL(AVG(avg_fragmentation_in_percent), 0), 2) AS HealthScore
      FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED')
      WHERE page_count > 50 AND index_id > 0
    `);

    const healthScore = healthResult.recordset[0]?.HealthScore || 100;

    return {
      success: true,
      data: {
        indexes: indexesResult.recordset,
        healthScore: healthScore,
      },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "db:fixIndex",
  async (event, { tableName, indexName, fragmentation }) => {
    try {
      if (!pool) throw new Error("Veritabanı bağlantısı yok");

      const action = fragmentation >= 30 ? "REBUILD" : "REORGANIZE";
      const query = `ALTER INDEX [${indexName}] ON [${tableName}] ${action}`;
      await pool.request().query(query);

      const statQuery = `
      SELECT ROUND(ips.avg_fragmentation_in_percent, 2) AS NewFragmentation
      FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('${tableName}'), NULL, NULL, 'LIMITED') ips
      INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
      WHERE i.name = '${indexName}'
    `;
      const statResult = await pool.request().query(statQuery);
      const newFrag = statResult.recordset[0]?.NewFragmentation || 0;

      const healthResult = await pool.request().query(`
      SELECT ROUND(100 - ISNULL(AVG(avg_fragmentation_in_percent), 0), 2) AS HealthScore
      FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED')
      WHERE page_count > 50 AND index_id > 0
    `);
      const newHealthScore = healthResult.recordset[0]?.HealthScore || 100;

      return {
        success: true,
        action,
        newFragmentation: newFrag,
        newHealthScore: newHealthScore,
        message: `İşlem Başarılı`,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },
);

ipcMain.handle("db:getDbSpaceInfo", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");

    const request = pool.request();

    const filesResult = await request.query(`
      SELECT 
        type_desc AS [FileType],
        name AS [LogicalName],
        CAST(size * 8.0 / 1024 AS FLOAT) AS [TotalSizeMB],
        CAST(FILEPROPERTY(name, 'SpaceUsed') * 8.0 / 1024 AS FLOAT) AS [UsedSizeMB],
        (SELECT recovery_model_desc FROM sys.databases WHERE database_id = DB_ID()) AS [RecoveryModel]
      FROM sys.database_files
    `);

    const topTablesResult = await request.query(`
      SELECT TOP 10 
          t.name AS [TableName],
          MAX(p.rows) AS [RowCount],
          CAST(ROUND(SUM(a.total_pages) * 8.0 / 1024.0, 2) AS FLOAT) AS [TotalSpaceMB]
      FROM sys.tables t
      INNER JOIN sys.partitions p ON t.object_id = p.object_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
      WHERE t.is_ms_shipped = 0 AND p.index_id IN (0,1)
      GROUP BY t.name
      ORDER BY [TotalSpaceMB] DESC
    `);

    return {
      success: true,
      data: {
        files: filesResult.recordset,
        topTables: topTablesResult.recordset,
      },
    };
  } catch (error) {
    console.error("Disk bilgisi çekilirken SQL Hatası:", error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:shrinkLogFile", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");

    const request = pool.request();

    const dbInfoResult = await request.query(`
      SELECT DB_NAME() AS DbName, recovery_model_desc AS RecoveryModel 
      FROM sys.databases WHERE database_id = DB_ID()
    `);
    const dbName = dbInfoResult.recordset[0].DbName;
    const originalRecoveryModel = dbInfoResult.recordset[0].RecoveryModel;

    const logFileResult = await request.query(`
      SELECT name AS LogLogicalName FROM sys.database_files WHERE type_desc = 'LOG'
    `);
    const logLogicalName = logFileResult.recordset[0].LogLogicalName;

    if (originalRecoveryModel === "FULL") {
      await request.query(`ALTER DATABASE [${dbName}] SET RECOVERY SIMPLE`);
    }

    await request.query(`DBCC SHRINKFILE ('${logLogicalName}', 1)`);

    if (originalRecoveryModel === "FULL") {
      await request.query(`ALTER DATABASE [${dbName}] SET RECOVERY FULL`);
    }

    return {
      success: true,
      message: "Log dosyası başarıyla temizlendi ve küçültüldü!",
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getStatisticsInfo", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const request = pool.request();

    const result = await request.query(`
      SELECT 
          OBJECT_NAME(s.[object_id]) AS [TableName],
          MAX(STATS_DATE(s.[object_id], s.[stats_id])) AS [LastUpdated],
          CAST(MAX(sp.[rows]) AS FLOAT) AS [TotalRows],
          CAST(SUM(sp.[modification_counter]) AS FLOAT) AS [ModifiedRows],
          CAST(CASE WHEN MAX(sp.[rows]) > 0 THEN (CAST(SUM(sp.[modification_counter]) AS FLOAT) / MAX(sp.[rows])) * 100 ELSE 0 END AS FLOAT) AS [StalePercentage]
      FROM sys.stats s
      CROSS APPLY sys.dm_db_stats_properties(s.[object_id], s.[stats_id]) sp
      INNER JOIN sys.tables t ON s.[object_id] = t.[object_id]
      WHERE t.is_ms_shipped = 0 AND sp.[rows] > 0
      GROUP BY s.[object_id]
      ORDER BY [StalePercentage] DESC, [TableName] ASC
    `);

    const stats = result.recordset;

    let totalRows = 0;
    let totalMods = 0;

    stats.forEach((s) => {
      const rows = Number(s.TotalRows);
      const mods = Number(s.ModifiedRows);

      if (!Number.isNaN(rows)) totalRows += rows;
      if (!Number.isNaN(mods)) totalMods += mods;
    });

    let healthScore = 100;
    if (totalRows > 0) {
      let staleRatio = (totalMods / totalRows) * 100;

      if (Number.isNaN(staleRatio)) staleRatio = 0;
      if (staleRatio > 100) staleRatio = 100;

      healthScore = Math.max(0, Math.round(100 - staleRatio));
    }

    return { success: true, data: { stats, healthScore } };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:updateTableStatistics", async (event, tableName) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    await pool.request().query(`UPDATE STATISTICS [${tableName}]`);
    return {
      success: true,
      message: `[${tableName}] tablosunun veri haritası (istatistiği) güncellendi.`,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:updateAllStatistics", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    await pool.request().query("EXEC sp_updatestats");
    return {
      success: true,
      message:
        "Tüm veritabanı istatistikleri başarıyla güncellendi! Sistem hızlandırıldı.",
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getSqlJobs", async () => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const query = `
      SELECT j.job_id as JobId, j.name AS JobName, j.enabled AS IsEnabled, j.description AS Description,
          ISNULL((SELECT TOP 1 CASE WHEN stop_execution_date IS NULL AND start_execution_date IS NOT NULL THEN 1 ELSE 0 END
              FROM msdb.dbo.sysjobactivity a WHERE a.job_id = j.job_id ORDER BY start_execution_date DESC), 0) AS IsRunning,
          (SELECT TOP 1 h.run_status FROM msdb.dbo.sysjobhistory h WHERE h.job_id = j.job_id AND h.step_id = 0 ORDER BY h.run_date DESC, h.run_time DESC) AS LastRunStatus 
      FROM msdb.dbo.sysjobs j ORDER BY j.name ASC;
    `;
    const result = await pool.request().query(query);
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:executeJobAction", async (event, { jobName, action }) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const proc =
      action === "start" ? "msdb.dbo.sp_start_job" : "msdb.dbo.sp_stop_job";
    await pool.request().input("job_name", sql.NVarChar, jobName).execute(proc);
    return {
      success: true,
      message: `Görev başarıyla ${action === "start" ? "başlatıldı" : "durduruldu"}.`,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:toggleSqlJob", async (event, { jobName, enabled }) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    await pool
      .request()
      .input("job_name", sql.NVarChar, jobName)
      .input("enabled", sql.TinyInt, enabled ? 1 : 0)
      .execute("msdb.dbo.sp_update_job");
    return { success: true, message: "Durum güncellendi." };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getSqlJobHistory", async (event, jobName) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const query = `
      SELECT TOP 50 h.step_id AS StepId, h.step_name AS StepName, h.run_status AS RunStatus, h.message AS Message, h.run_date AS RunDate, h.run_time AS RunTime, h.run_duration AS Duration
      FROM msdb.dbo.sysjobhistory h INNER JOIN msdb.dbo.sysjobs j ON h.job_id = j.job_id
      WHERE j.name = @jobName ORDER BY h.run_date DESC, h.run_time DESC
    `;
    const result = await pool
      .request()
      .input("jobName", sql.NVarChar, jobName)
      .query(query);
    return { success: true, data: result.recordset };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getSqlJobDetails", async (event, jobName) => {
  try {
    if (!pool) throw new Error("Veritabanı bağlantısı yok");
    const stepsQuery = `SELECT step_id as StepId, step_name as StepName, subsystem as Subsystem, command as Command, database_name as DatabaseName FROM msdb.dbo.sysjobsteps WHERE job_id = (SELECT job_id FROM msdb.dbo.sysjobs WHERE name = @jobName) ORDER BY step_id ASC`;
    const stepsResult = await pool
      .request()
      .input("jobName", sql.NVarChar, jobName)
      .query(stepsQuery);
    const schedQuery = `SELECT s.name as ScheduleName, s.enabled as IsEnabled, s.freq_type as FreqType, s.freq_interval as FreqInterval, s.active_start_time as StartTime FROM msdb.dbo.sysjobschedules js INNER JOIN msdb.dbo.sysschedules s ON js.schedule_id = s.schedule_id INNER JOIN msdb.dbo.sysjobs j ON js.job_id = j.job_id WHERE j.name = @jobName`;
    const schedResult = await pool
      .request()
      .input("jobName", sql.NVarChar, jobName)
      .query(schedQuery);
    return {
      success: true,
      data: { steps: stepsResult.recordset, schedules: schedResult.recordset },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getCurrentDbName", async () => {
  try {
    if (!pool) throw new Error("Bağlantı yok");
    const result = await pool.request().query("SELECT DB_NAME() AS currentDb");
    return { success: true, data: result.recordset[0].currentDb };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "db:saveJobMaster",
  async (event, { isEdit, originalName, jobData }) => {
    try {
      if (!pool) throw new Error("Veritabanı bağlantısı yok");

      const safeName = jobData.name.replace(/'/g, "''");
      const safeDesc = jobData.description.replace(/'/g, "''");
      const isEnabled = jobData.enabled ? 1 : 0;

      let masterQuery = `DECLARE @jobId BINARY(16);\n`;

      if (isEdit) {
        const safeOrig = originalName.replace(/'/g, "''");
        masterQuery += `
        SELECT @jobId = job_id FROM msdb.dbo.sysjobs WHERE name = N'${safeOrig}';
        
        EXEC msdb.dbo.sp_update_job 
            @job_id = @jobId, 
            @new_name = N'${safeName}', 
            @description = N'${safeDesc}', 
            @enabled = ${isEnabled};
            
        DECLARE @maxStep INT = ${jobData.steps.length};
        DECLARE @delStep INT;
        
        WHILE (SELECT ISNULL(MAX(step_id), 0) FROM msdb.dbo.sysjobsteps WHERE job_id = @jobId) > @maxStep 
        BEGIN
            SET @delStep = (SELECT MAX(step_id) FROM msdb.dbo.sysjobsteps WHERE job_id = @jobId);
            EXEC msdb.dbo.sp_delete_jobstep @job_id = @jobId, @step_id = @delStep;
        END;
      `;
      } else {
        masterQuery += `
        EXEC msdb.dbo.sp_add_job 
            @job_name = N'${safeName}', 
            @description = N'${safeDesc}', 
            @enabled = ${isEnabled}, 
            @job_id = @jobId OUTPUT;
            
        EXEC msdb.dbo.sp_add_jobserver 
            @job_id = @jobId, 
            @server_name = @@SERVERNAME;
      `;
      }

      jobData.steps.forEach((step, idx) => {
        const sName = step.name.replace(/'/g, "''");
        const sDb = step.db.replace(/'/g, "''");
        const sCmd = step.cmd.replace(/'/g, "''");

        masterQuery += `
        IF EXISTS (SELECT 1 FROM msdb.dbo.sysjobsteps WHERE job_id = @jobId AND step_id = ${idx + 1})
        BEGIN
            EXEC msdb.dbo.sp_update_jobstep 
                @job_id = @jobId, 
                @step_id = ${idx + 1}, 
                @step_name = N'${sName}', 
                @command = N'${sCmd}', 
                @database_name = N'${sDb}';
        END
        ELSE 
        BEGIN
            EXEC msdb.dbo.sp_add_jobstep 
                @job_id = @jobId, 
                @step_name = N'${sName}', 
                @step_id = ${idx + 1}, 
                @subsystem = N'TSQL', 
                @command = N'${sCmd}', 
                @database_name = N'${sDb}';
        END;
      `;
      });

      masterQuery += `
        DECLARE @schedId INT; 
        DECLARE curSched CURSOR LOCAL FAST_FORWARD FOR 
            SELECT schedule_id FROM msdb.dbo.sysjobschedules WHERE job_id = @jobId;
            
        OPEN curSched; 
        FETCH NEXT FROM curSched INTO @schedId; 
        
        WHILE @@FETCH_STATUS = 0 
        BEGIN
            EXEC msdb.dbo.sp_detach_schedule @job_id = @jobId, @schedule_id = @schedId; 
            FETCH NEXT FROM curSched INTO @schedId;
        END; 
        
        CLOSE curSched; 
        DEALLOCATE curSched;
    `;

      jobData.schedules.forEach((sch, idx) => {
        if (!sch.enabled) return;
        const timeInt = parseInt(sch.time.replace(":", "") + "00");

        masterQuery += `
        EXEC msdb.dbo.sp_add_schedule 
            @schedule_name = N'${safeName}_S_${idx}', 
            @freq_type = ${sch.freqType}, 
            @freq_interval = ${sch.freqInterval}, 
            @active_start_time = ${timeInt};
            
        EXEC msdb.dbo.sp_attach_schedule 
            @job_id = @jobId, 
            @schedule_name = N'${safeName}_S_${idx}';
      `;
      });

      await pool.request().query(masterQuery);
      return { success: true, message: "Görev başarıyla kaydedildi." };
    } catch (error) {
      console.error("Job Kaydetme Hatası:", error);
      return { success: false, message: error.message };
    }
  },
);
