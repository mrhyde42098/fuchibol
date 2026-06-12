const $ = (id) => document.getElementById(id);
let state = {};

function toast(msg, isError = false) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden', 'error');
  if (isError) el.classList.add('error');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 3500);
}

function setBusy(busy) {
  const ok = state.projectValid !== false;
  $('btn-start').disabled = busy || state.running || !ok;
  $('btn-stop').disabled = busy || !state.running;
  $('btn-repair').disabled = busy || !ok;
  $('btn-rebuild').disabled = busy || !ok;
  $('btn-tunnel').disabled = busy || !state.running || !ok;
}

function applyStatus(s) {
  state = s;
  const pill = $('status-pill');
  if (!s.projectValid) {
    pill.textContent = 'Sin proyecto';
    pill.className = 'pill pill-warn';
    if (s.projectError) $('logs').textContent = s.projectError;
  } else if (!s.nodeOk) {
    pill.textContent = 'Sin Node.js';
    pill.className = 'pill pill-warn';
  } else if (s.running) {
    pill.textContent = 'En línea';
    pill.className = 'pill pill-on';
  } else if (s.needsBuild) {
    pill.textContent = 'Sin compilar';
    pill.className = 'pill pill-warn';
  } else {
    pill.textContent = 'Detenido';
    pill.className = 'pill pill-off';
  }

  $('url-local').textContent = s.localUrl;
  if (s.lanUrl) {
    $('row-lan').classList.remove('hidden');
    $('url-lan').textContent = s.lanUrl;
  } else {
    $('row-lan').classList.add('hidden');
  }
  if (s.tunnelUrl) {
    $('row-tunnel').classList.remove('hidden');
    $('url-tunnel').textContent = s.tunnelUrl;
  } else {
    $('row-tunnel').classList.add('hidden');
  }

  setBusy(false);
}

async function refreshLogs() {
  const text = await window.fuchibol.getLogs();
  $('logs').textContent = text;
  $('logs').scrollTop = $('logs').scrollHeight;
}

$('btn-start').onclick = async () => {
  setBusy(true);
  $('status-pill').textContent = 'Iniciando...';
  $('status-pill').className = 'pill pill-warn';
  const r = await window.fuchibol.startServer();
  if (r.ok) {
    toast('Servidor listo');
    window.fuchibol.openUrl(r.localUrl);
  } else {
    toast(r.error || 'Error al iniciar', true);
  }
  await refreshLogs();
};

$('btn-stop').onclick = async () => {
  setBusy(true);
  await window.fuchibol.stopServer();
  toast('Servidor detenido');
  await refreshLogs();
};

$('btn-repair').onclick = async () => {
  setBusy(true);
  $('logs').textContent = 'Reparando...\n';
  const r = await window.fuchibol.repair();
  toast(r.ok ? 'Reparación OK' : (r.error || 'Falló'), !r.ok);
  await refreshLogs();
};

$('btn-rebuild').onclick = async () => {
  setBusy(true);
  $('logs').textContent = 'Compilando...\n';
  const r = await window.fuchibol.rebuild();
  toast(r.ok ? 'Compilado' : (r.error || 'Falló'), !r.ok);
  await refreshLogs();
};

$('btn-tunnel').onclick = async () => {
  setBusy(true);
  $('status-pill').textContent = 'Túnel...';
  const r = await window.fuchibol.startTunnel();
  toast(r.ok ? `Internet: ${r.tunnelUrl}` : (r.error || 'Falló túnel'), !r.ok);
  await refreshLogs();
};

$('btn-logs-folder').onclick = () => window.fuchibol.openFolder('logs');
$('btn-refresh-logs').onclick = refreshLogs;

document.querySelectorAll('[data-open]').forEach((btn) => {
  btn.onclick = () => {
    const k = btn.dataset.open;
    const url = k === 'local' ? state.localUrl : k === 'lan' ? state.lanUrl : state.tunnelUrl;
    if (url) window.fuchibol.openUrl(url);
  };
});

window.fuchibol.onStatus(applyStatus);
window.fuchibol.onLog((t) => {
  $('logs').textContent += t;
  $('logs').scrollTop = $('logs').scrollHeight;
});

(async () => {
  applyStatus(await window.fuchibol.getStatus());
  await refreshLogs();
})();
