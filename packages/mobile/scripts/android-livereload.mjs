import os from 'os';
import net from 'net';
import { spawn } from 'child_process';

const DEV_PORT = 3000;

function isPrivateIpv4(ip) {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  const [a, b] = ip.split('.').map((n) => Number(n));
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function getLanIpv4() {
  const interfaces = os.networkInterfaces();
  /** @type {string[]} */
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const info of interfaces[name] ?? []) {
      if (!info) continue;
      if (info.family !== 'IPv4') continue;
      if (info.internal) continue;
      if (info.address.startsWith('169.254.')) continue; // link-local
      candidates.push(info.address);
    }
  }

  if (candidates.length === 0) return null;
  const privateIp = candidates.find(isPrivateIpv4);
  return privateIp ?? candidates[0];
}

function pnpmCmd() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function spawnInherit(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function waitForPort(host, port, timeoutMs = 30_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.createConnection({ host, port });
      socket.once('connect', () => {
        socket.end();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`));
        } else {
          setTimeout(tryOnce, 300);
        }
      });
    };
    tryOnce();
  });
}

const lanIp = getLanIpv4();
if (!lanIp) {
  console.error('Could not detect a LAN IPv4 address. Are you connected to a network?');
  process.exit(1);
}

const CAP_SERVER_URL = `http://${lanIp}:${DEV_PORT}`;
const env = { ...process.env, CAP_SERVER_URL };

console.log(`CAP_SERVER_URL=${CAP_SERVER_URL}`);

// 1) Start Vite dev server (keeps running).
const devServer = spawn(pnpmCmd(), ['run', 'dev'], { stdio: 'inherit', shell: true, env });
devServer.on('exit', (code) => {
  if (typeof code === 'number' && code !== 0) process.exit(code);
});

// 2) Wait until the dev server is reachable on LAN IP, then sync + run Android with live reload.
(async () => {
  try {
    await waitForPort(lanIp, DEV_PORT, 45_000);
    await spawnInherit(pnpmCmd(), ['run', 'cap:sync:android'], env);
    await spawnInherit(pnpmCmd(), ['run', 'cap', '--', 'run', 'android', '--live-reload', '--external'], env);
  } catch (err) {
    console.error(err?.message ?? err);
    devServer.kill();
    process.exit(1);
  }
})();
