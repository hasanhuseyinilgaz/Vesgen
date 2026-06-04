const { app, BrowserWindow, ipcMain, dialog, shell, Notification, Tray, Menu, powerMonitor } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const pkg = require("../package.json");

app.name = "Vesgen";
const NOTIF_ICON_PNG = path.join(__dirname, "../assets/icon.png");
const NOTIF_ICON_ICO = path.join(__dirname, "../assets/icon.ico");

if (process.platform === 'win32') {
  app.setAppUserModelId("Vesgen");
}

const sql = require("mssql");
const Store = require("electron-store");
const security = require("./security");
const { Client } = require("ssh2");

const store = new Store();
let mainWindow;
let tray = null;
let isQuitting = false;
let pool = null;
const activeTerminals = new Map();

async function ensurePool() {
  if (pool && pool.connected) {
    return pool;
  }

  if (pool) {
    try {
      await pool.connect();
      return pool;
    } catch (err) {
      console.log(`[${ts()}] Pool reconnection failed, clearing pool:`, err.message);
      pool = null;
    }
  }

  const lastConn = store.get("lastConnection");
  if (lastConn) {
    try {
      console.log(`[${ts()}] Attempting auto-reconnect to ${lastConn.server}/${lastConn.database}...`);
      const dbConfig = {
        server: lastConn.server,
        database: lastConn.database,
        user: lastConn.user,
        password: security.decrypt(lastConn.password),
        options: {
          encrypt: lastConn.encrypt || false,
          trustServerCertificate: lastConn.trustServerCertificate || true,
          enableArithAbort: true,
        },
        pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
      };
      pool = await sql.connect(dbConfig);
      console.log(`[${ts()}] Auto-reconnect successful.`);
      return pool;
    } catch (err) {
      console.error(`[${ts()}] Auto-reconnect failed:`, err.message);
      pool = null;
      throw new Error(`Bağlantı Hatası: Veritabanına ulaşılamıyor. Lütfen ağınızı veya VPN bağlantınızı kontrol edin. (Detay: ${err.message})`);
    }
  }

  throw new Error("Veritabanı bağlantısı yok. Lütfen bir veritabanına bağlanın.");
}

const serializeData = (data) => {
  return JSON.parse(
    JSON.stringify(data, (key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
};

const getBasePath = () => {
  return app.isPackaged ? app.getPath("userData") : path.join(__dirname, "..");
};

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
    monitoring: { interval: 10 },
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

async function ensureFileSystem() {
  const basePath = getBasePath();
  const dirsToCreate = [
    path.join(basePath, "configs"),
    path.join(basePath, "configs/tenants"),
    path.join(basePath, "queries"),
    path.join(basePath, "monitoring")
  ];

  for (const dir of dirsToCreate) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      console.log("Yeni klasör oluşturuldu:", dir);
    }
  }

  const presetsFile = path.join(basePath, "configs/presets.json");
  try {
    await fs.access(presetsFile);
  } catch {
    await fs.writeFile(presetsFile, JSON.stringify([], null, 2));
    console.log("Yeni presets dosyası oluşturuldu:", presetsFile);
  }
}

function getDevPort() {
  const portFile = path.join(__dirname, "dev-port");
  try {
    const fsSync = require("fs");
    if (fsSync.existsSync(portFile)) {
      const port = parseInt(fsSync.readFileSync(portFile, "utf-8").trim(), 10);
      if (!isNaN(port) && port > 0) return port;
    }
  } catch (e) {
    console.warn("dev-port dosyası okunamadı, varsayılan 5173 kullanılacak:", e.message);
  }
  return 5173;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,

    show: false,
    backgroundColor: '#0a0a0a',

    frame: false,
    titleBarStyle: "hidden",

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: process.platform === 'win32' ? NOTIF_ICON_ICO : NOTIF_ICON_PNG,
  });

  mainWindow.setMenu(null);

  const isDev = !app.isPackaged;

  if (isDev) {
    const devPort = getDevPort();
    mainWindow.loadURL(`http://localhost:${devPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/react/index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      MonitoringService.updateGlobalFocus(false);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("focus", () => {
    MonitoringService.updateGlobalFocus(true);
  });

  mainWindow.on("blur", () => {
    MonitoringService.updateGlobalFocus(false);
  });
}

const fsSync = require("fs");
function createTray() {
  const iconPath = path.join(__dirname, "../assets/icon.png");
  let trayIcon;
  if (fsSync.existsSync(iconPath)) {
    trayIcon = require("electron").nativeImage.createFromPath(iconPath);
  } else {
    trayIcon = require("electron").nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Vesgen'i Göster",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      }
    },
    { type: "separator" },
    {
      label: "Çıkış Yap (Tamamen Kapat)",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip("Vesgen Monitoring & Management");
  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    }
  });
}

app.whenReady().then(async () => {
  await ensureConfig();
  await ensureFileSystem();

  if (process.platform === 'win32' && !app.isPackaged) {
    const fsSync = require('fs');
    const shortcutPath = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Vesgen.lnk');
    if (!fsSync.existsSync(shortcutPath)) {
      const { exec } = require('child_process');
      const targetPath = process.execPath;
      const iconPath = NOTIF_ICON_ICO;
      const psCommand = `powershell -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('${shortcutPath}'); $s.TargetPath = '${targetPath}'; $s.IconLocation = '${iconPath}'; $s.Description = 'Vesgen Dev'; $s.Save();"`;
      exec(psCommand, (err) => {
        if (!err) console.log(`[${ts()}] System: Created dev shortcut for notification icons.`);
      });
    }
  }

  initGlobalMonitoring();
  createWindow();
  createTray();

  app.on('browser-window-blur', () => { });

  powerMonitor.on('suspend', () => console.log(`[${ts()}] System: Suspending (Going to sleep)`));
  powerMonitor.on('resume', () => {
    console.log(`[${ts()}] System: Resumed from sleep. Refreshing monitoring...`);
    MonitoringService.sessions.forEach((sess, id) => {
      if (sess.status === "error" || sess.status === "connecting") {
        MonitoringService.runCycle(id);
      }
    });
  });
});

ipcMain.on("app:networkStatus", (event, { online }) => {
  console.log(`[${ts()}] System Network: ${online ? 'ONLINE' : 'OFFLINE'}`);
  if (online) {
    MonitoringService.sessions.forEach((sess, id) => {
      if (sess.status === "error") {
        MonitoringService.runCycle(id);
      }
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") {

  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
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
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.on("app:pageChanged", (event, pagePath) => {
  MonitoringService.updatePage(pagePath);
});

ipcMain.on("app:setTrayLanguage", (event, langStrings) => {
  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: langStrings.show || "Vesgen'i Göster",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
          }
        }
      },
      { type: "separator" },
      {
        label: langStrings.quit || "Çıkış Yap (Tamamen Kapat)",
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  }
});

function addAppNotification(opts) {
  const { title, body, titleKey, bodyKey, data, type = 'info', serverId = null } = opts;
  const notifs = store.get("app_notifications", []);
  const newNotif = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
    title,
    body,
    titleKey,
    bodyKey,
    data,
    type,
    timestamp: Date.now(),
    read: false,
    serverId
  };

  notifs.unshift(newNotif);
  if (notifs.length > 5000) notifs.length = 5000;
  store.set("app_notifications", notifs);

  if (mainWindow) {
    mainWindow.webContents.send("app:notification", newNotif);
  }
}

ipcMain.handle("notifications:get", () => store.get("app_notifications", []));
ipcMain.handle("notifications:markAsRead", (event, id) => {
  const notifs = store.get("app_notifications", []);
  const idx = notifs.findIndex((n) => n.id === id);
  if (idx !== -1) {
    notifs[idx].read = true;
    store.set("app_notifications", notifs);
  }
  return true;
});
ipcMain.handle("notifications:markAllAsRead", () => {
  const notifs = store.get("app_notifications", []);
  notifs.forEach(n => { n.read = true; });
  store.set("app_notifications", notifs);
  return true;
});
ipcMain.handle("notifications:clearAll", () => {
  store.set("app_notifications", []);
  return true;
});
ipcMain.handle("notifications:toggleRead", (event, id) => {
  const notifs = store.get("app_notifications", []);
  const idx = notifs.findIndex((n) => n.id === id);
  if (idx !== -1) {
    notifs[idx].read = !notifs[idx].read;
    store.set("app_notifications", notifs);
  }
  return true;
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
    const dbConfig = {
      server: config.server,
      database: config.database,
      user: config.user,
      password: security.decrypt(config.password),
      options: {
        encrypt: config.encrypt || false,
        trustServerCertificate: config.trustServerCertificate || true,
        enableArithAbort: true,
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };

    let sessionCount = 0;

    if (!config.saveConnection) {
      const localPool = await new sql.ConnectionPool(dbConfig).connect();
      try {
        const result = await localPool.request().query(`
          SELECT COUNT(*) as Count 
          FROM sys.dm_exec_sessions 
          WHERE is_user_process = 1 AND database_id = DB_ID()
        `);
        sessionCount = result.recordset[0].Count;
      } catch (err) {
        console.error("Session count fetch error:", err);
      }
      await localPool.close();

      return {
        success: true,
        message: "Bağlantı başarılı!",
        activeSessions: sessionCount
      };
    }

    if (pool) await pool.close();
    pool = await sql.connect(dbConfig);

    if (config.saveConnection) {
      const encryptedPassword = security.encrypt(security.decrypt(config.password));
      store.set("lastConnection", {
        server: config.server,
        database: config.database,
        user: config.user,
        password: encryptedPassword,
        encrypt: config.encrypt,
        trustServerCertificate: config.trustServerCertificate,
      });
    }

    return {
      success: true,
      message: "Bağlantı başarılı!",
      activeSessions: sessionCount
    };
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
    const activePool = await ensurePool();
    const result = await activePool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' 
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
    const serialized = serializeData(result.recordset);
    return { success: true, data: serialized };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "db:getTableData",
  async (event, { tableName, top, whereClause, orderBy, joins = [] }) => {
    try {
      const activePool = await ensurePool();

      const colResult = await activePool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}'
      `);

      const getColumnsWithAlias = (targetTable, colList, useAlias) => {
        return colList.map((col) => {
          const type = col.DATA_TYPE.toLowerCase();
          const alias = useAlias ? `${targetTable}_${col.COLUMN_NAME}` : col.COLUMN_NAME;
          const source = `[${targetTable}].[${col.COLUMN_NAME}]`;

          if (
            type === "varbinary" ||
            type === "image" ||
            type === "geometry" ||
            type === "geography"
          ) {
            return `CAST('<Binary/Spatial Data>' AS VARCHAR(50)) AS [${alias}]`;
          }
          if (type === "xml" || type === "text" || type === "ntext") {
            return `CAST(LEFT(${source}, 500) + '...' AS VARCHAR(503)) AS [${alias}]`;
          }
          return `${source} AS [${alias}]`;
        });
      };

      const useAlias = joins && joins.length > 0;
      let allSelectColumns = getColumnsWithAlias(tableName, colResult.recordset, useAlias);

      let joinSql = "";
      if (useAlias) {
        for (const j of joins) {
          const type = j.type || "INNER JOIN";
          joinSql += ` ${type} [${j.targetTable}] ON [${tableName}].[${j.localColumn}] = [${j.targetTable}].[${j.targetColumn}]`;

          const joinColResult = await activePool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${j.targetTable}'
          `);

          const joinSelects = getColumnsWithAlias(j.targetTable, joinColResult.recordset, true);
          allSelectColumns = allSelectColumns.concat(joinSelects);
        }
      }

      const finalSelect = allSelectColumns.length > 0 ? allSelectColumns.join(", ") : "*";
      const topClause = top ? `TOP ${top}` : "TOP 100";
      const where = whereClause ? `WHERE ${whereClause}` : "";
      const order = orderBy ? `ORDER BY ${orderBy}` : "";

      const query = `SELECT ${topClause} ${finalSelect} FROM [${tableName}] ${joinSql} ${where} ${order}`;
      const result = await activePool.request().query(query);

      const serialized = serializeData(result.recordset);
      return { success: true, data: serialized };
    } catch (error) {
      console.error("Tablo veri çekme hatası:", error);
      return { success: false, message: error.message };
    }
  },
);

