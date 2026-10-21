'use strict';

/**
 * Personal test build: keeps the original signed Electron executable untouched,
 * so the Authenticode signature remains valid. Do NOT distribute this build —
 * the publisher shown by Windows will be the Electron distributor, not MG.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const runtime = path.join(root, 'dist', 'win');
const appSource = path.join(root, 'app');
const stage = path.join(root, 'release', 'MG-Browser-personal-signed-runtime');
const signedExe = process.env.MG_SIGNED_RUNTIME ||
  'C:\\Users\\SMM\\AppData\\Local\\Programs\\DeepSeek Harness\\DeepSeek Harness.exe';
const exe = path.join(stage, 'MG-Browser.exe');

const EXCLUDE_APP = new Set([
  'node_modules', '.userdata', 'shots', 'dist', 'release', '.git', '.mg-temp',
  'package-lock.json'
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
  if (!fs.existsSync(signedExe)) {
    console.error('Signed runtime not found:', signedExe);
    process.exit(1);
  }

  console.log('Preparing personal build at', stage);
  fs.rmSync(stage, { recursive: true, force: true });
  fs.mkdirSync(stage, { recursive: true });

  for (const entry of fs.readdirSync(runtime, { withFileTypes: true })) {
    if (entry.name === 'resources' || entry.name === 'MG-Browser.exe') continue;
    if (entry.name === 'MG-Browser.ico' || entry.name === 'MG-Browser.png') continue;
    const from = path.join(runtime, entry.name);
    const to = path.join(stage, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }

  // The signed executable is copied as-is: renaming does not invalidate Authenticode.
  fs.copyFileSync(signedExe, exe);

  const resources = path.join(stage, 'resources');
  fs.mkdirSync(resources, { recursive: true });
  const defaultApp = path.join(runtime, 'resources', 'default_app.asar');
  if (fs.existsSync(defaultApp)) fs.copyFileSync(defaultApp, path.join(resources, 'default_app.asar'));
  copyDir(appSource, path.join(resources, 'app'), EXCLUDE_APP);

  fs.copyFileSync(path.join(appSource, 'assets', 'icon.ico'), path.join(stage, 'MG-Browser.ico'));
  fs.copyFileSync(path.join(appSource, 'assets', 'icon.png'), path.join(stage, 'MG-Browser.png'));

  const template = path.join(root, 'release-template');
  for (const file of ['Create-Personal-Shortcut.ps1', 'PERSONAL-README.txt']) {
    const source = path.join(template, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(stage, file));
  }

  console.log('Done:', stage);
  console.log('EXE:', exe);
  console.log('This build is for personal testing only. Do not redistribute it.');
}

build();
