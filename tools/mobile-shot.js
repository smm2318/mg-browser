'use strict';

/**
 * Mobile screenshots through the Chrome DevTools Protocol with real mobile emulation.
 *   node tools/mobile-shot.js <url> <out.png> [view=home|tabs|vault|settings]
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CHROME = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9333 + Math.floor(Math.random() * 200);

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const out = process.argv[3] || path.join(process.cwd(), 'mobile-shot.png');
const view = process.argv[4] || '';

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function waitForEndpoint() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch { /* ignore */ }
    await delay(200);
  }
  throw new Error('Chrome debugging endpoint not available');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener('open', () => resolve({
      send(method, params = {}) {
        const messageId = ++id;
        return new Promise((res, rej) => {
          pending.set(messageId, { res, rej });
          ws.send(JSON.stringify({ id: messageId, method, params }));
        });
      },
      close() { try { ws.close(); } catch { /* ignore */ } }
    }));
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const entry = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) entry.rej(new Error(msg.error.message));
        else entry.res(msg.result);
      }
    });
    ws.addEventListener('error', reject);
  });
}

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank'
  ], { stdio: 'ignore', windowsHide: true });

  try {
    await waitForEndpoint();
    const created = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
    const client = await connect(created.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390, height: 844, deviceScaleFactor: 3, mobile: true
    });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await client.send('Page.navigate', { url });
    await delay(1600);
    if (process.env.MG_SCRIPT) {
      const expression = fs.readFileSync(process.env.MG_SCRIPT, 'utf8');
      const result = await client.send('Runtime.evaluate', {
        expression, awaitPromise: true, returnByValue: true
      });
      console.log('script', result && result.result ? result.result.value : '');
      await delay(900);
    }
    if (view) {
      await client.send('Runtime.evaluate', {
        expression: `document.querySelector('.tabbar-item[data-nav="${view}"]')?.click(); true`
      });
      await delay(900);
    }
    const metrics = await client.send('Runtime.evaluate', {
      expression: 'JSON.stringify({w:innerWidth,h:innerHeight,dpr:devicePixelRatio,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})',
      returnByValue: true
    });
    console.log('metrics', metrics.result.value);
    const shot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
    console.log('saved', out);
    client.close();
  } finally {
    try { chrome.kill(); } catch { /* ignore */ }
    await delay(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