ipcMain.handle("db:getTableColumns", async (event, tableName) => {
  try {
    const activePool = await ensurePool();
    const result = await activePool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT,
      COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') as IS_IDENTITY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}' ORDER BY ORDINAL_POSITION
    `);
    const serialized = serializeData(result.recordset);
    return { success: true, data: serialized };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "db:updateRecord",
  async (event, { tableName, idColumn, idValue, newData }) => {
    try {
      const activePool = await ensurePool();

      const request = activePool.request();

      const colMetaResult = await activePool.request().query(`
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
    const activePool = await ensurePool();
    const result = await activePool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS ORDER BY TABLE_NAME
    `);
    const serialized = serializeData(result.recordset);
    return { success: true, data: serialized };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getViewDefinition", async (event, viewName) => {
  try {
    const activePool = await ensurePool();
    const result = await activePool.request().query(`
      SELECT OBJECT_DEFINITION(OBJECT_ID('${viewName}')) as definition
    `);
    return { success: true, data: result.recordset[0]?.definition };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getStoredProcedures", async () => {
  try {
    const activePool = await ensurePool();
    const result = await activePool.request().query(`
      SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_DEFINITION
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE' ORDER BY ROUTINE_NAME
    `);
    const serialized = serializeData(result.recordset);
    return { success: true, data: serialized };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getSPParameters", async (event, spName) => {
  try {
    const activePool = await ensurePool();
    const result = await activePool.request().query(`
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
    const activePool = await ensurePool();
    const request = activePool.request();
    for (const param of parameters) {
      request.input(param.name.replace("@", ""), sql[param.type], param.value);
    }
    const result = await request.execute(spName);
    const serialized = serializeData(result.recordset);
    return {
      success: true,
      data: serialized,
      rowsAffected: result.rowsAffected,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:executeQuery", async (event, query) => {
  try {
    const activePool = await ensurePool();

    const request = activePool.request();
    let messages = [];

    request.on('info', (info) => {
      messages.push({
        message: info.message,
        line: info.lineNumber
      });
    });

    const result = await request.query(query);
    const serialized = serializeData(result.recordset);

    return {
      success: true,
      data: serialized,
      rowsAffected: result.rowsAffected,
      messages: messages
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      lineNumber: error.lineNumber
    };
  }
});

ipcMain.handle("fs:readQueries", async () => {
  try {
    const queriesPath = path.join(getBasePath(), "queries");
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
    const filePath = path.join(getBasePath(), "queries", safeName);
    await fs.writeFile(filePath, content, "utf-8");
    return { success: true, message: "Sorgu başarıyla kaydedildi." };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:deleteQuery", async (event, filename) => {
  try {
    const filePath = path.join(getBasePath(), "queries", filename);
    await fs.unlink(filePath);
    return { success: true, message: "Sorgu silindi." };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:readPresets", async () => {
  try {
    const presetsPath = path.join(getBasePath(), "configs/presets.json");
    const content = await fs.readFile(presetsPath, "utf-8");
    return { success: true, data: JSON.parse(content) };
  } catch (error) {
    return { success: false, message: error.message, data: [] };
  }
});

ipcMain.handle("fs:savePresets", async (event, presets) => {
  try {
    const presetsPath = path.join(getBasePath(), "configs/presets.json");
    await fs.writeFile(presetsPath, JSON.stringify(presets, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

const getTenantsDirPath = () => path.join(getBasePath(), "configs/tenants");

async function ensureTenantsDir() {
  const tenantsDirPath = getTenantsDirPath();
  try {
    await fs.access(tenantsDirPath);
  } catch {
    await fs.mkdir(tenantsDirPath, { recursive: true });
  }
}

async function loadAllTenantsInternal() {
  try {
    await ensureTenantsDir();
    const tenantsDirPath = getTenantsDirPath();
    const files = await fs.readdir(tenantsDirPath);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const tenants = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(
          path.join(tenantsDirPath, file),
          "utf-8",
        );
        const tenant = JSON.parse(content);
        if (tenant.databases) {
          tenant.databases = tenant.databases.map(db => ({
            ...db,
            password: security.decrypt(db.password)
          }));
        }
        if (tenant.windowsServers) {
          tenant.windowsServers = tenant.windowsServers.map(srv => ({
            ...srv,
            password: security.decrypt(srv.password)
          }));
        }
        return tenant;
      }),
    );
    return tenants;
  } catch (error) {
    console.error("loadAllTenantsInternal hatası:", error);
    return [];
  }
}

async function initGlobalMonitoring() {
  console.log("Global monitoring başlatılıyor...");
  const tenants = await loadAllTenantsInternal();
  let serverCount = 0;
  let dbCount = 0;

  for (const tenant of tenants) {
    const tenantInfo = { name: tenant.name, shortName: tenant.shortName, color: tenant.color };

    if (tenant.windowsServers && tenant.windowsServers.length > 0) {
      for (const server of tenant.windowsServers) {
        if (!server.excludeFromMonitoring) {
          MonitoringService.start({ ...server, type: 'windowsServer', tenantInfo });
          serverCount++;
        }
      }
    }

    if (tenant.databases && tenant.databases.length > 0) {
      for (const db of tenant.databases) {
        if (!db.excludeFromMonitoring) {
          MonitoringService.start({ ...db, type: 'database', tenantInfo });
          dbCount++;
        }
      }
    }
  }
  console.log(`Global İzleme: ${serverCount} sunucu ve ${dbCount} veritabanı arka planda izleniyor.`);
}

ipcMain.handle("fs:readTenants", async () => {
  try {
    const tenants = await loadAllTenantsInternal();
    return { success: true, data: tenants };
  } catch (error) {
    console.error("Ortamlar okunurken hata:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:saveTenant", async (event, tenantData) => {
  try {
    await ensureTenantsDir();
    const tenantsDirPath = getTenantsDirPath();
    const filePath = path.join(tenantsDirPath, `${tenantData.id}.json`);

    const dataToSave = { ...tenantData };
    if (dataToSave.databases) {
      dataToSave.databases = dataToSave.databases.map(db => ({
        ...db,
        password: security.encrypt(db.password)
      }));
    }
    if (dataToSave.windowsServers) {
      dataToSave.windowsServers = dataToSave.windowsServers.map(srv => ({
        ...srv,
        password: security.encrypt(srv.password)
      }));
    }

    await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));
    if (mainWindow) mainWindow.webContents.send("tenants-updated");
    return { success: true };
  } catch (error) {
    console.error("Ortam kaydedilirken hata:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("fs:deleteTenant", async (event, tenantId) => {
  try {
    const tenantsDirPath = getTenantsDirPath();
    const filePath = path.join(tenantsDirPath, `${tenantId}.json`);
    await fs.unlink(filePath);
    if (mainWindow) mainWindow.webContents.send("tenants-updated");
    return { success: true };
  } catch (error) {
    console.error("Ortam silinirken hata:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getActivity", async () => {
  try {
    const activePool = await ensurePool();

    const result = await activePool.request().query(`
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

    const serialized = serializeData(result.recordset);
    return { success: true, data: serialized };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getServerHealth", async () => {
  try {
    const activePool = await ensurePool();

    const cpuResult = await activePool.request().query(`
      SELECT TOP 1 
        record.value('(./Record/SchedulerMonitorEvent/SystemHealth/ProcessUtilization)[1]', 'int') AS [SQLCPU]
      FROM (
        SELECT TIMESTAMP, CONVERT(xml, record) AS record 
        FROM sys.dm_os_ring_buffers 
        WHERE ring_buffer_type = N'RING_BUFFER_SCHEDULER_MONITOR' 
        AND record LIKE '%<SystemHealth>%') AS x 
      ORDER BY TIMESTAMP DESC
    `);

    const diskResult = await activePool.request().query(`
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
      disks: serializeData(diskResult.recordset),
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getTableRelations", async (event, tableName) => {
  try {
    const activePool = await ensurePool();

    const result = await activePool.request().query(`
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

    const serialized = serializeData(result.recordset);
    return { success: true, data: serialized };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getFragmentedIndexes", async () => {
  try {
    const activePool = await ensurePool();

    const indexesResult = await activePool.request().query(`
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

    const healthResult = await activePool.request().query(`
      SELECT ROUND(100 - ISNULL(AVG(avg_fragmentation_in_percent), 0), 2) AS HealthScore
      FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED')
      WHERE page_count > 50 AND index_id > 0
    `);

    const healthScore = healthResult.recordset[0]?.HealthScore || 100;

    const serialized = serializeData({
      indexes: indexesResult.recordset,
      healthScore: healthScore,
    });

    return {
      success: true,
      data: serialized,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "db:fixIndex",
  async (event, { tableName, indexName, fragmentation }) => {
    try {
      const activePool = await ensurePool();

      const action = fragmentation >= 30 ? "REBUILD" : "REORGANIZE";
      const query = `ALTER INDEX [${indexName}] ON [${tableName}] ${action}`;
      await activePool.request().query(query);

      const statQuery = `
      SELECT ROUND(ips.avg_fragmentation_in_percent, 2) AS NewFragmentation
      FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('${tableName}'), NULL, NULL, 'LIMITED') ips
      INNER JOIN sys.indexes i ON ips.object_id = i.object_id AND ips.index_id = i.index_id
      WHERE i.name = '${indexName}'
    `;
      const statResult = await activePool.request().query(statQuery);
      const newFrag = statResult.recordset[0]?.NewFragmentation || 0;

      const healthResult = await activePool.request().query(`
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
    const activePool = await ensurePool();

    const request = activePool.request();

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

    const serialized = serializeData({
      files: filesResult.recordset,
      topTables: topTablesResult.recordset,
    });

    return {
      success: true,
      data: serialized,
    };
  } catch (error) {
    console.error("Disk bilgisi çekilirken SQL Hatası:", error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:shrinkLogFile", async () => {
  try {
    const activePool = await ensurePool();

    const request = activePool.request();

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
    const activePool = await ensurePool();
    const request = activePool.request();

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
    const activePool = await ensurePool();
    await activePool.request().query(`UPDATE STATISTICS [${tableName}]`);
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
    const activePool = await ensurePool();
    await activePool.request().query("EXEC sp_updatestats");
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
    const activePool = await ensurePool();
    const query = `
      SELECT j.job_id as JobId, j.name AS JobName, j.enabled AS IsEnabled, j.description AS Description,
          ISNULL((SELECT TOP 1 CASE WHEN stop_execution_date IS NULL AND start_execution_date IS NOT NULL THEN 1 ELSE 0 END
              FROM msdb.dbo.sysjobactivity a WHERE a.job_id = j.job_id ORDER BY start_execution_date DESC), 0) AS IsRunning,
          (SELECT TOP 1 h.run_status FROM msdb.dbo.sysjobhistory h WHERE h.job_id = j.job_id AND h.step_id = 0 ORDER BY h.run_date DESC, h.run_time DESC) AS LastRunStatus 
      FROM msdb.dbo.sysjobs j ORDER BY j.name ASC;
    `;
    const result = await activePool.request().query(query);
    const serialized = serializeData(result.recordset);
    return { success: true, data: serialized };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:executeJobAction", async (event, { jobName, action }) => {
  try {
    const activePool = await ensurePool();
    const proc =
      action === "start" ? "msdb.dbo.sp_start_job" : "msdb.dbo.sp_stop_job";
    await activePool.request().input("job_name", sql.NVarChar, jobName).execute(proc);
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
    const activePool = await ensurePool();
    await activePool
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
    const activePool = await ensurePool();
    const query = `
      SELECT TOP 50 h.step_id AS StepId, h.step_name AS StepName, h.run_status AS RunStatus, h.message AS Message, h.run_date AS RunDate, h.run_time AS RunTime, h.run_duration AS Duration
      FROM msdb.dbo.sysjobhistory h INNER JOIN msdb.dbo.sysjobs j ON h.job_id = j.job_id
      WHERE j.name = @jobName ORDER BY h.run_date DESC, h.run_time DESC
    `;
    const result = await activePool
      .request()
      .input("jobName", sql.NVarChar, jobName)
      .query(query);
    const serialized = serializeData(result.recordset);
    return { success: true, data: serialized };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getSqlJobDetails", async (event, jobName) => {
  try {
    const activePool = await ensurePool();
    const stepsQuery = `SELECT step_id as StepId, step_name as StepName, subsystem as Subsystem, command as Command, database_name as DatabaseName FROM msdb.dbo.sysjobsteps WHERE job_id = (SELECT job_id FROM msdb.dbo.sysjobs WHERE name = @jobName) ORDER BY step_id ASC`;
    const stepsResult = await activePool
      .request()
      .input("jobName", sql.NVarChar, jobName)
      .query(stepsQuery);
    const schedQuery = `SELECT s.name as ScheduleName, s.enabled as IsEnabled, s.freq_type as FreqType, s.freq_interval as FreqInterval, s.active_start_time as StartTime FROM msdb.dbo.sysjobschedules js INNER JOIN msdb.dbo.sysschedules s ON js.schedule_id = s.schedule_id INNER JOIN msdb.dbo.sysjobs j ON js.job_id = j.job_id WHERE j.name = @jobName`;
    const schedResult = await pool
      .request()
      .input("jobName", sql.NVarChar, jobName)
      .query(schedQuery);
    const serialized = serializeData({
      steps: stepsResult.recordset,
      schedules: schedResult.recordset,
    });
    return {
      success: true,
      data: serialized,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("db:getCurrentDbName", async () => {
  try {
    const activePool = await ensurePool();
    const result = await activePool.request().query("SELECT DB_NAME() AS currentDb");
    return { success: true, data: result.recordset[0].currentDb };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle(
  "db:saveJobMaster",
  async (event, { isEdit, originalName, jobData }) => {
    try {
      const activePool = await ensurePool();

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

      await activePool.request().query(masterQuery);
      return { success: true, message: "Görev başarıyla kaydedildi." };
    } catch (error) {
      console.error("Job Kaydetme Hatası:", error);
      return { success: false, message: error.message };
    }
  },
);

ipcMain.handle("win:testConnection", async (event, config) => {
  return new Promise((resolve) => {
    const conn = new Client();

    conn.on("ready", () => {
      conn.exec('powershell.exe -NoProfile -Command "Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version | ConvertTo-Json"', (err, stream) => {
        if (err) {
          conn.end();
          return resolve({ success: false, message: "Komut reddedildi: " + err.message });
        }

        let data = "";
        let errorData = "";

        stream.on("close", (code) => {
          conn.end();
          if (code !== 0) {
            return resolve({ success: false, message: `SSH Hata ${code}: ${errorData || data}` });
          }
          try {
            const result = JSON.parse(data.trim());
            resolve({ success: true, data: result });
          } catch (e) {
            resolve({ success: true, data: { Caption: data.trim(), Version: "JSON Ayrıştırma Hatası" } });
          }
        }).on("data", (d) => {
          data += d.toString();
        }).stderr.on("data", (d) => {
          errorData += d.toString();
        });
      });
    }).on("error", (err) => {
      resolve({ success: false, message: "SSH Bağlantı Hatası: " + err.message });
    }).connect({
      host: config.host,
      port: 22,
      username: config.username || config.user,
      password: config.password,
      readyTimeout: 15000
    });
  });
});

ipcMain.handle("win:getPerformanceStats", async (event, config) => {
  return new Promise((resolve) => {
    const conn = new Client();
    let isResolved = false;

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        conn.end();
        resolve({ success: false, message: "Bağlantı zaman aşımına uğradı (SSH timeout)" });
      }
    }, 25000);

    const command = `powershell.exe -NoProfile -Command "$cpu = (Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter \\"Name='_Total'\\" -Property PercentProcessorTime).PercentProcessorTime; $mem = Get-CimInstance Win32_OperatingSystem -Property TotalVisibleMemorySize, FreePhysicalMemory; $disks = Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3 OR DriveType=2' -Property DeviceID, Size, FreeSpace, VolumeName; $diskIO = (Get-CimInstance Win32_PerfFormattedData_PerfDisk_LogicalDisk -Filter \\"Name='_Total'\\" -Property DiskBytesPersec).DiskBytesPersec; $netIO = (Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface -Property BytesTotalPersec | Measure-Object -Property BytesTotalPersec -Sum).Sum; if ($null -eq $netIO) { $netIO = 0 }; $info = @{ CPU = [Math]::Round([double]$cpu, 1); RAM = @{ Total = [Math]::Round($mem.TotalVisibleMemorySize / 1MB, 2); Used = [Math]::Round(($mem.TotalVisibleMemorySize - $mem.FreePhysicalMemory) / 1MB, 2); Percent = [Math]::Round((([double]$mem.TotalVisibleMemorySize - [double]$mem.FreePhysicalMemory) / ([double]$mem.TotalVisibleMemorySize + 1)) * 100, 1) }; Disks = @($disks | ForEach-Object { @{ ID = $_.DeviceID; Name = $_.VolumeName; Total = [Math]::Round([double]$_.Size / 1GB, 2); Free = [Math]::Round([double]$_.FreeSpace / 1GB, 2); Percent = [Math]::Round((([double]$_.Size - [double]$_.FreeSpace) / ([double]$_.Size + 0.1)) * 100, 1) }; }); IO = @{ DiskRW = [Math]::Round([double]$diskIO / 1MB, 2); Network = [Math]::Round([double]$netIO / 1KB, 2) }; Timestamp = Get-Date -Format 'HH:mm:ss' }; $info | ConvertTo-Json -Depth 5"`;

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            conn.end();
            resolve({ success: false, message: err.message });
          }
          return;
        }
        let data = "";
        stream.on("close", () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            conn.end();
            try { resolve({ success: true, data: JSON.parse(data.trim()) }); }
            catch (e) { resolve({ success: false, message: "Veri okuma hatası: " + data }); }
          }
        }).on("data", (d) => { data += d.toString(); });
      });
    }).on("error", (err) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        resolve({ success: false, message: err.message });
      }
    }).connect({ host: config.host, port: 22, username: config.username || config.user, password: config.password, readyTimeout: 10000 });
  });
});

ipcMain.handle("win:getServices", async (event, config) => {
  return new Promise((resolve) => {
    const conn = new Client();
    const command = `powershell.exe -NoProfile -Command "$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Service | Select-Object Name, DisplayName, Status | ConvertTo-Json -Compress"`;

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return resolve({ success: false, message: err.message }); }
        let data = "";
        stream.on("close", () => {
          conn.end();
          try { resolve({ success: true, data: JSON.parse(data.trim()) }); }
          catch (e) { resolve({ success: false, message: "Data parse error: " + e.message }); }
        }).on("data", (d) => { data += d.toString('utf8'); });
      });
    }).on("error", (err) => resolve({ success: false, message: err.message }))
      .connect({ host: config.host, port: 22, username: config.username || config.user, password: config.password, readyTimeout: 10000 });
  });
});

ipcMain.handle("win:startService", async (event, { config, serviceName }) => {
  return new Promise((resolve) => {
    const conn = new Client();
    const command = `powershell.exe -NoProfile -Command "Start-Service -Name '${serviceName}'; if ($?) { Write-Output 'Success' } else { Write-Output 'Failed' }"`;

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return resolve({ success: false, message: err.message }); }
        let data = "";
        stream.on("close", () => {
          conn.end();
          resolve({ success: true, message: `Service ${serviceName} started.` });
        }).on("data", (d) => { data += d.toString(); });
      });
    }).on("error", (err) => resolve({ success: false, message: err.message }))
      .connect({ host: config.host, port: 22, username: config.username || config.user, password: config.password, readyTimeout: 10000 });
  });
});

ipcMain.handle("win:stopService", async (event, { config, serviceName }) => {
  return new Promise((resolve) => {
    const conn = new Client();
    const command = `powershell.exe -NoProfile -Command "Stop-Service -Name '${serviceName}' -Force; if ($?) { Write-Output 'Success' } else { Write-Output 'Failed' }"`;

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return resolve({ success: false, message: err.message }); }
        let data = "";
        stream.on("close", () => {
          conn.end();
          resolve({ success: true, message: `Service ${serviceName} stopped.` });
        }).on("data", (d) => { data += d.toString(); });
      });
    }).on("error", (err) => resolve({ success: false, message: err.message }))
      .connect({ host: config.host, port: 22, username: config.username || config.user, password: config.password, readyTimeout: 10000 });
  });
});

ipcMain.handle("win:toggleServiceWatch", async (event, { tenantId, serverId, serviceName, watch }) => {
  try {
    const tenantsDirPath = getTenantsDirPath();
    const filePath = path.join(tenantsDirPath, `${tenantId}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const tenant = JSON.parse(content);

    const serverIndex = tenant.windowsServers.findIndex(s => (s.id || s.host) === serverId);
    if (serverIndex !== -1) {
      const server = tenant.windowsServers[serverIndex];
      if (!server.watchedServices) server.watchedServices = [];

      if (watch && !server.watchedServices.includes(serviceName)) {
        server.watchedServices.push(serviceName);
      } else if (!watch) {
        server.watchedServices = server.watchedServices.filter(s => s !== serviceName);
      }

      await fs.writeFile(filePath, JSON.stringify(tenant, null, 2));

      const sess = MonitoringService.sessions.get(serverId);
      if (sess && sess.config) {
        sess.config.watchedServices = server.watchedServices;
      }

      if (mainWindow) mainWindow.webContents.send("tenants-updated");
      return { success: true };
    }
    return { success: false, message: "Server not found in tenant." };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("win:startTerminalSession", async (event, serverId, config) => {
  try {
    const conn = await MonitoringService.getConnection(serverId, config);
    if (!conn) throw new Error("Could not connect to server");

    return new Promise((resolve) => {
      conn.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) {
          resolve({ success: false, message: err.message });
          return;
        }

        activeTerminals.set(serverId, stream);

        stream.on('data', (data) => {
          if (mainWindow) {
            mainWindow.webContents.send(`terminal:data:${serverId}`, data.toString());
          }
        });

        stream.on('close', () => {
          activeTerminals.delete(serverId);
        });

        resolve({ success: true });
      });
    });
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.handle("win:terminalInput", (event, serverId, input) => {
  const stream = activeTerminals.get(serverId);
  if (stream) {
    stream.write(input);
    return { success: true };
  }
  console.log(`[Terminal] No active stream for ${serverId}`);
  return { success: false, message: "No active terminal session" };
});

ipcMain.handle("win:resizeTerminal", (event, serverId, cols, rows) => {
  const stream = activeTerminals.get(serverId);
  if (stream) {
    stream.setWindow(rows, cols, 0, 0);
    return { success: true };
  }
  return { success: false, message: "No active terminal session" };
});

ipcMain.handle("win:stopTerminalSession", (event, serverId) => {
  const stream = activeTerminals.get(serverId);
  if (stream) {
    stream.end();
    activeTerminals.delete(serverId);
    return { success: true };
  }
  return { success: false, message: "No active terminal session" };
});

const ts = () => new Date().toLocaleTimeString('tr-TR', { hour12: false }) + '.' + new Date().getMilliseconds().toString().padStart(3, '0');

const MonitoringService = {
  sessions: new Map(),
  dataLimit: 30000,
  syncInterval: 60000 * 5, // 5 min
  isAppFocused: true,

  pendingNotifications: [],
  notificationTimer: null,

  queueNotification(type, isInitialFailure, serverName, serverId) {
    this.pendingNotifications.push({ type, isInitialFailure, serverName, serverId });
    if (this.notificationTimer) clearTimeout(this.notificationTimer);

    this.notificationTimer = setTimeout(() => {
      this.flushNotifications();
    }, 1500);
  },

  flushNotifications() {
    const queue = [...this.pendingNotifications];
    this.pendingNotifications = [];
    if (queue.length === 0) return;

    const lang = store.get('config')?.ui?.language || 'tr';

    const groups = {};
    queue.forEach(q => {
      const key = `${q.type}-${q.isInitialFailure ? 'initial' : 'repeat'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });

    for (const [key, items] of Object.entries(groups)) {
      const [type, state] = key.split('-');
      const isInitial = state === 'initial';
      const names = [...new Set(items.map(i => i.serverName))].join(", ");

      let osTitle = "", osBody = "", appTitleKey = "", appBodyKey = "", notificationData = {};

      if (items.length === 1) {
        const item = items[0];
        notificationData = { name: item.serverName };
        if (type === 'database') {
          osTitle = lang === 'en' ? (isInitial ? "Database Connection Lost" : "Database Disconnected") : (isInitial ? "Veritabanı Bağlantısı Koptu" : "Veritabanı Bağlantısı Yok");
          osBody = lang === 'en' ? `${item.serverName} database is unreachable.` : `${item.serverName} veritabanına ulaşılamıyor.`;
          appTitleKey = isInitial ? "notifications.dbOffline.title" : "notifications.dbDisconnected.title";
          appBodyKey = isInitial ? "notifications.dbOffline.body" : "notifications.dbDisconnected.body";
        } else {
          osTitle = lang === 'en' ? (isInitial ? "Server Connection Lost" : "Server Disconnected") : (isInitial ? "Sunucu Bağlantısı Koptu" : "Sunucu Bağlantısı Yok");
          osBody = lang === 'en' ? `${item.serverName} server is unreachable.` : `${item.serverName} sunucusuna ulaşılamıyor.`;
          appTitleKey = isInitial ? "notifications.serverOffline.title" : "notifications.serverDisconnected.title";
          appBodyKey = isInitial ? "notifications.serverOffline.body" : "notifications.serverDisconnected.body";
        }
        addAppNotification({ titleKey: appTitleKey, bodyKey: appBodyKey, data: notificationData, type: "error", serverId: type === 'windowsServer' ? item.serverId : null });
      } else {
        notificationData = { names: names, count: items.length };
        if (type === 'database') {
          osTitle = lang === 'en' ? `${items.length} Databases Disconnected` : `${items.length} Veritabanı Bağlantısı Koptu`;
          osBody = lang === 'en' ? `The following databases are unreachable: ${names}` : `Şu veritabanlarına ulaşılamıyor: ${names}`;
          appTitleKey = isInitial ? "notifications.dbOfflineBatched.title" : "notifications.dbDisconnectedBatched.title";
          appBodyKey = isInitial ? "notifications.dbOfflineBatched.body" : "notifications.dbDisconnectedBatched.body";
        } else {
          osTitle = lang === 'en' ? `${items.length} Servers Disconnected` : `${items.length} Sunucu Bağlantısı Koptu`;
          osBody = lang === 'en' ? `The following servers are unreachable: ${names}` : `Şu sunuculara ulaşılamıyor: ${names}`;
          appTitleKey = isInitial ? "notifications.serverOfflineBatched.title" : "notifications.serverDisconnectedBatched.title";
          appBodyKey = isInitial ? "notifications.serverOfflineBatched.body" : "notifications.serverDisconnectedBatched.body";
        }
        addAppNotification({ titleKey: appTitleKey, bodyKey: appBodyKey, data: notificationData, type: "error", serverId: null });
      }

      if (!this.isAppFocused || isInitial) {
        new Notification({ title: osTitle, body: osBody }).show();
      }
    }
  },

  async getLogPath(serverId, dateStr) {
    const basePath = getBasePath();
    return path.join(basePath, "monitoring", `stats_${serverId}_${dateStr}.json`);
  },

  async getAvailableDates(serverId) {
    const basePath = getBasePath();
    const targetDir = path.join(basePath, "monitoring");
    const dates = new Set();

    try {
      const files = await fs.readdir(targetDir);
      for (const file of files) {
        const dailyMatch = file.match(new RegExp(`^stats_${serverId}_(\\d{4}-\\d{2}-\\d{2})\\.json$`));
        if (dailyMatch) {
          dates.add(dailyMatch[1]);
        }

        if (file === `stats_${serverId}.json`) {

          dates.add(new Date().toISOString().split('T')[0]);
        }
      }
    } catch (e) {
      console.warn(`[getAvailableDates] Failed to read monitoring dir for ${serverId}:`, e);
    }

    return Array.from(dates).sort();
  },

  async loadHistory(serverId, dateStr) {
    try {
      const targetDate = dateStr || new Date().toISOString().split('T')[0];
      const logPath = await this.getLogPath(serverId, targetDate);

      let content;
      try {
        content = await fs.readFile(logPath, "utf-8");
      } catch (err) {

        const basePath = getBasePath();
        const legacyPath = path.join(basePath, "monitoring", `stats_${serverId}.json`);
        try {
          content = await fs.readFile(legacyPath, "utf-8");
          const legacyData = JSON.parse(content);

          const results = [];
          legacyData.forEach(item => {

            if (!item.Date) item.Date = targetDate;
            if (item.Date === targetDate || !dateStr) {
              results.push(item);
            }
          });
          return results;
        } catch (legacyErr) {
          return [];
        }
      }

      return JSON.parse(content);
    } catch {
      return [];
    }
  },

  async saveHistory(serverId, data) {
    try {
      const groupedData = {};
      data.forEach(item => {
        const date = item.Date || new Date().toISOString().split('T')[0];
        if (!groupedData[date]) groupedData[date] = [];
        groupedData[date].push(item);
      });

      for (const [date, dailyData] of Object.entries(groupedData)) {
        const logPath = await this.getLogPath(serverId, date);

        const optimizedData = dailyData.slice(-this.dataLimit).map(item => {
          const prf = { ...item };

          delete prf.Disks;

          if (prf.CPU < 80 && (prf.RAM?.Percent || 0) < 85) {
            delete prf.TopProcs;
          }
          return prf;
        });

        const content = "[\n" + optimizedData.map(d => "  " + JSON.stringify(d)).join(",\n") + "\n]";
        await fs.writeFile(logPath, content, "utf-8");
      }
    } catch (err) {
      console.error(`Save history error (${serverId}):`, err);
    }
  },

  async start(server) {
    const serverId = server.ID || server.id || server.host;
    if (this.sessions.has(serverId)) return;

    this.sessions.set(serverId, { status: "initializing" });
    console.log(`[${ts()}] Starting background monitoring for: ${serverId}`);

    const history = await this.loadHistory(serverId);

    if (!this.sessions.has(serverId)) return;

    const session = {
      type: server.type || 'windowsServer',
      config: server,
      data: history,
      interval: null,
      lastSync: Date.now(),
      consecutiveErrors: 0,
      status: "connecting",
      lastError: null,
      lastInterval: 10000,
      preferredInterval: 10000,
      sshClient: null,
      dbPool: null,
      isConnecting: false,
      isProcessing: false,
      tenantInfo: server.tenantInfo,
      alertState: { isOffline: false, cpuHigh: false, ramHigh: false, diskHigh: false }
    };

    this.sessions.set(serverId, session);

    this.runCycle(serverId);

    session.interval = setInterval(() => this.runCycle(serverId), 10000);
  },

  async runCycle(serverId) {
    const sess = this.sessions.get(serverId);
    if (!sess || sess.status === "initializing" || sess.isProcessing) return;

    sess.isProcessing = true;
    try {
      const res = await this.performFetch(sess.config);

      if (res.success) {
        sess.data.push(res.data);
        if (sess.data.length > this.dataLimit) sess.data.shift();

        if (sess.consecutiveErrors > 0 || sess.status !== "connected") {
          sess.consecutiveErrors = 0;
          sess.status = "connected";
          sess.lastError = null;
          console.log(`[${ts()}] Monitoring (${serverId}) successfully recovered and connected.`);
          this.broadcastStatus(serverId, sess);
          const activeInterval = this.isAppFocused ? sess.preferredInterval : 30000;
          this.adjustInterval(serverId, activeInterval);
        }

        if (!sess.alertState) sess.alertState = { isOffline: false, cpuHigh: false, ramHigh: false, diskHigh: false };

        const serverName = sess.config.alias || sess.config.name || serverId;

        if (sess.alertState.isOffline) {
          sess.alertState.isOffline = false;

          const serverName = sess.config.name || serverId;
          const lang = store.get('config')?.ui?.language || 'tr';

          const strings = {
            tr: {
              dbTitle: "Veritabanı Kurtarıldı",
              dbBody: `${serverName} veritabanı bağlantısı sağlandı.`,
              srvTitle: "Sunucu Kurtarıldı",
              srvBody: `${serverName} sunucusu tekrar çevrimiçi oldu.`
            },
            en: {
              dbTitle: "Database Recovered",
              dbBody: `${serverName} database connection restored.`,
              srvTitle: "Server Recovered",
              srvBody: `${serverName} server is back online.`
            }
          }[lang] || strings.tr;

          const recoveryTitle = sess.type === 'database' ? strings.dbTitle : strings.srvTitle;
          const recoveryBody = sess.type === 'database' ? strings.dbBody : strings.srvBody;

          new Notification({ title: recoveryTitle, body: recoveryBody }).show();
          addAppNotification({
            titleKey: sess.type === 'database' ? "notifications.dbRecovered.title" : "notifications.systemRecovered.title",
            bodyKey: sess.type === 'database' ? "notifications.dbRecovered.body" : "notifications.systemRecovered.body",
            data: { name: serverName },
            type: "success",
            serverId: sess.type === 'windowsServer' ? serverId : null
          });
        }

        const cpuLoad = res.data?.CPU || 0;
        const ramLoad = res.data?.RAM?.Percent || 0;

        const cpuThreshold = 90;
        if (cpuLoad > cpuThreshold && !sess.alertState.cpuHigh) {
          sess.alertState.cpuHigh = true;
          new Notification({ title: "Kritik CPU Yükü", body: `${serverName} sunucusunda CPU kullanımı %${cpuLoad} seviyesine ulaştı!` }).show();
          addAppNotification({
            titleKey: "notifications.cpuHigh.title",
            bodyKey: "notifications.cpuHigh.body",
            data: { name: serverName, value: cpuLoad },
            type: "warning",
            serverId
          });
        } else if (cpuLoad < (cpuThreshold - 2) && sess.alertState.cpuHigh) {
          sess.alertState.cpuHigh = false;
        }

        // RAM Alert
        if (ramLoad > 90 && !sess.alertState.ramHigh) {
          sess.alertState.ramHigh = true;
          new Notification({ title: "Kritik RAM Uyarısı", body: `${serverName} sunucusunda bellek kullanımı %${ramLoad} seviyesine ulaştı!` }).show();
          addAppNotification({
            titleKey: "notifications.ramHigh.title",
            bodyKey: "notifications.ramHigh.body",
            data: { name: serverName, value: ramLoad },
            type: "warning",
            serverId
          });
        } else if (ramLoad < 85 && sess.alertState.ramHigh) {
          sess.alertState.ramHigh = false;
        }

        // Disk Alert
        const fullDisks = (res.data?.Disks || []).filter(d => d.Percent > 90);
        if (fullDisks.length > 0 && !sess.alertState.diskHigh) {
          sess.alertState.diskHigh = true;
          const driveLabel = fullDisks.map(d => d.ID).join(", ");
          new Notification({ title: "Kritik Disk Doluluğu", body: `${serverName} sunucusunda ${driveLabel} sürücüsü %90 doluluğu geçti!` }).show();
          addAppNotification({
            titleKey: "notifications.diskHigh.title",
            bodyKey: "notifications.diskHigh.body",
            data: { name: serverName, drive: driveLabel, value: Math.round(fullDisks[0].Percent) },
            type: "warning",
            serverId
          });
        } else if (fullDisks.length === 0 && sess.alertState.diskHigh) {
          sess.alertState.diskHigh = false;
        }
        // Service Stop Alert
        if (res.data?.WatchedServices && res.data.WatchedServices.length > 0) {
          if (!sess.alertState.services) sess.alertState.services = {};

          res.data.WatchedServices.forEach(srv => {
            const isStopped = srv.Status !== 'Running' && srv.Status !== '4';
            const wasStopped = sess.alertState.services[srv.Name];

            if (isStopped && !wasStopped) {
              sess.alertState.services[srv.Name] = true;
              new Notification({ title: "Kritik Servis Durdu", body: `${serverName} sunucusunda ${srv.Name} servisi durdu!` }).show();
              addAppNotification({
                titleKey: "notifications.serviceStopped.title",
                bodyKey: "notifications.serviceStopped.body",
                data: { name: serverName, service: srv.Name },
                type: "error",
                serverId
              });
            } else if (!isStopped && wasStopped) {
              sess.alertState.services[srv.Name] = false;
            }
          });
        }

        if (mainWindow) {
          mainWindow.webContents.send(`monitoring:update:${serverId}`, res.data);
        }

        if (Date.now() - sess.lastSync > this.syncInterval) {
          this.saveHistory(serverId, sess.data);
          sess.lastSync = Date.now();
        }
      } else {
        sess.consecutiveErrors++;
        sess.lastError = res.message;

        let newStatus = "connecting";
        const baseDelay = 5000;
        const maxDelay = 120000;

        const retryDelay = Math.round(Math.min(baseDelay * Math.pow(1.5, Math.max(0, sess.consecutiveErrors - 1)), maxDelay));

        if (sess.consecutiveErrors >= 2) {
          newStatus = "error";
        } else {
          newStatus = "connecting";
        }

        if (sess.consecutiveErrors >= 3) {
          const isInitialFailure = sess.consecutiveErrors === 3;

          const isRepeatingFailure = (sess.consecutiveErrors - 3) % 30 === 0;

          if (isInitialFailure || isRepeatingFailure) {
            if (!sess.alertState) sess.alertState = { isOffline: true, cpuHigh: false, ramHigh: false };
            else sess.alertState.isOffline = true;

            const serverName = sess.config.name || sess.config.alias || serverId;
            this.queueNotification(sess.type, isInitialFailure, serverName, serverId);
          }
        }

        if (sess.status !== newStatus || sess.lastInterval !== retryDelay) {
          sess.status = newStatus;
          console.warn(`[${ts()}] [Geri Çekilme - Backoff] (${serverId}) Hata: ${res.message}. ${Math.round(retryDelay / 1000)}s sonra tekrar denenecek. (Deneme: ${sess.consecutiveErrors})`);
          this.broadcastStatus(serverId, sess);
          this.adjustInterval(serverId, retryDelay);
        } else {
          console.log(`[${ts()}] [Geri Çekilme] (${serverId}) Hata devam ediyor. Deneme: ${sess.consecutiveErrors} (Bekleme: ${Math.round(retryDelay / 1000)}s)`);
          this.broadcastStatus(serverId, sess);
        }
      }
    } catch (e) {
      console.error(`[${ts()}] Monitoring (${serverId}) crash:`, e);
    } finally {
      sess.isProcessing = false;
    }
  },

  currentPage: "/overview",

  recalculateIntervals() {
    const isHighFreqPage =
      this.currentPage === "/" ||
      this.currentPage === "/overview" ||
      this.currentPage.includes("/win/performance") ||
      this.currentPage.includes("/database/activity");

    console.log(`[${ts()}] Monitoring Service: Recalculating intervals (Focus: ${this.isAppFocused}, Page: ${this.currentPage})`);

    for (const [serverId, sess] of this.sessions.entries()) {
      if (sess.consecutiveErrors > 0 || sess.status === "error" || sess.status === "retrying") continue;

      let actualInterval = 30000;
      if (this.isAppFocused) {
        if (isHighFreqPage) {
          actualInterval = sess.preferredInterval || 3000;
        } else {
          actualInterval = 20000;
        }
      }
      this.adjustInterval(serverId, actualInterval);
    }
  },

  updatePage(pagePath) {
    if (this.currentPage === pagePath) return;
    this.currentPage = pagePath;
    this.recalculateIntervals();
  },

  updateInterval(serverId, newMs) {
    const sess = this.sessions.get(serverId);
    if (!sess) return;
    sess.preferredInterval = newMs;
    this.recalculateIntervals();
  },

  updateGlobalFocus(focused) {
    if (this.isAppFocused === focused) return;
    this.isAppFocused = focused;
    console.log(`[${ts()}] Monitoring Service: App focus changed to ${focused}.`);


    if (focused) {
      for (const [serverId, sess] of this.sessions.entries()) {
        if (sess.status === "error" || sess.consecutiveErrors > 0) {
          console.log(`[${ts()}] Monitoring Service: App focused, forcing immediate retry for offline resource ${serverId}`);

          if (sess.interval) clearInterval(sess.interval);
          sess.lastInterval = 0;
          this.runCycle(serverId);
        }
      }
    }

    this.recalculateIntervals();
  },

  broadcastStatus(serverId, sess) {
    if (mainWindow) {
      mainWindow.webContents.send(`monitoring:status:${serverId}`, {
        status: sess.status,
        lastError: sess.lastError,
        consecutiveErrors: sess.consecutiveErrors
      });
    }
  },

  adjustInterval(serverId, newMs) {
    const sess = this.sessions.get(serverId);
    if (!sess) return;
    if (sess.lastInterval === newMs) return;

    if (sess.interval) clearInterval(sess.interval);
    sess.interval = setInterval(() => this.runCycle(serverId), newMs);
    sess.lastInterval = newMs;
  },

  refreshAll() {
    console.log(`[${ts()}] Monitoring: Force refreshing all ${this.sessions.size} sessions...`);
    for (const serverId of this.sessions.keys()) {
      this.runCycle(serverId);
    }
  },

  updateConfig(serverId, newConfig) {
    const sess = this.sessions.get(serverId);

    if (newConfig.excludeFromMonitoring) {
      if (sess) {
        console.log(`[${ts()}] Monitoring (${serverId}) is now excluded. Stopping...`);
        this.stop(serverId);
      }
      return;
    }

    if (!sess) {
      console.log(`[${ts()}] Monitoring (${serverId}) is no longer excluded. Starting...`);
      this.start({ ...newConfig, type: newConfig.type || (serverId.startsWith('db-') ? 'database' : 'windowsServer') });
      return;
    }

    console.log(`[${ts()}] Monitoring (${serverId}) config updated. Refreshing connection...`);
    sess.config = { ...newConfig, type: newConfig.type || sess.type };

    if (sess.sshClient) {
      try { sess.sshClient.end(); } catch (e) { }
      sess.sshClient = null;
    }

    if (sess.dbPool) {
      try { sess.dbPool.close(); } catch (e) { }
      sess.dbPool = null;
    }

    this.runCycle(serverId);
  },

  stop(serverId) {
    const sess = this.sessions.get(serverId);
    if (sess) {
      if (sess.interval) clearInterval(sess.interval);
      if (sess.sshClient) {
        try { sess.sshClient.end(); } catch (e) { }
      }
      if (sess.dbPool) {
        try { sess.dbPool.close(); } catch (e) { }
      }
      this.saveHistory(serverId, sess.data);
      this.sessions.delete(serverId);
    }
  },

  async getConnection(serverId, config) {
    const sess = this.sessions.get(serverId);
    if (!sess) return null;

    if (sess.sshClient) {
      return sess.sshClient;
    }

    if (sess.isConnecting) {

      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!sess.isConnecting) {
            clearInterval(check);
            resolve(sess.sshClient?._state === 'authenticated' ? sess.sshClient : null);
          }
        }, 100);
        setTimeout(() => { clearInterval(check); resolve(null); }, 15000);
      });
    }

    sess.isConnecting = true;
    console.log(`[${ts()}] Monitoring: Connecting to ${config.host}...`);
    return new Promise((resolve) => {
      const conn = new Client();

      const timeout = setTimeout(() => {
        if (sess.isConnecting) {
          sess.isConnecting = false;
          try { conn.destroy(); } catch (e) { }
          resolve(null);
        }
      }, 20000);

      conn.on("ready", () => {
        console.log(`[${ts()}] Monitoring: Successfully connected to ${config.host}`);
        clearTimeout(timeout);
        sess.sshClient = conn;
        sess.isConnecting = false;
        resolve(conn);
      }).on("error", (err) => {
        let errType = "Bilinmeyen Ağ Hatası";
        if (err.message.includes("ECONNRESET")) errType = "Sunucu bağlantıyı kesti (ECONNRESET - Limit veya Yük)";
        else if (err.message.includes("handshake")) errType = "Handshake Hatası (SSH servisi yanıt vermiyor)";
        else if (err.message.includes("ETIMEDOUT")) errType = "Zaman Aşımı (Sunucuya ulaşılamıyor)";
        else if (err.message.includes("ENOTFOUND")) errType = "Sunucu bulunamadı (ENOTFOUND)";

        console.error(`[${ts()}] [Bağlantı Hatası] (${config.host}) Tür: ${errType} | Detay: ${err.message}`);
        clearTimeout(timeout);
        sess.sshClient = null;
        sess.isConnecting = false;
        try { conn.destroy(); } catch (e) { }
        resolve(null);
      }).on("close", () => {
        console.log(`[${ts()}] Monitoring SSH Closed (${config.host})`);
        sess.sshClient = null;
        sess.isConnecting = false;
        try { conn.destroy(); } catch (e) { }
      }).connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3,
        readyTimeout: 30000
      });
    });
  },

  async performFetch(config) {
    const serverId = config.id || config.host || config.server;
    const sess = this.sessions.get(serverId);
    if (!sess) return { success: false, message: "Session not found" };

    if (config.type === 'database') {
      try {

        if (!sess.dbPool || !sess.dbPool.connected) {
          const dbConfig = {
            server: config.server,
            database: config.databaseName || config.database || "",
            user: config.user,
            password: security.decrypt(config.password),
            options: {
              encrypt: false,
              trustServerCertificate: true,
              enableArithAbort: true,
            },
            pool: { max: 1, min: 0, idleTimeoutMillis: 30000 },
          };
          sess.dbPool = await new sql.ConnectionPool(dbConfig).connect();
        }

        const pool = sess.dbPool;
        let sessionCount = 0;
        try {
          const result = await pool.request().query(`
            SELECT COUNT(*) as Count 
            FROM sys.dm_exec_sessions 
            WHERE is_user_process = 1 AND database_id = DB_ID()
          `);
          sessionCount = result.recordset[0].Count;
        } catch (dbErr) {

          sess.dbPool = null;
          throw dbErr;
        }

        return {
          success: true,
          data: {
            activeSessions: sessionCount,
            Timestamp: new Date().toLocaleTimeString('tr-TR', { hour12: false })
          }
        };
      } catch (err) {
        return { success: false, message: err.message };
      }
    }


    const conn = await this.getConnection(serverId, config);

    if (!conn) {
      return { success: false, message: "Could not establish persistent connection" };
    }

    return new Promise((resolve) => {
      let isResolved = false;
      let data = "";

      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          try {
            const sess = this.sessions.get(serverId);
            if (sess && sess.sshClient === conn) sess.sshClient = null;
            conn.destroy();
          } catch (e) { }
          resolve({ success: false, message: "Timeout" });
        }
      }, 30000);

      let servicesScript = `$services = @(); `;
      if (config.watchedServices && config.watchedServices.length > 0) {
        const sList = config.watchedServices.map(s => `'${s}'`).join(',');
        servicesScript = `$services = Get-Service -Name ${sList} -ErrorAction SilentlyContinue | Select-Object Name, Status | ForEach-Object { @{ Name = $_.Name; Status = $_.Status.ToString() } }; `;
      }

      const command = `powershell.exe -NoProfile -Command "${servicesScript}$cpu = (Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter \\"Name='_Total'\\" -Property PercentProcessorTime).PercentProcessorTime; $mem = Get-CimInstance Win32_OperatingSystem -Property TotalVisibleMemorySize, FreePhysicalMemory; $disks = Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3 OR DriveType=2' -Property DeviceID, Size, FreeSpace, VolumeName; $diskIO = (Get-CimInstance Win32_PerfFormattedData_PerfDisk_LogicalDisk -Filter \\"Name='_Total'\\" -Property DiskBytesPersec).DiskBytesPersec; $netIO = (Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface -Property BytesTotalPersec | Measure-Object -Property BytesTotalPersec -Sum).Sum; if ($null -eq $netIO) { $netIO = 0 }; $procCount = (Get-CimInstance Win32_Processor).NumberOfLogicalProcessors; if ($null -eq $procCount -or $procCount -lt 1) { $procCount = 1 }; $procs = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -Filter \\"Name != '_Total' AND Name != 'Idle'\\" -Property Name, PercentProcessorTime | Sort-Object PercentProcessorTime -Descending | Select-Object -First 5 | ForEach-Object { @{ Name = $_.Name; CPU = [Math]::Round(($_.PercentProcessorTime / $procCount), 1) } }; $info = @{ CPU = [Math]::Round([double]$cpu, 1); RAM = @{ Total = [Math]::Round([double]$mem.TotalVisibleMemorySize / 1MB, 2); Used = [Math]::Round(([double]$mem.TotalVisibleMemorySize - [double]$mem.FreePhysicalMemory) / 1MB, 2); Percent = [Math]::Round(((([double]$mem.TotalVisibleMemorySize - [double]$mem.FreePhysicalMemory) / ([double]$mem.TotalVisibleMemorySize + 1)) * 100), 1) }; Disks = @($disks | ForEach-Object { @{ ID = $_.DeviceID; Name = $_.VolumeName; Total = [Math]::Round([double]$_.Size / 1GB, 2); Free = [Math]::Round([double]$_.FreeSpace / 1GB, 2); Percent = [Math]::Round(((([double]$_.Size - [double]$_.FreeSpace) / ([double]$_.Size + 0.1)) * 100), 1) }; }); IO = @{ DiskRW = [Math]::Round([double]$diskIO / 1MB, 2); Network = [Math]::Round([double]$netIO / 1KB, 2) }; TopProcs = $procs; WatchedServices = @($services); Timestamp = Get-Date -Format 'HH:mm:ss' }; $info | ConvertTo-Json -Depth 5"`;

      conn.exec(command, (err, stream) => {
        if (err) {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            console.error(`[${ts()}] [Komut Gönderme Hatası] (${serverId}):`, err.message);
            resolve({ success: false, message: err.message });
          }
          return;
        }

        let stdErrData = "";
        stream.stderr.on("data", (d) => { stdErrData += d.toString(); });
        stream.on("data", (d) => { data += d.toString(); });
        stream.on("close", (code, signal) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);

            if (stdErrData) {
              console.error(`[${ts()}] [PowerShell Hatası] (${serverId}):`, stdErrData.trim());
            }
            if (code !== 0 && code !== undefined) {
              console.error(`[${ts()}] [Süreç Hatası] (${serverId}): PowerShell beklenmeyen bir kodla çıktı (${code})`);
            }

            try {
              const res = JSON.parse(data.trim());
              res.Date = new Date().toISOString().split('T')[0];
              resolve({ success: true, data: res });
            } catch (e) {
              console.error(`[${ts()}] [Ayrıştırma / JSON Hatası] (${serverId}): Sunucudan gelen veri işlenemedi. Gelen veri:`, data.substring(0, 200) + "...");
              resolve({ success: false, message: "Geçersiz veya boş veri. (Parse error)" });
            }
          }
        });
      });
    });
  }
};

ipcMain.handle("monitoring:start", (event, server) => {
  MonitoringService.start(server);
  return { success: true };
});

ipcMain.handle("monitoring:updateConfig", (event, { serverId, config }) => {
  MonitoringService.updateConfig(serverId, config);
  return { success: true };
});

ipcMain.handle("monitoring:getAllStatuses", async () => {
  const statuses = {};
  for (const [serverId, sess] of MonitoringService.sessions.entries()) {
    if (sess.status === "initializing") continue;

    statuses[serverId] = {
      status: sess.status,
      lastData: sess.data.length > 0 ? sess.data[sess.data.length - 1] : null,
      lastError: sess.lastError,
      consecutiveErrors: sess.consecutiveErrors
    };
  }
  return { success: true, data: statuses };
});

ipcMain.handle("monitoring:getHistory", async (event, args) => {

  const serverId = typeof args === 'string' ? args : args.serverId;
  const dateStr = typeof args === 'string' ? null : args.dateStr;

  const session = MonitoringService.sessions.get(serverId);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const isTargetingToday = !dateStr || dateStr === todayDateStr;

  if (session && session.data && isTargetingToday) {
    return { success: true, data: session.data };
  }

  const history = await MonitoringService.loadHistory(serverId, dateStr);
  return { success: true, data: history };
});

ipcMain.handle("monitoring:getAvailableDates", async (event, serverId) => {
  const dates = await MonitoringService.getAvailableDates(serverId);
  return { success: true, data: dates };
});

ipcMain.handle("monitoring:stop", (event, serverId) => {
  MonitoringService.stop(serverId);
  return { success: true };
});

ipcMain.handle("monitoring:generateReport", async (event, { server, range = 'last24h', lang = 'tr', dateRange, dateStr }) => {
  const serverId = server.id || server.host;

  let history = [];

  if (dateRange && dateRange.start && dateRange.end) {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    let iter = new Date(start);

    while (iter <= end) {
      const iterStr = iter.toISOString().split('T')[0];
      const items = await MonitoringService.loadHistory(serverId, iterStr);
      history = history.concat(items);
      iter.setDate(iter.getDate() + 1);
    }
  } else {
    const todayDateStr = new Date().toISOString().split('T')[0];
    const targetDate = dateStr || todayDateStr;
    const isTargetingToday = targetDate === todayDateStr;

    if (isTargetingToday) {
      const sess = MonitoringService.sessions.get(serverId);
      history = sess ? [...sess.data] : [];
      if (history.length === 0) {
        history = await MonitoringService.loadHistory(serverId, todayDateStr);
      }
    } else {
      history = await MonitoringService.loadHistory(serverId, dateStr);
    }
  }

  const i18n = {
    tr: {
      noData: "Rapor için yeterli veri bulunamadı. Lütfen en az 5 veri noktası (yaklaşık 15 saniye) toplanmasını bekleyin.",
      reportTitle: "VESGEN PERFORMANS RAPORU",
      duration: "Gözlem Süresi",
      seconds: "Saniye",
      avgCpu: "Ortalama İşlemci Yükü (CPU)",
      avgRam: "Ortalama Bellek Kullanımı (RAM)",
      avgDisk: "Disk Trafiği (Ortalama)",
      avgNet: "Ağ Trafiği (Ortalama)",
      observations: "Anatomi ve Kritik Gözlemler",
      stable: "Tüm sistem parametreleri stabil seyretti. Herhangi bir anomali saptanmadı.",
      detected: "Tespit Edildi",
      footer: "Bu rapor Vesgen Professional Monitoring Service tarafından otomatik olarak oluşturulmuştur.",
      diagnostics: {
        perfect: "Sistem performansı oldukça iyi ve stabil.",
        normal: "Sistem normal yük altında çalışıyor.",
        heavy: "Sistem yükü yüksek, süreçleri kontrol etmenizi öneririz.",
        ramCritical: "Bellek kullanımı kritik seviyede!"
      },
      suspectedProcesses: "Şüpheli Uygulamalar / Süreçler",
      cpuCritical: "Kritik İşlemci Yükü",
      ramAnom: "Kritik Bellek Kullanımı",
      valLabel: "Değer",
      timeLabel: "Saat",
      saveTitle: "Performans Raporunu Kaydet",
      cancel: "İşlem iptal edildi."
    },
    en: {
      noData: "Not enough data found for report. Please wait for at least 5 data points (~15 seconds).",
      reportTitle: "VESGEN PERFORMANCE REPORT",
      duration: "Observation Period",
      seconds: "Seconds",
      avgCpu: "Average CPU Load",
      avgRam: "Average Memory Usage (RAM)",
      avgDisk: "Disk Traffic (Average)",
      avgNet: "Network Traffic (Average)",
      observations: "Anatomy & Critical Observations",
      stable: "All system parameters remained stable. No anomalies detected.",
      detected: "Detected",
      footer: "This report was automatically generated by Vesgen Professional Monitoring Service.",
      diagnostics: {
        perfect: "System performance is excellent and stable.",
        normal: "System is operating under normal load.",
        heavy: "High system load detected, recommended to check active processes.",
        ramCritical: "Memory usage is at a critical level!"
      },
      suspectedProcesses: "Suspected Applications / Processes",
      cpuCritical: "Critical CPU Load",
      ramAnom: "Critical Memory Usage",
      valLabel: "Value",
      timeLabel: "Time",
      saveTitle: "Save Performance Report",
      cancel: "Process cancelled."
    }
  };

  const t = i18n[lang] || i18n.en;

  if (!history || history.length < 5) {
    return { success: false, message: t.noData };
  }

  const stats = {
    cpu: { avg: 0, max: 0, min: 100 },
    ram: { avg: 0, max: 0, min: 100 },
    disk: { avg: 0, max: 0, min: 99999 },
    net: { avg: 0, max: 0, min: 99999 },
    counts: history.length,
    anomalies: []
  };

  history.forEach(d => {
    // CPU
    const cpuVal = d.CPU || 0;
    stats.cpu.avg += cpuVal;
    if (cpuVal > stats.cpu.max) stats.cpu.max = cpuVal;
    if (cpuVal < stats.cpu.min) stats.cpu.min = cpuVal;
    if (cpuVal > 80) stats.anomalies.push({ type: t.cpuCritical, val: `%${cpuVal}`, time: d.Timestamp, procs: d.TopProcs });

    // RAM
    const ramVal = d.RAM?.Percent || 0;
    stats.ram.avg += ramVal;
    if (ramVal > stats.ram.max) stats.ram.max = ramVal;
    if (ramVal < stats.ram.min) stats.ram.min = ramVal;
    if (ramVal > 85) stats.anomalies.push({ type: t.ramAnom, val: `%${ramVal}`, time: d.Timestamp, procs: d.TopProcs });

    // Disk
    const dVal = d.IO?.DiskRW || 0;
    stats.disk.avg += dVal;
    if (dVal > stats.disk.max) stats.disk.max = dVal;
    if (dVal < stats.disk.min) stats.disk.min = dVal;

    // Network
    const nVal = d.IO?.Network || 0;
    stats.net.avg += nVal;
    if (nVal > stats.net.max) stats.net.max = nVal;
    if (nVal < stats.net.min) stats.net.min = nVal;
  });

  stats.cpu.avg = Number((stats.cpu.avg / stats.counts).toFixed(1));
  stats.ram.avg = Number((stats.ram.avg / stats.counts).toFixed(1));
  stats.disk.avg = Number((stats.disk.avg / stats.counts).toFixed(1));
  stats.net.avg = Number((stats.net.avg / stats.counts).toFixed(1));

  // Smart Diagnostics
  let diagText = "";
  if (stats.cpu.avg < 30) diagText = t.diagnostics.perfect;
  else if (stats.cpu.avg < 60) diagText = t.diagnostics.normal;
  else diagText = t.diagnostics.heavy;

  if (stats.ram.avg > 85) diagText += ` ${t.diagnostics.ramCritical}`;

  const reportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; background: #fff; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
        .title { color: #f59e0b; font-size: 28px; font-weight: 800; margin: 0; }
        .server-info { font-style: italic; color: #666; font-size: 14px; }
        .card { border: 1px solid #eee; padding: 20px; border-radius: 12px; background: #fafafa; }
        .card-title { font-size: 10px; font-weight: 900; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .val-big { font-size: 32px; font-weight: 800; color: #111; }
        .stats-row { display: flex; justify-content: space-between; margin-top: 10px; font-size: 12px; color: #666; }
        .anomaly-card { border-left: 4px solid #ef4444; background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
        .diag-card { border-left: 4px solid #3b82f6; background: #eff6ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; font-weight: 600; color: #1e40af; }
        .footer { margin-top: 50px; text-align: center; color: #aaa; font-size: 10px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">${t.reportTitle}</h1>
          <div class="server-info">${server.alias || server.name} (${server.host})</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: bold; font-size: 12px;">${new Date().toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</div>
          <div style="font-size: 10px; color: #999;">${t.duration}: ~${stats.counts * 3} ${t.seconds}</div>
        </div>
      </div>

      <div class="diag-card">${diagText}</div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div class="card">
          <div class="card-title">${t.avgCpu}</div>
          <div class="val-big">%${stats.cpu.avg}</div>
          <div class="stats-row text-sm"><span>Peak: %${stats.cpu.max}</span> <span>Min: %${stats.cpu.min}</span></div>
        </div>
        <div class="card">
          <div class="card-title">${t.avgRam}</div>
          <div class="val-big">%${stats.ram.avg}</div>
          <div class="stats-row"><span>Peak: %${stats.ram.max}</span> <span>Min: %${stats.ram.min}</span></div>
        </div>
        <div class="card">
          <div class="card-title">${t.avgDisk}</div>
          <div class="val-big">${stats.disk.avg} MB/s</div>
          <div class="stats-row"><span>Max: ${stats.disk.max} MB/s</span></div>
        </div>
        <div class="card">
          <div class="card-title">${t.avgNet}</div>
          <div class="val-big">${stats.net.avg} KB/s</div>
          <div class="stats-row"><span>Max: ${stats.net.max} KB/s</span></div>
        </div>
      </div>

      <h2 style="font-size: 14px; text-transform: uppercase; color: #666; margin-bottom: 15px;">${t.observations}</h2>
      ${stats.anomalies.length > 0 ? stats.anomalies.slice(0, 10).map(a => `
        <div class="anomaly-card">
          <div style="font-weight: bold; color: #b91c1c;">${a.type} ${t.detected}</div>
          <div style="font-size: 12px; color: #444;">${t.valLabel}: ${a.val} | ${t.timeLabel}: ${a.time}</div>
          ${a.procs && a.procs.length > 0 ? `
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dotted #fecaca;">
              <div style="font-size: 9px; font-weight: bold; color: #991b1b; text-transform: uppercase; margin-bottom: 5px;">${t.suspectedProcesses}:</div>
              ${a.procs.map(p => `
                <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                  <span style="color: #1f2937;">${p.Name}</span>
                  <span style="font-weight: bold; color: #b91c1c;">%${p.CPU}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `).join('') : `<div style="color: #059669; font-weight: bold;">${t.stable}</div>`}

      <div class="footer">
        ${t.footer}<br/>
        &copy; 2026 Vesgen Performance Systems
      </div>
    </body>
    </html>
  `;

  const fileName = `Vesgen_Report_${serverId}_${new Date().getTime()}.pdf`;
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: t.saveTitle,
    defaultPath: path.join(app.getPath('downloads'), fileName),
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (!filePath) return { success: false, message: t.cancel };

  const workerWindow = new BrowserWindow({ show: false });
  await workerWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(reportHtml)}`);

  try {
    const pdfData = await workerWindow.webContents.printToPDF({
      printBackground: true,
      marginsType: 1,
      pageSize: 'A4'
    });

    const fsSync = require("fs");
    fsSync.writeFileSync(filePath, pdfData);
    workerWindow.destroy();

    shell.openPath(filePath);

    return { success: true, path: filePath };
  } catch (err) {
    workerWindow.destroy();
    return { success: false, message: "PDF oluşturma hatası: " + err.message };
  }
});

ipcMain.handle("monitoring:updateInterval", (event, serverId, intervalMs) => {
  MonitoringService.updateInterval(serverId, intervalMs);
  return { success: true };
});

ipcMain.handle("monitoring:refresh", () => {
  MonitoringService.refreshAll();
  return { success: true };
});
