const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const sm = require('./server-manager.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');

const PORT = 4000;
let mainWindow = null;
let tray = null;
let pollTimer = null;
let isQuitting = false;
let lastStatus = {};

function getProjectRoot() {
  return resolveProjectRoot(app.isPackaged, path.resolve(__dirname, '..'));
}

function getTrayIcon() {
  const iconPath = path.join(__dirname, 'icon.png');
  if (fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
  }
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMElEQVQ4T2NkYGD4z0ABYBzVMKoBBg2MwwwM/5nQaBiGUTUAAJxFBAv0n8x8AAAAAElFTkSuQmCC',
  );
}

function send(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function updateTray(status) {
  if (!tray) return;
  lastStatus = status;
  const line = status.running ? 'Servidor en línea' : 'Servidor detenido';
  tray.setToolTip(`Fuchibol — ${line}`);
}

function hideToTray(notify = true) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.hide();
  if (notify && tray && process.platform === 'win32') {
    try {
      tray.displayBalloon({
        title: 'Fuchibol',
        content: 'Sigue en segundo plano. Clic derecho en el icono de la bandeja para abrir.',
      });
    } catch { /* ignore */ }
  }
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  mainWindow.show();
  mainWindow.focus();
}

function buildTrayMenu() {
  const running = lastStatus.running;
  return Menu.buildFromTemplate([
    { label: 'Abrir panel', click: () => showWindow() },
    { label: 'Abrir web', click: () => shell.openExternal('http://localhost:4000'), enabled: running },
    { type: 'separator' },
    {
      label: 'Detener servidor',
      enabled: running,
      click: () => {
        sm.stopServer(getProjectRoot());
        broadcastStatus();
      },
    },
    { type: 'separator' },
    {
      label: 'Salir de Fuchibol',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

function broadcastStatus() {
  const root = getProjectRoot();
  const status = sm.getStatus(root);
  updateTray(status);
  if (tray) tray.setContextMenu(buildTrayMenu());
  send('status', status);
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(broadcastStatus, 3000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 660,
    minWidth: 440,
    minHeight: 540,
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

  mainWindow.on('minimize', () => hideToTray(false));

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      hideToTray(true);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  tray = new Tray(getTrayIcon());
  tray.setToolTip('Fuchibol');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => showWindow());
  tray.on('double-click', () => showWindow());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startPolling();
  broadcastStatus();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
  hideToTray(false);
});

app.on('before-quit', () => {
  isQuitting = true;
  if (pollTimer) clearInterval(pollTimer);
});

ipcMain.handle('minimize-to-tray', () => {
  hideToTray(true);
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
