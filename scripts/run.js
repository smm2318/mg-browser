'use strict';

/**
 * Dev launcher for MG Browser.
 *   node scripts/run.js            -> normal app
 *   node scripts/run.js --demo     -> screenshot demo (writes to ./shots)
 *   node scripts/run.js --url=...  -> open a URL on start
 */
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.join(__dirname, '..');
const exe = path.join(root, 'dist', 'win', 'MG-Browser.exe');
const args = process.argv.slice(2);
const demo = args.includes('--demo');
const urlArg = args.find((a) => a.startsWith('--url='));

if (!fs.existsSync(exe)) {
  console.error('Runtime not found:', exe);
  console.error('Run `npm run dist` (requires Electron) or place a runtime in dist/win.');
  process.exit(1);
}

const userData = path.join(root, '.userdata', demo ? 'demo' : 'default');
if (demo) {
  fs.rmSync(userData, { recursive: true, force: true });
}
fs.mkdirSync(userData, { recursive: true });

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.MG_USER_DATA = userData;
if (demo) {
  env.MG_DEMO = '1';
  env.MG_EXIT_AFTER_DEMO = '1';
  env.MG_DEMO_DIR = path.join(root, 'shots');
  const tempDir = path.join(root, '.mg-temp');
  fs.mkdirSync(tempDir, { recursive: true });
  env.TMP = tempDir;
  env.TEMP = tempDir;
  fs.mkdirSync(env.MG_DEMO_DIR, { recursive: true });
}
if (urlArg) env.MG_OPEN_URL = urlArg.slice('--url='.length);

console.log('[run] starting', exe);
console.log('[run] userData', userData);

const child = spawn(exe, ['--disable-gpu-sandbox'], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('exit', (code, signal) => {
  console.log('[run] exited', code, signal);
  process.exit(code == null ? 0 : code);
});
child.on('error', (err) => {
  console.error('[run] failed to launch', err);
  process.exit(1);
});
