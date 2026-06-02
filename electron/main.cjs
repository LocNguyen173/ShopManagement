const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store").default;

const store = new Store({ name: "shop-data" });

const createWindow = () => {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.ico")
    : path.join(__dirname, "..", "public", "icon.ico");

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#080808",
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
};

ipcMain.handle("shop:getData", () => {
  return store.get("data", null);
});

ipcMain.handle("shop:saveData", (_event, data) => {
  store.set("data", data);
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
