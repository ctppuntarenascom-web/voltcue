const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("voltcue", {
  getState: () => ipcRenderer.invoke("get-state"),
  regeneratePin: () => ipcRenderer.invoke("regenerate-pin"),
  cancelShutdown: () => ipcRenderer.invoke("cancel-shutdown"),
  openMobileUrl: () => ipcRenderer.invoke("open-mobile-url"),
  setDeviceName: (name) => ipcRenderer.invoke("set-device-name", name),
  setAutoStart: (enabled) => ipcRenderer.invoke("set-auto-start", enabled),
  connectCloud: (options) => ipcRenderer.invoke("connect-cloud", options),
  revokeDevice: (id) => ipcRenderer.invoke("revoke-device", id),
  hideWindow: () => ipcRenderer.invoke("hide-window"),
  onState: (callback) => ipcRenderer.on("state", (_event, state) => callback(state)),
});
