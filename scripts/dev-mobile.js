#!/usr/bin/env node

const fs = require('fs');
const net = require('net');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const frontendEnvPath = path.join(frontendDir, '.env');

let backendProc;
let tunnelProc;
let expoProc;
let shuttingDown = false;
let expoStarting = false;
let expoStarted = false;
let backendUrlReady = false;

const killProc = (proc) => {
  if (!proc || proc.killed) return;
  try {
    proc.kill('SIGTERM');
  } catch {
    // no-op
  }
};

const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  killProc(expoProc);
  killProc(tunnelProc);
  killProc(backendProc);
  setTimeout(() => process.exit(code), 500);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.stdin.on('error', (err) => {
  if (err && err.code !== 'EIO') {
    console.error(`[dev-mobile] stdin error: ${err.message}`);
  }
});

const writeFrontendEnv = (publicUrl) => {
  const clean = publicUrl.trim().replace(/\/+$/, '');
  const content = [
    `EXPO_PUBLIC_API_URL=${clean}/api`,
    `EXPO_PUBLIC_SOCKET_URL=${clean}`,
    '',
  ].join('\n');
  fs.writeFileSync(frontendEnvPath, content, 'utf8');
  console.log(`[dev-mobile] Wrote frontend env using ${clean}`);
};

const isPortInUse = (port, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(700);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
    socket.connect(port, host);
  });

const findFreePort = async (startPort) => {
  let port = startPort;
  for (let i = 0; i < 50; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const inUse = await isPortInUse(port);
    if (!inUse) return port;
    port += 1;
  }
  throw new Error('No free Expo port found in expected range');
};

const startExpo = (mode = 'tunnel') => {
  if (expoProc || expoStarting) return Promise.resolve();
  expoStarting = true;
  return findFreePort(8081).then((expoPort) => {
    const modeArg = mode === 'lan' ? '--lan' : '--tunnel';
    const args = ['expo', 'start', modeArg, '--port', String(expoPort)];
    if (!expoStarted) args.splice(3, 0, '-c');
    console.log(`[dev-mobile] Starting Expo with ${mode} on port ${expoPort}...`);
    expoProc = spawn('npx', args, {
      cwd: frontendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    const rlOut = readline.createInterface({ input: expoProc.stdout });
    const rlErr = readline.createInterface({ input: expoProc.stderr });
    const logExpo = (line, stream = 'out') => {
      const prefix = stream === 'err' ? '[expo:err]' : '[expo]';
      console.log(`${prefix} ${line}`);
    };
    rlOut.on('line', (line) => logExpo(line, 'out'));
    rlErr.on('line', (line) => logExpo(line, 'err'));

    expoProc.on('exit', (code) => {
      const exitCode = code ?? 0;
      expoProc = undefined;
      expoStarting = false;
      expoStarted = true;
      console.log(`[dev-mobile] Expo (${mode}) exited with code ${exitCode}`);

      // Auto-fallback once when ngrok tunnel mode fails.
      if (mode === 'tunnel' && exitCode !== 0) {
        console.log('[dev-mobile] Expo tunnel failed, falling back to LAN mode...');
        startExpo('lan').catch((err) => {
          console.error(`[dev-mobile] ${err.message}`);
          shutdown(1);
        });
        return;
      }

      shutdown(exitCode);
    });
  });
};

const startTunnel = () => {
  console.log('[dev-mobile] Starting backend tunnel with localhost.run...');
  tunnelProc = spawn('ssh', [
    '-o',
    'StrictHostKeyChecking=no',
    '-o',
    'ServerAliveInterval=30',
    '-R',
    '80:localhost:5000',
    'nokey@localhost.run',
  ], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  const rlOut = readline.createInterface({ input: tunnelProc.stdout });
  const rlErr = readline.createInterface({ input: tunnelProc.stderr });

  const handleLine = (line, stream = 'out') => {
    const prefix = stream === 'err' ? '[tunnel:err]' : '[tunnel]';
    console.log(`${prefix} ${line}`);
    // Example line:
    // "xxxx.lhr.life tunneled with tls termination, https://xxxx.lhr.life"
    if (!line.includes('tunneled with tls termination')) return;
    const match = line.match(/https:\/\/[a-z0-9.-]+/i);
    if (!match) return;
    if (backendUrlReady) return;
    backendUrlReady = true;
    writeFrontendEnv(match[0]);
    startExpo('tunnel').catch((err) => {
      console.error(`[dev-mobile] ${err.message}`);
      shutdown(1);
    });
  };

  rlOut.on('line', (line) => handleLine(line, 'out'));
  rlErr.on('line', (line) => handleLine(line, 'err'));

  tunnelProc.on('exit', (code) => {
    console.log(`[dev-mobile] Tunnel exited with code ${code ?? 0}`);
    shutdown(code ?? 1);
  });
};

const startBackend = () => {
  return isPortInUse(5000).then((inUse) => {
    if (inUse) {
      console.log('[dev-mobile] Backend already running on port 5000. Reusing existing process.');
      return;
    }

    console.log('[dev-mobile] Starting backend...');
    backendProc = spawn('npm', ['run', 'dev'], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: true,
    });

    backendProc.on('exit', (code) => {
      console.log(`[dev-mobile] Backend exited with code ${code ?? 0}`);
      shutdown(code ?? 1);
    });
  });
};

const ensureDirs = () => {
  if (!fs.existsSync(backendDir)) throw new Error('backend directory missing');
  if (!fs.existsSync(frontendDir)) throw new Error('frontend directory missing');
};

try {
  ensureDirs();
  startBackend()
    .then(() => setTimeout(startTunnel, 2500))
    .catch((err) => {
      console.error(`[dev-mobile] ${err.message}`);
      process.exit(1);
    });
} catch (err) {
  console.error(`[dev-mobile] ${err.message}`);
  process.exit(1);
}
