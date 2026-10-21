'use strict';

/**
 * Packages the portable Windows build from the local Electron runtime.
 *   node scripts/package-win.js
 * Output: release/MG-Browser-win-x64
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const runtime = path.join(root, 'dist', 'win');
const appSource = path.join(root, 'app');
const stageRoot = path.join(root, 'release');
const stage = path.join(stageRoot, 'MG-Browser-win-x64');
const exe = path.join(stage, 'MG-Browser.exe');

const EXCLUDE_APP = new Set([
  'node_modules', '.userdata', 'shots', 'dist', 'release', '.git', '.mg-temp',
  'package-lock.json', 'package.json.bak'
]);

function copyDir(src, dest, exclude = new Set()) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (exclude.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to, exclude);
    else if (entry.isSymbolicLink()) fs.copyFileSync(fs.realpathSync(from), to);
    else fs.copyFileSync(from, to);
  }
}

function build() {
  if (!fs.existsSync(runtime)) {
    console.error('Missing runtime:', runtime);
    process.exit(1);
  }
  console.log('Preparing', stage);
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });

  console.log('Copying Electron runtime…');
  for (const entry of fs.readdirSync(runtime, { withFileTypes: true })) {
    if (entry.name === 'resources' || entry.name === 'MG-Browser.ico' || entry.name === 'MG-Browser.png') continue;
    const from = path.join(runtime, entry.name);
    const to = path.join(stage, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }

  console.log('Copying MG Browser application…');
  const resources = path.join(stage, 'resources');
  fs.mkdirSync(resources, { recursive: true });
  const defaultApp = path.join(runtime, 'resources', 'default_app.asar');
  if (fs.existsSync(defaultApp)) fs.copyFileSync(defaultApp, path.join(resources, 'default_app.asar'));
  copyDir(appSource, path.join(resources, 'app'), EXCLUDE_APP);

  // extra documents next to the executable
  fs.copyFileSync(path.join(appSource, 'assets', 'icon.ico'), path.join(stage, 'MG-Browser.ico'));
  fs.copyFileSync(path.join(appSource, 'assets', 'icon.png'), path.join(stage, 'MG-Browser.png'));

  const template = path.join(root, 'release-template');
  if (fs.existsSync(template)) {
    for (const file of fs.readdirSync(template)) {
      fs.copyFileSync(path.join(template, file), path.join(stage, file));
    }
  }

  const readme = [
    'MG Browser 1.0.0',
    '================',
    '',
    'Run MG-Browser.exe to start the browser.',
    '',
    'Windows SmartScreen',
    '-------------------',
    'This build is not code-signed, so Windows may show "Windows protected your PC".',
    'That warning means Windows has not seen this file before — not that a virus was found.',
    '',
    'To remove it:',
    '  1. Run:  powershell -ExecutionPolicy Bypass -File .\\Unblock-MG-Browser.ps1',
    '     (or right-click the ZIP -> Properties -> check "Unblock" BEFORE extracting)',
    '  2. When running the EXE, click "More info" -> "Run anyway".',
    '',
    '• Your settings, history and encrypted passwords are stored in:',
    '  %APPDATA%\\MG Browser',
    '• Downloads go to your Downloads folder (change it in Settings → Downloads).',
    '• Right-click a page for the customizable context menu.',
    '• F12 opens the custom MG DevTools panel.',
    '• Ctrl+Shift+S toggles split view.',
    '',
    'To create shortcuts, run Install-MG-Browser.ps1 from the release folder.',
    ''
  ].join('\r\n');
  fs.writeFileSync(path.join(stage, 'README.txt'), readme, 'utf8');

  console.log('Branding executable…');
  const { rcedit } = require('rcedit');
  return rcedit(exe, {
    icon: path.join(appSource, 'assets', 'icon.ico'),
    'file-version': '1.0.0.0',
    'product-version': '1.0.0.0',
    'version-string': {
      CompanyName: 'MG Browser',
      FileDescription: 'MG Browser — a modern web browser',
      ProductName: 'MG Browser',
      InternalName: 'MG-Browser',
      OriginalFilename: 'MG-Browser.exe',
      LegalCopyright: '© 2026 MG Browser',
      Comments: 'Split view · Live search · Password vault · MG DevTools'
    }
  }).then(() => {
    console.log('Packaged:', stage);
    const size = dirSize(stage);
    console.log('Size:', (size / 1024 / 1024).toFixed(1), 'MB');
  });
}

function dirSize(dir) {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(p);
    else if (entry.isFile()) total += fs.statSync(p).size;
  }
  return total;
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
