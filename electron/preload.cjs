const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shopStorage", {
  getData: () => ipcRenderer.invoke("shop:getData"),
  saveData: (data) => ipcRenderer.invoke("shop:saveData", data),
});
