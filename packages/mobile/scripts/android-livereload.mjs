import os from 'os';
import net from 'net';
import readline from 'readline';
import { execFile, spawn } from 'child_process';

const DEV_PORT = 3000;

function parseArgs(argv) {
  const args = argv.slice(2);
  /** @type {{ target?: string, verbose: boolean }} */
  const result = { verbose: false };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--verbose') result.verbose = true;
    if ((arg === '--target' || arg === '--device') && typeof args[i + 1] === 'string') {
      result.target = args[i + 1];
      i += 1;
    }
  }

  if (!result.target) {
    const envTarget =
      process.env.CAP_ANDROID_TARGET?.trim() ||
      process.env.ANDROID_TARGET?.trim() ||
      process.env.CAPACITOR_ANDROID_TARGET?.trim();
    if (envTarget) result.target = envTarget;
  }

  return result;
}

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

function quoteCmdArg(arg) {
  if (arg === '') return '""';
  if (!/[ \t"]/g.test(arg)) return arg;
  return `"${arg.replaceAll('"', '\\"')}"`;
}

function spawnPnpm(args, options) {
  if (process.platform !== 'win32') return spawn(pnpmCmd(), args, options);

  const command = `pnpm.cmd ${args.map(quoteCmdArg).join(' ')}`;
  return spawn('cmd.exe', ['/d', '/s', '/c', command], options);
}

function execFileAsync(command, args, options) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stdout, stderr }));
      else resolve({ stdout, stderr });
    });
  });
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

async function listAdbDevices() {
  try {
    const { stdout } = await execFileAsync('adb', ['devices', '-l'], {
      windowsHide: true,
      env: process.env,
    });

    return stdout
      .split(/\r?\n/g)
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('*'))
      .map((line) => {
        const [serial, state] = line.split(/\s+/g);
        return { serial, state };
      })
      .filter((d) => d.serial);
  } catch {
    return null;
  }
}

function promptDeviceIndex(devices) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q) => new Promise((resolve) => rl.question(q, resolve));

  return (async () => {
    console.log('\nMultiple Android devices detected:');
    devices.forEach((d, idx) => console.log(`  ${idx + 1}) ${d.serial} (${d.state})`));
    while (true) {
      const answer = String(await question('Select device number: ')).trim();
      const idx = Number(answer);
      if (Number.isInteger(idx) && idx >= 1 && idx <= devices.length) {
        rl.close();
        return idx - 1;
      }
      console.log(`Please enter a number between 1 and ${devices.length}.`);
    }
  })();
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

async function resolveAndroidTarget(explicitTarget) {
  if (explicitTarget) return explicitTarget;

  const devices = await listAdbDevices();
  if (!devices) return null;

  const online = devices.filter((d) => d.state === 'device');
  if (online.length === 0) {
    const states = devices.map((d) => `${d.serial} (${d.state})`).join(', ');
    console.error(`No online devices found via adb. Detected: ${states || 'none'}`);
    return null;
  }

  if (online.length === 1) return online[0].serial;

  const selectedIndex = await promptDeviceIndex(online);
  return online[selectedIndex]?.serial ?? null;
}

const lanIp = getLanIpv4();
if (!lanIp) {
  console.error('Could not detect a LAN IPv4 address. Are you connected to a network?');
  process.exit(1);
}

const { target: argTarget, verbose } = parseArgs(process.argv);

const CAP_SERVER_URL = `http://${lanIp}:${DEV_PORT}`;
const env = { ...process.env, CAP_SERVER_URL };

console.log(`CAP_SERVER_URL=${CAP_SERVER_URL}`);

/** @type {Set<import('child_process').ChildProcess>} */
const children = new Set();
let shuttingDown = false;

async function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform !== 'win32') return;
  try {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
      killer.on('exit', resolve);
      killer.on('error', resolve);
    });
  } catch {
    // ignore
  }
}

async function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of Array.from(children)) {
    if (child.pid) await killProcessTree(child.pid);
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));

function track(child) {
  children.add(child);
  child.on('exit', () => children.delete(child));
  child.on('error', () => children.delete(child));
  return child;
}

// 1) Start Vite dev server (keeps running). Keep logs quiet so interactive prompts remain usable.
console.log('Starting Vite dev server...');
const devServer = track(
  spawnPnpm(['run', 'dev'], {
    stdio: verbose ? 'inherit' : ['inherit', 'pipe', 'pipe'],
    shell: false,
    env,
  })
);
if (!verbose) {
  devServer.stdout?.on('data', () => {});
  devServer.stderr?.on('data', (buf) => process.stderr.write(buf));
}
devServer.on('exit', (code) => {
  if (!shuttingDown && typeof code === 'number' && code !== 0) shutdown(code);
});

// 2) Wait until the dev server is reachable on LAN IP, then sync + run Android with live reload.
(async () => {
  try {
    await waitForPort(lanIp, DEV_PORT, 45_000);
    console.log('Dev server reachable; syncing Capacitor...');

    const target = await resolveAndroidTarget(argTarget);
    if (target) console.log(`Using Android target: ${target}`);
    else
      console.log(
        'No Android target selected (adb missing or no devices detected). Capacitor may prompt to pick a device; pass `--target <serial>` or set `CAP_ANDROID_TARGET` to skip prompts.'
      );

    await spawnInherit(pnpmCmd(), ['run', 'cap:sync:android'], env);
    const capArgs = ['run', 'cap', '--', 'run', 'android', '--live-reload', '--external'];
    if (target) capArgs.push('--target', target);
    await spawnInherit(pnpmCmd(), capArgs, env);
  } catch (err) {
    console.error(err?.message ?? err);
    await shutdown(1);
  }
})();
