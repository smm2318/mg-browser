'use strict';

const {
  app, BrowserWindow, WebContentsView, ipcMain, session, Menu, dialog,
  shell, clipboard, nativeTheme, nativeImage, Notification
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const { Store } = require('./store');
const { PasswordVault } = require('./passwords');
const { DownloadManager } = require('./downloads');
const { DevtoolsBridge } = require('./devtools');
const { ContextMenuWindow } = require('./context-menu-window');
const search = require('./search');
const menus = require('./context-menu');

const APP_ROOT = path.join(__dirname, '..', '..');
const RENDERER_DIR = path.join(APP_ROOT, 'src', 'renderer');
const CHROME_PRELOAD = path.join(APP_ROOT, 'src', 'preload', 'chrome-preload.js');
const PAGE_PRELOAD = path.join(APP_ROOT, 'src', 'preload', 'page-preload.js');
const MENU_PRELOAD = path.join(APP_ROOT, 'src', 'preload', 'menu-preload.js');
const ICON = path.join(APP_ROOT, 'assets', 'icon.png');
const IS_MAC = process.platform === 'darwin';
const PARTITION = 'persist:mg';

if (process.env.MG_USER_DATA) {
  app.setPath('userData', process.env.MG_USER_DATA);
}
if (process.env.MG_DEMO === '1') {
  try {
    const tempDir = path.join(process.cwd(), '.mg-temp');
    fs.mkdirSync(tempDir, { recursive: true });
    app.setPath('temp', tempDir);
  } catch { /* ignore */ }
}
app.setName('MG Browser');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling');

let win = null;
let store = null;
let vault = null;
let tabSession = null;
let downloads = null;
let devtools = null;
let quitting = false;
const loadedExtensions = new Map();
let contextMenuWindow = null;

const state = {
  nextId: 1,
  tabs: new Map(),
  order: [],
  activeId: null,
  split: null,          // { left, right, ratio }
  insets: { top: 104, right: 0, bottom: 0, left: 0 },
  viewsVisible: true,
  fullscreen: false,
  devtoolsOpen: false,
  closed: [],
  initialized: false,
  saveTimer: null,
  pendingPermissions: new Map(),
  pendingPasswords: new Map(),
  lastProfileKey: ''
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function effectiveTheme() {
  const pref = (store && store.settings.theme) || 'system';
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function send(type, payload) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('mg:event', { type, payload });
  }
}

function pageColor() {
  return effectiveTheme() === 'dark' ? '#14151b' : '#ffffff';
}

function chromeColor() {
  return effectiveTheme() === 'dark' ? '#0d0e12' : '#f4f5fa';
}

function newTabFileUrl() {
  const s = store.settings;
  const q = new URLSearchParams({
    theme: effectiveTheme(),
    lang: s.language,
    accent: s.accent,
    engine: s.searchEngine,
    v: '1'
  });
  return pathToFileURL(path.join(RENDERER_DIR, 'newtab.html')).href + '?' + q.toString();
}

function originOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.origin;
  } catch {
    return '';
  }
}

function isGoogleHost(host) {
  return /(^|\.)google\.[a-z.]+$/i.test(host) || /(^|\.)googleusercontent\.com$/i.test(host);
}

function isAuthPopup(url) {
  try {
    const u = new URL(url);
    const h = u.hostname;
    if (/(^|\.)accounts\.google\.com$/i.test(h)) return true;
    if (/(^|\.)accounts\.youtube\.com$/i.test(h)) return true;
    if (u.pathname.includes('oauth') || u.pathname.includes('signin') || u.pathname.includes('sign-in')) {
      return /(^|\.)(google|microsoftonline|apple|github|facebook)\./i.test(h);
    }
  } catch { /* ignore */ }
  return false;
}

