const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { isProjectRoot, getProjectError } = require('./project-root.cjs');

const BUNDLED_ENV = path.join(__dirname, 'default.env.example');

function paths(root) {
  return {
    root,
    backend: path.join(root, 'backend'),
    frontendDist: path.join(root, 'frontend', 'dist', 'index.html'),
    backendDist: path.join(root, 'backend', 'dist', 'index.js'),
    envFile: path.join(root, 'backend', '.env'),
    envExample: path.join(root, 'backend', '.env.example'),
    logsDir: path.join(root, 'logs'),
    pidFile: path.join(root, 'logs', 'fuchibol-server.pid'),
    serverLog: path.join(root, 'logs', 'server.log'),
    serverErr: path.join(root, 'logs', 'server-error.log'),
    tunnelLog: path.join(root, 'logs', 'tunnel.log'),
    tunnelUrl: path.join(root, 'logs', 'tunnel.url'),
    cloudflared: path.join(root, 'tools', 'cloudflared.exe'),
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function randomSecret(len = 48) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function ensureEnv(p) {
  const err = getProjectError(p.root);
  if (err) throw new Error(err);

  if (!fs.existsSync(p.envFile)) {
    if (fs.existsSync(p.envExample)) fs.copyFileSync(p.envExample, p.envFile);
    else if (fs.existsSync(BUNDLED_ENV)) fs.copyFileSync(BUNDLED_ENV, p.envFile);
    else throw new Error('No se pudo crear backend/.env');
  }
  let text = fs.readFileSync(p.envFile, 'utf8');
  const set = (key, value) => {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) text = text.replace(re, `${key}=${value}`);
    else text += `\n${key}=${value}`;
  };
  const secretMatch = text.match(/^TOKEN_SECRET=(.+)$/m);
  const secret = secretMatch?.[1]?.trim() || '';
  if (!secret || secret.length < 32 || secret.includes('change-me')) {
    set('TOKEN_SECRET', randomSecret());
  }
  set('NODE_ENV', 'production');
  set('SERVE_FRONTEND', 'true');
  set('IPTV_MIRROR_ENABLED', 'true');
  set('THESPORTSDB_ENABLED', 'true');
  set('THESPORTSDB_MINIMAL_MODE', 'true');
  set('ESPN_AGENDA_ENABLED', 'true');
  set('FUTBOL_LIBRE_ENABLED', 'true');
  set('STREAM_AUDIT_ENABLED', 'true');
  fs.writeFileSync(p.envFile, text, 'utf8');
}

function needsBuild(p) {
  return !fs.existsSync(p.backendDist) || !fs.existsSync(p.frontendDist);
}

function runCommand(cmd, args, cwd, onLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, shell: true, windowsHide: true });
    child.stdout.on('data', (d) => onLine?.(d.toString()));
    child.stderr.on('data', (d) => onLine?.(d.toString()));
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Comando falló (${code}): ${cmd}`))));
    child.on('error', reject);
  });
}

async function runBuild(root, onLine) {
  const p = paths(root);
  onLine?.('Compilando backend...\n');
  await runCommand('npm', ['run', 'build', '--prefix', 'backend'], root, onLine);
  onLine?.('Compilando frontend...\n');
  await runCommand('npm', ['run', 'build', '--prefix', 'frontend'], root, onLine);
  onLine?.('Compilación lista.\n');
}

function readPid(p) {
  if (!fs.existsSync(p.pidFile)) return null;
  const pid = Number(fs.readFileSync(p.pidFile, 'utf8').trim());
  return Number.isFinite(pid) ? pid : null;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', windowsHide: true });
    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const pid = Number(line.trim().split(/\s+/).pop());
      if (pid > 0) {
        try { process.kill(pid, 'SIGTERM'); } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
}

function stopServer(root) {
  const p = paths(root);
  const pid = readPid(p);
  if (pid && isProcessAlive(pid)) {
    try { process.kill(pid, 'SIGTERM'); } catch { /* ignore */ }
  }
  if (fs.existsSync(p.pidFile)) fs.unlinkSync(p.pidFile);
  killPort(4000);
  stopTunnel(root);
}

let tunnelChild = null;

function stopTunnel(root) {
  if (tunnelChild) {
    try { tunnelChild.kill(); } catch { /* ignore */ }
    tunnelChild = null;
  }
  try {
    execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore', windowsHide: true });
  } catch { /* ignore */ }
  const p = paths(root);
  if (fs.existsSync(p.tunnelUrl)) fs.unlinkSync(p.tunnelUrl);
}

function loadEnvFile(envPath) {
  const env = { ...process.env };
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

function startServer(root, publicBaseUrl) {
  const p = paths(root);
  ensureDir(p.logsDir);
  stopServer(root);

  const env = loadEnvFile(p.envFile);
  env.NODE_ENV = 'production';
  env.SERVE_FRONTEND = 'true';
  env.PUBLIC_BASE_URL = publicBaseUrl;
  env.PORT = '4000';
  env.IPTV_MIRROR_ENABLED = 'true';
  env.THESPORTSDB_ENABLED = 'true';
  env.ESPN_AGENDA_ENABLED = 'true';
  env.FUTBOL_LIBRE_ENABLED = 'true';

  const out = fs.openSync(p.serverLog, 'a');
  const err = fs.openSync(p.serverErr, 'a');
  const child = spawn('node', ['dist/index.js'], {
    cwd: p.backend,
    detached: true,
    stdio: ['ignore', out, err],
    env,
    windowsHide: true,
  });
  child.unref();
  fs.writeFileSync(p.pidFile, String(child.pid));
  return child.pid;
}

function waitHealth(baseUrl, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get(`${baseUrl}/api/health`, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          if (body.includes('"ok"') || body.includes('"status":"ok"')) resolve(true);
          else if (Date.now() < deadline) setTimeout(tick, 1200);
          else resolve(false);
        });
      });
      req.on('error', () => {
        if (Date.now() < deadline) setTimeout(tick, 1200);
        else resolve(false);
      });
      req.setTimeout(5000, () => req.destroy());
    };
    tick();
  });
}

function tailFile(filePath, maxLines = 80) {
  if (!fs.existsSync(filePath)) return '';
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  return lines.slice(-maxLines).join('\n');
}

function getLogs(root) {
  const p = paths(root);
  const parts = [];
  if (fs.existsSync(p.serverErr)) {
    const err = tailFile(p.serverErr, 40);
    if (err.trim()) parts.push('--- Errores ---\n' + err);
  }
  if (fs.existsSync(p.serverLog)) {
    parts.push('--- Servidor ---\n' + tailFile(p.serverLog, 40));
  }
  if (fs.existsSync(p.tunnelLog)) {
    parts.push('--- Túnel ---\n' + tailFile(p.tunnelLog, 20));
  }
  return parts.join('\n\n') || 'Sin registros aún.';
}

async function ensureCloudflared(p) {
  if (fs.existsSync(p.cloudflared)) return p.cloudflared;
  ensureDir(path.dirname(p.cloudflared));
  const url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo descargar cloudflared');
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(p.cloudflared, buf);
  return p.cloudflared;
}

function startTunnel(root) {
  return new Promise(async (resolve, reject) => {
    const p = paths(root);
    stopTunnel(root);
    try {
      const cf = await ensureCloudflared(p);
      if (fs.existsSync(p.tunnelLog)) fs.unlinkSync(p.tunnelLog);
      const out = fs.openSync(p.tunnelLog, 'a');
      const err = fs.openSync(path.join(p.logsDir, 'tunnel-error.log'), 'a');
      tunnelChild = spawn(cf, ['tunnel', '--url', 'http://127.0.0.1:4000'], {
        detached: false,
        stdio: ['ignore', out, err],
        windowsHide: true,
      });

      const deadline = Date.now() + 60000;
      const poll = () => {
        if (!fs.existsSync(p.tunnelLog)) {
          if (Date.now() < deadline) return setTimeout(poll, 1500);
          return reject(new Error('Tiempo agotado esperando URL del túnel'));
        }
        const log = fs.readFileSync(p.tunnelLog, 'utf8');
        const m = log.match(/(https:\/\/[a-z0-9-]+\.trycloudflare\.com)/);
        if (m) {
          fs.writeFileSync(p.tunnelUrl, m[1]);
          return resolve(m[1]);
        }
        if (Date.now() < deadline) setTimeout(poll, 1500);
        else reject(new Error('No se encontró URL en tunnel.log'));
      };
      poll();
    } catch (e) {
      reject(e);
    }
  });
}

function getStatus(root) {
  const p = paths(root);
  const projectValid = isProjectRoot(root);
  const projectError = getProjectError(root);
  const pid = readPid(p);
  const running = pid ? isProcessAlive(pid) : false;
  const lan = getLanIp();
  const localUrl = 'http://localhost:4000';
  const lanUrl = lan !== '127.0.0.1' ? `http://${lan}:4000` : null;
  let tunnel = null;
  if (fs.existsSync(p.tunnelUrl)) tunnel = fs.readFileSync(p.tunnelUrl, 'utf8').trim();
  return {
    running,
    pid: running ? pid : null,
    projectValid,
    projectError,
    projectRoot: root,
    needsBuild: projectValid && needsBuild(p),
    localUrl,
    lanUrl,
    tunnelUrl: tunnel,
    nodeOk: (() => {
      try { execSync('node -v', { windowsHide: true }); return true; } catch { return false; }
    })(),
  };
}

async function repair(root, onLine) {
  const p = paths(root);
  onLine?.('Reparando configuración...\n');
  try {
    execSync('node -v', { windowsHide: true });
  } catch {
    throw new Error('Instala Node.js LTS desde https://nodejs.org');
  }
  ensureEnv(p);
  onLine?.('Verificando dependencias...\n');
  if (!fs.existsSync(path.join(p.backend, 'node_modules'))) {
    await runCommand('npm', ['install', '--prefix', 'backend'], root, onLine);
  }
  if (!fs.existsSync(path.join(root, 'frontend', 'node_modules'))) {
    await runCommand('npm', ['install', '--prefix', 'frontend'], root, onLine);
  }
  await runBuild(root, onLine);
  onLine?.('Reparación completada.\n');
}

module.exports = {
  paths,
  ensureEnv,
  needsBuild,
  runBuild,
  stopServer,
  startServer,
  waitHealth,
  getLogs,
  startTunnel,
  stopTunnel,
  getStatus,
  repair,
  getLanIp,
};
