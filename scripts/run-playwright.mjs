import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';

const LOCAL_BASE_URL = 'http://127.0.0.1:5173';
const testArgs = process.argv.slice(2);
const explicitBaseUrl = process.env.BASE_URL;
const baseURL = explicitBaseUrl || LOCAL_BASE_URL;
let serverProcess = null;

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function canReach(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(url)) {
      return;
    }

    await delay(300);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function stopServer() {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  serverProcess.kill('SIGTERM');
  await Promise.race([once(serverProcess, 'exit'), delay(1_200)]);

  if (!serverProcess.killed) {
    serverProcess.kill('SIGKILL');
  }
}

async function startLocalServerIfNeeded() {
  if (explicitBaseUrl) {
    return;
  }

  if (await canReach(LOCAL_BASE_URL)) {
    return;
  }

  const viteBin = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
  serverProcess = spawn(
    process.execPath,
    [viteBin, '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
    {
      stdio: ['ignore', 'ignore', 'inherit'],
      windowsHide: true,
    },
  );

  serverProcess.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`Vite dev server exited with code ${code}`);
    }
  });

  await waitForServer(LOCAL_BASE_URL);
}

function runPlaywright() {
  const playwrightBin = path.join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'playwright.cmd' : 'playwright',
  );

  return new Promise((resolve) => {
    const child = spawn(playwrightBin, ['test', ...testArgs], {
      env: {
        ...process.env,
        BASE_URL: baseURL,
      },
      shell: process.platform === 'win32',
      stdio: 'inherit',
      windowsHide: true,
    });

    child.on('exit', (code) => resolve(code ?? 1));
  });
}

process.on('SIGINT', async () => {
  await stopServer();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  await stopServer();
  process.exit(143);
});

try {
  await startLocalServerIfNeeded();
  const exitCode = await runPlaywright();
  await stopServer();
  process.exit(exitCode);
} catch (error) {
  await stopServer();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
