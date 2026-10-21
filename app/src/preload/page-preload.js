'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/* ------------------------------------------------------------------ */
/* autofill                                                            */
/* ------------------------------------------------------------------ */

function setNativeValue(el, value) {
  try {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {
    el.value = value;
  }
}

function visible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 4 && rect.height > 4;
}

function findPasswordFields() {
  return [...document.querySelectorAll('input[type="password"]')].filter(
    (el) => visible(el) && !el.disabled && !el.readOnly
  );
}

function fillCredentials(credentials) {
  if (!Array.isArray(credentials) || !credentials.length) return;
  if (location.protocol !== 'https:' && location.protocol !== 'http:') return;
  const passwords = findPasswordFields();
  if (!passwords.length) return;
  const password = passwords[0];
  if (password.value) return;

  let usernameField = null;
  const form = password.form;
  const scope = form || document;
  const candidates = [
    ...scope.querySelectorAll('input[autocomplete="username"]'),
    ...scope.querySelectorAll('input[type="email"]'),
    ...scope.querySelectorAll('input[name*="user" i]'),
    ...scope.querySelectorAll('input[name*="email" i]'),
    ...scope.querySelectorAll('input[name*="login" i]'),
    ...scope.querySelectorAll('input[type="text"]')
  ];
  usernameField = candidates.find((el) => visible(el) && !el.disabled && !el.readOnly) || null;

  const preferred = (usernameField && usernameField.value)
    ? credentials.find((c) => c.username === usernameField.value)
    : null;
  const cred = preferred || credentials[0];
  if (!cred) return;

  if (usernameField && !usernameField.value && cred.username) {
    setNativeValue(usernameField, cred.username);
  }
  setNativeValue(password, cred.password);
  password.focus({ preventScroll: true });
  password.dispatchEvent(new Event('focus', { bubbles: false }));
}

ipcRenderer.on('mg:autofill', (_event, data) => {
  if (!data || !Array.isArray(data.credentials)) return;
  const run = () => fillCredentials(data.credentials);
  run();
  setTimeout(run, 600);
  setTimeout(run, 1800);
});

/* ------------------------------------------------------------------ */
/* login form capture                                                  */
/* ------------------------------------------------------------------ */

const recent = new Map();

function readField(scope, selectors) {
  for (const selector of selectors) {
    const el = scope.querySelector(selector);
    if (el && typeof el.value === 'string' && el.value.trim()) return el.value.trim();
  }
  return '';
}

function captureLogin(form) {
  try {
    if (!form || form.nodeType !== 1) return;
    const passwords = [...form.querySelectorAll('input[type="password"]')];
    const passwordEl = passwords.find((el) => el.value && !el.disabled);
    if (!passwordEl) return;
    if (passwordEl.value.length < 1) return;

    const username = readField(form, [
      'input[autocomplete="username"]',
      'input[type="email"]',
      'input[name*="user" i]',
      'input[name*="email" i]',
      'input[id*="user" i]',
      'input[id*="email" i]',
      'input[type="text"]'
    ]);
    const signature = username + '|' + passwordEl.value.length;
    const key = location.origin + signature;
    const now = Date.now();
    if (recent.has(key) && now - recent.get(key) < 120000) return;
    recent.set(key, now);

    ipcRenderer.send('mg:login-candidate', {
      url: location.href,
      username,
      password: passwordEl.value
    });
  } catch { /* ignore */ }
}

document.addEventListener('submit', (event) => {
  const form = event.target;
  setTimeout(() => captureLogin(form), 40);
}, true);

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest('button[type="submit"], input[type="submit"], [role="button"]');
  if (!button) return;
  const form = button.form || button.closest('form');
  if (form) setTimeout(() => captureLogin(form), 120);
}, true);

/* ------------------------------------------------------------------ */
/* google account avatar                                               */
/* ------------------------------------------------------------------ */

let googleTimer = null;

function googleHost() {
  const h = location.hostname;
  return /(^|\.)google\.[a-z.]+$/i.test(h) || h === 'accounts.google.com' || /(^|\.)youtube\.com$/i.test(h);
}

function extractGoogle() {
  if (!googleHost()) return;
  try {
    let avatar = '';
    const img = document.querySelector(
      'a[aria-label*="Google Account"] img, a[href*="SignOutOptions"] img, ' +
      'a[aria-label*="حساب Google"] img, header img[src*="googleusercontent"], ' +
      'img[src*="googleusercontent.com"][src*="=s"]'
    );
    if (img && img.src) avatar = img.src;
    if (!avatar) {
      const el = document.querySelector('[aria-label*="Google Account"], [aria-label*="حساب Google"]');
      if (el) {
        const bg = window.getComputedStyle(el).backgroundImage;
        const m = /url\(["']?(.*?)["']?\)/.exec(bg || '');
        if (m && m[1]) avatar = m[1];
      }
    }
    if (!avatar) return;

    let name = '';
    let email = '';
    for (const el of document.querySelectorAll('[aria-label*="Google Account"], [aria-label*="حساب Google"]')) {
      const label = el.getAttribute('aria-label') || '';
      const match = /[:：]\s*(.*?)\s*\((.*?)\)/.exec(label);
      if (match) {
        name = match[1].trim();
        email = match[2].trim();
        break;
      }
    }
    if (!name && !email) {
      const el = document.querySelector('[data-email]');
      if (el) email = el.getAttribute('data-email') || '';
    }
    if (!avatar) return;
    ipcRenderer.send('mg:google-profile', {
      url: location.href,
      avatar,
      name,
      email
    });
  } catch { /* ignore */ }
}

function scheduleGoogle() {
  if (!googleHost()) return;
  clearInterval(googleTimer);
  let runs = 0;
  googleTimer = setInterval(() => {
    runs += 1;
    extractGoogle();
    if (runs > 14) clearInterval(googleTimer);
  }, 2200);
  setTimeout(extractGoogle, 900);
  setTimeout(extractGoogle, 2500);
}

window.addEventListener('load', () => {
  scheduleGoogle();
  setTimeout(() => ipcRenderer.send('mg:autofill-request'), 200);
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) extractGoogle();
});

/* ------------------------------------------------------------------ */
/* internal pages API (new tab page)                                   */
/* ------------------------------------------------------------------ */

const isInternalPage =
  location.protocol === 'file:' && /newtab\.html$/i.test(location.pathname);

if (isInternalPage) {
  contextBridge.exposeInMainWorld('mgPage', {
    data: () => ipcRenderer.invoke('mg:internal', 'data'),
    suggest: (query) => ipcRenderer.invoke('mg:internal', 'suggest', { query }),
    search: (query, engineId) => ipcRenderer.invoke('mg:internal', 'search', { query, engineId }),
    navigate: (url) => ipcRenderer.invoke('mg:internal', 'navigate', { url }),
    newTab: (url) => ipcRenderer.invoke('mg:internal', 'newTab', { url }),
    openSettings: () => ipcRenderer.invoke('mg:internal', 'settings'),
    openDownloads: () => ipcRenderer.invoke('mg:internal', 'downloads'),
    openPasswords: () => ipcRenderer.invoke('mg:internal', 'passwords'),
    bookmark: (data) => ipcRenderer.invoke('mg:internal', 'bookmark', data),
    clearRecent: () => ipcRenderer.invoke('mg:internal', 'clearRecent'),
    platform: process.platform
  });
}
