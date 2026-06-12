const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const sm = require('./server-manager.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');

const PORT = 4000;
let mainWindow = null;
let tray = null;
let pollTimer = null;

function getProjectRoot() {
  return resolveProjectRoot(app.isPackaged, path.resolve(__dirname, '..'));
}

function send(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function broadcastStatus() {
  const root = getProjectRoot();
  send('status', sm.getStatus(root));
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(broadcastStatus, 3000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 640,
    minWidth: 440,
    minHeight: 520,
    title: 'Fuchibol',
    backgroundColor: '#0a1128',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==') : icon);
  tray.setToolTip('Fuchibol');
  const menu = Menu.buildFromTemplate([
    { label: 'Abrir panel', click: () => { mainWindow?.show(); } },
    { label: 'Abrir web', click: () => shell.openExternal('http://localhost:4000') },
    { type: 'separator' },
    { label: 'Salir', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => mainWindow?.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startPolling();
  broadcastStatus();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
  mainWindow?.hide();
});

app.on('before-quit', () => {
  if (pollTimer) clearInterval(pollTimer);
});

ipcMain.handle('get-status', () => sm.getStatus(getProjectRoot()));

ipcMain.handle('get-logs', () => sm.getLogs(getProjectRoot()));

ipcMain.handle('start-server', async () => {
  const root = getProjectRoot();
  try {
    sm.ensureEnv(root);
    if (sm.needsBuild(sm.paths(root))) {
      send('log', 'Primera vez: compilando proyecto...\n');
      await sm.runBuild(root, (t) => send('log', t));
    }
    const lan = sm.getLanIp();
    const base = lan !== '127.0.0.1' ? `http://${lan}:${PORT}` : `http://localhost:${PORT}`;
    const pid = sm.startServer(root, base);
    send('log', `Servidor iniciado (PID ${pid})\n`);
    const ok = await sm.waitHealth(`http://localhost:${PORT}`);
    if (!ok) {
      const logs = sm.getLogs(root);
      throw new Error('El servidor no respondió. Revisa los logs.\n' + logs.slice(-500));
    }
    broadcastStatus();
    return { ok: true, ...sm.getStatus(root) };
  } catch (err) {
    send('log', `Error: ${err.message}\n`);
    broadcastStatus();
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('stop-server', () => {
  sm.stopServer(getProjectRoot());
  broadcastStatus();
  return { ok: true };
});

ipcMain.handle('rebuild', async () => {
  const root = getProjectRoot();
  try {
    await sm.runBuild(root, (t) => send('log', t));
    broadcastStatus();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('repair', async () => {
  const root = getProjectRoot();
  try {
    await sm.repair(root, (t) => send('log', t));
    broadcastStatus();
    return { ok: true };
  } catch (err) {
    send('log', `Error reparación: ${err.message}\n`);
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('start-tunnel', async () => {
  const root = getProjectRoot();
  const status = sm.getStatus(root);
  if (!status.running) {
    return { ok: false, error: 'Primero inicia el servidor local.' };
  }
  try {
    const url = await sm.startTunnel(root);
    sm.stopServer(root);
    sm.startServer(root, url);
    await sm.waitHealth('http://localhost:4000');
    broadcastStatus();
    return { ok: true, tunnelUrl: url };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('stop-tunnel', () => {
  sm.stopTunnel(getProjectRoot());
  broadcastStatus();
  return { ok: true };
});

ipcMain.handle('open-url', (_, url) => {
  if (url) shell.openExternal(url);
});

ipcMain.handle('open-folder', (_, sub) => {
  const root = getProjectRoot();
  const target = sub === 'logs' ? path.join(root, 'logs') : root;
  shell.openPath(target);
});
