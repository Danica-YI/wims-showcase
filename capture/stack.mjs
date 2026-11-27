// Runs the real WIMS app locally: in-memory MongoDB, Express backend, Vite frontend.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const WIMS_REPO = 'https://github.com/Danica-YI/WareHouse-Inventory-Management-System.git';
export const API_PORT = 5001;
export const WEB_PORT = 5173;

/** Clone WIMS into dir (default .wims/) and install its dependencies if missing. */
export async function ensureWims(dir = path.join(ROOT, '.wims')) {
  if (!fs.existsSync(path.join(dir, 'backend', 'server.js'))) {
    execSync(`git clone --depth 1 ${WIMS_REPO} "${dir}"`, { stdio: 'inherit' });
  }
  for (const sub of ['backend', 'frontend']) {
    if (!fs.existsSync(path.join(dir, sub, 'node_modules'))) {
      execSync('npm ci --no-audit --no-fund', { cwd: path.join(dir, sub), stdio: 'inherit' });
    }
  }
  return dir;
}

function portFree(port) {
  return new Promise(resolve => {
    const s = net.createServer().once('error', () => resolve(false))
      .once('listening', () => s.close(() => resolve(true))).listen(port);
  });
}

async function waitFor(url, okStatuses, timeoutMs, label, logs) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (okStatuses.includes(r.status)) return r.status;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`${label} not ready at ${url} after ${timeoutMs} ms\n${logs.slice(-20).join('')}`);
}

function launch(args, opts, label, logs) {
  const p = spawn(process.execPath, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
  const keep = d => { logs.push(`[${label}] ${d}`); if (logs.length > 300) logs.shift(); };
  p.stdout.on('data', keep);
  p.stderr.on('data', keep);
  return p;
}

function killTree(p) {
  if (!p || p.exitCode !== null) return;
  if (process.platform === 'win32') {
    try { execSync(`taskkill /pid ${p.pid} /T /F`, { stdio: 'ignore' }); } catch { /* already gone */ }
  } else {
    p.kill('SIGTERM');
  }
}

/** Start MongoDB, the backend on API_PORT and the frontend on WEB_PORT. */
export async function startStack({ wimsDir } = {}) {
  for (const port of [API_PORT, WEB_PORT]) {
    if (!(await portFree(port))) throw new Error(`Port ${port} is in use; stop whatever is running there first.`);
  }
  const dir = await ensureWims(wimsDir);
  const mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri('wims');
  const logs = [];
  const apiUrl = `http://localhost:${API_PORT}/api`;
  const webUrl = `http://localhost:${WEB_PORT}`;
  const api = launch(['server.js'], {
    cwd: path.join(dir, 'backend'),
    env: { ...process.env, PORT: String(API_PORT), MONGO_URI: mongoUri, JWT_SECRET: 'showcase-local' },
  }, 'api', logs);
  const web = launch([path.join(dir, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'),
    '--port', String(WEB_PORT), '--strictPort'], {
    cwd: path.join(dir, 'frontend'),
    env: { ...process.env, VITE_API_URL: apiUrl },
  }, 'web', logs);
  const stop = async () => { killTree(web); killTree(api); await mongo.stop(); };
  try {
    await waitFor(`${apiUrl}/stocks`, [401], 60000, 'backend', logs);
    await waitFor(webUrl + '/', [200], 60000, 'frontend', logs);
  } catch (e) {
    await stop();
    throw e;
  }
  return { apiUrl, webUrl, mongoUri, stop, logs };
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--check')) {
  const s = await startStack();
  const api = (await fetch(`${s.apiUrl}/stocks`)).status;
  const web = (await fetch(s.webUrl + '/')).status;
  console.log(`api ${api}`);
  console.log(`web ${web}`);
  await s.stop();
  const freed = (await portFree(API_PORT)) && (await portFree(WEB_PORT));
  console.log(`ports freed ${freed}`);
  process.exit(api === 401 && web === 200 && freed ? 0 : 1);
}
