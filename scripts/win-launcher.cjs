/**
 * Lanzador Windows para Fuchibol.exe (generado con scripts/build-fuchibol-exe.ps1)
 * También ejecutable con: node scripts/win-launcher.cjs
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = process.pkg
  ? path.dirname(process.execPath)
  : path.resolve(__dirname, '..');

const PORT = 4000;
const PID_FILE = path.join(ROOT, 'logs', 'fuchibol-server.pid');
const LOG_DIR = path.join(ROOT, 'logs');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getLanIp() {
  try {
    const out = execSync(
      'powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch \'^127\\.\' -and $_.IPAddress -notmatch \'^169\\.254\\.\' } | Select-Object -First 1).IPAddress"',
      { encoding: 'utf8', windowsHide: true },
    ).trim();
    return out || '127.0.0.1';
  } catch {
    return '127.0.0.1';
  }
}

function stopServer() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim());
      if (pid) {
        try { process.kill(pid, 'SIGTERM'); } catch { /* ignore */ }
      }
      fs.unlinkSync(PID_FILE);
    }
  } catch { /* ignore */ }
  try {
    const lines = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8', windowsHide: true }).split('\n');
    for (const line of lines) {
      if (!line.includes('LISTENING')) continue;
      const pid = Number(line.trim().split(/\s+/).pop());
      if (pid > 0) {
        try { process.kill(pid, 'SIGTERM'); } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

function needsBuild() {
  return (
    !fs.existsSync(path.join(ROOT, 'backend', 'dist', 'index.js')) ||
    !fs.existsSync(path.join(ROOT, 'frontend', 'dist', 'index.html'))
  );
}

function runBuild() {
  log('Compilando Fuchibol (primera vez)...');
  execSync('npm run build --prefix backend', { cwd: ROOT, stdio: 'inherit', windowsHide: true });
  execSync('npm run build --prefix frontend', { cwd: ROOT, stdio: 'inherit', windowsHide: true });
}

function waitHealth(baseUrl, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get(`${baseUrl}/api/health`, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          if (body.includes('"ok"') || body.includes('"status":"ok"')) resolve(true);
          else if (Date.now() < deadline) setTimeout(tick, 1000);
          else resolve(false);
        });
      });
      req.on('error', () => {
        if (Date.now() < deadline) setTimeout(tick, 1000);
        else resolve(false);
      });
      req.setTimeout(4000, () => req.destroy());
    };
    tick();
  });
}

function openBrowser(url) {
  try {
    execSync(`start "" "${url}"`, { cwd: ROOT, windowsHide: true });
  } catch { /* ignore */ }
}

async function main() {
  const arg = process.argv[2];
  if (arg === '--stop') {
    stopServer();
    log('Fuchibol detenido.');
    return;
  }

  ensureDir(LOG_DIR);
  stopServer();

  if (needsBuild()) runBuild();

  const lan = getLanIp();
  const localUrl = `http://localhost:${PORT}`;
  const publicBase = lan !== '127.0.0.1' ? `http://${lan}:${PORT}` : localUrl;

  const serverLog = path.join(LOG_DIR, 'server.log');
  const out = fs.openSync(serverLog, 'a');
  const child = spawn('node', ['dist/index.js'], {
    cwd: path.join(ROOT, 'backend'),
    detached: true,
    stdio: ['ignore', out, out],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      SERVE_FRONTEND: 'true',
      PUBLIC_BASE_URL: publicBase,
      PORT: String(PORT),
      IPTV_MIRROR_ENABLED: 'true',
      THESPORTSDB_ENABLED: 'true',
      ESPN_AGENDA_ENABLED: 'true',
      FUTBOL_LIBRE_ENABLED: 'true',
      TOKEN_SECRET: process.env.TOKEN_SECRET || 'fuchibol-home-local-secret-min-32-chars!!',
    },
    windowsHide: true,
  });
  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid));

  log('Iniciando Fuchibol...');
  const ok = await waitHealth(localUrl);
  if (!ok) {
    log(`Error: el servidor no respondió. Revisa ${serverLog}`);
    process.exit(1);
  }

  log(`Listo: ${localUrl}`);
  if (lan !== '127.0.0.1') log(`Celular (WiFi): http://${lan}:${PORT}`);
  openBrowser(localUrl);
}

main().catch((err) => {
  log(`Error: ${err.message}`);
  process.exit(1);
});