function safeJsonParse(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

/* ------------------------------------------------------------------ */
/* window                                                              */
/* ------------------------------------------------------------------ */

function createWindow() {
  const saved = store.data.windowState || {};
  const demoMode = process.env.MG_DEMO === '1';
  const width = clamp(demoMode ? 1440 : (saved.width || 1320), 960, 4000);
  const height = clamp(demoMode ? 900 : (saved.height || 860), 620, 3000);

  win = new BrowserWindow({
    width,
    height,
    x: demoMode ? 30 : saved.x,
    y: demoMode ? 20 : saved.y,
    minWidth: 920,
    minHeight: 600,
    show: false,
    frame: IS_MAC ? true : false,
    titleBarStyle: IS_MAC ? 'hiddenInset' : 'hidden',
    trafficLightPosition: IS_MAC ? { x: 18, y: 18 } : undefined,
    backgroundColor: chromeColor(),
    icon: fs.existsSync(ICON) ? ICON : undefined,
    roundedCorners: true,
    webPreferences: {
      preload: CHROME_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  if (saved.maximized) win.maximize();

  win.loadFile(path.join(RENDERER_DIR, 'index.html'));

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('before-input-event', onShortcut);
  win.on('resize', () => { applyLayout(); saveWindowState(); });
  win.on('move', saveWindowState);
  win.on('maximize', () => send('window-state', { maximized: true }));
  win.on('unmaximize', () => send('window-state', { maximized: false }));
  win.on('enter-full-screen', () => { state.fullscreen = true; applyLayout(); send('fullscreen', { value: true }); });
  win.on('leave-full-screen', () => { state.fullscreen = false; applyLayout(); send('fullscreen', { value: false }); });

  win.once('ready-to-show', () => {
    win.show();
    if (saved.maximized) win.maximize();
    if (process.env.MG_DEMO === '1') {
      win.setAlwaysOnTop(true, 'floating');
      win.focus();
    }
  });

  win.on('close', () => {
    saveWindowState(true);
    saveSession(true);
  });

  win.on('closed', () => {
    for (const tab of state.tabs.values()) {
      try { tab.destroyed = true; } catch { /* ignore */ }
    }
    state.tabs.clear();
    state.order = [];
    state.activeId = null;
    state.split = null;
    state.initialized = false;
    state.devtoolsOpen = false;
    win = null;
  });

  win.webContents.on('render-process-gone', () => {
    if (win && !win.isDestroyed()) win.reload();
  });

  return win;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function saveWindowState(immediate = false) {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  const maximized = win.isMaximized();
  store.data.windowState = {
    width, height, maximized,
    x: win.getBounds().x,
    y: win.getBounds().y
  };
  if (immediate) store.save(true); else store.save();
}

/* ------------------------------------------------------------------ */
/* tabs                                                                */
/* ------------------------------------------------------------------ */

function tabState(tab) {
  const isSplit = state.split && (tab.id === state.split.left || tab.id === state.split.right);
  return {
    id: tab.id,
    url: tab.url,
    title: tab.title || 'New tab',
    favicon: tab.favicon || '',
    loading: !!tab.loading,
    canGoBack: !!tab.canGoBack,
    canGoForward: !!tab.canGoForward,
    muted: !!tab.muted,
    pinned: !!tab.pinned,
    audible: !!tab.audible,
    isNewTab: !!tab.isNewTab,
    error: tab.error || null,
    zoom: tab.zoom || 0,
    active: tab.id === state.activeId,
    splitSide: isSplit ? (tab.id === state.split.left ? 'left' : 'right') : null,
    index: state.order.indexOf(tab.id)
  };
}

function tabsPayload() {
  return {
    tabs: state.order.map((id) => tabState(state.tabs.get(id))).filter(Boolean),
    activeId: state.activeId,
    split: state.split
  };
}

function broadcastTabs() {
  send('tabs', tabsPayload());
  scheduleSessionSave();
}

function broadcastTab(tab) {
  if (!tab || tab.destroyed) return;
  send('tab', tabState(tab));
}

function updateActive() {
  if (!win) return;
  for (const [id, tab] of state.tabs) {
    const visible =
      state.viewsVisible &&
      (state.split ? (id === state.split.left || id === state.split.right) : id === state.activeId);
    try { tab.view.setVisible(visible); } catch { /* ignore */ }
  }
}

function createTab(input, opts = {}) {
  if (!win) return null;
  const inputString = String(input == null ? '' : input);
  if (/^mg:\/\//i.test(inputString) && !/^mg:\/\/(newtab|home)/i.test(inputString)) {
    openInternal(inputString.replace(/^mg:\/\//i, '').split(/[/?#]/)[0].toLowerCase());
    return null;
  }
  const id = state.nextId++;
  const view = new WebContentsView({
    webPreferences: {
      preload: PAGE_PRELOAD,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      partition: PARTITION,
      spellcheck: true,
      backgroundThrottling: false
    }
  });
  view.setBackgroundColor(pageColor());
  view.setBorderRadius(12);
  win.contentView.addChildView(view);
  view.setVisible(false);

  const tab = {
    id,
    view,
    url: '',
    title: 'New tab',
    favicon: '',
    loading: false,
    canGoBack: false,
    canGoForward: false,
    muted: false,
    pinned: false,
    audible: false,
    isNewTab: true,
    error: null,
    zoom: 0
  };
  state.tabs.set(id, tab);
  state.order.push(id);

  wireTab(tab);
  loadTab(tab, input === undefined ? 'mg://newtab' : input);

  if (opts.active !== false) {
    activateTab(id, { focus: true });
  } else {
    broadcastTabs();
  }
  return tab;
}

function loadTab(tab, input) {
  let target = String(input == null ? '' : input).trim();
  const s = store.settings;

  if (!target || target === 'mg://newtab' || target === 'about:newtab' || target === 'mg://home') {
    tab.isNewTab = true;
    target = newTabFileUrl();
  } else if (/^mg:\/\//i.test(target)) {
    const kind = target.replace(/^mg:\/\//i, '').split(/[/?#]/)[0].toLowerCase();
    openInternal(kind);
    return;
  } else if (search.looksLikeUrl(target)) {
    target = search.normalizeUrl(target);
  } else {
    target = search.buildSearchUrl(s, target);
  }

  tab.url = target;
  tab.error = null;
  tab.showingError = false;
  tab.isNewTab = /newtab\.html/i.test(target);
  if (tab.isNewTab) {
    tab.title = 'New tab';
    tab.favicon = '';
  } else {
    try { tab.title = new URL(target).hostname.replace(/^www\./, '') || target; } catch { tab.title = target; }
  }
  tab.loading = true;
  try {
    const p = tab.view.webContents.loadURL(target);
    if (p && p.catch) p.catch(() => {});
  } catch (err) {
    tab.error = { code: -1, description: err.message, url: target };
  }
  broadcastTab(tab);
}

function openInternal(kind) {
  switch (kind) {
    case 'settings':
      send('open-settings', { section: 'general' });
      break;
    case 'downloads':
      send('open-sidebar', { view: 'downloads' });
      break;
    case 'passwords':
      send('open-sidebar', { view: 'passwords' });
      break;
    case 'history':
      send('open-settings', { section: 'history' });
      break;
    case 'devtools':
      toggleDevtools(true);
      break;
    default:
      send('toast', { message: `Unknown internal page: mg://${kind}`, kind: 'error' });
  }
}

function wireTab(tab) {
  const wc = tab.view.webContents;

  wc.setWindowOpenHandler(({ url, disposition, features }) => {
    if (isAuthPopup(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 700,
          parent: win,
          modal: false,
          autoHideMenuBar: true,
          backgroundColor: '#ffffff',
          icon: fs.existsSync(ICON) ? ICON : undefined,
          webPreferences: {
            preload: PAGE_PRELOAD,
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            partition: PARTITION
          }
        }
      };
    }
    const active = disposition === 'foreground-tab' || disposition === 'new-window' ||
      (features && features.includes('foreground'));
    createTab(url, { active });
    return { action: 'deny' };
  });

  wc.on('page-title-updated', (event, title) => {
    if (tab.showingError) return;
    tab.title = title || tab.title;
    if (store && tab.url && /^https?:/.test(tab.url)) {
      store.updateHistoryMeta(tab.url, { title: tab.title });
    }
    broadcastTab(tab);
  });

  wc.on('page-favicon-updated', (event, favicons) => {
    if (favicons && favicons.length) {
      tab.favicon = favicons.find((f) => /^https?:|^data:/.test(f)) || favicons[0];
      if (tab.url && /^https?:/.test(tab.url)) {
        store.updateHistoryMeta(tab.url, { favicon: tab.favicon });
      }
      broadcastTab(tab);
    }
  });

  wc.on('did-start-loading', () => {
    tab.loading = true;
    if (!tab.showingError) tab.error = null;
    broadcastTab(tab);
    send('progress', { id: tab.id, value: 0.15 });
  });

  wc.on('did-stop-loading', () => {
    tab.loading = false;
    updateNavState(tab);
    broadcastTab(tab);
    send('progress', { id: tab.id, value: 1 });
    setTimeout(() => send('progress', { id: tab.id, value: null }), 350);
  });

  wc.on('did-navigate', (event, url) => {
    if (/error\.html/i.test(url)) {
      broadcastTab(tab);
      return;
    }
    const isStartPage = /newtab\.html/i.test(url);
    tab.url = url;
    tab.isNewTab = isStartPage;
    tab.showingError = false;
    tab.error = null;
    if (isStartPage) {
      tab.favicon = '';
      tab.title = 'New tab';
    }
    updateNavState(tab);
    if (/^https?:/.test(url)) {
      store.addHistory({ url, title: tab.title, favicon: tab.favicon });
    }
    broadcastTab(tab);
    scheduleSessionSave();
  });

  wc.on('did-navigate-in-page', (event, url, isMainFrame) => {
    if (!isMainFrame || tab.showingError) return;
    tab.url = url;
    tab.isNewTab = /newtab\.html/i.test(url);
    updateNavState(tab);
    if (/^https?:/.test(url)) {
      store.addHistory({ url, title: tab.title, favicon: tab.favicon });
    }
    broadcastTab(tab);
    scheduleSessionSave();
  });

  wc.on('did-finish-load', () => {
    updateNavState(tab);
    if (tab.showingError) {
      broadcastTab(tab);
      return;
    }
    if (/^https?:/.test(tab.url)) {
      store.updateHistoryMeta(tab.url, { title: tab.title, favicon: tab.favicon });
    }
    broadcastTab(tab);
    maybeAutofill(tab);
  });

  wc.on('did-fail-load', (event, code, description, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    if (tab.showingError || /^file:/.test(url)) return;
    tab.loading = false;
    tab.error = { code, description, url };
    tab.showingError = true;
    tab.isNewTab = false;
    tab.title = (code === -106) ? 'No internet' : (code === -105) ? 'Page not found' : 'Page not available';
    broadcastTab(tab);
    if (!win) return;
    const errUrl = pathToFileURL(path.join(RENDERER_DIR, 'error.html')).href + '?' + new URLSearchParams({
      url,
      code: String(code),
      desc: description || '',
      theme: effectiveTheme(),
      lang: store.settings.language
    }).toString();
    setTimeout(() => {
      if (tab.url === url || tab.showingError) {
        try { tab.view.webContents.loadURL(errUrl).catch(() => {}); } catch { /* ignore */ }
      }
    }, 30);
  });

  wc.on('render-process-gone', (event, details) => {
    tab.loading = false;
    tab.error = { code: -2, description: details.reason || 'The page crashed', url: tab.url, crashed: true };
    updateActive();
    broadcastTab(tab);
  });

  wc.on('context-menu', (event, params) => {
    popupPageMenu(tab, params);
  });

  wc.on('before-input-event', onShortcut);

  wc.on('found-in-page', (event, result) => {
    if (state.activeId !== tab.id) return;
    send('find-result', {
      matches: result.matches,
      active: result.activeMatchOrdinal,
      final: result.finalUpdate
    });
  });

  wc.on('enter-html-full-screen', () => {
    if (!win) return;
    state.fullscreen = true;
    send('fullscreen', { value: true });
    win.setFullScreen(true);
    applyLayout();
  });

  wc.on('leave-html-full-screen', () => {
    if (!win) return;
    state.fullscreen = false;
    send('fullscreen', { value: false });
    win.setFullScreen(false);
    applyLayout();
  });

  wc.on('zoom-changed', (event, direction) => {
    zoomBy(tab, direction === 'in' ? 0.5 : -0.5);
  });

  wc.on('audio-state-changed', (event) => {
    const audible = typeof event === 'object' && event.audible !== undefined ? event.audible : wc.isCurrentlyAudible();
    if (tab.audible !== audible) {
      tab.audible = audible;
      broadcastTab(tab);
    }
  });

  wc.on('update-target-url', (event, url) => {
    send('target-url', { url });
  });
}

function popupPageMenu(tab, params, position) {
  if (!win || !tab) return null;
  const wc = tab.view && !tab.view.webContents.isDestroyed() ? tab.view.webContents : null;
  const actions = {
    openTab: (url, options = {}) => createTab(url, { active: options.activate !== false }),
    openSplit: (url) => openSplitWithNewTab(url),
    searchInNewTab: (query, engineId) => createTab(search.buildSearchUrl(store.settings, query, engineId), { active: true }),
    goBack: () => goBack(tab.id),
    goForward: () => goForward(tab.id),
    reload: () => reloadTab(tab.id),
    openDevtoolsPanel: () => toggleDevtools(true),
    openNativeDevtools: () => openNativeDevtools(tab),
    openContextSettings: () => send('open-settings', { section: 'contextmenu' })
  };
  const spec = menus.buildPageMenuSpec({
    params,
    tab,
    settings: store.settings,
    engines: search.enginesFor(store.settings),
    searchEngineName: search.engineFor(store.settings).name,
    lang: store.settings.language,
    actions
  });

  try {
    if (!contextMenuWindow || contextMenuWindow.parent !== win) {
      contextMenuWindow = new ContextMenuWindow({
        parent: win,
        preload: MENU_PRELOAD,
        html: path.join(RENDERER_DIR, 'contextmenu.html'),
        onClose: () => {
          const active = updateActiveTab();
          if (active) {
            try { active.view.webContents.focus(); } catch { /* ignore */ }
          }
        }
      });
    }
    contextMenuWindow.open({
      items: spec.items,
      actions: spec.actions,
      theme: effectiveTheme(),
      lang: store.settings.language,
      accent: store.settings.accent,
      position
    }).catch((err) => {
      console.error('[menu] custom menu failed', err.message);
    });
  } catch (err) {
    console.error('[menu]', err);
    const fallback = menus.buildPageMenu({
      params,
      tab,
      settings: store.settings,
      engines: search.enginesFor(store.settings),
      searchEngineName: search.engineFor(store.settings).name,
      lang: store.settings.language,
      actions
    });
    fallback.popup({ window: win });
  }
  return null;
}

function updateNavState(tab) {
  const wc = tab.view.webContents;
  if (wc.isDestroyed()) return;
  try {
    tab.canGoBack = wc.navigationHistory ? wc.navigationHistory.canGoBack() : wc.canGoBack();
    tab.canGoForward = wc.navigationHistory ? wc.navigationHistory.canGoForward() : wc.canGoForward();
  } catch {
    tab.canGoBack = false;
    tab.canGoForward = false;
  }
  if (!tab.showingError) tab.url = wc.getURL() || tab.url;
}

function activateTab(id, opts = {}) {
  const tab = state.tabs.get(id);
  if (!tab) return;
  if (state.split && id !== state.split.left && id !== state.split.right) {
    state.split = null;
    send('split-state', { split: null });
  }
  state.activeId = id;
  updateActive();
  applyLayout();
  broadcastTabs();
  if (opts.focus !== false) {
    try { tab.view.webContents.focus(); } catch { /* ignore */ }
  }
  send('active', { id });
  if (state.devtoolsOpen) attachDevtools(tab);
}

function closeTab(id, opts = {}) {
  const tab = state.tabs.get(id);
  if (!tab) return;
  const index = state.order.indexOf(id);
  if (!opts.silent && tab.url && !tab.isNewTab) {
    state.closed.push({
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      pinned: tab.pinned,
      index
    });
    if (state.closed.length > 20) state.closed.shift();
  }

  if (state.split) {
    if (state.split.left === id) state.split.left = state.split.right;
    if (state.split.right === id) state.split.right = state.split.left;
    if (!state.split.left || state.split.left === state.split.right || !state.tabs.has(state.split.left)) {
      state.split = null;
    }
  }

  try { win.contentView.removeChildView(tab.view); } catch { /* ignore */ }
  try { tab.view.webContents.close(); } catch { /* ignore */ }
  tab.destroyed = true;
  state.tabs.delete(id);
  state.order = state.order.filter((x) => x !== id);

  if (state.activeId === id) {
    const nextId = state.order[Math.min(index, state.order.length - 1)];
    state.activeId = nextId || null;
    if (nextId) {
      const next = state.tabs.get(nextId);
      if (next) {
        if (state.split) state.activeId = state.split.left;
        try { state.tabs.get(state.activeId).view.webContents.focus(); } catch { /* ignore */ }
      }
    }
  }

  if (!state.tabs.size) {
    createTab(store.settings.newTabUrl || 'mg://newtab');
  } else {
    updateActive();
    applyLayout();
    broadcastTabs();
  }
  send('tab-closed', { id });
}

function reopenTab() {
  const entry = state.closed.pop();
  if (!entry) return null;
  return createTab(entry.url, { active: true });
}

function updateActiveTab() {
  return state.tabs.get(state.activeId) || null;
}

function goBack(id) {
  const tab = state.tabs.get(id || state.activeId);
  if (!tab) return;
  const wc = tab.view.webContents;
  if (wc.navigationHistory && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
  else if (wc.canGoBack()) wc.goBack();
}

function goForward(id) {
  const tab = state.tabs.get(id || state.activeId);
  if (!tab) return;
  const wc = tab.view.webContents;
  if (wc.navigationHistory && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
  else if (wc.canGoForward()) wc.goForward();
}

function reloadTab(id, hard = false) {
  const tab = state.tabs.get(id || state.activeId);
  if (!tab) return;
  const wc = tab.view.webContents;
  if (tab.error && tab.error.url) {
    tab.error = null;
    loadTab(tab, tab.url || store.settings.newTabUrl);
    return;
  }
  if (hard) wc.reloadIgnoringCache(); else wc.reload();
}

function stopTab(id) {
  const tab = state.tabs.get(id || state.activeId);
  if (tab) tab.view.webContents.stop();
}

function zoomBy(tab, delta) {
  if (!tab) return;
  const wc = tab.view.webContents;
  const current = wc.getZoomLevel();
  const next = delta === 0 ? 0 : clamp(current + delta, -5, 6);
  wc.setZoomLevel(next);
  tab.zoom = next;
  broadcastTab(tab);
  send('toast', { message: `Zoom ${Math.round(Math.pow(1.2, next) * 100)}%`, kind: 'info', timeout: 1200 });
}

function toggleMute(id) {
  const tab = state.tabs.get(id);
  if (!tab) return;
  tab.muted = !tab.muted;
  tab.view.webContents.setAudioMuted(tab.muted);
  broadcastTab(tab);
}

function togglePin(id) {
  const tab = state.tabs.get(id);
  if (!tab) return;
  tab.pinned = !tab.pinned;
  if (tab.pinned) {
    state.order = [id, ...state.order.filter((x) => x !== id)];
  } else {
    const activeIndex = Math.max(0, state.order.indexOf(state.activeId));
    state.order = state.order.filter((x) => x !== id);
    state.order.splice(Math.min(activeIndex + 1, state.order.length), 0, id);
  }
  broadcastTabs();
}

function duplicateTab(id) {
  const tab = state.tabs.get(id);
  if (!tab) return;
  createTab(tab.url, { active: true });
}

/* ------------------------------------------------------------------ */
/* split view                                                          */
/* ------------------------------------------------------------------ */

function setSplit(leftId, rightId) {
  if (!leftId || !rightId || leftId === rightId) {
    state.split = null;
    updateActive();
    applyLayout();
    broadcastTabs();
    send('split-state', { split: null });
    return;
  }
  if (!state.tabs.has(leftId) || !state.tabs.has(rightId)) return;
  state.split = { left: leftId, right: rightId, ratio: state.split ? state.split.ratio : 0.5 };
  state.activeId = leftId;
  updateActive();
  applyLayout();
  broadcastTabs();
  send('split-state', { split: state.split });
}

function toggleSplit() {
  if (state.split) {
    setSplit(null, null);
    return;
  }
  const active = state.activeId;
  const other = state.order.find((id) => id !== active);
  if (!other) {
    send('toast', { message: 'Open another tab first to use split view', kind: 'info' });
    return;
  }
  setSplit(active, other);
}

function openSplitWithNewTab(url) {
  const tab = createTab(url, { active: false });
  if (!tab) return;
  if (state.split) {
    setSplit(state.split.left, tab.id);
  } else {
    setSplit(state.activeId, tab.id);
  }
}

function toggleDevtools(force) {
  state.devtoolsOpen = force === undefined ? !state.devtoolsOpen : force;
  send('devtools', { open: state.devtoolsOpen });
  if (state.devtoolsOpen) {
    const tab = updateActiveTab();
    if (tab) attachDevtools(tab);
  } else {
    devtools.detach();
  }
}

function attachDevtools(tab) {
  if (!tab || !tab.view || tab.view.webContents.isDestroyed()) return;
  devtools.attach(tab.view.webContents, tab.id);
}

/* ------------------------------------------------------------------ */
/* layout                                                              */
/* ------------------------------------------------------------------ */

function applyLayout() {
  if (!win || win.isDestroyed()) return;
  const [width, height] = win.getContentSize();
  const insets = state.insets;
  const content = {
    x: Math.round(insets.left),
    y: Math.round(insets.top),
    width: Math.max(0, Math.round(width - insets.left - insets.right)),
    height: Math.max(0, Math.round(height - insets.top - insets.bottom))
  };
  const pad = state.fullscreen ? 0 : 8;
  const inner = {
    x: content.x + pad,
    y: content.y + pad,
    width: Math.max(0, content.width - pad * 2),
    height: Math.max(0, content.height - pad * 2)
  };

  const split = state.split;
  const left = split && state.tabs.get(split.left);
  const right = split && state.tabs.get(split.right);

  if (left && right && left !== right) {
    const gap = 10;
    const leftWidth = Math.max(140, Math.round((inner.width - gap) * split.ratio));
    const rightWidth = Math.max(140, inner.width - gap - leftWidth);
    setViewBounds(left, { x: inner.x, y: inner.y, width: leftWidth, height: inner.height });
    setViewBounds(right, { x: inner.x + leftWidth + gap, y: inner.y, width: rightWidth, height: inner.height });
  } else {
    const active = state.tabs.get(state.activeId);
    if (active) setViewBounds(active, inner);
  }
  updateActive();
}

function setViewBounds(tab, bounds) {
  try {
    tab.view.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height))
    });
  } catch (err) {
    console.error('[layout]', err.message);
  }
}

/* ------------------------------------------------------------------ */
/* session persistence                                                 */
/* ------------------------------------------------------------------ */

function scheduleSessionSave() {
  if (state.saveTimer) return;
  state.saveTimer = setTimeout(() => {
    state.saveTimer = null;
    saveSession();
  }, 600);
}

function saveSession(immediate = false) {
  if (!store) return;
  const tabs = state.order
    .map((id) => state.tabs.get(id))
    .filter((t) => t && !t.destroyed)
    .map((t) => ({
      url: t.isNewTab || /^file:.*newtab\.html/.test(t.url) ? 'mg://newtab' : t.url,
      title: t.title,
      favicon: t.favicon,
      pinned: t.pinned
    }))
    .filter((t) => t.url && t.url !== 'about:blank');

  let split = null;
  if (state.split) {
    const l = state.order.indexOf(state.split.left);
    const r = state.order.indexOf(state.split.right);
    if (l >= 0 && r >= 0) split = { left: l, right: r, ratio: state.split.ratio };
  }
  const activeIndex = Math.max(0, state.order.indexOf(state.activeId));
  store.data.session = { tabs, activeIndex, split };
  store.data.bookmarks = store.data.bookmarks || [];
  if (immediate) store.save(true); else store.save();
}

function restoreSession() {
  const saved = store.data.session || {};
  const tabs = Array.isArray(saved.tabs) ? saved.tabs : [];
  const usable = tabs.filter((t) => t && typeof t.url === 'string').slice(0, 30);
  if (store.settings.restoreSession && usable.length) {
    const created = [];
    for (const item of usable) {
      const tab = createTab(item.url || 'mg://newtab', { active: false });
      if (tab) {
        tab.pinned = !!item.pinned;
        if (item.title) tab.title = item.title;
        if (item.favicon) tab.favicon = item.favicon;
        created.push(tab);
      }
    }
    if (saved.split && created[saved.split.left] && created[saved.split.right]) {
      state.split = {
        left: created[saved.split.left].id,
        right: created[saved.split.right].id,
        ratio: clamp(saved.split.ratio || 0.5, 0.25, 0.75)
      };
    }
    const active = created[clamp(saved.activeIndex || 0, 0, created.length - 1)];
    if (active) {
      state.activeId = state.split ? state.split.left : active.id;
    }
    updateActive();
    applyLayout();
    broadcastTabs();
  } else {
    createTab('mg://newtab', { active: true });
  }
}

/* ------------------------------------------------------------------ */
/* omnibox                                                             */
/* ------------------------------------------------------------------ */

let omniSeq = 0;

async function omniQuery(text) {
  const seq = ++omniSeq;
  const data = await search.getOmniboxData(text, store.settings, {
    history: store.data.history,
    tabs: state.order.map((id) => state.tabs.get(id)).filter(Boolean)
  });
  return { seq, ...data };
}

function openFromOmnibox(text, engineId, disposition) {
  let input = String(text || '').trim();
  if (!input) return;
  if (/^mg:\/\//i.test(input)) {
    openInternal(input.replace(/^mg:\/\//i, '').split(/[/?#]/)[0].toLowerCase());
    return;
  }
  let url;
  if (search.looksLikeUrl(input)) url = search.normalizeUrl(input);
  else url = search.buildSearchUrl(store.settings, input, engineId);

  if (disposition === 'newtab') {
    createTab(url, { active: false });
    send('toast', { message: 'Opened in a background tab', kind: 'success', timeout: 1600 });
  } else if (disposition === 'split') {
    openSplitWithNewTab(url);
  } else {
    const tab = updateActiveTab();
    if (tab && (tab.isNewTab || /newtab\.html/.test(tab.url))) {
      tab.isNewTab = false;
      tab.url = url;
      tab.title = url;
      tab.view.webContents.loadURL(url).catch(() => {});
      broadcastTab(tab);
    } else if (tab) {
      loadTab(tab, url);
    } else {
      createTab(url, { active: true });
    }
  }
}

/* ------------------------------------------------------------------ */
/* autofill, google profile, passwords                                 */
/* ------------------------------------------------------------------ */

function maybeAutofill(tab) {
  if (!store.settings.autofillPasswords || !tab || !tab.url) return;
  const origin = originOf(tab.url);
  if (!origin) return;
  const creds = vault.forOrigin(origin);
  if (!creds.length) return;
  try {
    tab.view.webContents.send('mg:autofill', {
      origin,
      credentials: creds.map((c) => ({ username: c.username, password: c.password }))
    });
  } catch { /* ignore */ }
}

function handleLoginCandidate(sender, data) {
  const tab = findTabByWebContents(sender);
  if (!tab || !data || typeof data.password !== 'string' || !data.password) return;
  const origin = originOf(tab.url);
  if (!origin) return;
  if (originOf(data.url) !== origin) return;
  if (!store.settings.savePasswords) return;
  if (vault.isDismissed(origin)) return;

  const username = String(data.username || '').slice(0, 320);
  const existing = vault.forOrigin(origin).find(
    (c) => c.username === username && c.password === data.password
  );
  if (existing) return;

  const requestId = crypto.randomUUID();
  state.pendingPasswords.set(requestId, { origin, username, password: data.password });
  send('password-prompt', { requestId, origin, username });
}

function handleGoogleProfile(sender, data) {
  const tab = findTabByWebContents(sender);
  if (!tab || !data) return;
  let host = '';
  let tabHost = '';
  try {
    host = new URL(data.url || tab.url).hostname;
    tabHost = new URL(tab.url).hostname;
  } catch { return; }
  if (!isGoogleHost(tabHost) || !isGoogleHost(host)) return;

  const avatar = String(data.avatar || '');
  let avatarHost = '';
  try { avatarHost = new URL(avatar).hostname; } catch { /* ignore */ }
  const avatarAllowed = /(^|\.)googleusercontent\.com$/i.test(avatarHost) ||
    /(^|\.)ggpht\.com$/i.test(avatarHost) ||
    /(^|\.)gstatic\.com$/i.test(avatarHost);

  const profile = {
    name: String(data.name || '').slice(0, 120),
    email: String(data.email || '').slice(0, 200),
    avatar: avatarAllowed ? avatar : (store.data.profile.avatar || ''),
    source: 'google'
  };
  const key = profile.name + '|' + profile.email + '|' + profile.avatar;
  if (!profile.name && !profile.email && !profile.avatar) return;
  if (key === state.lastProfileKey) return;
  state.lastProfileKey = key;
  store.data.profile = profile;
  store.save();
  send('profile', { profile });
}

function findTabByWebContents(sender) {
  for (const tab of state.tabs.values()) {
    if (tab.view && !tab.view.webContents.isDestroyed() && tab.view.webContents.id === sender.id) return tab;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* extensions                                                          */
/* ------------------------------------------------------------------ */

function extensionState() {
  return (store.data.extensions || []).map((ext) => {
    const loaded = loadedExtensions.get(ext.path);
    return {
      path: ext.path,
      name: loaded ? loaded.name : (ext.name || path.basename(ext.path)),
      version: loaded ? loaded.version : (ext.version || ''),
      id: loaded ? loaded.id : (ext.id || ''),
      enabled: ext.enabled !== false,
      loaded: !!loaded,
      error: ext.error || null,
      addedAt: ext.addedAt || 0
    };
  });
}

async function loadOneExtension(ext) {
  if (!ext || !ext.path || ext.enabled === false) return false;
  if (loadedExtensions.has(ext.path)) return true;
  try {
    const extensionApi = tabSession.extensions || tabSession;
    const loaded = await extensionApi.loadExtension(ext.path, { allowFileAccess: true });
    loadedExtensions.set(ext.path, loaded);
    ext.id = loaded.id;
    ext.name = loaded.name || ext.name;
    ext.version = loaded.version || ext.version;
    ext.error = null;
    console.log('[extensions] loaded', ext.name, loaded.id);
    return true;
  } catch (err) {
    ext.error = err.message;
    console.error('[extensions] failed', ext.path, err.message);
    return false;
  }
}

async function loadInstalledExtensions() {
  for (const ext of store.data.extensions || []) {
    if (ext.enabled !== false) await loadOneExtension(ext);
  }
  store.save();
}

async function addExtensionFromPath(dir) {
  const resolved = path.resolve(String(dir || ''));
  const manifestPath = path.join(resolved, 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('manifest.json پیدا نشد');
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    throw new Error('manifest.json معتبر نیست: ' + err.message);
  }
  if (!manifest.name) throw new Error('manifest.name وجود ندارد');
  const existing = (store.data.extensions || []).find((e) => path.resolve(e.path) === resolved);
  if (existing) throw new Error('این افزونه قبلاً اضافه شده است');
  const entry = {
    path: resolved,
    name: manifest.name,
    version: manifest.version || '',
    enabled: true,
    addedAt: Date.now(),
    error: null
  };
  await loadOneExtension(entry);
  store.data.extensions = [...(store.data.extensions || []), entry];
  store.save();
  return extensionState();
}

function findStoredExtension(id) {
  return (store.data.extensions || []).find((e) => e.id === id || e.path === id || path.basename(e.path) === id);
}

async function chooseExtensionFolder() {
  if (!win) return { ok: false, error: 'window not ready' };
  const result = await dialog.showOpenDialog(win, {
    title: store.settings.language === 'fa' ? 'انتخاب پوشه افزونه (unpacked)' : 'Load unpacked extension',
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths.length) return { ok: false, canceled: true };
  try {
    const extensions = await addExtensionFromPath(result.filePaths[0]);
    return { ok: true, extensions };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function removeExtension(id) {
  const ext = findStoredExtension(id);
  if (!ext) return false;
  const loaded = loadedExtensions.get(ext.path);
  if (loaded) {
    try { (tabSession.extensions || tabSession).removeExtension(loaded.id); } catch { /* ignore */ }
    loadedExtensions.delete(ext.path);
  }
  store.data.extensions = (store.data.extensions || []).filter((e) => e.path !== ext.path);
  store.save();
  return true;
}

async function toggleExtension(id, enabled) {
  const ext = findStoredExtension(id);
  if (!ext) return false;
  ext.enabled = !!enabled;
  if (enabled) {
    await loadOneExtension(ext);
  } else {
    const loaded = loadedExtensions.get(ext.path);
    if (loaded) {
      try { (tabSession.extensions || tabSession).removeExtension(loaded.id); } catch { /* ignore */ }
      loadedExtensions.delete(ext.path);
    }
  }
  store.save();
  return true;
}

async function reloadExtension(id) {
  const ext = findStoredExtension(id);
  if (!ext) return false;
  const loaded = loadedExtensions.get(ext.path);
  if (loaded) {
    try { (tabSession.extensions || tabSession).removeExtension(loaded.id); } catch { /* ignore */ }
    loadedExtensions.delete(ext.path);
  }
  ext.error = null;
  await loadOneExtension(ext);
  store.save();
  return !ext.error;
}

function reloadTabsForExtensions() {
  for (const tab of state.tabs.values()) {
    if (!tab.isNewTab && !tab.showingError && /^https?:/.test(tab.url || '')) {
      try { tab.view.webContents.reload(); } catch { /* ignore */ }
    }
  }
}

/* ------------------------------------------------------------------ */
/* devtools                                                            */
/* ------------------------------------------------------------------ */

function setupDevtools() {
  devtools = new DevtoolsBridge((msg) => {
    send('devtools-event', msg);
  });
}

/* ------------------------------------------------------------------ */
/* downloads                                                           */
/* ------------------------------------------------------------------ */

function setupDownloads() {
  downloads = new DownloadManager({
    session: tabSession,
    store,
    getWindow: () => win,
    getSettings: () => store.settings,
    onChange: (items) => send('downloads', { items })
  });
}

/* ------------------------------------------------------------------ */
/* shortcuts                                                           */
/* ------------------------------------------------------------------ */

function onShortcut(event, input) {
  if (input.type !== 'keyDown') return;
  const mod = IS_MAC ? input.meta : input.control;
  const key = String(input.key || '').toLowerCase();
  const shift = input.shift;
  const alt = input.alt;
  let action = null;

  if (input.key === 'F12') action = 'devtools';
  else if (input.key === 'F11') action = 'fullscreen';
  else if (input.key === 'F5') action = 'reload';
  else if (mod && !shift && key === 't') action = 'newTab';
  else if (mod && shift && key === 't') action = 'reopenTab';
  else if (mod && !shift && key === 'w') action = 'closeTab';
  else if (mod && shift && key === 'w') action = 'closeWindow';
  else if (mod && key === 'l') action = 'focusOmnibox';
  else if (mod && !shift && key === 'r') action = 'reload';
  else if (mod && shift && key === 'r') action = 'hardReload';
  else if (mod && key === 'f') action = 'find';
  else if (mod && key === 'j') action = 'downloads';
  else if (mod && key === 'd') action = 'bookmark';
  else if (mod && key === 'p') action = 'print';
  else if (mod && key === ',') action = 'settings';
  else if (mod && shift && key === 's') action = 'split';
  else if (mod && key === 'tab') action = shift ? 'prevTab' : 'nextTab';
  else if (mod && (key === '=' || key === '+')) action = 'zoomIn';
  else if (mod && key === '-') action = 'zoomOut';
  else if (mod && key === '0') action = 'zoomReset';
  else if (mod && shift && key === 'i') action = 'devtools';
  else if (mod && shift && key === 'delete') action = 'clearData';
  else if (alt && input.key === 'ArrowLeft') action = 'back';
  else if (alt && input.key === 'ArrowRight') action = 'forward';
  else if (input.key === 'Escape' && state.devtoolsOpen && !store.settings.confirmBeforeQuit) action = null;

  if (!action) return;
  event.preventDefault();
  send('shortcut', { action });
}

/* ------------------------------------------------------------------ */
/* menus                                                               */
/* ------------------------------------------------------------------ */

function showMainMenu() {
  const tab = updateActiveTab();
  const menu = menus.buildMainMenu({
    settings: store.settings,
    lang: store.settings.language,
    recentHistory: store.data.history.slice(0, 10),
    isBookmarked: !!(tab && tab.url && store.isBookmarked(tab.url)),
    actions: {
      newTab: () => createTab('mg://newtab', { active: true }),
      newSplit: () => toggleSplit(),
      toggleBookmark: () => toggleBookmark(),
      openTab: (url, opts) => createTab(url, { active: !opts || opts.activate !== false }),
      clearHistory: () => clearHistory(),
      openDownloads: () => send('open-sidebar', { view: 'downloads' }),
      openPasswords: () => send('open-sidebar', { view: 'passwords' }),
      zoom: (delta) => zoomBy(updateActiveTab(), delta),
      find: () => send('shortcut', { action: 'find' }),
      print: () => { const t = updateActiveTab(); if (t) t.view.webContents.print(); },
      openDevtools: () => toggleDevtools(true),
      openSettings: () => send('open-settings', { section: 'general' }),
      about: () => showAbout()
    }
  });
  menu.popup({ window: win });
}

function showTabMenu(tabId) {
  const tab = state.tabs.get(tabId);
  if (!tab) return;
  const menu = menus.buildTabMenu({
    tab,
    settings: store.settings,
    lang: store.settings.language,
    actions: {
      newTab: () => createTab('mg://newtab', { active: true }),
      reloadTab: (id) => reloadTab(id),
      duplicateTab: (id) => duplicateTab(id),
      pinTab: (id) => togglePin(id),
      muteTab: (id) => toggleMute(id),
      closeTab: (id) => closeTab(id),
      closeOthers: (id) => closeOtherTabs(id),
      closeRight: (id) => closeTabsToRight(id),
      splitWith: (id) => setSplit(state.activeId === id ? state.order.find((x) => x !== id) : state.activeId, id),
      canSplit: state.order.length > 1
    }
  });
  menu.popup({ window: win });
}

function closeOtherTabs(id) {
  for (const other of [...state.order]) {
    if (other !== id) closeTab(other, { silent: true });
  }
  activateTab(id);
}

function closeTabsToRight(id) {
  const index = state.order.indexOf(id);
  for (const other of state.order.slice(index + 1)) closeTab(other, { silent: true });
  activateTab(id);
}

function showProfileMenu() {
  const menu = menus.buildProfileMenu({
    profile: store.data.profile,
    lang: store.settings.language,
    actions: {
      openTab: (url, opts) => createTab(url, { active: !opts || opts.activate !== false }),
      changeAvatar: () => pickAvatar(),
      clearAvatar: () => {
        store.data.profile = { ...store.data.profile, avatar: '', source: 'local' };
        state.lastProfileKey = '';
        store.save();
        send('profile', { profile: store.data.profile });
      },
      openPasswords: () => send('open-sidebar', { view: 'passwords' }),
      openSettings: () => send('open-settings', { section: 'general' })
    }
  });
  menu.popup({ window: win });
}

async function pickAvatar() {
  const result = await dialog.showOpenDialog(win, {
    title: 'Choose a profile photo',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
  });
  if (result.canceled || !result.filePaths.length) return;
  try {
    const img = nativeImage.createFromPath(result.filePaths[0]);
    if (img.isEmpty()) throw new Error('Could not read image');
    const resized = img.resize({ width: 256, height: 256, quality: 'best' });
    const dataUrl = resized.toDataURL();
    store.data.profile = { ...store.data.profile, avatar: dataUrl, source: 'local' };
    state.lastProfileKey = '';
    store.save();
    send('profile', { profile: store.data.profile });
  } catch (err) {
    dialog.showErrorBox('Profile photo', err.message);
  }
}

function toggleBookmark() {
  const tab = updateActiveTab();
  if (!tab || !tab.url || !/^https?:/.test(tab.url)) return;
  const added = store.toggleBookmark({ url: tab.url, title: tab.title, favicon: tab.favicon });
  send('bookmarked', { url: tab.url, bookmarked: added });
  send('toast', { message: added ? 'Bookmark added' : 'Bookmark removed', kind: 'success', timeout: 1600 });
  send('bookmarks', { bookmarks: store.data.bookmarks });
}

function showAbout() {
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'About MG Browser',
    message: `MG Browser ${app.getVersion()}`,
    detail: `A modern browser built with Electron.\n\nChromium ${process.versions.chrome}\nNode ${process.versions.node}\nElectron ${process.versions.electron}\n\nData folder: ${app.getPath('userData')}`,
    buttons: ['OK'],
    icon: fs.existsSync(ICON) ? nativeImage.createFromPath(ICON) : undefined
  });
}

function clearHistory() {
  store.data.history = [];
  store.save(true);
  send('history', { history: [] });
  send('toast', { message: 'Browsing history cleared', kind: 'success' });
}

/* ------------------------------------------------------------------ */
/* internal page API (new tab page)                                    */
/* ------------------------------------------------------------------ */

function internalData() {
  const s = store.settings;
  return {
    settings: {
      theme: s.theme,
      accent: s.accent,
      language: s.language,
      searchEngine: s.searchEngine,
      liveResults: s.liveResults
    },
    theme: effectiveTheme(),
    engines: search.enginesFor(s),
    bookmarks: store.data.bookmarks.slice(0, 12),
    history: store.data.history.slice(0, 12),
    topsites: topSites(),
    profile: store.data.profile,
    version: app.getVersion()
  };
}

function topSites() {
  const map = new Map();
  for (const h of store.data.history) {
    try {
      const hostname = new URL(h.url).hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      const root = parts.slice(-2).join('.');
      if (!map.has(root)) {
        map.set(root, { host: root, url: h.url, title: root, favicon: h.favicon, count: 0, last: 0 });
      }
      const item = map.get(root);
      item.count += 1;
      if (h.visitedAt > item.last) {
        item.last = h.visitedAt;
        item.url = h.url;
      }
      if (h.favicon && !item.favicon) item.favicon = h.favicon;
    } catch { /* ignore */ }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

async function handleInternal(action, payload, event) {
  switch (action) {
    case 'data':
      return internalData();
    case 'search': {
      const q = String(payload.query || '');
      const engineId = payload.engineId || store.settings.searchEngine;
      if (search.looksLikeUrl(q)) return { url: search.normalizeUrl(q) };
      return { url: search.buildSearchUrl(store.settings, q, engineId) };
    }
    case 'suggest': {
      const data = await search.getOmniboxData(String(payload.query || ''), store.settings, {
        history: store.data.history,
        tabs: []
      });
      return data;
    }
    case 'navigate': {
      const tab = findTabByWebContents(event.sender);
      if (!tab) return { ok: false };
      loadTab(tab, String(payload.url || ''));
      return { ok: true };
    }
    case 'newTab': {
      createTab(String(payload.url || 'mg://newtab'), { active: true });
      return { ok: true };
    }
    case 'settings':
      openInternal('settings');
      return { ok: true };
    case 'downloads':
      openInternal('downloads');
      return { ok: true };
    case 'passwords':
      openInternal('passwords');
      return { ok: true };
    case 'bookmark': {
      const added = store.toggleBookmark(payload);
      send('bookmarks', { bookmarks: store.data.bookmarks });
      return { added };
    }
    case 'clearRecent':
      clearHistory();
      return { ok: true };
    default:
      return { ok: false, error: 'Unknown action' };
  }
}

/* ------------------------------------------------------------------ */
/* permissions                                                         */
/* ------------------------------------------------------------------ */

const AUTO_PERMISSIONS = new Set([
  'fullscreen', 'clipboard-sanitized-write', 'pointerLock', 'keyboardLock',
  'media-key-system', 'window-management', 'unknown'
]);

function setupPermissions() {
  tabSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    if (AUTO_PERMISSIONS.has(permission)) return callback(true);
    let origin = '';
    try { origin = new URL(details.requestingUrl || wc.getURL()).origin; } catch { /* ignore */ }
    const requestId = crypto.randomUUID();
    state.pendingPermissions.set(requestId, callback);
    send('permission-request', { requestId, permission, origin });
    setTimeout(() => {
      if (state.pendingPermissions.has(requestId)) {
        state.pendingPermissions.delete(requestId);
        try { callback(false); } catch { /* ignore */ }
      }
    }, 30000);
  });
}

/* ------------------------------------------------------------------ */
/* IPC                                                                 */
/* ------------------------------------------------------------------ */

async function dispatch(action, payload = {}) {
  switch (action) {
    case 'app:init': {
      if (!state.initialized) {
        state.initialized = true;
        restoreSession();
      }
      return {
        platform: process.platform,
        isMac: IS_MAC,
        versions: {
          app: app.getVersion(),
          electron: process.versions.electron,
          chrome: process.versions.chrome,
          node: process.versions.node
        },
        settings: store.settings,
        profile: store.data.profile,
        engines: search.enginesFor(store.settings),
        downloads: downloads.list(),
        bookmarks: store.data.bookmarks,
        history: store.data.history.slice(0, 50),
        tabs: tabsPayload(),
        maximized: win ? win.isMaximized() : false,
        userData: app.getPath('userData')
      };
    }
    case 'app:minimize': win.minimize(); return true;
    case 'app:maximize': win.isMaximized() ? win.unmaximize() : win.maximize(); return win.isMaximized();
    case 'app:close': win.close(); return true;
    case 'app:openExternal': {
      const url = String(payload.url || '');
      if (/^https?:/i.test(url) || /^mailto:/i.test(url)) shell.openExternal(url);
      return true;
    }
    case 'app:about': showAbout(); return true;
    case 'app:pickAvatar': pickAvatar(); return true;

    case 'tabs:new': return tabState(createTab(payload.url || 'mg://newtab', { active: payload.active !== false, index: payload.index }));
    case 'tabs:close': closeTab(payload.id); return true;
    case 'tabs:activate': activateTab(payload.id); return true;
    case 'tabs:navigate': {
      const tab = state.tabs.get(payload.id || state.activeId);
      if (tab) loadTab(tab, payload.url);
      return true;
    }
    case 'tabs:back': goBack(payload.id); return true;
    case 'tabs:forward': goForward(payload.id); return true;
    case 'tabs:reload': reloadTab(payload.id, !!payload.hard); return true;
    case 'tabs:stop': stopTab(payload.id); return true;
    case 'tabs:mute': {
      const tab = state.tabs.get(payload.id);
      if (tab) {
        tab.muted = !!payload.muted;
        tab.view.webContents.setAudioMuted(tab.muted);
        broadcastTab(tab);
      }
      return true;
    }
    case 'tabs:pin': {
      const tab = state.tabs.get(payload.id);
      if (tab) { tab.pinned = !!payload.pinned; togglePin(payload.id); }
      return true;
    }
    case 'tabs:duplicate': duplicateTab(payload.id); return true;
    case 'tabs:closeOthers': closeOtherTabs(payload.id); return true;
    case 'tabs:closeRight': closeTabsToRight(payload.id); return true;
    case 'tabs:move': {
      const from = state.order.indexOf(payload.id);
      if (from === -1) return false;
      state.order.splice(from, 1);
      state.order.splice(clamp(payload.index, 0, state.order.length), 0, payload.id);
      broadcastTabs();
      applyLayout();
      return true;
    }
    case 'tabs:reopen': reopenTab(); return true;
    case 'tabs:zoom': zoomBy(state.tabs.get(payload.id || state.activeId), payload.delta || 0); return true;
    case 'tabs:find': {
      const tab = state.tabs.get(state.activeId);
      if (!tab) return false;
      tab.view.webContents.findInPage(String(payload.text || ''), {
        forward: payload.forward !== false,
        findNext: !!payload.findNext,
        matchCase: !!payload.matchCase
      });
      return true;
    }
    case 'tabs:findStop': {
      const tab = state.tabs.get(state.activeId);
      if (tab) tab.view.webContents.stopFindInPage('clearSelection');
      return true;
    }
    case 'tabs:print': {
      const tab = state.tabs.get(state.activeId);
      if (tab) tab.view.webContents.print();
      return true;
    }
    case 'tabs:menu': showTabMenu(payload.id); return true;

    case 'split:toggle': toggleSplit(); return true;
    case 'split:set': setSplit(payload.left, payload.right); return true;
    case 'split:ratio': {
      if (state.split) {
        state.split.ratio = clamp(payload.ratio, 0.2, 0.8);
        applyLayout();
        send('split-state', { split: state.split });
      }
      return true;
    }
    case 'split:swap': {
      if (state.split) {
        const left = state.split.left;
        state.split.left = state.split.right;
        state.split.right = left;
        applyLayout();
        broadcastTabs();
        send('split-state', { split: state.split });
      }
      return true;
    }
    case 'split:close': setSplit(null, null); return true;
    case 'split:focus': {
      if (state.split && (payload.id === state.split.left || payload.id === state.split.right)) {
        state.activeId = payload.id;
        updateActive();
        broadcastTabs();
        state.tabs.get(payload.id).view.webContents.focus();
      }
      return true;
    }

    case 'layout:insets': {
      state.insets = {
        top: Math.max(0, Math.round(payload.top || 0)),
        right: Math.max(0, Math.round(payload.right || 0)),
        bottom: Math.max(0, Math.round(payload.bottom || 0)),
        left: Math.max(0, Math.round(payload.left || 0))
      };
      applyLayout();
      return true;
    }
    case 'layout:viewsVisible': {
      state.viewsVisible = !!payload.visible;
      updateActive();
      if (payload.visible) applyLayout();
      return true;
    }

    case 'omni:query': return omniQuery(payload.text);
    case 'omni:open': openFromOmnibox(payload.text, payload.engineId, payload.disposition); return true;
    case 'omni:engines': return search.enginesFor(store.settings);
    case 'omni:setEngine': {
      store.updateSettings({ searchEngine: payload.engineId });
      send('settings', { settings: store.settings });
      return true;
    }

    case 'settings:get': return store.settings;
    case 'settings:set': {
      const patch = payload || {};
      const before = { ...store.settings };
      store.updateSettings(patch);
      afterSettingsChange(before, store.settings);
      send('settings', { settings: store.settings });
      return store.settings;
    }
    case 'settings:reset': {
      const before = { ...store.settings };
      store.resetSettings();
      afterSettingsChange(before, store.settings);
      send('settings', { settings: store.settings });
      return store.settings;
    }
    case 'settings:chooseDownloadFolder': {
      const result = await dialog.showOpenDialog(win, {
        title: 'Choose download folder',
        properties: ['openDirectory', 'createDirectory']
      });
      if (!result.canceled && result.filePaths[0]) {
        store.updateSettings({ downloadPath: result.filePaths[0] });
        send('settings', { settings: store.settings });
      }
      return store.settings.downloadPath;
    }

    case 'downloads:list': return downloads.list();
    case 'downloads:pause': downloads.pause(payload.id); return true;
    case 'downloads:resume': downloads.resume(payload.id); return true;
    case 'downloads:cancel': downloads.cancel(payload.id); return true;
    case 'downloads:open': downloads.open(payload.id); return true;
    case 'downloads:reveal': downloads.reveal(payload.id); return true;
    case 'downloads:copyLink': downloads.copyLink(payload.id); return true;
    case 'downloads:remove': downloads.remove(payload.id); return true;
    case 'downloads:clear': downloads.clear(); return true;
    case 'downloads:chooseFolder': return dispatch('settings:chooseDownloadFolder', {});

    case 'passwords:list': return vault.list();
    case 'passwords:save': {
      vault.add(payload);
      send('passwords', { passwords: vault.list() });
      return true;
    }
    case 'passwords:delete': {
      vault.remove(payload.id);
      send('passwords', { passwords: vault.list() });
      return true;
    }
    case 'passwords:reveal': return vault.reveal(payload.id);
    case 'passwords:copy': {
      const value = payload.field === 'username' ? (vault.list().find((p) => p.id === payload.id) || {}).username : vault.reveal(payload.id);
      if (value) clipboard.writeText(value);
      return true;
    }
    case 'passwords:generate': return require('./passwords').PasswordVault.generate(payload || {});
    case 'passwords:promptResponse': {
      const req = state.pendingPasswords.get(payload.requestId);
      if (!req) return false;
      state.pendingPasswords.delete(payload.requestId);
      if (payload.action === 'save') {
        vault.add(req);
        send('passwords', { passwords: vault.list() });
        send('toast', { message: 'Password saved to MG Vault', kind: 'success' });
      } else if (payload.action === 'never') {
        vault.dismissSite(req.origin);
      }
      return true;
    }

    case 'profile:menu': showProfileMenu(); return true;
    case 'profile:set': {
      store.data.profile = { ...store.data.profile, ...payload };
      store.save();
      send('profile', { profile: store.data.profile });
      return true;
    }

    case 'menu:main': showMainMenu(); return true;
    case 'menu:profile': showProfileMenu(); return true;

    case 'devtools:toggle': toggleDevtools(payload.open); return state.devtoolsOpen;
    case 'devtools:snapshot': return devtools.snapshot();
    case 'devtools:clear': devtools.clear(); return true;
    case 'devtools:evaluate': return devtools.evaluate(String(payload.expression || ''));
    case 'devtools:document': return devtools.getDocument();
    case 'devtools:cookies': return devtools.getCookies();
    case 'devtools:storage': return devtools.getStorage();
    case 'devtools:native': {
      const tab = updateActiveTab();
      if (tab) openNativeDevtools(tab);
      return true;
    }
    case 'devtools:detach': devtools.detach(); return true;

    case 'history:list': {
      const q = String(payload.query || '').toLowerCase();
      const items = store.data.history
        .filter((h) => !q || (h.title || '').toLowerCase().includes(q) || h.url.toLowerCase().includes(q))
        .slice(0, 300);
      return items;
    }
    case 'history:clear': clearHistory(); return true;
    case 'history:remove': {
      store.data.history = store.data.history.filter((h) => h.url !== payload.url);
      store.save();
      send('history', { history: store.data.history.slice(0, 50) });
      return true;
    }
    case 'bookmarks:list': return store.data.bookmarks;
    case 'bookmarks:toggle': {
      const added = store.toggleBookmark(payload);
      send('bookmarks', { bookmarks: store.data.bookmarks });
      return added;
    }
    case 'bookmarks:remove': {
      store.data.bookmarks = store.data.bookmarks.filter((b) => b.url !== payload.url);
      store.save();
      send('bookmarks', { bookmarks: store.data.bookmarks });
      return true;
    }

    case 'extensions:list': return extensionState();
    case 'extensions:add': {
      const result = await chooseExtensionFolder();
      if (result.ok) send('extensions', { extensions: result.extensions });
      return result;
    }
    case 'extensions:addPath': {
      try {
        const extensions = await addExtensionFromPath(payload.path);
        send('extensions', { extensions });
        return { ok: true, extensions };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    }
    case 'extensions:remove': {
      await removeExtension(payload.id);
      const extensions = extensionState();
      send('extensions', { extensions });
      return extensions;
    }
    case 'extensions:toggle': {
      await toggleExtension(payload.id, payload.enabled);
      const extensions = extensionState();
      send('extensions', { extensions });
      return extensions;
    }
    case 'extensions:reload': {
      await reloadExtension(payload.id);
      const extensions = extensionState();
      send('extensions', { extensions });
      return extensions;
    }
    case 'extensions:openFolder': {
      const ext = findStoredExtension(payload.id);
      if (ext && ext.path) shell.openPath(ext.path);
      return true;
    }
    case 'extensions:reloadTabs': reloadTabsForExtensions(); return true;

    case 'permission:respond': {
      const cb = state.pendingPermissions.get(payload.requestId);
      if (!cb) return false;
      state.pendingPermissions.delete(payload.requestId);
      try { cb(!!payload.allow); } catch { /* ignore */ }
      return true;
    }

    case 'window:maximize': win.isMaximized() ? win.unmaximize() : win.maximize(); return win.isMaximized();
    case 'window:minimize': win.minimize(); return true;
    case 'window:close': win.close(); return true;
    case 'window:fullscreen': win.setFullScreen(!!payload.value); return true;

    default:
      console.warn('[ipc] unknown action', action);
      return null;
  }
}

function afterSettingsChange(before, after) {
  if (before.theme !== after.theme) {
    nativeTheme.themeSource = after.theme === 'system' ? 'system' : after.theme;
    const color = pageColor();
    for (const tab of state.tabs.values()) {
      try { tab.view.setBackgroundColor(color); } catch { /* ignore */ }
    }
    if (win) win.setBackgroundColor(chromeColor());
  }
  if (before.language !== after.language || before.theme !== after.theme || before.accent !== after.accent || before.searchEngine !== after.searchEngine) {
    for (const tab of state.tabs.values()) {
      if (tab.isNewTab) loadTab(tab, 'mg://newtab');
    }
  }
  if (before.askDownloadPath !== after.askDownloadPath) {
    // no-op, dialogs read settings live
  }
}

function openNativeDevtools(tab) {
  if (!tab) return;
  try {
    tab.view.webContents.openDevTools({ mode: 'detach', activate: true });
  } catch (err) {
    send('toast', { message: 'Could not open native DevTools: ' + err.message, kind: 'error' });
  }
}

function registerIpc() {
  ipcMain.handle('mg:call', async (event, action, payload) => {
    if (!win || event.sender !== win.webContents) {
      return { error: 'unauthorized' };
    }
    try {
      return await dispatch(action, payload || {});
    } catch (err) {
      console.error('[ipc]', action, err);
      return { error: err.message };
    }
  });

  ipcMain.handle('mg:internal', async (event, action, payload) => {
    try {
      return await handleInternal(action, payload || {}, event);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.on('mg:login-candidate', (event, data) => handleLoginCandidate(event.sender, data));
  ipcMain.on('mg:google-profile', (event, data) => handleGoogleProfile(event.sender, data));
  ipcMain.on('mg:autofill-request', (event) => {
    const tab = findTabByWebContents(event.sender);
    if (tab) maybeAutofill(tab);
  });
  ipcMain.on('menu:pick', (event, id) => {
    if (contextMenuWindow) contextMenuWindow.pick(id);
  });
  ipcMain.on('menu:close', () => {
    if (contextMenuWindow) contextMenuWindow.close();
  });
  ipcMain.on('mg:page-crashed', () => {});
}

/* ------------------------------------------------------------------ */
/* lifecycle                                                           */
/* ------------------------------------------------------------------ */

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (event, argv) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    app.setAppUserModelId('app.mgbrowser');

    store = new Store(app.getPath('userData'));
    vault = new PasswordVault(store);

    nativeTheme.themeSource = store.settings.theme === 'system' ? 'system' : store.settings.theme;

    tabSession = session.fromPartition(PARTITION);
    try {
      let ua = tabSession.getUserAgent();
      ua = ua.replace(/\sElectron\/[\d.]+/i, '').replace(/\sMG Browser\/[\d.]+/i, '');
      tabSession.setUserAgent(ua, store.settings.language === 'fa' ? 'fa-IR,fa;q=0.9,en-US;q=0.8' : 'en-US,en;q=0.9,fa;q=0.8');
    } catch { /* ignore */ }
    try { tabSession.setSpellCheckerLanguages(['en-US', 'fa']); } catch { /* ignore */ }
    try { tabSession.setSpellCheckerEnabled(true); } catch { /* ignore */ }

    tabSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      if (!store.settings.blockTrackers) return callback({});
      const blocked = /(doubleclick|googlesyndication|google-analytics|adservice|adsystem|scorecardresearch|taboola|outbrain|criteo|adnxs)/i;
      callback({ cancel: blocked.test(details.url) });
    });

    tabSession.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = { ...details.requestHeaders };
      if (store.settings.doNotTrack) headers['DNT'] = '1';
      callback({ requestHeaders: headers });
    });
    setupPermissions();
    setupDownloads();
    setupDevtools();
    await loadInstalledExtensions();
    createWindow();
    registerIpc();

    Menu.setApplicationMenu(null);

    nativeTheme.on('updated', () => {
      if (store.settings.theme !== 'system') return;
      send('system-theme', { theme: effectiveTheme() });
      for (const tab of state.tabs.values()) {
        try { tab.view.setBackgroundColor(pageColor()); } catch { /* ignore */ }
        if (tab.isNewTab) loadTab(tab, 'mg://newtab');
      }
      if (win) win.setBackgroundColor(chromeColor());
    });

    win.webContents.on('did-finish-load', () => {
      send('settings', { settings: store.settings });
    });

    if (process.env.MG_OPEN_URL) {
      setTimeout(() => createTab(process.env.MG_OPEN_URL, { active: true }), 1200);
    }

    if (process.env.MG_DEMO === '1') {
      runDemoMode();
    }

    if (process.env.MG_DL_TEST === '1') {
      runDownloadTest();
    }

    if (process.env.MG_SELFTEST === '1') {
      runSelfTest();
    }
  });

  app.on('window-all-closed', () => {
    if (!IS_MAC) app.quit();
  });

  app.on('activate', () => {
    if (!win) createWindow();
  });

  app.on('before-quit', () => {
    quitting = true;
    saveSession(true);
    if (devtools) devtools.detach();
  });
}

async function runSelfTest() {
  const log = (...args) => console.log('[selftest]', ...args);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    await wait(1500);
    const t1 = createTab('https://example.com', { active: true });
    await wait(3000);
    log('tab1', t1.url, '| title:', t1.title, '| loading:', t1.loading);
    const t2 = createTab('https://en.wikipedia.org/wiki/Web_browser', { active: true });
    await wait(4000);
    log('tab2', t2.title, '| canGoBack:', t2.canGoBack);
    setSplit(t1.id, t2.id);
    await wait(500);
    log('split', JSON.stringify(state.split));
    goBack(t2.id);
    await wait(900);
    log('back ->', t2.url);
    reloadTab(t2.id, true);
    await wait(1800);
    closeTab(t1.id);
    await wait(500);
    log('after close: split', JSON.stringify(state.split), 'tabs', state.order.length);
    reopenTab();
    await wait(1200);
    log('reopened: tabs', state.order.length, 'active', state.activeId);
    await dispatch('settings:set', { theme: 'dark', language: 'fa', searchEngine: 'duckduckgo' });
    log('settings:', store.settings.theme, store.settings.language, store.settings.searchEngine);
    const pid = vault.add({ origin: 'https://example.com', username: 'demo', password: 'Secret123!' });
    log('vault add/reveal:', vault.list().length, vault.reveal(pid));
    vault.remove(pid);
    log('vault after remove:', vault.list().length);
    const omniData = await omniQuery('quantum computing');
    log('omni:', omniData.suggestions.length, 'suggestions,', omniData.cards.length, 'cards:', omniData.cards.map((c) => c.kind + ':' + c.title).join(' | '));
    const mathData = await omniQuery('2+2*3');
    log('math card:', mathData.cards[0] && mathData.cards[0].text);
    openFromOmnibox('example.com', null, 'newtab');
    await wait(2500);
    log('final tabs:', state.tabs.size, 'active:', state.activeId);

    try {
      const testOrigin = 'http://127.0.0.1:4180';
      vault.add({ origin: testOrigin, username: 'demo@mg.local', password: 'Secret123!' });
      const loginTab = createTab(testOrigin + '/login.html', { active: true });
      await wait(3200);
      const filled = await loginTab.view.webContents.executeJavaScript(
        `({ user: (document.querySelector('input[name="username"]') || {}).value, pass: (document.querySelector('input[name="password"]') || {}).value })`
      );
      log('autofill:', JSON.stringify(filled));
    } catch (err) {
      log('autofill test skipped:', err.message);
    }

    try {
      const extPath = path.join(APP_ROOT, 'tools', 'test-extension');
      const added = await dispatch('extensions:addPath', { path: extPath });
      log('extension add:', !!(added && added.ok), added && added.error ? added.error : '');
      const extList = await dispatch('extensions:list');
      log('extension list:', extList.length, 'loaded:', extList[0] && extList[0].loaded, 'error:', extList[0] && extList[0].error);
      const extTab = createTab('https://example.com', { active: true });
      await wait(3500);
      const injected = await extTab.view.webContents.executeJavaScript(
        `document.documentElement.getAttribute('data-mg-test-extension')`
      );
      log('extension content script:', injected);
      await dispatch('extensions:remove', { id: extPath });
    } catch (err) {
      log('extension test failed:', err.message);
    }

    try {
      const menuTab = updateActiveTab();
      popupPageMenu(menuTab, {
        x: 400, y: 300, linkURL: '', srcURL: '', mediaType: 'none', selectionText: '',
        misspelledWord: '', dictionarySuggestions: [], isEditable: false,
        editFlags: { canCopy: true, canPaste: true }
      }, { x: 500, y: 300 });
      await wait(900);
      await contextMenuWindow.win.webContents.executeJavaScript(
        `document.querySelector('.menu-item:not(:disabled)')?.click()`
      );
      await wait(400);
      log('context menu copy:', clipboard.readText().slice(0, 90));
      contextMenuWindow.close();
    } catch (err) {
      log('context menu test failed:', err.message);
    }

    await dispatch('settings:set', { theme: 'system', language: 'en', searchEngine: 'google' });
    log('SELFTEST PASS');
  } catch (err) {
    console.error('[selftest] FAIL', err);
  }
  setTimeout(() => app.quit(), 900);
}

async function runDownloadTest() {
  const dir = process.env.MG_DL_DIR || path.join(process.cwd(), '.demodl');
  store.updateSettings({ askDownloadPath: false, downloadPath: dir });
  send('settings', { settings: store.settings });
  createTab('https://example.com', { active: true });
  await new Promise((r) => setTimeout(r, 3000));
  const tab = updateActiveTab();
  const target = process.env.MG_DL_URL || 'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png';
  console.log('[dl-test] downloading', target);
  if (tab) tab.view.webContents.downloadURL(target);
  setTimeout(() => {
    try {
      console.log('[dl-test] cwd', process.cwd(), 'files', fs.readdirSync(dir));
    } catch (err) {
      console.log('[dl-test] readdir failed', err.message);
    }
    app.quit();
  }, 8000);
}

/* ------------------------------------------------------------------ */
/* demo / screenshot mode (used for visual verification)               */
/* ------------------------------------------------------------------ */

function runDemoMode() {
  const { captureWindow } = require('./demo-capture');
  const dir = process.env.MG_DEMO_DIR || path.join(process.cwd(), 'shots');
  const scenario = [
    { action: 'theme-dark', wait: 1200 },
    { wait: 2200, shot: '01-start-dark.png' },
    { action: 'omnibox', arg: 'quantum computing', wait: 3600, shot: '02-live-search.png' },
    { action: 'close-omnibox', wait: 400 },
    { action: 'browse', arg: 'https://en.wikipedia.org/wiki/Web_browser', wait: 6000, shot: '03-tabs.png' },
    { action: 'browse-bg', arg: 'https://www.wikipedia.org', wait: 2600 },
    { action: 'split', wait: 2600, shot: '04-split.png' },
    { action: 'download', wait: 3200 },
    { action: 'sidebar-downloads', wait: 1200, shot: '05-downloads.png' },
    { action: 'sidebar-passwords', wait: 1400, shot: '06-passwords.png' },
    { action: 'close-sidebar', wait: 500 },
    { action: 'devtools', wait: 3200, shot: '07-devtools.png' },
    { action: 'settings', arg: 'appearance', wait: 1500, shot: '08-settings.png' },
    { action: 'theme-light', wait: 900 },
    { action: 'lang-fa', wait: 1800, shot: '09-persian-light.png' },
    { action: 'close-settings', wait: 500 },
    { action: 'devtools-off', wait: 700 },
    { action: 'newtab', wait: 2200, shot: '10-start-persian.png' },
    { action: 'browse', arg: 'https://mg-browser-does-not-exist.invalid', wait: 5200, shot: '11-error.png' },
    { action: 'browse', arg: 'https://en.wikipedia.org/wiki/Web_browser', wait: 4800 },
    { action: 'contextmenu', wait: 1300, shot: '12-contextmenu-fa.png', noActivate: true },
    { action: 'close-menu', wait: 400 },
    { action: 'add-extension', wait: 900 },
    { action: 'settings-extensions', wait: 1500, shot: '13-extensions-fa.png' },
    { action: 'close-settings', wait: 500 },
    { action: 'newtab', wait: 1600 },
    { action: 'size', arg: '1080x720', wait: 1000, shot: '14-persian-narrow.png' }
  ];

  const seedDemoVault = () => {
    if (vault.list().length) return;
    vault.add({ origin: 'https://accounts.google.com', username: 'sara@mgbrowser.app', password: 'Aurora!Sky#2024' });
    vault.add({ origin: 'https://github.com', username: 'sara-dev', password: 'Byte-Me-42-Cloud' });
    vault.add({ origin: 'https://dribbble.com', username: 'sara.design', password: 'Canvas&Ink!77' });
  };
  seedDemoVault();

  let index = 0;
  const next = async () => {
    if (index >= scenario.length) {
      if (process.env.MG_EXIT_AFTER_DEMO === '1') setTimeout(() => app.quit(), 700);
      return;
    }
    const step = scenario[index];
    index += 1;
    try {
      if (step.action) await runDemoAction(step.action, step.arg);
      await new Promise((r) => setTimeout(r, step.wait || 1200));
      if (step.shot) await captureWindow(win, path.join(dir, step.shot), { noActivate: !!step.noActivate });
    } catch (err) {
      console.error('[demo] step failed', step, err);
    }
    next();
  };
  setTimeout(next, 1200);
}

async function runDemoAction(action, arg) {
  const active = updateActiveTab();
  switch (action) {
    case 'newtab':
      createTab('mg://newtab', { active: true });
      break;
    case 'browse':
      createTab(arg || 'https://example.com', { active: true });
      break;
    case 'browse-bg':
      createTab(arg || 'https://example.com', { active: false });
      break;
    case 'split': {
      if (state.split) break;
      const candidates = state.order.filter((id) => id !== state.activeId);
      const other = candidates[candidates.length - 1];
      if (other) setSplit(state.activeId, other);
      break;
    }
    case 'omnibox':
      send('demo-omnibox', { text: arg || 'electron' });
      break;
    case 'close-omnibox':
      send('demo-close-omnibox');
      break;
    case 'settings':
      send('open-settings', { section: arg || 'general' });
      break;
    case 'close-settings':
      send('demo-close-settings');
      break;
    case 'sidebar-downloads':
      send('open-sidebar', { view: 'downloads' });
      break;
    case 'sidebar-passwords':
      send('open-sidebar', { view: 'passwords' });
      break;
    case 'close-sidebar':
      send('open-sidebar', { view: null });
      break;
    case 'download': {
      await dispatch('settings:set', {
        askDownloadPath: false,
        downloadPath: path.join(process.cwd(), '.demo-downloads')
      });
      const tab = updateActiveTab();
      if (tab) {
        tab.view.webContents.downloadURL('https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png');
      }
      break;
    }
    case 'devtools': {
      toggleDevtools(true);
      if (active) {
        setTimeout(() => {
          if (active.view && !active.view.webContents.isDestroyed()) {
            active.view.webContents.executeJavaScript(`
              console.log('MG DevTools attached to', location.host);
              console.info('Rendering', document.querySelectorAll('*').length, 'elements');
              console.warn('Demo warning: sample message');
              console.error('Demo error: handled exception sample');
              fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&titles=Browser&origin=*').catch(()=>{});
            `).catch(() => {});
          }
        }, 900);
      }
      break;
    }
    case 'devtools-off':
      toggleDevtools(false);
      break;
    case 'size': {
      const [w, h] = String(arg || '1100x740').split('x').map(Number);
      if (w > 700 && h > 500 && win) {
        win.setContentSize(w, h);
        setTimeout(applyLayout, 120);
      }
      break;
    }
    case 'contextmenu': {
      const tab = updateActiveTab();
      if (tab) {
        popupPageMenu(tab, {
          x: 600,
          y: 360,
          linkURL: '',
          srcURL: '',
          mediaType: 'none',
          selectionText: '',
          misspelledWord: '',
          dictionarySuggestions: [],
          isEditable: false,
          editFlags: { canCopy: true, canPaste: true, canCut: false, canUndo: false, canRedo: false, canSelectAll: true }
        }, { x: 620, y: 320 });
      }
      break;
    }
    case 'close-menu':
      try { if (contextMenuWindow) contextMenuWindow.close(); } catch { /* ignore */ }
      break;
    case 'add-extension':
      await dispatch('extensions:addPath', { path: path.join(APP_ROOT, 'tools', 'test-extension') });
      break;
    case 'settings-extensions':
      send('open-settings', { section: 'extensions' });
      break;
    case 'theme-dark':
      await dispatch('settings:set', { theme: 'dark' });
      break;
    case 'theme-light':
      await dispatch('settings:set', { theme: 'light' });
      break;
    case 'lang-fa':
      await dispatch('settings:set', { language: 'fa' });
      break;
    case 'lang-en':
      await dispatch('settings:set', { language: 'en' });
      break;
    default:
      break;
  }
}



