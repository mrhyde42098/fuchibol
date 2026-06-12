const fs = require('fs');
const path = require('path');

function isProjectRoot(dir) {
  return (
    fs.existsSync(path.join(dir, 'backend', 'package.json')) &&
    fs.existsSync(path.join(dir, 'frontend', 'package.json'))
  );
}

function findUpward(startDir, maxDepth = 8) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < maxDepth; i++) {
    if (isProjectRoot(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function getExeDirectory() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return path.resolve(process.env.PORTABLE_EXECUTABLE_DIR);
  }
  if (process.env.PORTABLE_EXECUTABLE_FILE) {
    return path.dirname(path.resolve(process.env.PORTABLE_EXECUTABLE_FILE));
  }
  return path.dirname(process.execPath);
}

function resolveProjectRoot(isPackaged, devRoot) {
  const candidates = [];
  if (isPackaged) {
    candidates.push(getExeDirectory());
    candidates.push(process.cwd());
    candidates.push(path.dirname(process.execPath));
  } else {
    candidates.push(devRoot);
    candidates.push(process.cwd());
  }

  const seen = new Set();
  for (const start of candidates) {
    if (!start || seen.has(start)) continue;
    seen.add(start);
    const found = findUpward(start);
    if (found) return found;
  }

  return isPackaged ? getExeDirectory() : devRoot;
}

function getProjectError(root) {
  if (isProjectRoot(root)) return null;
  const backend = path.join(root, 'backend', 'package.json');
  if (!fs.existsSync(backend)) {
    return `No encuentro la carpeta del proyecto en:\n${root}\n\nColoca Fuchibol.exe dentro de la carpeta Fuchibol (junto a backend/ y frontend/).`;
  }
  return `Falta frontend/package.json en ${root}`;
}

module.exports = { resolveProjectRoot, isProjectRoot, getProjectError, getExeDirectory };
