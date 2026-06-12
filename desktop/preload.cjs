const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fuchibol', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  getLogs: () => ipcRenderer.invoke('get-logs'),
  startServer: () => ipcRenderer.invoke('start-server'),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  rebuild: () => ipcRenderer.invoke('rebuild'),
  repair: () => ipcRenderer.invoke('repair'),
  startTunnel: () => ipcRenderer.invoke('start-tunnel'),
  stopTunnel: () => ipcRenderer.invoke('stop-tunnel'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  openFolder: (sub) => ipcRenderer.invoke('open-folder', sub),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  onStatus: (cb) => ipcRenderer.on('status', (_, d) => cb(d)),
  onLog: (cb) => ipcRenderer.on('log', (_, d) => cb(d)),
});
