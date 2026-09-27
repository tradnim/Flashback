// Run from anywhere: node integration-infra/start.mjs
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { parseEnv } from 'node:util';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engine = resolve(root, 'backend/historical-engine');
const ai = resolve(root, 'backend/ai-voice');
const frontend = resolve(root, 'frontend');
const children = [];
let stopping = false;
const config = folder => ({ ...((existsSync(resolve(folder, '.env'))) ? parseEnv(readFileSync(resolve(folder, '.env'), 'utf8')) : {}), ...process.env });

async function cleanup(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children.reverse()) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    child.kill('SIGTERM');
  }
  await new Promise(resolve => setTimeout(resolve, 1200));
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => cleanup(0));

function launch(name, command, args, cwd, env) {
  if (stopping) throw new Error('Startup interrupted.');
  const child = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', () => { console.error(`${name} could not start. Check its runtime and dependencies.`); cleanup(1); });
  child.on('exit', code => { if (!stopping) { console.error(`${name} exited (${code}). Stopping services.`); cleanup(1); } });
}
async function available(port) {
  await new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once('error', () => reject(new Error(`Port ${port} is already in use. Stop that service before starting the stack.`)));
    socket.listen(port, '127.0.0.1', () => socket.close(resolve));
  });
}
async function waitFor(url) {
  for (let attempt = 0; attempt < 30 && !stopping; attempt++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1500) })).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Service did not become ready: ${url}`);
}

try {
  const engineEnv = config(engine), aiEnv = config(ai);
  if (!engineEnv.MONGO_URI?.trim()) throw new Error('Set MONGO_URI privately in backend/historical-engine/.env first.');
  if (engineEnv.PORT && engineEnv.PORT !== '3000') throw new Error('The local stack requires engine PORT=3000.');
  if (aiEnv.AI_VOICE_PORT && aiEnv.AI_VOICE_PORT !== '8000') throw new Error('The local stack requires AI_VOICE_PORT=8000.');
  for (const file of [resolve(engine, 'node_modules/mongoose/package.json'), resolve(frontend, 'node_modules/vite/bin/vite.js')]) {
    if (!existsSync(file)) throw new Error('Install the history engine and frontend dependencies first; see README.');
  }
  const venv = resolve(ai, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const python = process.env.PYTHON || (existsSync(venv) ? venv : 'python');
  const probe = spawnSync(python, ['-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { windowsHide: true, stdio: 'ignore' });
  if (probe.status !== 0) throw new Error('Python 3.10+ is required. Create the AI .venv or set PYTHON to its executable.');
  await Promise.all([3000, 8000, 5173].map(available));
  launch('History engine', process.execPath, ['src/src/models/src/routes/events.js'], engine, engineEnv);
  await waitFor('http://127.0.0.1:3000/ready');
  launch('AI/voice', python, ['-u', 'server.py'], ai, { ...aiEnv, AI_VOICE_HOST: '127.0.0.1', HISTORICAL_ENGINE_URL: 'http://127.0.0.1:3000' });
  await waitFor('http://127.0.0.1:8000/health');
  const readiness = await (await fetch('http://127.0.0.1:8000/ready', { signal: AbortSignal.timeout(10000) })).json();
  for (const [name, status] of Object.entries(readiness.providers || {})) if (!status.configured) console.warn(`${name} unavailable: ${status.missing.join(', ')}`);
  launch('Frontend', process.execPath, ['node_modules/vite/bin/vite.js'], frontend, { ...process.env, VITE_HISTORY_ENGINE_URL: 'http://127.0.0.1:3000', VITE_AI_VOICE_URL: 'http://127.0.0.1:8000' });
  await waitFor('http://127.0.0.1:5173');
  console.log('Flashback: http://127.0.0.1:5173 — Ctrl+C stops this command’s services. No automatic seeding.');
} catch (error) {
  console.error(error.message);
  await cleanup(1);
}
